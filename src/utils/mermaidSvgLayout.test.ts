import { describe, it, expect } from 'vitest'
import { renderOfficialMermaidPreview } from './officialMermaidPreview'
import {
  extractNodeLayoutsFromMermaidSvg,
  parseMermaidNodeIdFromSvgId,
} from './mermaidSvgLayout'

describe('mermaidSvgLayout', () => {
  it('parses mermaid node ids from svg element ids', () => {
    expect(parseMermaidNodeIdFromSvgId('flowchart-A-0')).toBe('A')
    expect(parseMermaidNodeIdFromSvgId('flowchart-my_node-12')).toBe('my_node')
    expect(parseMermaidNodeIdFromSvgId('other')).toBeNull()
  })

  it(
    'extracts node positions and sizes from an official Mermaid SVG',
    { timeout: 20_000 },
    async () => {
      const svg = await renderOfficialMermaidPreview(
        'flowchart TD\n    A[Start] --> B{Decision}\n    B --> C[End]',
        false,
        { bg: '#ffffff', fg: '#333333', line: '#999999' },
      )

      const layouts = extractNodeLayoutsFromMermaidSvg(svg, ['A', 'B', 'C'])
      expect(layouts.size).toBe(3)
      expect(layouts.get('A')).toMatchObject({
        width: expect.any(Number),
        height: expect.any(Number),
      })
      expect(layouts.get('A')!.width).toBeGreaterThan(0)
      expect(layouts.get('B')!.y).toBeGreaterThan(layouts.get('A')!.y)
    },
  )
})
