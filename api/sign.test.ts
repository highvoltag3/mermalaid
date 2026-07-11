import { describe, it, expect, afterEach } from 'vitest'
import { gzipSync } from 'node:zlib'
import handler from './sign.js'
import { verifyPreview } from './_lib/previewSigning.js'

afterEach(() => {
  delete process.env.PREVIEW_LINK_SECRET
})

const enc = (src: string) => gzipSync(Buffer.from(src, 'utf8')).toString('base64url')
const post = (body: unknown) =>
  new Request('https://mermalaid.com/api/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('sign handler', () => {
  it('returns 503 when signing is disabled', async () => {
    delete process.env.PREVIEW_LINK_SECRET
    const res = await handler(post({ c: enc('graph TD; A-->B'), t: 'dark' }))
    expect(res.status).toBe(503)
  })

  it('signs a valid diagram, and the signature verifies', async () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    const c = enc('graph TD; A-->B')
    const res = await handler(post({ c, t: 'dark' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { s?: string }
    expect(typeof body.s).toBe('string')
    expect(verifyPreview(c, 'dark', body.s as string)).toBe(true)
  })

  it('rejects an invalid diagram with 400', async () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    const res = await handler(post({ c: '!!not-base64', t: 'dark' }))
    expect(res.status).toBe(400)
  })

  it('answers OPTIONS preflight with permissive CORS', async () => {
    const res = await handler(new Request('https://mermalaid.com/api/sign', { method: 'OPTIONS' }))
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })
})
