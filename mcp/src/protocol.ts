// Wire protocol shared between the `mermalaid-mcp` server and the Mermalaid editor.
//
// SOURCE OF TRUTH. This file is duplicated verbatim to `src/agentBridge/protocol.ts`
// so the browser bundle (Vite, bundler resolution) and the Node server (tsc, NodeNext
// resolution) each get a self-contained copy. A drift test asserts the two stay identical.
// Keep this file DEPENDENCY-FREE (pure types + consts + guards) — no imports — so it is
// valid under both module resolution modes.

export const PROTOCOL_VERSION = 1

export const DEFAULT_BRIDGE_HOST = '127.0.0.1'
export const DEFAULT_BRIDGE_PORT = 7337
/** Ports scanned in order when the default is already taken. */
export const BRIDGE_PORT_FALLBACKS = [7337, 7338, 7339, 7340]

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000

/** Discriminator values for every message on the wire. */
export const MessageType = {
  // editor -> server
  Hello: 'hello',
  State: 'state',
  SetDiagramResult: 'setDiagramResult',
  GetDiagramResult: 'getDiagramResult',
  ValidateResult: 'validateResult',
  RenderResult: 'renderResult',
  Pong: 'pong',
  // server -> editor
  Welcome: 'welcome',
  Reject: 'reject',
  Superseded: 'superseded',
  SetDiagram: 'setDiagram',
  GetDiagram: 'getDiagram',
  Validate: 'validate',
  Render: 'render',
  Ping: 'ping',
} as const

export type ClientRuntime = 'web' | 'tauri'
export type RenderFormat = 'svg' | 'png'
export type DiagramStateSource = 'user' | 'agent' | 'initial'

export type RejectReason =
  | 'bad_pairing_code'
  | 'origin_not_allowed'
  | 'version_mismatch'
  | 'server_busy'
  | 'malformed_hello'

/** Fields shared by every message. */
export interface Envelope {
  v: number
  type: string
  id?: string
}

export interface EditorCapabilities {
  setDiagram: boolean
  getDiagram: boolean
  validate: boolean
  renderSvg: boolean
  renderPng: boolean
  mermaidVersion?: string
}

export interface EditorClientInfo {
  app: string
  appVersion?: string
  runtime: ClientRuntime
  origin?: string
  userAgent?: string
}

// ---- editor -> server ----

export interface HelloMessage extends Envelope {
  type: 'hello'
  role: 'editor'
  pairingCode: string
  clientInfo: EditorClientInfo
  capabilities: EditorCapabilities
}

export interface StateMessage extends Envelope {
  type: 'state'
  rev: number
  code: string
  source: DiagramStateSource
  valid: boolean
  error: string | null
}

export interface SetDiagramResultMessage extends Envelope {
  type: 'setDiagramResult'
  id: string
  ok: boolean
  rev: number
  valid: boolean
  error: string | null
}

export interface GetDiagramResultMessage extends Envelope {
  type: 'getDiagramResult'
  id: string
  code: string
  rev: number
  valid: boolean
  error: string | null
}

export interface ValidateResultMessage extends Envelope {
  type: 'validateResult'
  id: string
  valid: boolean
  error: string | null
  diagramType?: string | null
}

export interface RenderResultMessage extends Envelope {
  type: 'renderResult'
  id: string
  ok: boolean
  format: RenderFormat
  /** SVG markup for `svg`, base64 (no data: prefix) for `png`. */
  data: string
  mimeType: string
  width: number | null
  height: number | null
  error: string | null
}

export interface PongMessage extends Envelope {
  type: 'pong'
}

// ---- server -> editor ----

export interface WelcomeMessage extends Envelope {
  type: 'welcome'
  sessionId: string
  serverInfo: { name: string; version: string }
  protocolVersion: number
  heartbeatIntervalMs: number
}

export interface RejectMessage extends Envelope {
  type: 'reject'
  reason: RejectReason
  message: string
}

export interface SupersededMessage extends Envelope {
  type: 'superseded'
  message: string
}

export interface SetDiagramMessage extends Envelope {
  type: 'setDiagram'
  id: string
  code: string
  mode: 'replace'
  reason?: string
}

export interface GetDiagramMessage extends Envelope {
  type: 'getDiagram'
  id: string
}

export interface ValidateMessage extends Envelope {
  type: 'validate'
  id: string
  code?: string
}

export interface RenderMessage extends Envelope {
  type: 'render'
  id: string
  code?: string
  format: RenderFormat
  scale?: number
  theme?: string
}

export interface PingMessage extends Envelope {
  type: 'ping'
}

export type EditorToServerMessage =
  | HelloMessage
  | StateMessage
  | SetDiagramResultMessage
  | GetDiagramResultMessage
  | ValidateResultMessage
  | RenderResultMessage
  | PongMessage

export type ServerToEditorMessage =
  | WelcomeMessage
  | RejectMessage
  | SupersededMessage
  | SetDiagramMessage
  | GetDiagramMessage
  | ValidateMessage
  | RenderMessage
  | PingMessage

export type BridgeMessage = EditorToServerMessage | ServerToEditorMessage

/** Parse a raw frame into a BridgeMessage, or null if it is not a well-formed envelope. */
export function parseBridgeMessage(raw: string): BridgeMessage | null {
  let obj: unknown
  try {
    obj = JSON.parse(raw)
  } catch {
    return null
  }
  if (!obj || typeof obj !== 'object') return null
  const m = obj as Record<string, unknown>
  if (typeof m.type !== 'string' || typeof m.v !== 'number') return null
  return m as unknown as BridgeMessage
}

export function serializeBridgeMessage(msg: BridgeMessage): string {
  return JSON.stringify(msg)
}
