import { describe, it, expect, afterEach } from 'vitest'
import { gzipSync } from 'node:zlib'
import handler from './sign.js'
import { verifyPreview } from './_lib/previewSigning.js'

afterEach(() => {
  delete process.env.PREVIEW_LINK_SECRET
  delete process.env.SIGN_ALLOWED_ORIGINS
  delete process.env.SIGN_ALLOW_DEV_ORIGINS
})

const enc = (src: string) => gzipSync(Buffer.from(src, 'utf8')).toString('base64url')
const post = (body: unknown, origin = 'https://mermalaid.com') =>
  new Request('https://mermalaid.com/api/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  })

describe('sign handler', () => {
  it('exposes the Web Standard fetch export Vercel invokes', async () => {
    expect(typeof handler.fetch).toBe('function')
    const res = await handler.fetch(
      new Request('https://mermalaid.com/api/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    )
    expect(res.status).toBe(403)
  })

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
    expect(res.headers.get('access-control-allow-origin')).toBe('https://mermalaid.com')
    const body = (await res.json()) as { s?: string }
    expect(typeof body.s).toBe('string')
    expect(verifyPreview(c, 'dark', body.s as string)).toBe(true)
  })

  it('rejects an invalid diagram with 400', async () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    const res = await handler(post({ c: '!!not-base64', t: 'dark' }))
    expect(res.status).toBe(400)
  })

  it('rejects disallowed or missing Origin', async () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    const bad = await handler(post({ c: enc('graph TD; A-->B'), t: 'dark' }, 'https://evil.example'))
    expect(bad.status).toBe(403)

    const noOrigin = await handler(
      new Request('https://mermalaid.com/api/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ c: enc('graph TD; A-->B'), t: 'dark' }),
      }),
    )
    expect(noOrigin.status).toBe(403)
  })

  it('allows same-origin signing for self-hosted deployments', async () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    const c = enc('graph TD; A-->B')
    const res = await handler(
      new Request('https://my-fork.vercel.app/api/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://my-fork.vercel.app',
        },
        body: JSON.stringify({ c, t: 'dark' }),
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://my-fork.vercel.app')
  })

  it('answers OPTIONS preflight only for allowlisted origins', async () => {
    const ok = await handler(
      new Request('https://mermalaid.com/api/sign', {
        method: 'OPTIONS',
        headers: { Origin: 'tauri://localhost' },
      }),
    )
    expect(ok.status).toBe(204)
    expect(ok.headers.get('access-control-allow-origin')).toBe('tauri://localhost')
    expect(ok.headers.get('access-control-allow-origin')).not.toBe('*')

    const bad = await handler(
      new Request('https://mermalaid.com/api/sign', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example' },
      }),
    )
    expect(bad.status).toBe(403)
  })
})
