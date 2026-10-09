import { describe, expect, it } from 'vitest'
import { contrastRatioHex, ensureReadableLineColor } from './colorContrast'

describe('ensureReadableLineColor', () => {
  it('darkens faint lines on a light background', () => {
    const adjusted = ensureReadableLineColor('#d1d9e0', '#ffffff')
    const before = contrastRatioHex('#d1d9e0', '#ffffff')
    const after = contrastRatioHex(adjusted, '#ffffff')
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(after!).toBeGreaterThan(before!)
    expect(after!).toBeGreaterThanOrEqual(3)
  })

  it('lightens faint lines on a dark background', () => {
    const adjusted = ensureReadableLineColor('#3d444d', '#0d1117')
    const after = contrastRatioHex(adjusted, '#0d1117')
    expect(after).not.toBeNull()
    expect(after!).toBeGreaterThanOrEqual(3)
  })

  it('keeps already-readable lines unchanged', () => {
    expect(ensureReadableLineColor('#24292f', '#ffffff')).toBe('#24292f')
  })
})
