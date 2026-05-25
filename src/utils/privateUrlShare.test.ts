import { describe, expect, it } from 'vitest'
import {
  applyPrivateShareFullUrlToHistory,
  assertPrivateShareUrlFits,
  buildPrivateShareUrl,
  decodePrivateShareHash,
  encodePrivateShareHash,
  getPrivateShareErrorMessage,
  isPrivateShareHash,
  PrivateShareError,
  PRIVATE_SHARE_BROWSER_MAX_URL_LENGTH,
  PRIVATE_SHARE_MESSAGING_SAFE_MAX_URL_LENGTH,
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

  it('when Web Crypto is missing on an insecure origin, error mentions localhost/LAN', async () => {
    const origCrypto = globalThis.crypto
    const secureDesc = Object.getOwnPropertyDescriptor(window, 'isSecureContext')
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          getRandomValues: origCrypto.getRandomValues.bind(origCrypto),
          subtle: undefined,
        },
        configurable: true,
      })
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        configurable: true,
        writable: true,
      })
      await expect(encodePrivateShareHash({ code: 'x' })).rejects.toThrow(/localhost|192\.168/i)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: origCrypto, configurable: true })
      if (secureDesc) {
        Object.defineProperty(window, 'isSecureContext', secureDesc)
      } else {
        delete (window as { isSecureContext?: boolean }).isSecureContext
      }
    }
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

  it('assertPrivateShareUrlFits rejects URLs too long for Slack-style chat limits', () => {
    const long = 'x'.repeat(PRIVATE_SHARE_MESSAGING_SAFE_MAX_URL_LENGTH + 1)
    expect(() => assertPrivateShareUrlFits(long)).toThrow(PrivateShareError)
    try {
      assertPrivateShareUrlFits(long)
    } catch (e) {
      expect(e).toBeInstanceOf(PrivateShareError)
      expect((e as PrivateShareError).kind).toBe('oversized')
      expect(getPrivateShareErrorMessage(e)).toMatch(/Slack|chat apps/i)
    }
  })

  it('assertPrivateShareUrlFits rejects extremely long URLs for browser safety', () => {
    const long = 'x'.repeat(PRIVATE_SHARE_BROWSER_MAX_URL_LENGTH + 1)
    expect(() => assertPrivateShareUrlFits(long)).toThrow(PrivateShareError)
    try {
      assertPrivateShareUrlFits(long)
    } catch (e) {
      expect(e).toBeInstanceOf(PrivateShareError)
      expect((e as PrivateShareError).kind).toBe('oversized')
      expect(getPrivateShareErrorMessage(e)).toMatch(/browser/i)
    }
  })

  it('assertPrivateShareUrlFits at browser max length uses browser message, not chat-app message', () => {
    const atBrowserMax = 'x'.repeat(PRIVATE_SHARE_BROWSER_MAX_URL_LENGTH)
    expect(() => assertPrivateShareUrlFits(atBrowserMax)).toThrow(PrivateShareError)
    try {
      assertPrivateShareUrlFits(atBrowserMax)
    } catch (e) {
      expect(getPrivateShareErrorMessage(e)).toMatch(/browser/i)
      expect(getPrivateShareErrorMessage(e)).not.toMatch(/Slack|chat apps/i)
    }
  })

  it('applyPrivateShareFullUrlToHistory updates path and hash', () => {
    const prev = `${window.location.pathname}${window.location.search}${window.location.hash}`
    try {
      history.replaceState(null, '', '/editor')
      applyPrivateShareFullUrlToHistory('http://localhost:5173/editor?x=1#v1.abc')
      expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(
        '/editor?x=1#v1.abc',
      )
    } finally {
      history.replaceState(null, '', prev || '/')
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
