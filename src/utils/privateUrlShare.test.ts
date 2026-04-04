import { describe, expect, it } from 'vitest'
import {
  assertPrivateShareUrlFits,
  buildPrivateShareUrl,
  decodePrivateShareHash,
  encodePrivateShareHash,
  getPrivateShareErrorMessage,
  isPrivateShareHash,
  PrivateShareError,
  PRIVATE_SHARE_MAX_URL_LENGTH,
  PRIVATE_SHARE_URL_PREFIX,
} from './privateUrlShare'

describe('privateUrlShare', () => {
  it('roundtrips editor state through encode/decode', async () => {
    const state = { code: 'graph TD\n  A --> B' }
    const hash = await encodePrivateShareHash(state)
    expect(hash.startsWith(PRIVATE_SHARE_URL_PREFIX)).toBe(true)
    const decoded = await decodePrivateShareHash(hash)
    expect(decoded).toEqual(state)
  })

  it('roundtrips larger payload', async () => {
    const state = { code: 'flowchart LR\n' + '  n'.repeat(2000) }
    const hash = await encodePrivateShareHash(state)
    const decoded = await decodePrivateShareHash(hash)
    expect(decoded).toEqual(state)
  })

  it('detects supported hash prefix', () => {
    expect(isPrivateShareHash('#v1.abc')).toBe(true)
    expect(isPrivateShareHash('#v2.abc')).toBe(false)
    expect(isPrivateShareHash('')).toBe(false)
  })

  it('rejects invalid base64 payload', async () => {
    await expect(decodePrivateShareHash('#v1!!!')).rejects.toBeInstanceOf(PrivateShareError)
  })

  it('rejects truncated packet', async () => {
    const short = `${PRIVATE_SHARE_URL_PREFIX}a`
    await expect(decodePrivateShareHash(short)).rejects.toBeInstanceOf(PrivateShareError)
  })

  it('rejects tampered ciphertext', async () => {
    const hash = await encodePrivateShareHash({ code: 'graph TD\n  A --> B' })
    const payload = hash.slice(PRIVATE_SHARE_URL_PREFIX.length)
    const flipAt = PRIVATE_SHARE_URL_PREFIX.length + Math.min(8, payload.length - 1)
    const ch = hash[flipAt] ?? 'A'
    const flipped = ch === 'A' ? 'B' : 'A'
    const broken = `${hash.slice(0, flipAt)}${flipped}${hash.slice(flipAt + 1)}`
    await expect(decodePrivateShareHash(broken)).rejects.toBeInstanceOf(PrivateShareError)
  })

  it('assertPrivateShareUrlFits throws oversized with friendly message', () => {
    const long = 'x'.repeat(PRIVATE_SHARE_MAX_URL_LENGTH + 1)
    expect(() => assertPrivateShareUrlFits(long)).toThrow(PrivateShareError)
    try {
      assertPrivateShareUrlFits(long)
    } catch (e) {
      expect(e).toBeInstanceOf(PrivateShareError)
      expect((e as PrivateShareError).kind).toBe('oversized')
      expect(getPrivateShareErrorMessage(e)).toMatch(/too large/i)
    }
  })

  it('buildPrivateShareUrl sets hash on current location', () => {
    const prev = `${window.location.pathname}${window.location.search}`
    try {
      history.replaceState(null, '', '/app/editor?q=1')
      const url = buildPrivateShareUrl('#v1.abc')
      expect(url.endsWith('/app/editor?q=1#v1.abc')).toBe(true)
    } finally {
      history.replaceState(null, '', prev || '/')
    }
  })
})
