/**
 * HMAC signing for public preview links.
 *
 * When PREVIEW_LINK_SECRET is set, /api/og and /api/preview only accept `c`
 * values this server signed (via /api/sign), so the render endpoint can't be
 * hotlinked / embedded / tampered with as a free rendering API. When the secret
 * is unset, signing is disabled and links work unsigned (previous behavior).
 *
 * The signature binds the compressed diagram `c` and the (normalized) theme.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Whether signing is enabled for this deployment. */
export function isSigningEnabled(): boolean {
  return Boolean(process.env.PREVIEW_LINK_SECRET)
}

function computeSignature(c: string, theme: string, key: string): string {
  return createHmac('sha256', key).update(`${c}.${theme}`).digest('base64url')
}

/** Sign (c, theme). Returns null when signing is disabled. */
export function signPreview(c: string, theme: string): string | null {
  const key = process.env.PREVIEW_LINK_SECRET
  if (!key) return null
  return computeSignature(c, theme, key)
}

/**
 * Verify a preview signature.
 * - Signing disabled → always true (accept unsigned links).
 * - Signing enabled → require a matching, constant-time-compared signature.
 */
export function verifyPreview(c: string, theme: string, signature: string | null): boolean {
  const key = process.env.PREVIEW_LINK_SECRET
  if (!key) return true
  if (!signature || !/^[A-Za-z0-9_-]+$/.test(signature)) return false

  const expected = Buffer.from(computeSignature(c, theme, key), 'utf8')
  const actual = Buffer.from(signature, 'utf8')
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
