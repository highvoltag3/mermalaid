import { describe, expect, it } from 'vitest'
import { generateMermaidCode, parsedDiagramToCode } from './mermaidGenerator'
import { parseMermaidFlowchart } from './mermaidParser'

describe('generateMermaidCode', () => {
  it('emits style directives for node fill and stroke', () => {
    const code = generateMermaidCode(
      [
        {
          id: 'A',
          position: { x: 0, y: 0 },
          data: { label: 'Start', shape: 'rect', fill: '#ffcc00', stroke: '#333333' },
        },
        {
          id: 'B',
          position: { x: 0, y: 0 },
          data: { label: 'End', shape: 'rect' },
        },
      ],
      [
        {
          id: 'A-B',
          source: 'A',
          target: 'B',
          data: { type: 'arrow' },
        },
      ],
      'TD',
      'flowchart',
    )

    expect(code).toContain('A[Start]')
    expect(code).toContain('style A fill:#ffcc00,stroke:#333333')
    expect(code).not.toContain('style B')
  })
})

describe('style round-trip', () => {
  it('preserves fill and stroke through parse → generate', () => {
    const original = `flowchart TD

    A[Start]
    B[End]

    A --> B

    style A fill:#ffcc00,stroke:#333333`

    const parsed = parseMermaidFlowchart(original)
    expect(parsed).not.toBeNull()
    const regenerated = parsedDiagramToCode(parsed!)
    const reparsed = parseMermaidFlowchart(regenerated)
    expect(reparsed?.nodes.find((n) => n.id === 'A')).toMatchObject({
      fill: '#ffcc00',
      stroke: '#333333',
    })
  })
})
