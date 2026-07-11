import { describe, it, expect, afterEach } from 'vitest'
import { signPreview, verifyPreview, isSigningEnabled } from './previewSigning.js'

afterEach(() => {
  delete process.env.PREVIEW_LINK_SECRET
})

describe('previewSigning', () => {
  it('disabled: sign returns null and verify accepts anything', () => {
    delete process.env.PREVIEW_LINK_SECRET
    expect(isSigningEnabled()).toBe(false)
    expect(signPreview('abc', 'default')).toBeNull()
    expect(verifyPreview('abc', 'default', null)).toBe(true)
    expect(verifyPreview('abc', 'default', 'anything')).toBe(true)
  })

  it('enabled: signs and verifies a round trip', () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    expect(isSigningEnabled()).toBe(true)
    const s = signPreview('abc', 'dark')
    expect(s).toBeTruthy()
    expect(verifyPreview('abc', 'dark', s)).toBe(true)
  })

  it('enabled: rejects missing, malformed, wrong-c and wrong-theme signatures', () => {
    process.env.PREVIEW_LINK_SECRET = 'test-secret'
    const s = signPreview('abc', 'dark') as string
    expect(verifyPreview('abc', 'dark', null)).toBe(false)
    expect(verifyPreview('abc', 'dark', 'not a sig!!')).toBe(false)
    expect(verifyPreview('abcd', 'dark', s)).toBe(false)
    expect(verifyPreview('abc', 'default', s)).toBe(false)
  })

  it('enabled: rejects a signature made with a different secret', () => {
    process.env.PREVIEW_LINK_SECRET = 'secret-a'
    const s = signPreview('abc', 'dark') as string
    process.env.PREVIEW_LINK_SECRET = 'secret-b'
    expect(verifyPreview('abc', 'dark', s)).toBe(false)
  })
})
