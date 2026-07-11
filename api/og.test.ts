import { describe, it, expect, afterEach } from 'vitest'
import { gzipSync } from 'node:zlib'
import handler from './og.js'

afterEach(() => {
  delete process.env.PREVIEW_LINK_SECRET
})

const enc = (src: string) => gzipSync(Buffer.from(src, 'utf8')).toString('base64url')
const req = (path: string) => new Request(`https://mermalaid.com${path}`)

describe('og handler — signature enforcement (reject paths, no render)', () => {
  it('missing c falls back to the logo', async () => {
    const res = await handler(req('/api/og'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('og-image.png')
  })

  it('with signing enabled, a valid c but no signature falls back (does not render)', async () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    const res = await handler(req(`/api/og?c=${enc('graph TD; A-->B')}&t=dark`))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('og-image.png')
  })

  it('with signing enabled, a bad signature falls back', async () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    const res = await handler(req(`/api/og?c=${enc('graph TD; A-->B')}&t=dark&s=deadbeef`))
    expect(res.status).toBe(302)
  })
})
