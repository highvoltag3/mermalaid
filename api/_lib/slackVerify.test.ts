import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifySlackSignature } from './slackVerify.js'

const SECRET = 'test-signing-secret'

function sign(body: string, timestamp: number): string {
  const digest = createHmac('sha256', SECRET).update(`v0:${timestamp}:${body}`).digest('hex')
  return `v0=${digest}`
}

describe('verifySlackSignature', () => {
  const body = 'token=abc&command=%2Fmermalaid&text=graph'
  const now = 1_700_000_000

  it('accepts a correctly-signed, fresh request', () => {
    expect(
      verifySlackSignature({
        signingSecret: SECRET,
        rawBody: body,
        timestamp: String(now),
        signature: sign(body, now),
        nowSeconds: now,
      }),
    ).toBe(true)
  })

  it('rejects a tampered body', () => {
    expect(
      verifySlackSignature({
        signingSecret: SECRET,
        rawBody: body + '&evil=1',
        timestamp: String(now),
        signature: sign(body, now),
        nowSeconds: now,
      }),
    ).toBe(false)
  })

  it('rejects a wrong signing secret', () => {
    const digest = createHmac('sha256', 'other-secret').update(`v0:${now}:${body}`).digest('hex')
    expect(
      verifySlackSignature({
        signingSecret: SECRET,
        rawBody: body,
        timestamp: String(now),
        signature: `v0=${digest}`,
        nowSeconds: now,
      }),
    ).toBe(false)
  })

  it('rejects a stale timestamp (replay window)', () => {
    const staleTs = now - 60 * 10 // 10 minutes old
    expect(
      verifySlackSignature({
        signingSecret: SECRET,
        rawBody: body,
        timestamp: String(staleTs),
        signature: sign(body, staleTs),
        nowSeconds: now,
      }),
    ).toBe(false)
  })

  it('rejects missing signature or timestamp', () => {
    expect(
      verifySlackSignature({ signingSecret: SECRET, rawBody: body, timestamp: null, signature: sign(body, now), nowSeconds: now }),
    ).toBe(false)
    expect(
      verifySlackSignature({ signingSecret: SECRET, rawBody: body, timestamp: String(now), signature: null, nowSeconds: now }),
    ).toBe(false)
  })

  it('rejects a non-numeric timestamp without throwing', () => {
    expect(
      verifySlackSignature({ signingSecret: SECRET, rawBody: body, timestamp: 'nope', signature: sign(body, now), nowSeconds: now }),
    ).toBe(false)
  })
})
