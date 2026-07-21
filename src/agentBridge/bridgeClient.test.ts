import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BridgeClient, type BridgeClientHandlers, type BridgeStatus } from './bridgeClient'

// Minimal WebSocket stand-in the client can drive; tests simulate the server via helpers.
class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }
  send(data: string): void {
    this.sent.push(data)
  }
  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) return
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.()
  }
  // --- test helpers ---
  open(): void {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.()
  }
  serverSend(obj: unknown): void {
    this.onmessage?.({ data: JSON.stringify(obj) })
  }
  frames(): Array<Record<string, unknown>> {
    return this.sent.map((s) => JSON.parse(s))
  }
  framesOfType(type: string): Array<Record<string, unknown>> {
    return this.frames().filter((f) => f.type === type)
  }
}

const WELCOME = {
  v: 1,
  type: 'welcome',
  sessionId: 's1',
  serverInfo: { name: 'mermalaid-mcp', version: 'test' },
  protocolVersion: 1,
  heartbeatIntervalMs: 100,
}

function makeClient(overrides: Partial<BridgeClientHandlers> = {}) {
  const statuses: BridgeStatus[] = []
  const handlers: BridgeClientHandlers = {
    getState: () => ({ code: 'graph TD\n A-->B', valid: true, error: null }),
    applyDiagram: vi.fn(async (code: string) => ({ code, valid: true, error: null })),
    validate: vi.fn(async () => ({ valid: true, error: null, diagramType: 'flowchart' })),
    render: vi.fn(async () => ({ ok: true, data: 'svg', mimeType: 'image/svg+xml', width: 10, height: 10, error: null })),
    onStatus: (s) => statuses.push(s),
    ...overrides,
  }
  const client = new BridgeClient({
    url: 'ws://127.0.0.1:7337',
    pairingCode: 'TESTCODE',
    clientInfo: { app: 'mermalaid', runtime: 'web' },
    capabilities: { setDiagram: true, getDiagram: true, validate: true, renderSvg: true, renderPng: true },
    handlers,
    webSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
  })
  return { client, handlers, statuses }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  FakeWebSocket.instances = []
})
afterEach(() => {
  vi.useRealTimers()
})

describe('BridgeClient handshake', () => {
  it('sends hello on open and reports connected on welcome', () => {
    const { client, statuses } = makeClient()
    client.connect()
    const sock = FakeWebSocket.instances[0]
    sock.open()

    const hello = sock.framesOfType('hello')[0]
    expect(hello).toMatchObject({ type: 'hello', pairingCode: 'TESTCODE', role: 'editor' })

    sock.serverSend(WELCOME)
    expect(statuses).toContain('connected')
    // pushes initial state after welcome
    expect(sock.framesOfType('state')[0]).toMatchObject({ source: 'initial', code: 'graph TD\n A-->B' })
  })

  it('does not reconnect after a reject', () => {
    vi.useFakeTimers()
    const { client, statuses } = makeClient()
    client.connect()
    const sock = FakeWebSocket.instances[0]
    sock.open()
    sock.serverSend({ v: 1, type: 'reject', reason: 'bad_pairing_code', message: 'nope' })
    expect(statuses).toContain('rejected')
    sock.close()
    vi.advanceTimersByTime(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1) // no reconnect attempt
  })

  it('does not reconnect after being superseded', () => {
    vi.useFakeTimers()
    const { client, statuses } = makeClient()
    client.connect()
    const sock = FakeWebSocket.instances[0]
    sock.open()
    sock.serverSend(WELCOME)
    sock.serverSend({ v: 1, type: 'superseded', message: 'another tab' })
    expect(statuses).toContain('superseded')
    sock.close()
    vi.advanceTimersByTime(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('detaches the previous socket on reconnect so its late close cannot wedge the new one', () => {
    vi.useFakeTimers()
    const { client } = makeClient()
    client.connect()
    const sockA = FakeWebSocket.instances[0]
    sockA.open()
    sockA.serverSend(WELCOME)
    sockA.serverSend({ v: 1, type: 'superseded', message: 'another tab' })
    // User clicks "Reconnect / take over" while socket A's server-side close is still in flight.
    client.connect()
    const sockB = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
    expect(sockB).not.toBe(sockA)
    expect(sockA.onclose).toBeNull() // A is detached; its late close is now inert
    sockB.open()
    sockB.serverSend(WELCOME)
    expect(client.getStatus()).toBe('connected')
  })

  it('reconnects with backoff after an unexpected drop', () => {
    vi.useFakeTimers()
    const { client } = makeClient()
    client.connect()
    const sock = FakeWebSocket.instances[0]
    sock.open()
    sock.serverSend(WELCOME)
    sock.close() // unexpected drop
    vi.advanceTimersByTime(2_000) // exceed first backoff
    expect(FakeWebSocket.instances.length).toBeGreaterThan(1)
  })
})

describe('BridgeClient request handling', () => {
  it('applies a setDiagram request and replies with the result', async () => {
    const { client, handlers } = makeClient()
    client.connect()
    const sock = FakeWebSocket.instances[0]
    sock.open()
    sock.serverSend(WELCOME)
    sock.serverSend({ v: 1, type: 'setDiagram', id: 'r1', code: 'flowchart LR\n X-->Y', mode: 'replace' })
    await flush()
    expect(handlers.applyDiagram).toHaveBeenCalledWith('flowchart LR\n X-->Y', undefined)
    const result = sock.framesOfType('setDiagramResult')[0]
    expect(result).toMatchObject({ id: 'r1', ok: true, valid: true })
  })

  it('answers a getDiagram request from current state', () => {
    const { client } = makeClient()
    client.connect()
    const sock = FakeWebSocket.instances[0]
    sock.open()
    sock.serverSend(WELCOME)
    sock.serverSend({ v: 1, type: 'getDiagram', id: 'g1' })
    const result = sock.framesOfType('getDiagramResult')[0]
    expect(result).toMatchObject({ id: 'g1', code: 'graph TD\n A-->B', valid: true })
  })

  it('answers a validate request via the injected validator', async () => {
    const { client, handlers } = makeClient()
    client.connect()
    const sock = FakeWebSocket.instances[0]
    sock.open()
    sock.serverSend(WELCOME)
    sock.serverSend({ v: 1, type: 'validate', id: 'v1', code: 'graph TD\n A-->B' })
    await flush()
    expect(handlers.validate).toHaveBeenCalled()
    expect(sock.framesOfType('validateResult')[0]).toMatchObject({ id: 'v1', valid: true, diagramType: 'flowchart' })
  })

  it('replies with an error when a capability handler is missing', async () => {
    const { client } = makeClient({ render: undefined })
    client.connect()
    const sock = FakeWebSocket.instances[0]
    sock.open()
    sock.serverSend(WELCOME)
    sock.serverSend({ v: 1, type: 'render', id: 'rn1', format: 'png' })
    await flush()
    const result = sock.framesOfType('renderResult')[0]
    expect(result).toMatchObject({ id: 'rn1', ok: false })
    expect(String(result.error)).toContain('does not support')
  })
})

describe('BridgeClient disconnect', () => {
  it('stops reconnecting after an explicit disconnect', () => {
    vi.useFakeTimers()
    const { client, statuses } = makeClient()
    client.connect()
    const sock = FakeWebSocket.instances[0]
    sock.open()
    sock.serverSend(WELCOME)
    client.disconnect()
    vi.advanceTimersByTime(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(statuses[statuses.length - 1]).toBe('disconnected')
  })
})
