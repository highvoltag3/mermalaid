/**
 * Throttle / lockout for agent-bridge pairing attempts.
 *
 * The bridge defaults to loopback (safe), but operators can bind `--host` to a
 * LAN interface. Failed pairing codes are counted per remote address so a
 * network attacker cannot brute-force the code. Loopback still gets a limit
 * (defense in depth) with a slightly higher budget.
 */

export interface PairingThrottleOptions {
  /** Failed attempts before lockout (non-loopback). Default 5. */
  maxAttempts?: number
  /** Failed attempts before lockout on loopback. Default 20. */
  maxAttemptsLoopback?: number
  /** Lockout window after the budget is exhausted. Default 5 minutes. */
  lockoutMs?: number
  /** Sliding window that resets the failure count when idle. Default 15 minutes. */
  windowMs?: number
  now?: () => number
}

export interface PairingThrottleDecision {
  allowed: boolean
  retryAfterMs?: number
}

interface Bucket {
  failures: number
  windowStartedAt: number
  lockedUntil: number
}

function isLoopbackAddress(remoteAddress: string | null | undefined): boolean {
  if (!remoteAddress) return true
  const host = remoteAddress.replace(/^::ffff:/i, '').toLowerCase()
  return host === '127.0.0.1' || host === '::1' || host === 'localhost'
}

export class PairingThrottle {
  private readonly maxAttempts: number
  private readonly maxAttemptsLoopback: number
  private readonly lockoutMs: number
  private readonly windowMs: number
  private readonly now: () => number
  private readonly buckets = new Map<string, Bucket>()

  constructor(options: PairingThrottleOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 5
    this.maxAttemptsLoopback = options.maxAttemptsLoopback ?? 20
    this.lockoutMs = options.lockoutMs ?? 5 * 60_000
    this.windowMs = options.windowMs ?? 15 * 60_000
    this.now = options.now ?? Date.now
  }

  private key(remoteAddress: string | null | undefined): string {
    if (!remoteAddress) return 'unknown'
    return remoteAddress.replace(/^::ffff:/i, '')
  }

  private budget(remoteAddress: string | null | undefined): number {
    return isLoopbackAddress(remoteAddress) ? this.maxAttemptsLoopback : this.maxAttempts
  }

  private bucket(remoteAddress: string | null | undefined): Bucket {
    const key = this.key(remoteAddress)
    const existing = this.buckets.get(key)
    const now = this.now()
    if (!existing) {
      const created: Bucket = { failures: 0, windowStartedAt: now, lockedUntil: 0 }
      this.buckets.set(key, created)
      return created
    }
    if (existing.lockedUntil > 0 && existing.lockedUntil <= now) {
      existing.lockedUntil = 0
      existing.failures = 0
      existing.windowStartedAt = now
    } else if (now - existing.windowStartedAt > this.windowMs && existing.lockedUntil <= now) {
      existing.failures = 0
      existing.windowStartedAt = now
    }
    return existing
  }

  check(remoteAddress: string | null | undefined): PairingThrottleDecision {
    const bucket = this.bucket(remoteAddress)
    const now = this.now()
    if (bucket.lockedUntil > now) {
      return { allowed: false, retryAfterMs: bucket.lockedUntil - now }
    }
    return { allowed: true }
  }

  recordFailure(remoteAddress: string | null | undefined): PairingThrottleDecision {
    const bucket = this.bucket(remoteAddress)
    const now = this.now()
    if (bucket.lockedUntil > now) {
      return { allowed: false, retryAfterMs: bucket.lockedUntil - now }
    }
    bucket.failures += 1
    if (bucket.failures >= this.budget(remoteAddress)) {
      bucket.lockedUntil = now + this.lockoutMs
      bucket.failures = 0
      bucket.windowStartedAt = now
      return { allowed: false, retryAfterMs: this.lockoutMs }
    }
    return { allowed: true }
  }

  recordSuccess(remoteAddress: string | null | undefined): void {
    this.buckets.delete(this.key(remoteAddress))
  }
}

export { isLoopbackAddress }
