/**
 * Per-IP rate limiting for the public render endpoints, backed by Vercel's WAF
 * Rate Limiting SDK (@vercel/firewall) — no external datastore.
 *
 * Requires a Firewall rule with this rate-limit ID created in the Vercel
 * dashboard (see slack/README.md). It runs inside the function, so it only
 * counts cache MISSES (actual renders), not cached unfurls.
 *
 * Fails open: off Vercel (local dev), or if the SDK errors / the rule doesn't
 * exist yet, it never blocks legitimate traffic.
 */

/** Shared rate-limit rule ID (Hobby allows a single rule, so both endpoints share it). */
export const PREVIEW_RATE_LIMIT_ID = 'mermalaid-preview'

export async function isRateLimited(
  request: Request,
  id: string = PREVIEW_RATE_LIMIT_ID,
  rateLimitKey?: string,
): Promise<boolean> {
  // The WAF SDK only works on Vercel; skip it everywhere else (local dev, tests).
  if (!process.env.VERCEL) return false

  try {
    const { checkRateLimit } = await import('@vercel/firewall')
    const { rateLimited } = await checkRateLimit(
      id,
      rateLimitKey ? { request, rateLimitKey } : { request },
    )
    return rateLimited
  } catch {
    // Never block real users because the limiter had a problem.
    return false
  }
}
