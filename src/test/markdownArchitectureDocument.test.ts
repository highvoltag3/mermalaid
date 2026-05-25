/**
 * Regression tests for large Markdown files that embed multiple Mermaid diagrams.
 * Fixture: `fixtures/architecture.anonymized.md` — full doc shape (YAML, tables,
 * `---`, `%%` comments, nested subgraphs, styles, quoted edges, stateDiagram-v2)
 * with fictional names and labels (no real product terminology).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  extractAllMermaidBlocks,
  extractMermaidCode,
  replaceMermaidBlock,
} from '../utils/mermaidCodeBlock'
import { normalizeMermaidForBeautifulMermaid } from '../utils/normalizeMermaidForBeautifulMermaid'
import { parseMermaidFlowchart } from '../utils/mermaidParser'

const __dirname = dirname(fileURLToPath(import.meta.url))

const FIXTURE_PATH = join(__dirname, 'fixtures', 'architecture.anonymized.md')

/** Quoted edge label used in the first diagram (must normalize to pipe form). */
const QUOTED_EDGE_LABEL = 'shardKey'

describe('markdown documents with multiple Mermaid diagrams', () => {
  it('anonymized architecture fixture: fenced blocks, normalization, replaceMermaidBlock', () => {
    const content = readFileSync(FIXTURE_PATH, 'utf8')

    expect(content.trimStart().startsWith('---\n')).toBe(true)
    expect(content).toMatch(/^---\n[\s\S]*?\n---\n/)
    expect(content).toMatch(/\n#\s+YAML comments use #/m)

    const blocks = extractAllMermaidBlocks(content)
    expect(blocks.length).toBe(2)

    expect(extractMermaidCode(content)).toBe(blocks[0].code)

    const flow = blocks[0].code
    const state = blocks[1].code

    expect(flow).toContain('%%')
    expect(flow).toMatch(/graph\s+TB/i)
    expect(flow).toContain('subgraph')
    expect(flow).toMatch(/--\s*"[^"]+"\s*-->/)

    const normalized = normalizeMermaidForBeautifulMermaid(flow)
    expect(normalized).not.toMatch(new RegExp(`--\\s*"${QUOTED_EDGE_LABEL}"\\s*-->`))
    expect(normalized).toMatch(new RegExp(`-->\\|${QUOTED_EDGE_LABEL}\\|`))

    const parsed = parseMermaidFlowchart(flow)
    expect(parsed).not.toBeNull()
    expect(parsed!.type).toMatch(/flowchart|graph/)
    expect(parsed!.direction).toBe('TD')
    expect(parsed!.nodes.length).toBeGreaterThan(10)
    expect(parsed!.edges.length).toBeGreaterThan(5)

    expect(parseMermaidFlowchart(state)).toBeNull()
    expect(state).toMatch(/stateDiagram-v2/i)

    const patched = replaceMermaidBlock(content, blocks[1], 'stateDiagram-v2\n    [*] --> Patched')
    const after = extractAllMermaidBlocks(patched)
    expect(after.length).toBe(2)
    expect(after[1].code).toContain('[*] --> Patched')
  })
})
