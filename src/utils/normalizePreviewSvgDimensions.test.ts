import { describe, expect, it } from 'vitest'
import { normalizePreviewSvgDimensions } from './normalizePreviewSvgDimensions'

describe('normalizePreviewSvgDimensions', () => {
  it('sets pixel width/height from viewBox on well-formed SVG', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="100%" height="100%"><rect width="10" height="10"/></svg>'
    const out = normalizePreviewSvgDimensions(input)
    expect(out).toContain('width="200"')
    expect(out).toContain('height="100"')
    expect(out).toContain('width: 200px')
    expect(out).toContain('height: 100px')
  })

  it('recovers when Mermaid HTML labels include unclosed <br>', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="100%" height="100%">' +
      '<g><foreignObject width="80" height="40"><div xmlns="http://www.w3.org/1999/xhtml">' +
      '<span><b>Bold</b><br>line2</span></div></foreignObject></g></svg>'

    const asXml = new DOMParser().parseFromString(input, 'image/svg+xml')
    expect(asXml.querySelector('parsererror')).not.toBeNull()

    const out = normalizePreviewSvgDimensions(input)
    expect(out.toLowerCase()).toContain('<svg')
    expect(out).toContain('width="320"')
    expect(out).toContain('height="180"')
    expect(out).toMatch(/width:\s*320px/)
    expect(out).toMatch(/height:\s*180px/)
    expect(out).not.toContain('parsererror')
  })

  it('returns original markup when there is no usable svg root', () => {
    expect(normalizePreviewSvgDimensions('not svg')).toBe('not svg')
  })
})
