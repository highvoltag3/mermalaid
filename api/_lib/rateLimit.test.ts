import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { checkRateLimitMock } = vi.hoisted(() => ({ checkRateLimitMock: vi.fn() }))
vi.mock('@vercel/firewall', () => ({ checkRateLimit: checkRateLimitMock }))

import { isRateLimited } from './rateLimit.js'

const OLD_VERCEL = process.env.VERCEL

beforeEach(() => {
  checkRateLimitMock.mockReset()
})
afterEach(() => {
  if (OLD_VERCEL === undefined) delete process.env.VERCEL
  else process.env.VERCEL = OLD_VERCEL
})

const req = () => new Request('https://mermalaid.com/api/og?c=x')

describe('isRateLimited', () => {
  it('no-ops (returns false) off Vercel and never calls the SDK', async () => {
    delete process.env.VERCEL
    expect(await isRateLimited(req())).toBe(false)
    expect(checkRateLimitMock).not.toHaveBeenCalled()
  })

  it('returns true when the SDK reports the request is rate limited', async () => {
    process.env.VERCEL = '1'
    checkRateLimitMock.mockResolvedValue({ rateLimited: true })
    expect(await isRateLimited(req())).toBe(true)
  })

  it('returns false when the SDK reports not limited', async () => {
    process.env.VERCEL = '1'
    checkRateLimitMock.mockResolvedValue({ rateLimited: false })
    expect(await isRateLimited(req())).toBe(false)
  })

  it('fails open (returns false) when the SDK throws', async () => {
    process.env.VERCEL = '1'
    checkRateLimitMock.mockRejectedValue(new Error('boom'))
    expect(await isRateLimited(req())).toBe(false)
  })
})
