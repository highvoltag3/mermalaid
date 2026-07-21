// Origin allowlist for the localhost WebSocket bridge.
//
// Browsers always send a truthful `Origin` header on a WebSocket handshake and page
// scripts cannot forge it, so this list blocks any web page not served from a known
// Mermalaid origin from driving the socket — defense-in-depth on top of the pairing code.
const PRODUCTION_ORIGINS = [
  'https://mermalaid.com',
  'https://www.mermalaid.com',
  // Tauri desktop webview (macOS/Linux use tauri://localhost; Windows uses http://tauri.localhost)
  'tauri://localhost',
  'http://tauri.localhost',
]

// Generic Vite dev/preview ports. Off by default (a malicious page on localhost:5173 would
// otherwise pass the Origin layer); opt in with MERMALAID_BRIDGE_DEV when developing Mermalaid.
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

export interface OriginCheckerOptions {
  extraOrigins?: string[]
  allowDevOrigins?: boolean
}

export function makeOriginChecker(
  options: OriginCheckerOptions = {},
): (origin: string | null | undefined) => boolean {
  const allowed = new Set([
    ...PRODUCTION_ORIGINS,
    ...(options.allowDevOrigins ? DEV_ORIGINS : []),
    ...(options.extraOrigins ?? []),
  ])
  return (origin) => {
    // Non-browser MCP tooling and some webviews omit Origin entirely. Allow the empty case —
    // the pairing code still gates binding, and these clients are already local (loopback bind).
    if (!origin) return true
    return allowed.has(origin)
  }
}

export { PRODUCTION_ORIGINS, DEV_ORIGINS }
