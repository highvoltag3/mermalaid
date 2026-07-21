#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig } from './config.js'
import { makeOriginChecker } from './origins.js'
import { formatPairingCode, generatePairingCode } from './pairing.js'
import { registerDiagramResource } from './resources.js'
import { BridgeSession } from './session.js'
import { registerTools } from './tools.js'
import { BridgeWsServer } from './wsServer.js'

const SERVER_NAME = 'mermalaid-mcp'

function readVersion(): string {
  try {
    const pkgUrl = new URL('../package.json', import.meta.url)
    const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), 'utf8')) as { version?: string }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

// The MCP protocol owns stdout — everything human-facing must go to stderr.
function logStderr(line: string): void {
  process.stderr.write(`${line}\n`)
}

async function main(): Promise<void> {
  const config = loadConfig()
  const version = readVersion()
  const pairingCode = generatePairingCode()

  const session = new BridgeSession({
    pairingCode,
    serverInfo: { name: SERVER_NAME, version },
    heartbeatIntervalMs: config.heartbeatIntervalMs,
    timeouts: config.timeouts,
  })

  const ws = new BridgeWsServer(
    {
      host: config.host,
      ports: config.ports,
      allowOrigin: makeOriginChecker({
        extraOrigins: config.extraOrigins,
        allowDevOrigins: config.allowDevOrigins,
      }),
      heartbeatIntervalMs: config.heartbeatIntervalMs,
      maxPayloadBytes: config.maxPayloadBytes,
    },
    {
      onMessage: (conn, msg) => session.handleMessage(conn, msg),
      onClose: (conn) => session.handleClose(conn),
    },
  )

  const port = await ws.start()

  const server = new McpServer({ name: SERVER_NAME, version })
  registerTools(server, { session, pairingCode, port })
  registerDiagramResource(server, session)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  logStderr('')
  logStderr(`[${SERVER_NAME}] v${version} ready.`)
  logStderr(`[${SERVER_NAME}] Bridge listening on ws://${config.host}:${port}`)
  logStderr(`[${SERVER_NAME}] Pairing code: ${formatPairingCode(pairingCode)}`)
  logStderr(`[${SERVER_NAME}] In Mermalaid, open the "AI Agent" panel and enter the code to connect.`)
  logStderr('')

  let shuttingDown = false
  const shutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true
    session.dispose()
    await ws.stop()
    await server.close().catch(() => {})
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

main().catch((err) => {
  logStderr(`[${SERVER_NAME}] Fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`)
  process.exit(1)
})
