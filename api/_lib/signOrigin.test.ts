import { afterEach, describe, expect, it } from 'vitest'
import {
  corsHeadersForSignOrigin,
  getAllowedSignOrigins,
  isAllowedSignOrigin,
} from './signOrigin.js'

afterEach(() => {
  delete process.env.SIGN_ALLOWED_ORIGINS
  delete process.env.SIGN_ALLOW_DEV_ORIGINS
})

describe('signOrigin', () => {
  it('allows production web and Tauri origins', () => {
    expect(isAllowedSignOrigin('https://mermalaid.com')).toBe(true)
    expect(isAllowedSignOrigin('https://www.mermalaid.com')).toBe(true)
    expect(isAllowedSignOrigin('tauri://localhost')).toBe(true)
    expect(isAllowedSignOrigin('http://tauri.localhost')).toBe(true)
  })

  it('rejects missing, empty, and unknown origins', () => {
    expect(isAllowedSignOrigin(null)).toBe(false)
    expect(isAllowedSignOrigin('')).toBe(false)
    expect(isAllowedSignOrigin('https://evil.example')).toBe(false)
    expect(isAllowedSignOrigin('http://localhost:5173')).toBe(false)
  })

  it('allows same-origin requests for self-hosted deployments', () => {
    expect(
      isAllowedSignOrigin(
        'https://my-fork.vercel.app',
        process.env,
        'https://my-fork.vercel.app/api/sign',
      ),
    ).toBe(true)
    expect(
      isAllowedSignOrigin(
        'https://evil.example',
        process.env,
        'https://my-fork.vercel.app/api/sign',
      ),
    ).toBe(false)
  })

  it('honors SIGN_ALLOW_DEV_ORIGINS and SIGN_ALLOWED_ORIGINS', () => {
    process.env.SIGN_ALLOW_DEV_ORIGINS = '1'
    expect(isAllowedSignOrigin('http://127.0.0.1:5173')).toBe(true)
    process.env.SIGN_ALLOWED_ORIGINS = 'https://preview.example, https://fork.example'
    const allowed = getAllowedSignOrigins()
    expect(allowed.has('https://preview.example')).toBe(true)
    expect(allowed.has('https://fork.example')).toBe(true)
  })

  it('builds CORS headers only for allowlisted origins', () => {
    expect(corsHeadersForSignOrigin('https://evil.example')).toBeNull()
    expect(corsHeadersForSignOrigin(null)).toBeNull()
    const headers = corsHeadersForSignOrigin('https://mermalaid.com')
    expect(headers).toMatchObject({
      'Access-Control-Allow-Origin': 'https://mermalaid.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    })
  })
})
