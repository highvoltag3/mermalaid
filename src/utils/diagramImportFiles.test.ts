/**
 * README § File Management — Open `.mmd`, `.txt`, or `.md` files.
 */
import { describe, expect, it } from 'vitest'
import { isDiagramImportFileName } from './diagramImportFiles'

describe('isDiagramImportFileName', () => {
  it('accepts the three documented extensions (case-insensitive)', () => {
    expect(isDiagramImportFileName('x.mmd')).toBe(true)
    expect(isDiagramImportFileName('X.MMD')).toBe(true)
    expect(isDiagramImportFileName('notes.txt')).toBe(true)
    expect(isDiagramImportFileName('doc.md')).toBe(true)
  })

  it('rejects other extensions', () => {
    expect(isDiagramImportFileName('x.json')).toBe(false)
    expect(isDiagramImportFileName('x.mermaid')).toBe(false)
    expect(isDiagramImportFileName('readme')).toBe(false)
  })
})
