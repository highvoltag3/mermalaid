import { randomUUID } from 'node:crypto'
import {
  MessageType,
  PROTOCOL_VERSION,
  type EditorCapabilities,
  type EditorClientInfo,
  type EditorToServerMessage,
  type GetDiagramResultMessage,
  type HelloMessage,
  type RejectReason,
  type RenderFormat,
  type RenderResultMessage,
  type ServerToEditorMessage,
  type SetDiagramResultMessage,
  type StateMessage,
  type ValidateResultMessage,
} from './protocol.js'
import type { BridgeTimeouts } from './config.js'
import { pairingCodesMatch } from './pairing.js'
import type { EditorConnection } from './wsServer.js'

export class BridgeNotConnectedError extends Error {
  constructor() {
    super('No Mermalaid editor is connected')
    this.name = 'BridgeNotConnectedError'
  }
}

export class BridgeTimeoutError extends Error {
  constructor(op: string, timeoutMs: number) {
    super(`Editor did not respond to "${op}" within ${timeoutMs}ms`)
    this.name = 'BridgeTimeoutError'
  }
}

export class BridgeDisconnectedError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'BridgeDisconnectedError'
  }
}

export interface CachedState {
  rev: number
  code: string
  valid: boolean
  error: string | null
  source: string
  updatedAt: number
}

export interface DiagramSnapshot {
  code: string
  rev: number
  valid: boolean
  error: string | null
}

export interface SessionStatus {
  paired: boolean
  editorInfo: EditorClientInfo | null
  capabilities: EditorCapabilities | null
  hasCachedState: boolean
  lastRevision: number | null
  lastValid: boolean | null
}

/** Omit that distributes over a union so each member keeps its own properties. */
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never

type OutboundRequest = DistributiveOmit<ServerToEditorMessage, 'v' | 'id'>

