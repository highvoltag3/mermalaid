/**
 * README § "Mermaid Diagram Types Supported" — ensure starters are recognized after YAML strip.
 */
import { describe, expect, it } from 'vitest'
import { isEditableDiagram } from './mermaidParser'
import { parseMermaidWithConfig } from './mermaidYamlConfig'

/** First non-empty, non-%% line of diagram body (after optional Mermaid YAML header). */
function firstDiagramLine(diagramSource: string): string {
  const { code } = parseMermaidWithConfig(diagramSource.trim())
  const line =
    code
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith('%%')) ?? ''
  return line
}

describe('README diagram type keywords', () => {
  const cases: Array<{ name: string; sample: string; head: string | RegExp }> = [
    { name: 'flowchart', sample: 'flowchart TD\n  A --> B', head: /^flowchart\s+TD/i },
    { name: 'graph', sample: 'graph LR\n  A --> B', head: /^graph\s+LR/i },
    { name: 'sequenceDiagram', sample: 'sequenceDiagram\n  A->>B: hi', head: /^sequenceDiagram$/i },
    { name: 'classDiagram', sample: 'classDiagram\n  class A', head: /^classDiagram$/i },
    { name: 'classDiagram-v2', sample: 'classDiagram-v2\n  class A', head: /^classDiagram-v2$/i },
    { name: 'stateDiagram-v2', sample: 'stateDiagram-v2\n  [*] --> A', head: /^stateDiagram-v2$/i },
    { name: 'stateDiagram', sample: 'stateDiagram\n  [*] --> A', head: /^stateDiagram$/i },
    { name: 'erDiagram', sample: 'erDiagram\n  ENTITY ||--o{ OTHER : rel', head: /^erDiagram$/i },
    { name: 'journey', sample: 'journey\n  title My journey', head: /^journey$/i },
    { name: 'gantt', sample: 'gantt\n  title A', head: /^gantt$/i },
    { name: 'pie', sample: 'pie title Data\n  "a": 1', head: /^pie\s+title/i },
    { name: 'gitGraph', sample: 'gitGraph\n  commit', head: /^gitGraph$/i },
  ]

  it.each(cases)('$name: first line matches expected header', ({ sample, head }) => {
    const line = firstDiagramLine(sample)
    expect(line).toMatch(head)
  })

  it('flowchart/graph inside YAML-wrapped block still detected', () => {
    const wrapped = `---
config:
  theme: dark
---

graph TD
  A-->B`
    expect(firstDiagramLine(wrapped)).toMatch(/^graph\s+TD/i)
  })

  it('visual editor eligibility matches README (flowcharts only)', () => {
    expect(isEditableDiagram('flowchart TD\nA-->B')).toBe(true)
    expect(isEditableDiagram('sequenceDiagram\nA->>B:x')).toBe(false)
    expect(isEditableDiagram('classDiagram\nclass X')).toBe(false)
  })
})
