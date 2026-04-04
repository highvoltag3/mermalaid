import { describe, expect, it } from 'vitest'
import {
  extractAllMermaidBlocks,
  extractMermaidCode,
  replaceMermaidBlock,
} from './mermaidCodeBlock'

describe('extractMermaidCode', () => {
  it('returns empty string for empty input', () => {
    expect(extractMermaidCode('')).toBe('')
  })

  it('unwraps a single ```mermaid fenced block', () => {
    const src = 'Intro\n\n```mermaid\ngraph TD\n  A --> B\n```\n\nOutro'
    expect(extractMermaidCode(src)).toBe('graph TD\n  A --> B')
  })

  it('returns trimmed plain mermaid when no fence', () => {
    expect(extractMermaidCode('  graph LR\n    X --> Y  ')).toBe('graph LR\n    X --> Y')
  })
})

describe('extractAllMermaidBlocks', () => {
  it('returns empty array when no blocks', () => {
    expect(extractAllMermaidBlocks('graph TD\nA-->B')).toEqual([])
  })

  it('extracts multiple blocks with offsets', () => {
    const text = 'a\n```mermaid\none\n```\nb\n```mermaid\ntwo\n```'
    const blocks = extractAllMermaidBlocks(text)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].code).toBe('one')
    expect(blocks[1].code).toBe('two')
    expect(text.slice(blocks[0].start, blocks[0].end)).toContain('one')
    expect(text.slice(blocks[1].start, blocks[1].end)).toContain('two')
  })
})

describe('replaceMermaidBlock', () => {
  it('replaces the targeted block only', () => {
    const text = '```mermaid\nold\n```'
    const [block] = extractAllMermaidBlocks(text)
    expect(block).toBeDefined()
    const next = replaceMermaidBlock(text, block, 'new')
    expect(next).toBe('```mermaid\nnew\n```')
  })
})
