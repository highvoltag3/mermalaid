import { describe, it, expect } from 'vitest'
import {
  layoutForMermaidNode,
  normalizeLayoutForShape,
  resolveNodeDisplaySize,
} from './visualEditorNodeDimensions'

describe('visualEditorNodeDimensions', () => {
  it('expands small diamond SVG bbox to minimum render size', () => {
    const result = normalizeLayoutForShape(
      'diamond',
      { x: 100, y: 50, width: 30, height: 30 },
      'Decision',
    )

    expect(result.width).toBeGreaterThanOrEqual(120)
    expect(result.height).toBeGreaterThanOrEqual(70)
    expect(result.x).toBe(100 - (result.width - 30) / 2)
    expect(result.y).toBe(50 - (result.height - 30) / 2)
  })

  it('keeps large layouts unchanged', () => {
    const layout = { x: 10, y: 20, width: 200, height: 100 }
    expect(normalizeLayoutForShape('diamond', layout, 'OK')).toEqual(layout)
  })

  it('widens diamond for long labels', () => {
    const result = normalizeLayoutForShape(
      'diamond',
      { x: 0, y: 0, width: 120, height: 70 },
      'Very long decision label',
    )
    expect(result.width).toBeGreaterThan(120)
    expect(result.height).toBe(70)
  })

  it('resolveNodeDisplaySize returns null without dimensions', () => {
    expect(resolveNodeDisplaySize('diamond', undefined, 30, 'Decision')).toBeNull()
  })

  it('layoutForMermaidNode uses node shape and label', () => {
    const result = layoutForMermaidNode(
      { id: 'B', shape: 'diamond', label: 'Decision' },
      { x: 80, y: 40, width: 28, height: 28 },
    )
    expect(result.width).toBeGreaterThanOrEqual(120)
    expect(result.height).toBeGreaterThanOrEqual(70)
  })
})
