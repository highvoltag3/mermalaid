import { describe, expect, it } from 'vitest'
import { isLoopbackAddress, PairingThrottle } from './pairingThrottle.js'

describe('isLoopbackAddress', () => {
  it('treats missing and loopback forms as local', () => {
    expect(isLoopbackAddress(null)).toBe(true)
    expect(isLoopbackAddress('127.0.0.1')).toBe(true)
    expect(isLoopbackAddress('::1')).toBe(true)
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isLoopbackAddress('10.0.0.5')).toBe(false)
  })
})

describe('PairingThrottle', () => {
  it('locks out a remote address after maxAttempts failures', () => {
    let now = 1_000
    const t = new PairingThrottle({
      maxAttempts: 3,
      maxAttemptsLoopback: 10,
      lockoutMs: 60_000,
      windowMs: 120_000,
      now: () => now,
    })
    const ip = '192.168.1.50'
    expect(t.check(ip).allowed).toBe(true)
    expect(t.recordFailure(ip).allowed).toBe(true)
    expect(t.recordFailure(ip).allowed).toBe(true)
    const locked = t.recordFailure(ip)
    expect(locked.allowed).toBe(false)
    expect(locked.retryAfterMs).toBe(60_000)
    expect(t.check(ip).allowed).toBe(false)

    now += 60_001
    expect(t.check(ip).allowed).toBe(true)
  })

  it('uses a higher budget for loopback', () => {
    const t = new PairingThrottle({ maxAttempts: 2, maxAttemptsLoopback: 4, lockoutMs: 10_000 })
    expect(t.recordFailure('127.0.0.1').allowed).toBe(true)
    expect(t.recordFailure('127.0.0.1').allowed).toBe(true)
    expect(t.recordFailure('127.0.0.1').allowed).toBe(true)
    expect(t.recordFailure('127.0.0.1').allowed).toBe(false)
  })

  it('clears failures on success', () => {
    const t = new PairingThrottle({ maxAttempts: 2, lockoutMs: 10_000 })
    const ip = '10.1.1.1'
    expect(t.recordFailure(ip).allowed).toBe(true)
    t.recordSuccess(ip)
    expect(t.recordFailure(ip).allowed).toBe(true)
    expect(t.check(ip).allowed).toBe(true)
  })
})
