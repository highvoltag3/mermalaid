import {
  BRIDGE_PORT_FALLBACKS,
  DEFAULT_BRIDGE_HOST,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
} from './protocol.js'

export interface BridgeTimeouts {
  getDiagramMs: number
  setDiagramMs: number
  validateMs: number
  renderSvgMs: number
  renderPngMs: number
}

export interface BridgeConfig {
  host: string
  /** Ports to try in order (first that binds wins). */
  ports: number[]
  extraOrigins: string[]
  /** Allow the generic localhost dev/preview origins (Vite 5173/4173). */
  allowDevOrigins: boolean
  heartbeatIntervalMs: number
  maxPayloadBytes: number
  timeouts: BridgeTimeouts
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function readFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag)
  if (i !== -1 && i + 1 < argv.length) return argv[i + 1]
  const withEq = argv.find((a) => a.startsWith(`${flag}=`))
  return withEq ? withEq.slice(flag.length + 1) : undefined
}

/**
 * Resolve bridge configuration from CLI flags and environment variables.
 * `--port` / MERMALAID_BRIDGE_PORT pins a single port (no fallback scan).
 * `--origins` / MERMALAID_BRIDGE_ORIGINS is a comma-separated origin allowlist extension.
 */
export function loadConfig(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): BridgeConfig {
  const port = parsePositiveInt(readFlag(argv, '--port') ?? env.MERMALAID_BRIDGE_PORT)
  const host = readFlag(argv, '--host') ?? env.MERMALAID_BRIDGE_HOST ?? DEFAULT_BRIDGE_HOST

  const originsRaw = readFlag(argv, '--origins') ?? env.MERMALAID_BRIDGE_ORIGINS ?? ''
  const extraOrigins = originsRaw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0)

  const allowDevOrigins = argv.includes('--dev') || Boolean(env.MERMALAID_BRIDGE_DEV)

  return {
    host,
    ports: port ? [port] : [...BRIDGE_PORT_FALLBACKS],
    extraOrigins,
    allowDevOrigins,
    heartbeatIntervalMs: DEFAULT_HEARTBEAT_INTERVAL_MS,
    maxPayloadBytes: 8 * 1024 * 1024,
    timeouts: {
      getDiagramMs: 3_000,
      setDiagramMs: 8_000,
      validateMs: 5_000,
      renderSvgMs: 15_000,
      renderPngMs: 20_000,
    },
  }
}
