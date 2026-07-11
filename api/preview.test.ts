import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { gzipSync } from 'node:zlib'
import handler from './preview.js'

const enc = (src: string) => gzipSync(Buffer.from(src, 'utf8')).toString('base64url')
const req = (path: string) => new Request(`https://mermalaid.com${path}`)

// Default to signing disabled; individual tests opt in.
beforeEach(() => {
  delete process.env.PREVIEW_LINK_SECRET
})
afterEach(() => {
  delete process.env.PREVIEW_LINK_SECRET
})

describe('preview handler', () => {
  it('returns HTML with og:image pointing at /api/og for a valid c', async () => {
    const res = await handler(req(`/api/preview?c=${enc('graph TD; A-->B')}&t=dark`))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('property="og:image"')
    expect(html).toContain('/api/og?c=')
    // Ampersand escaped inside the HTML attribute.
    expect(html).toContain('&amp;t=dark')
    expect(html).toContain('/editor?c=')
    expect(html).toContain('twitter:card')
    // Title derived from the diagram keyword.
    expect(html).toContain('Mermaid flowchart')
  })

  it('redirects to /editor when c is missing', async () => {
    const res = await handler(req('/api/preview'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/editor')
  })

  it('redirects to /editor when c is invalid', async () => {
    const res = await handler(req('/api/preview?c=%21%21not-valid'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/editor')
  })

  it('with signing enabled, redirects to /editor when the signature is missing', async () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    const res = await handler(req(`/api/preview?c=${enc('graph TD; A-->B')}&t=dark`))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/editor')
  })
})
