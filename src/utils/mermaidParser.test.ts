import { describe, expect, it } from 'vitest'
import { isEditableDiagram, parseMermaidFlowchart } from './mermaidParser'

describe('isEditableDiagram', () => {
  it('accepts flowchart and graph with supported directions', () => {
    expect(isEditableDiagram('flowchart TD\nA-->B')).toBe(true)
    expect(isEditableDiagram('graph LR\nA-->B')).toBe(true)
    expect(isEditableDiagram('  graph TB\n')).toBe(true)
  })

  it('rejects non-flowchart diagram types', () => {
    expect(isEditableDiagram('sequenceDiagram\nA->>B: hi')).toBe(false)
    expect(isEditableDiagram('pie title T\n"x": 1')).toBe(false)
  })

  it('rejects graph without direction keyword', () => {
    expect(isEditableDiagram('graph\nA-->B')).toBe(false)
  })
})

describe('parseMermaidFlowchart', () => {
  it('returns null for non-flowchart input', () => {
    expect(parseMermaidFlowchart('info')).toBeNull()
  })

  it('parses nodes, edges, and direction', () => {
    const code = `flowchart TD
    A[Start] --> B{Choice}
    B -->|yes| C[Done]
    B -->|no| D[Retry]`
    const parsed = parseMermaidFlowchart(code)
    expect(parsed).not.toBeNull()
    expect(parsed!.type).toBe('flowchart')
    expect(parsed!.direction).toBe('TD')
    expect(parsed!.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'D'].sort())
    expect(parsed!.edges.length).toBeGreaterThanOrEqual(3)
    const ab = parsed!.edges.find((e) => e.source === 'A' && e.target === 'B')
    expect(ab).toBeDefined()
    expect(ab!.type).toBe('arrow')
  })

  it('maps TB and DT to TD/BT respectively', () => {
    const td = parseMermaidFlowchart('graph TB\nA-->B')
    expect(td?.direction).toBe('TD')
    const bt = parseMermaidFlowchart('graph DT\nA-->B')
    expect(bt?.direction).toBe('BT')
  })

  it('parses style fill and stroke onto nodes', () => {
    const code = `flowchart TD
    A[Start] --> B[End]
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#ffcc00`
    const parsed = parseMermaidFlowchart(code)
    expect(parsed).not.toBeNull()
    const a = parsed!.nodes.find((n) => n.id === 'A')
    const b = parsed!.nodes.find((n) => n.id === 'B')
    expect(a?.fill).toBe('#ff99ff')
    expect(a?.stroke).toBe('#333333')
    expect(a?.styleExtra).toBe('stroke-width:2px')
    expect(b?.fill).toBe('#ffcc00')
    expect(b?.stroke).toBeUndefined()
  })
})
