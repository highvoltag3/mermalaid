import { describe, expect, it } from 'vitest'
import {
  formatPairingCode,
  generatePairingCode,
  normalizePairingCode,
  pairingCodesMatch,
} from './pairing.js'

describe('pairing', () => {
  it('generates codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generatePairingCode()
      expect(code).toHaveLength(8)
      expect(code).toMatch(/^[2-9A-HJKMNP-TV-Z]+$/)
      expect(code).not.toMatch(/[01ILOU]/)
    }
  })

  it('respects a custom length', () => {
    expect(generatePairingCode(6)).toHaveLength(6)
  })

  it('formats as XXXX-XXXX', () => {
    expect(formatPairingCode('K7RM9QX2')).toBe('K7RM-9QX2')
    expect(formatPairingCode('ABC')).toBe('ABC')
  })

  it('normalizes case and strips separators', () => {
    expect(normalizePairingCode('k7rm-9qx2')).toBe('K7RM9QX2')
    expect(normalizePairingCode('K7RM 9QX2')).toBe('K7RM9QX2')
  })

  it('matches regardless of formatting', () => {
    expect(pairingCodesMatch('K7RM-9QX2', 'k7rm9qx2')).toBe(true)
    expect(pairingCodesMatch('K7RM9QX2', 'K7RM9QX3')).toBe(false)
  })

  it('rejects empty and length-mismatched codes without throwing', () => {
    expect(pairingCodesMatch('', '')).toBe(false)
    expect(pairingCodesMatch('ABCD', 'ABCDEFGH')).toBe(false)
  })
})
