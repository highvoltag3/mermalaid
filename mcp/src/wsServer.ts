import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import {
  MessageType,
  PROTOCOL_VERSION,
  parseBridgeMessage,
  serializeBridgeMessage,
  type EditorToServerMessage,
  type ServerToEditorMessage,
} from './protocol.js'

/**
 * A bound editor socket, abstracted so the session logic can be unit-tested with a fake.
 */
export interface EditorConnection {
  readonly id: string
  readonly origin: string | null
  /** Liveness flag toggled by the heartbeat; exposed so the session need not know about ws. */
  isAlive: boolean
  send(msg: ServerToEditorMessage): void
  close(code?: number, reason?: string): void
}

export interface WsServerHandlers {
  onMessage(conn: EditorConnection, msg: EditorToServerMessage): void
  onClose(conn: EditorConnection): void
}

export interface WsServerOptions {
  host: string
  ports: number[]
  allowOrigin(origin: string | null | undefined): boolean
  heartbeatIntervalMs: number
  maxPayloadBytes: number
}

function isAddrInUse(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as NodeJS.ErrnoException).code === 'EADDRINUSE'
  )
}

/**
 * Hosts the localhost WebSocket the Mermalaid editor connects to. Owns the raw `ws`
 * sockets, enforces the Origin allowlist at the upgrade, runs the ping/pong heartbeat,
 * and forwards parsed messages to the session. Bound to loopback only.
 */
export class BridgeWsServer {
  private wss: WebSocketServer | null = null
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private readonly conns = new Map<WebSocket, EditorConnection>()
  port = 0

  constructor(
    private readonly opts: WsServerOptions,
    private readonly handlers: WsServerHandlers,
  ) {}

  /** Bind the first available port from `opts.ports`. Returns the chosen port. */
  async start(): Promise<number> {
    let lastErr: unknown
    for (const port of this.opts.ports) {
      try {
        this.wss = await this.listen(this.opts.host, port)
        const addr = this.wss.address()
        this.port = addr && typeof addr === 'object' ? addr.port : port
        this.wss.on('connection', (socket, req) => this.onConnection(socket, req))
        this.startHeartbeat()
        return this.port
      } catch (err) {
        lastErr = err
        if (!isAddrInUse(err)) throw err
      }
    }
    throw lastErr ?? new Error('No configured bridge port could be bound')
  }

  private listen(host: string, port: number): Promise<WebSocketServer> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({
        host,
        port,
        maxPayload: this.opts.maxPayloadBytes,
        verifyClient: (info, cb) => {
          const origin = (info.origin as string | undefined) ?? null
          if (this.opts.allowOrigin(origin)) cb(true)
          else cb(false, 403, 'Origin not allowed')
        },
      })
      const onError = (err: Error) => {
        wss.off('listening', onListening)
        wss.close() // release the failed listener (e.g. on EADDRINUSE before the fallback scan)
        reject(err)
      }
      const onListening = () => {
        wss.off('error', onError)
        resolve(wss)
      }
      wss.once('error', onError)
      wss.once('listening', onListening)
    })
  }

  private onConnection(socket: WebSocket, req: IncomingMessage): void {
    const conn: EditorConnection = {
      id: randomUUID(),
      origin: (req.headers.origin as string | undefined) ?? null,
      isAlive: true,
      send: (msg) => {
        if (socket.readyState === socket.OPEN) socket.send(serializeBridgeMessage(msg))
      },
      close: (code, reason) => socket.close(code, reason),
    }
    this.conns.set(socket, conn)

    socket.on('pong', () => {
      conn.isAlive = true
    })
    socket.on('message', (data) => {
      const raw = typeof data === 'string' ? data : data.toString('utf8')
      const msg = parseBridgeMessage(raw)
      if (msg) this.handlers.onMessage(conn, msg as EditorToServerMessage)
    })
    socket.on('close', () => {
      this.conns.delete(socket)
      this.handlers.onClose(conn)
    })
    socket.on('error', () => {
      // A `close` event always follows; nothing to do beyond preventing an unhandled throw.
    })
  }

  private startHeartbeat(): void {
    this.heartbeat = setInterval(() => {
      for (const [socket, conn] of this.conns) {
        if (!conn.isAlive) {
          socket.terminate()
          continue
        }
        conn.isAlive = false
        socket.ping()
        // Also send an app-level ping the browser client can observe (native ping frames
        // are invisible to a browser WebSocket) so its inactivity watchdog stays fed.
        conn.send({ v: PROTOCOL_VERSION, type: MessageType.Ping })
      }
    }, this.opts.heartbeatIntervalMs)
    this.heartbeat.unref?.()
  }

  async stop(): Promise<void> {
    if (this.heartbeat) {
      clearInterval(this.heartbeat)
      this.heartbeat = null
    }
    for (const socket of this.conns.keys()) socket.terminate()
    this.conns.clear()
    await new Promise<void>((resolve) => {
      if (!this.wss) return resolve()
      this.wss.close(() => resolve())
    })
    this.wss = null
  }
}
