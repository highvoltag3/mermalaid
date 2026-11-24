/**
 * Origin allowlist for POST /api/sign.
 *
 * Preview signing is meant for the Mermalaid editor (hosted web + Tauri desktop
 * calling the public origin). Browsers send a truthful Origin on cross-origin
 * fetch, so this blocks arbitrary sites from minting signatures. Non-browser
 * callers with no Origin are rejected (use the web/desktop editor instead).
 *
 * Extend via SIGN_ALLOWED_ORIGINS (comma-separated) for forks / preview deploys.
 * Set SIGN_ALLOW_DEV_ORIGINS=1 to also accept Vite localhost origins.
 */

const PRODUCTION_ORIGINS = [
  'https://mermalaid.com',
  'https://www.mermalaid.com',
  // Tauri 2 webviews (macOS/Linux vs Windows)
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
] as const

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
] as const

function parseExtraOrigins(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function getAllowedSignOrigins(
  env: NodeJS.ProcessEnv = process.env,
): Set<string> {
  const allowDev = env.SIGN_ALLOW_DEV_ORIGINS === '1' || env.SIGN_ALLOW_DEV_ORIGINS === 'true'
  return new Set<string>([
    ...PRODUCTION_ORIGINS,
    ...(allowDev ? DEV_ORIGINS : []),
    ...parseExtraOrigins(env.SIGN_ALLOWED_ORIGINS),
  ])
}

/**
 * True when Origin is present and either on the allowlist, or same-origin with
 * the request URL (so self-hosted forks / Vercel previews can sign locally).
 */
export function isAllowedSignOrigin(
  origin: string | null,
  env: NodeJS.ProcessEnv = process.env,
  requestUrl?: string | URL | null,
): boolean {
  if (!origin) return false
  if (getAllowedSignOrigins(env).has(origin)) return true
  if (!requestUrl) return false
  try {
    return new URL(requestUrl).origin === origin
  } catch {
    return false
  }
}

/**
 * CORS headers for an allowed Origin. Returns null when the request Origin is
 * missing or not allowlisted (caller should omit ACAO / reject the request).
 */
export function corsHeadersForSignOrigin(
  origin: string | null,
  env: NodeJS.ProcessEnv = process.env,
  requestUrl?: string | URL | null,
): Record<string, string> | null {
  if (!isAllowedSignOrigin(origin, env, requestUrl)) return null
  return {
    'Access-Control-Allow-Origin': origin as string,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export { PRODUCTION_ORIGINS, DEV_ORIGINS }
