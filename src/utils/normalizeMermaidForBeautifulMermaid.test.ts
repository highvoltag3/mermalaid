import { describe, expect, it } from 'vitest'
import { normalizeMermaidForBeautifulMermaid } from './normalizeMermaidForBeautifulMermaid'

describe('normalizeMermaidForBeautifulMermaid', () => {
  it('leaves non-flowchart diagrams unchanged', () => {
    const pie = `pie title Pets
"Dog": 40
"Cat": 35`
    expect(normalizeMermaidForBeautifulMermaid(pie)).toBe(pie)
  })

  it('converts quoted edge labels to pipe form', () => {
    const before = `graph LR
A -- "Hello" --> B`
    const after = normalizeMermaidForBeautifulMermaid(before)
    expect(after).toContain('-->|Hello|')
    expect(after).not.toContain('-- "Hello" -->')
  })

  it('normalizes thick arrow labels', () => {
    const before = `graph TD
A == "x" ==> B`
    const after = normalizeMermaidForBeautifulMermaid(before)
    expect(after).toContain('==>|x|')
  })

  it('skips comment and subgraph lines', () => {
    const code = `graph TD
%% comment
subgraph S1
A --> B
end`
    const out = normalizeMermaidForBeautifulMermaid(code)
    expect(out).toContain('%% comment')
    expect(out).toContain('subgraph S1')
  })
})
