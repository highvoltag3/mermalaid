import { describe, expect, it } from 'vitest'
import { getSyntaxEntry, getSyntaxIndex, normalizeDiagramType } from './syntaxReference.js'

describe('syntax reference', () => {
  it('returns an index of documented types plus additional type names', () => {
    const index = getSyntaxIndex()
    const types = index.documented.map((d) => d.type)
    expect(types).toContain('flowchart')
    expect(types).toContain('sequence')
    expect(types).toContain('class')
    expect(index.additionalTypes.length).toBeGreaterThan(0)
  })

  it('resolves aliases to canonical entries', () => {
    expect(getSyntaxEntry('graph')?.type).toBe('flowchart')
    expect(getSyntaxEntry('sequenceDiagram')?.type).toBe('sequence')
    expect(getSyntaxEntry('stateDiagram-v2')?.type).toBe('state')
    expect(getSyntaxEntry('ERdiagram')?.type).toBe('er')
  })

  it('returns null for unknown types', () => {
    expect(getSyntaxEntry('definitely-not-a-diagram')).toBeNull()
  })

  it('every documented entry has a non-empty snippet and tips', () => {
    for (const entry of getSyntaxIndex().documented) {
      const full = getSyntaxEntry(entry.type)
      expect(full?.snippet.length).toBeGreaterThan(0)
      expect(full?.tips.length).toBeGreaterThan(0)
    }
  })

  it('normalizes type strings', () => {
    expect(normalizeDiagramType('  State_Diagram-v2 ')).toBe('statediagramv2')
  })
})
