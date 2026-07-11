import { describe, expect, it } from 'vitest'
import { makeOriginChecker } from './origins.js'

describe('origin checker', () => {
  const allow = makeOriginChecker()

  it('allows production Mermalaid + Tauri origins', () => {
    expect(allow('https://mermalaid.com')).toBe(true)
    expect(allow('https://www.mermalaid.com')).toBe(true)
    expect(allow('tauri://localhost')).toBe(true)
    expect(allow('http://tauri.localhost')).toBe(true)
  })

  it('blocks generic localhost dev origins by default', () => {
    expect(allow('http://localhost:5173')).toBe(false)
    expect(allow('http://127.0.0.1:4173')).toBe(false)
  })

  it('allows dev origins only when allowDevOrigins is set', () => {
    const allowDev = makeOriginChecker({ allowDevOrigins: true })
    expect(allowDev('http://localhost:5173')).toBe(true)
    expect(allowDev('http://127.0.0.1:5173')).toBe(true)
    expect(allowDev('http://localhost:4173')).toBe(true)
  })

  it('allows missing/empty origin (non-browser clients; pairing code still gates)', () => {
    expect(allow(null)).toBe(true)
    expect(allow(undefined)).toBe(true)
    expect(allow('')).toBe(true)
  })

  it('blocks unknown web origins', () => {
    expect(allow('https://evil.example')).toBe(false)
    expect(allow('http://localhost:9999')).toBe(false)
  })

  it('honors extra origins', () => {
    const allowExtra = makeOriginChecker({ extraOrigins: ['https://my.app'] })
    expect(allowExtra('https://my.app')).toBe(true)
    expect(allowExtra('https://evil.example')).toBe(false)
  })
})
