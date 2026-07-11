import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BridgeDisconnectedError,
  BridgeNotConnectedError,
  BridgeSession,
  BridgeTimeoutError,
} from './session.js'
import {
  MessageType,
  PROTOCOL_VERSION,
  type EditorToServerMessage,
  type ServerToEditorMessage,
} from './protocol.js'
import type { EditorConnection } from './wsServer.js'

class FakeConn implements EditorConnection {
  id = Math.random().toString(36).slice(2)
  origin: string | null = 'http://localhost:5173'
  isAlive = true
  sent: ServerToEditorMessage[] = []
  closed: { code?: number; reason?: string } | null = null
  send(msg: ServerToEditorMessage): void {
    this.sent.push(msg)
  }
  close(code?: number, reason?: string): void {
    this.closed = { code, reason }
  }
  last(): ServerToEditorMessage {
    return this.sent[this.sent.length - 1]
  }
  has(type: string): boolean {
    return this.sent.some((m) => m.type === type)
  }
}

function makeSession(pairingCode = 'TESTCODE') {
  return new BridgeSession({
    pairingCode,
    serverInfo: { name: 'mermalaid-mcp', version: 'test' },
    heartbeatIntervalMs: 15_000,
    timeouts: { getDiagramMs: 100, setDiagramMs: 100, validateMs: 100, renderSvgMs: 100, renderPngMs: 100 },
  })
}

function hello(pairingCode: string): EditorToServerMessage {
  return {
    v: PROTOCOL_VERSION,
    type: MessageType.Hello,
    role: 'editor',
    pairingCode,
    clientInfo: { app: 'mermalaid', runtime: 'web' },
    capabilities: { setDiagram: true, getDiagram: true, validate: true, renderSvg: true, renderPng: true },
  } as EditorToServerMessage
}

function stateMsg(rev: number, code: string): EditorToServerMessage {
  return { v: PROTOCOL_VERSION, type: MessageType.State, rev, code, source: 'user', valid: true, error: null } as EditorToServerMessage
}

afterEach(() => {
  vi.useRealTimers()
})

describe('BridgeSession handshake', () => {
  it('rejects a wrong pairing code and closes the socket', () => {
    const s = makeSession()
    const c = new FakeConn()
    s.handleMessage(c, hello('WRONGCOD'))
    expect(c.last().type).toBe('reject')
    expect((c.last() as { reason: string }).reason).toBe('bad_pairing_code')
    expect(c.closed).toBeTruthy()
    expect(s.isPaired).toBe(false)
  })

  it('rejects a protocol version mismatch', () => {
    const s = makeSession()
    const c = new FakeConn()
    s.handleMessage(c, { ...hello('TESTCODE'), v: 99 })
    expect((c.last() as { reason: string }).reason).toBe('version_mismatch')
    expect(s.isPaired).toBe(false)
  })

  it('welcomes a correct pairing code', () => {
    const s = makeSession()
    const c = new FakeConn()
    s.handleMessage(c, hello('TESTCODE'))
    expect(c.last().type).toBe('welcome')
    expect(s.isPaired).toBe(true)
  })

  it('supersedes an incumbent editor (newest wins)', () => {
    const s = makeSession()
    const c1 = new FakeConn()
    const c2 = new FakeConn()
    s.handleMessage(c1, hello('TESTCODE'))
    s.handleMessage(c2, hello('TESTCODE'))
    expect(c1.has('superseded')).toBe(true)
    expect(c1.closed?.code).toBe(4002)
    expect(c2.last().type).toBe('welcome')
    expect(s.status().paired).toBe(true)
  })

  it('ignores state from a connection that never said hello', () => {
    const s = makeSession()
    const bound = new FakeConn()
    const stranger = new FakeConn()
    s.handleMessage(bound, hello('TESTCODE'))
    s.handleMessage(stranger, stateMsg(1, 'graph TD'))
    expect(s.status().hasCachedState).toBe(false)
  })
})

describe('BridgeSession request/response', () => {
  it('resolves a request when the matching result arrives', async () => {
    const s = makeSession()
    const c = new FakeConn()
    s.handleMessage(c, hello('TESTCODE'))
    const p = s.setDiagram('graph TD\n A-->B', 'reason')
    const sent = c.sent.find((m) => m.type === 'setDiagram') as { id: string } | undefined
    expect(sent?.id).toBeTruthy()
    s.handleMessage(c, {
      v: PROTOCOL_VERSION,
      type: MessageType.SetDiagramResult,
      id: sent!.id,
      ok: true,
      rev: 2,
      valid: true,
      error: null,
    } as EditorToServerMessage)
    await expect(p).resolves.toMatchObject({ ok: true, rev: 2, valid: true })
  })

  it('times out when the editor does not respond', async () => {
    vi.useFakeTimers()
    const s = makeSession()
    const c = new FakeConn()
    s.handleMessage(c, hello('TESTCODE'))
    const p = s.getDiagram(true)
    p.catch(() => {})
    await vi.advanceTimersByTimeAsync(150)
    await expect(p).rejects.toBeInstanceOf(BridgeTimeoutError)
  })

  it('rejects all pending requests when the editor disconnects', async () => {
    const s = makeSession()
    const c = new FakeConn()
    s.handleMessage(c, hello('TESTCODE'))
    const p = s.setDiagram('x')
    p.catch(() => {})
    s.handleClose(c)
    await expect(p).rejects.toBeInstanceOf(BridgeDisconnectedError)
    expect(s.isPaired).toBe(false)
  })

  it('rejects requests with BridgeNotConnectedError when no editor is bound', async () => {
    const s = makeSession()
    await expect(s.getDiagram(true)).rejects.toBeInstanceOf(BridgeNotConnectedError)
  })
})

describe('BridgeSession cache & waiters', () => {
  it('serves get_diagram from cache without a round-trip', async () => {
    const s = makeSession()
    const c = new FakeConn()
    s.handleMessage(c, hello('TESTCODE'))
    s.handleMessage(c, stateMsg(7, 'graph TD'))
    const snap = await s.getDiagram(false)
    expect(snap).toMatchObject({ code: 'graph TD', rev: 7, valid: true })
    expect(c.has('getDiagram')).toBe(false)
  })

  it('resolves waitForEditor when an editor pairs', async () => {
    const s = makeSession()
    const p = s.waitForEditor(1_000)
    s.handleMessage(new FakeConn(), hello('TESTCODE'))
    await expect(p).resolves.toBeUndefined()
  })

  it('times out waitForEditor', async () => {
    vi.useFakeTimers()
    const s = makeSession()
    const p = s.waitForEditor(500)
    p.catch(() => {})
    await vi.advanceTimersByTimeAsync(600)
    await expect(p).rejects.toBeInstanceOf(BridgeTimeoutError)
  })

  it('exposes the cached diagram and notifies listeners on change', () => {
    const s = makeSession()
    const changes: number[] = []
    s.onStateChange(() => changes.push(1))
    const c = new FakeConn()
    s.handleMessage(c, hello('TESTCODE')) // binding resets the cache and notifies
    expect(s.getCachedDiagram()).toBeNull()
    expect(changes.length).toBe(1)

    s.handleMessage(c, stateMsg(3, 'graph TD'))
    expect(s.getCachedDiagram()).toMatchObject({ code: 'graph TD', rev: 3 })
    expect(changes.length).toBe(2)

    s.handleClose(c) // unbind clears cache and notifies again
    expect(s.getCachedDiagram()).toBeNull()
    expect(changes.length).toBe(3)
  })
})
