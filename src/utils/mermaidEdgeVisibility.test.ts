import { describe, expect, it } from 'vitest'
import { boostMermaidEdgeStrokes } from './mermaidEdgeVisibility'

describe('boostMermaidEdgeStrokes', () => {
  it('still processes SVG when HTML labels contain raw <br>', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<g class="edgePaths"><path class="edge-path" stroke-width="1" d="M0 0"/></g>' +
      '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">a<br>b</div></foreignObject>' +
      '</svg>'
    const out = boostMermaidEdgeStrokes(input)
    expect(out).toContain('stroke-width="2"')
    expect(out).not.toContain('parsererror')
  })

  it('bumps thin edge path stroke-width to at least 2', () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><g class="edgePath"><path stroke-width="1.3" d="M0 0 L10 10"/></g></svg>`
    const out = boostMermaidEdgeStrokes(input)
    expect(out).toContain('stroke-width="2"')
  })

  it('leaves already-thick strokes alone', () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><g class="edgePath"><path stroke-width="3.5" d="M0 0 L10 10"/></g></svg>`
    const out = boostMermaidEdgeStrokes(input)
    expect(out).toContain('stroke-width="3.5"')
  })

  it('returns non-svg markup unchanged', () => {
    expect(boostMermaidEdgeStrokes('not svg')).toBe('not svg')
  })
})
