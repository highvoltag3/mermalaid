/**
 * Slack request signature verification.
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * Slack signs each request with an HMAC-SHA256 over `v0:{timestamp}:{rawBody}`
 * using the app's signing secret. We compare in constant time and reject stale
 * timestamps to blunt replay attacks.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Reject requests whose timestamp is more than 5 minutes from now. */
const MAX_SKEW_SECONDS = 60 * 5

export interface VerifySlackParams {
  signingSecret: string
  rawBody: string
  timestamp: string | null
  signature: string | null
  /** Override the clock (seconds since epoch) — used in tests. */
  nowSeconds?: number
}

export function verifySlackSignature(params: VerifySlackParams): boolean {
  const { signingSecret, rawBody, timestamp, signature } = params
  if (!signingSecret || !timestamp || !signature) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return false

  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > MAX_SKEW_SECONDS) return false

  const base = `v0:${timestamp}:${rawBody}`
  const digest = createHmac('sha256', signingSecret).update(base).digest('hex')
  const expected = `v0=${digest}`

  // Constant-time comparison; bail early on length mismatch (timingSafeEqual throws otherwise).
  const expectedBuf = Buffer.from(expected, 'utf8')
  const actualBuf = Buffer.from(signature, 'utf8')
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}
