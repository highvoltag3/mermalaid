import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the Mermaid engine so we can drive parse outcomes deterministically.
// vi.mock is hoisted, so the mock fn must come from vi.hoisted.
const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))
vi.mock('mermaid', () => ({ default: { parse: parseMock, initialize: vi.fn(), render: vi.fn() } }))

import { validateMermaid } from './renderForAgent'

beforeEach(() => {
  parseMock.mockReset()
})

describe('validateMermaid', () => {
  it('reports valid with the diagram type when parse succeeds', async () => {
    parseMock.mockResolvedValue({ diagramType: 'flowchart' })
    await expect(validateMermaid('graph TD\n A-->B')).resolves.toEqual({
      valid: true,
      error: null,
      diagramType: 'flowchart',
    })
  })

  it('reports valid with null type when parse returns a non-object', async () => {
    parseMock.mockResolvedValue(true)
    await expect(validateMermaid('graph TD')).resolves.toEqual({
      valid: true,
      error: null,
      diagramType: null,
    })
  })

  it('reports invalid with the error message when parse throws', async () => {
    parseMock.mockRejectedValue(new Error('Parse error on line 2'))
    await expect(validateMermaid('graph TD\n A--')).resolves.toEqual({
      valid: false,
      error: 'Parse error on line 2',
      diagramType: null,
    })
  })
})