interface Pending {
  resolve: (msg: EditorToServerMessage) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface Waiter {
  resolve: () => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export interface SessionOptions {
  pairingCode: string
  serverInfo: { name: string; version: string }
  heartbeatIntervalMs: number
  timeouts: BridgeTimeouts
}

/**
 * Owns the single bound-editor relationship: pairing handshake, newest-wins supersede,
 * the cached editor state, and the request/response correlation used by the MCP tools.
 */
export class BridgeSession {
  private editor: EditorConnection | null = null
  private editorInfo: EditorClientInfo | null = null
  private capabilities: EditorCapabilities | null = null
  private cached: CachedState | null = null
  private readonly pending = new Map<string, Pending>()
  private waiters: Waiter[] = []
  private readonly stateChangeListeners: Array<() => void> = []

  constructor(private readonly opts: SessionOptions) {}

  get isPaired(): boolean {
    return this.editor !== null
  }

  /** Subscribe to cached-diagram changes (bind, unbind, and each state push). */
  onStateChange(listener: () => void): void {
    this.stateChangeListeners.push(listener)
  }

  private emitStateChange(): void {
    for (const listener of this.stateChangeListeners) {
      try {
        listener()
      } catch {
        // a listener must not break session handling
      }
    }
  }

  /** The last known diagram, or null if none has been received yet. */
  getCachedDiagram(): DiagramSnapshot | null {
    if (!this.cached) return null
    const c = this.cached
    return { code: c.code, rev: c.rev, valid: c.valid, error: c.error }
  }

  // ---- inbound (called by the WS server) ----

  handleMessage(conn: EditorConnection, msg: EditorToServerMessage): void {
    if (msg.type === MessageType.Hello) {
      this.handleHello(conn, msg as HelloMessage)
      return
    }
    // Only the currently-bound editor may drive session state / resolve requests.
    if (conn !== this.editor) return

    switch (msg.type) {
      case MessageType.State:
        this.cacheState(msg as StateMessage)
        break
      case MessageType.SetDiagramResult:
      case MessageType.GetDiagramResult:
      case MessageType.ValidateResult:
      case MessageType.RenderResult:
      case MessageType.Pong:
        if (msg.id) this.resolvePending(msg.id, msg)
        break
      default:
        break
    }
  }

  handleClose(conn: EditorConnection): void {
    if (conn !== this.editor) return
    this.editor = null
    this.editorInfo = null
    this.capabilities = null
    this.cached = null
    this.failAllPending(new BridgeDisconnectedError('Editor disconnected'))
    this.emitStateChange()
  }

  private handleHello(conn: EditorConnection, msg: HelloMessage): void {
    if (typeof msg.v !== 'number' || msg.v !== PROTOCOL_VERSION) {
      this.rejectConn(conn, 'version_mismatch', `Unsupported protocol version ${msg.v}; server speaks ${PROTOCOL_VERSION}.`)
      return
    }
    if (!msg.pairingCode || !pairingCodesMatch(msg.pairingCode, this.opts.pairingCode)) {
      this.rejectConn(conn, 'bad_pairing_code', 'Invalid pairing code.')
      return
    }

    // Newest-wins supersede: an existing editor is bumped in favor of the new one.
    if (this.editor && this.editor !== conn) {
      this.editor.send({
        v: PROTOCOL_VERSION,
        type: MessageType.Superseded,
        message: 'Another Mermalaid tab or window took over the agent bridge.',
      })
      this.editor.close(4002, 'superseded')
      this.failAllPending(new BridgeDisconnectedError('Editor superseded by a newer connection'))
    }

    this.editor = conn
    this.editorInfo = msg.clientInfo ?? null
    this.capabilities = msg.capabilities ?? null
    this.cached = null // a fresh `state` push follows welcome
    this.emitStateChange() // notify resource subscribers the cached diagram was reset

    conn.send({
      v: PROTOCOL_VERSION,
      type: MessageType.Welcome,
      sessionId: randomUUID(),
      serverInfo: this.opts.serverInfo,
      protocolVersion: PROTOCOL_VERSION,
      heartbeatIntervalMs: this.opts.heartbeatIntervalMs,
    })
    this.resolveWaiters()
  }

  private rejectConn(conn: EditorConnection, reason: RejectReason, message: string): void {
    conn.send({ v: PROTOCOL_VERSION, type: MessageType.Reject, reason, message })
    conn.close(4001, reason)
  }

  private cacheState(msg: StateMessage): void {
    this.cached = {
      rev: msg.rev,
      code: msg.code,
      valid: msg.valid,
      error: msg.error,
      source: msg.source,
      updatedAt: Date.now(),
    }
    this.emitStateChange()
  }

  // ---- request/response correlation ----

  private request<T extends EditorToServerMessage>(
    payload: OutboundRequest,
    timeoutMs: number,
  ): Promise<T> {
    const editor = this.editor
    if (!editor) return Promise.reject(new BridgeNotConnectedError())

    const id = randomUUID()
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new BridgeTimeoutError(payload.type, timeoutMs))
      }, timeoutMs)
      timer.unref?.()
      this.pending.set(id, {
        resolve: resolve as (m: EditorToServerMessage) => void,
        reject,
        timer,
      })
      editor.send({ ...payload, v: PROTOCOL_VERSION, id } as ServerToEditorMessage)
    })
  }

  private resolvePending(id: string, msg: EditorToServerMessage): void {
    const p = this.pending.get(id)
    if (!p) return
    clearTimeout(p.timer)
    this.pending.delete(id)
    p.resolve(msg)
  }

  private failAllPending(err: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer)
      p.reject(err)
    }
    this.pending.clear()
  }

  // ---- operations used by the MCP tools ----

  async setDiagram(code: string, reason?: string): Promise<SetDiagramResultMessage> {
    return this.request<SetDiagramResultMessage>(
      { type: MessageType.SetDiagram, code, mode: 'replace', reason },
      this.opts.timeouts.setDiagramMs,
    )
  }

  async getDiagram(fresh = false): Promise<DiagramSnapshot> {
    const cached = this.getCachedDiagram()
    if (!fresh && cached) return cached
    const res = await this.request<GetDiagramResultMessage>(
      { type: MessageType.GetDiagram },
      this.opts.timeouts.getDiagramMs,
    )
    return { code: res.code, rev: res.rev, valid: res.valid, error: res.error }
  }

  async validate(code?: string): Promise<ValidateResultMessage> {
    return this.request<ValidateResultMessage>(
      { type: MessageType.Validate, code },
      this.opts.timeouts.validateMs,
    )
  }

  async render(
    format: RenderFormat,
    opts: { code?: string; scale?: number; theme?: string } = {},
  ): Promise<RenderResultMessage> {
    const timeout = format === 'png' ? this.opts.timeouts.renderPngMs : this.opts.timeouts.renderSvgMs
    return this.request<RenderResultMessage>(
      { type: MessageType.Render, format, code: opts.code, scale: opts.scale, theme: opts.theme },
      timeout,
    )
  }

  /** Resolve once an editor is paired, or reject on timeout. */
  waitForEditor(timeoutMs: number): Promise<void> {
    if (this.isPaired) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter((w) => w !== waiter)
          reject(new BridgeTimeoutError('wait_for_editor', timeoutMs))
        }, timeoutMs),
      }
      waiter.timer.unref?.()
      this.waiters.push(waiter)
    })
  }

  private resolveWaiters(): void {
    const waiters = this.waiters
    this.waiters = []
    for (const w of waiters) {
      clearTimeout(w.timer)
      w.resolve()
    }
  }

  status(): SessionStatus {
    return {
      paired: this.isPaired,
      editorInfo: this.editorInfo,
      capabilities: this.capabilities,
      hasCachedState: this.cached !== null,
      lastRevision: this.cached?.rev ?? null,
      lastValid: this.cached?.valid ?? null,
    }
  }

  /** Reject outstanding work and drop the editor — used on shutdown. */
  dispose(): void {
    this.failAllPending(new BridgeDisconnectedError('Server shutting down'))
    for (const w of this.waiters) {
      clearTimeout(w.timer)
      w.reject(new BridgeDisconnectedError('Server shutting down'))
    }
    this.waiters = []
    this.editor = null
  }
}
