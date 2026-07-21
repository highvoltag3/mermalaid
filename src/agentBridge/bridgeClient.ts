// Framework-agnostic WebSocket client for the Mermalaid agent bridge.
//
// Connects to the local `mermalaid-mcp` server, performs the pairing handshake, answers
// server->editor requests via injected handlers, and reconnects with backoff. It knows
// nothing about React — `useAgentBridge` wires it to editor state.

import {
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  MessageType,
  PROTOCOL_VERSION,
  parseBridgeMessage,
  serializeBridgeMessage,
  type BridgeMessage,
  type EditorCapabilities,
  type EditorClientInfo,
  type GetDiagramMessage,
  type RejectReason,
  type RenderFormat,
  type RenderMessage,
  type SetDiagramMessage,
  type ValidateMessage,
} from './protocol'

export type BridgeStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'rejected'
  | 'superseded'
  | 'error'

export interface BridgeStatusDetail {
  reason?: RejectReason
  message?: string
}

export interface DiagramState {
  code: string
  valid: boolean
  error: string | null
}

export interface ValidateOutcome {
  valid: boolean
  error: string | null
  diagramType?: string | null
}

export interface RenderOutcome {
  ok: boolean
  data: string
  mimeType: string
  width: number | null
  height: number | null
  error: string | null
}

export interface BridgeClientHandlers {
  /** Current editor diagram + validity (read synchronously). */
  getState(): DiagramState
  /** Apply an agent-authored diagram; resolve once the editor has settled with post-apply validity. */
  applyDiagram(code: string, reason?: string): Promise<DiagramState>
  /** Headless validate (M2). */
  validate?(code: string): Promise<ValidateOutcome>
  /** Headless render (M2). */
  render?(code: string, format: RenderFormat, opts: { scale?: number; theme?: string }): Promise<RenderOutcome>
  onStatus(status: BridgeStatus, detail?: BridgeStatusDetail): void
}

export interface BridgeClientOptions {
  url: string
  pairingCode: string
  clientInfo: EditorClientInfo
  capabilities: EditorCapabilities
  handlers: BridgeClientHandlers
  /** Injectable for tests; defaults to the global WebSocket. */
  webSocketImpl?: typeof WebSocket
}

const BACKOFF_BASE_MS = 500
const BACKOFF_FACTOR = 2
const BACKOFF_CAP_MS = 15_000

export class BridgeClient {
  private socket: WebSocket | null = null
  private status: BridgeStatus = 'disconnected'
  private shouldReconnect = false
  private manualClose = false
  private attempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS
  private rev = 0
  private readonly WebSocketImpl: typeof WebSocket

  constructor(private readonly opts: BridgeClientOptions) {
    this.WebSocketImpl = opts.webSocketImpl ?? WebSocket
  }

  getStatus(): BridgeStatus {
    return this.status
  }

  /** Open (or re-open) the connection. */
  connect(): void {
    this.manualClose = false
    this.shouldReconnect = true
    this.clearReconnectTimer()
    this.openSocket()
  }

  /** Close and stop reconnecting. */
  disconnect(): void {
    this.manualClose = true
    this.shouldReconnect = false
    this.clearReconnectTimer()
    this.clearWatchdog()
    this.teardownSocket()
    this.setStatus('disconnected')
  }

  /** Push the current editor state to the server (call on user edits). */
  pushState(state: DiagramState, source: 'user' | 'agent' | 'initial'): void {
    if (!this.isOpen()) return
    this.rev += 1
    this.send({
      v: PROTOCOL_VERSION,
      type: MessageType.State,
      rev: this.rev,
      code: state.code,
      source,
      valid: state.valid,
      error: state.error,
    })
  }

  private openSocket(): void {
    // Detach + close any prior socket so its (async) late events can't touch this client.
    this.teardownSocket()
    this.setStatus('connecting')
    let socket: WebSocket
    try {
      socket = new this.WebSocketImpl(this.opts.url)
    } catch (err) {
      this.setStatus('error', { message: err instanceof Error ? err.message : String(err) })
      this.scheduleReconnect()
      return
    }
    this.socket = socket

    socket.onopen = () => {
      if (this.socket !== socket) return
      this.send({
        v: PROTOCOL_VERSION,
        type: MessageType.Hello,
        role: 'editor',
        pairingCode: this.opts.pairingCode,
        clientInfo: this.opts.clientInfo,
        capabilities: this.opts.capabilities,
      })
      // Arm the watchdog now so a server that upgrades but never sends Welcome is retried.
      this.resetWatchdog()
    }
    socket.onmessage = (event) => {
      if (this.socket !== socket) return
      const msg = parseBridgeMessage(typeof event.data === 'string' ? event.data : String(event.data))
      if (msg) void this.handleMessage(msg)
    }
    socket.onerror = () => {
      if (this.socket !== socket) return
      if (this.status === 'connecting') this.setStatus('error', { message: 'Could not reach the agent bridge.' })
    }
    socket.onclose = () => {
      if (this.socket !== socket) return
      this.socket = null
      this.clearWatchdog()
      if (this.status === 'rejected' || this.status === 'superseded' || this.manualClose) {
        if (this.manualClose) this.setStatus('disconnected')
        return
      }
      this.setStatus('disconnected')
      this.scheduleReconnect()
    }
  }

  /** Detach handlers and close the current socket so its late events can't mutate this client. */
  private teardownSocket(): void {
    const socket = this.socket
    if (!socket) return
    this.socket = null
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    try {
      socket.close()
    } catch {
      // ignore
    }
  }

