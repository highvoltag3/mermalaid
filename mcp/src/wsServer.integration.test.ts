import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { BridgeWsServer } from './wsServer.js'
import { BridgeSession } from './session.js'
import { makeOriginChecker } from './origins.js'
import { MessageType, PROTOCOL_VERSION, parseBridgeMessage, type BridgeMessage } from './protocol.js'

const PAIRING = 'ITESTCOD'

function buildServer() {
  const session = new BridgeSession({
    pairingCode: PAIRING,
    serverInfo: { name: 'mermalaid-mcp', version: 'test' },
    heartbeatIntervalMs: 60_000,
    timeouts: { getDiagramMs: 1000, setDiagramMs: 1000, validateMs: 1000, renderSvgMs: 1000, renderPngMs: 1000 },
  })
  const ws = new BridgeWsServer(
    {
      host: '127.0.0.1',
      ports: [0], // ephemeral
      allowOrigin: makeOriginChecker({ allowDevOrigins: true }),
      heartbeatIntervalMs: 60_000,
      maxPayloadBytes: 1024 * 1024,
    },
    {
      onMessage: (conn, msg) => session.handleMessage(conn, msg),
      onClose: (conn) => session.handleClose(conn),
    },
  )
  return { session, ws }
}

let running: BridgeWsServer | null = null
afterEach(async () => {
  await running?.stop()
  running = null
})

function connect(port: number, origin: string | undefined) {
  return new WebSocket(`ws://127.0.0.1:${port}`, origin ? { origin } : {})
}

function nextMessage(sock: WebSocket): Promise<BridgeMessage> {
  return new Promise((resolve, reject) => {
    sock.once('message', (data) => {
      const msg = parseBridgeMessage(data.toString())
      if (msg) resolve(msg)
      else reject(new Error('unparseable'))
    })
    sock.once('error', reject)
  })
}

const helloFrame = (pairingCode: string) =>
  JSON.stringify({
    v: PROTOCOL_VERSION,
    type: MessageType.Hello,
    role: 'editor',
    pairingCode,
    clientInfo: { app: 'mermalaid', runtime: 'web' },
    capabilities: { setDiagram: true, getDiagram: true, validate: true, renderSvg: true, renderPng: true },
  })

describe('BridgeWsServer (real wire)', () => {
  it('completes hello -> welcome and a getDiagram round-trip', async () => {
    const { session, ws } = buildServer()
    running = ws
    const port = await ws.start()

    const sock = connect(port, 'http://localhost:5173')
    await new Promise((r) => sock.once('open', r))
    sock.send(helloFrame(PAIRING))

    const welcome = await nextMessage(sock)
    expect(welcome.type).toBe('welcome')

    // Server asks for a fresh diagram; the fake editor answers.
    const pending = session.getDiagram(true)
    const getReq = (await nextMessage(sock)) as { type: string; id: string }
    expect(getReq.type).toBe('getDiagram')
    sock.send(
      JSON.stringify({
        v: PROTOCOL_VERSION,
        type: MessageType.GetDiagramResult,
        id: getReq.id,
        code: 'graph TD\n  A-->B',
        rev: 1,
        valid: true,
        error: null,
      }),
    )
    await expect(pending).resolves.toMatchObject({ code: 'graph TD\n  A-->B', valid: true })
    sock.close()
  })

  it('rejects a bad pairing code', async () => {
    const { ws } = buildServer()
    running = ws
    const port = await ws.start()
    const sock = connect(port, 'http://localhost:5173')
    await new Promise((r) => sock.once('open', r))
    sock.send(helloFrame('NOPENOPE'))
    const reply = (await nextMessage(sock)) as { type: string; reason?: string }
    expect(reply.type).toBe('reject')
    expect(reply.reason).toBe('bad_pairing_code')
    sock.close()
  })

  it('refuses the upgrade for a disallowed origin', async () => {
    const { ws } = buildServer()
    running = ws
    const port = await ws.start()
    const sock = connect(port, 'https://evil.example')
    const errored = await new Promise<boolean>((resolve) => {
      sock.once('open', () => resolve(false))
      sock.once('error', () => resolve(true))
    })
    expect(errored).toBe(true)
  })
})