  private async handleMessage(msg: BridgeMessage): Promise<void> {
    // Any inbound frame proves the server is alive; feed the inactivity watchdog.
    this.resetWatchdog()
    switch (msg.type) {
      case MessageType.Welcome:
        this.attempt = 0
        this.rev = 0
        this.heartbeatIntervalMs = msg.heartbeatIntervalMs || DEFAULT_HEARTBEAT_INTERVAL_MS
        this.setStatus('connected')
        this.pushState(this.opts.handlers.getState(), 'initial')
        break
      case MessageType.Reject: {
        this.shouldReconnect = false
        this.setStatus('rejected', { reason: msg.reason, message: msg.message })
        break
      }
      case MessageType.Superseded:
        this.shouldReconnect = false
        this.setStatus('superseded', { message: msg.message })
        break
      case MessageType.SetDiagram:
        await this.onSetDiagram(msg)
        break
      case MessageType.GetDiagram:
        this.onGetDiagram(msg)
        break
      case MessageType.Validate:
        await this.onValidate(msg)
        break
      case MessageType.Render:
        await this.onRender(msg)
        break
      case MessageType.Ping:
        if (msg.id) this.send({ v: PROTOCOL_VERSION, type: MessageType.Pong, id: msg.id })
        break
      default:
        break
    }
  }

  private async onSetDiagram(msg: SetDiagramMessage): Promise<void> {
    try {
      const outcome = await this.opts.handlers.applyDiagram(msg.code, msg.reason)
      this.send({
        v: PROTOCOL_VERSION,
        type: MessageType.SetDiagramResult,
        id: msg.id,
        ok: true,
        rev: this.rev,
        valid: outcome.valid,
        error: outcome.error,
      })
    } catch (err) {
      this.send({
        v: PROTOCOL_VERSION,
        type: MessageType.SetDiagramResult,
        id: msg.id,
        ok: false,
        rev: this.rev,
        valid: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  private onGetDiagram(msg: GetDiagramMessage): void {
    const state = this.opts.handlers.getState()
    this.send({
      v: PROTOCOL_VERSION,
      type: MessageType.GetDiagramResult,
      id: msg.id,
      code: state.code,
      rev: this.rev,
      valid: state.valid,
      error: state.error,
    })
  }

  private async onValidate(msg: ValidateMessage): Promise<void> {
    const validate = this.opts.handlers.validate
    const code = msg.code ?? this.opts.handlers.getState().code
    let outcome: ValidateOutcome
    if (validate) {
      try {
        outcome = await validate(code)
      } catch (err) {
        outcome = { valid: false, error: err instanceof Error ? err.message : String(err) }
      }
    } else {
      outcome = { valid: false, error: 'This editor build does not support validation.' }
    }
    this.send({
      v: PROTOCOL_VERSION,
      type: MessageType.ValidateResult,
      id: msg.id,
      valid: outcome.valid,
      error: outcome.error,
      diagramType: outcome.diagramType ?? null,
    })
  }

  private sendRenderError(id: string, format: RenderFormat, error: string): void {
    this.send({
      v: PROTOCOL_VERSION,
      type: MessageType.RenderResult,
      id,
      ok: false,
      format,
      data: '',
      mimeType: format === 'png' ? 'image/png' : 'image/svg+xml',
      width: null,
      height: null,
      error,
    })
  }

  private async onRender(msg: RenderMessage): Promise<void> {
    const render = this.opts.handlers.render
    if (!render) {
      this.sendRenderError(msg.id, msg.format, 'This editor build does not support rendering.')
      return
    }
    const code = msg.code ?? this.opts.handlers.getState().code
    try {
      const out = await render(code, msg.format, { scale: msg.scale, theme: msg.theme })
      this.send({
        v: PROTOCOL_VERSION,
        type: MessageType.RenderResult,
        id: msg.id,
        ok: out.ok,
        format: msg.format,
        data: out.data,
        mimeType: out.mimeType,
        width: out.width,
        height: out.height,
        error: out.error,
      })
    } catch (err) {
      this.sendRenderError(msg.id, msg.format, err instanceof Error ? err.message : String(err))
    }
  }

  private send(msg: BridgeMessage): void {
    if (!this.isOpen()) return
    try {
      this.socket!.send(serializeBridgeMessage(msg))
    } catch {
      // socket closed underneath us; onclose will handle reconnect
    }
  }

  private isOpen(): boolean {
    return this.socket !== null && this.socket.readyState === this.WebSocketImpl.OPEN
  }

  private setStatus(status: BridgeStatus, detail?: BridgeStatusDetail): void {
    this.status = status
    this.opts.handlers.onStatus(status, detail)
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.manualClose) return
    const delay = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * BACKOFF_FACTOR ** this.attempt)
    const jitter = delay * 0.2 * Math.random()
    this.attempt += 1
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay + jitter)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // Server sends app-level pings every heartbeat; two missed intervals with no inbound
  // frame at all means the server is gone (a browser WebSocket can't observe ping frames,
  // so this app-level watchdog is what catches a silently-dead server). Force a reconnect.
  private resetWatchdog(): void {
    this.clearWatchdog()
    this.watchdogTimer = setTimeout(() => {
      if (this.socket) {
        try {
          this.socket.close(4000, 'inactivity')
        } catch {
          // onclose will handle reconnect
        }
      }
    }, this.heartbeatIntervalMs * 2)
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }
}
