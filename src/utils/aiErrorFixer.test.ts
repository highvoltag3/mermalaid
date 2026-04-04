/**
 * README § AI Syntax Fix — local API key storage + response cleanup.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearApiKey,
  fixMermaidErrorWithAI,
  getStoredApiKey,
  storeApiKey,
} from './aiErrorFixer'

describe('AI key storage (local only, README)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('round-trips openai-api-key in localStorage', () => {
    expect(getStoredApiKey()).toBeNull()
    storeApiKey('sk-local')
    expect(getStoredApiKey()).toBe('sk-local')
    clearApiKey()
    expect(getStoredApiKey()).toBeNull()
  })
})

describe('fixMermaidErrorWithAI', () => {
  it('strips ```mermaid fences from model output', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```mermaid\ngraph TD\n  A --> B\n```' } }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const fixed = await fixMermaidErrorWithAI('broken', 'syntax error', 'sk-test')

    expect(fixed).toBe('graph TD\n  A --> B')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )

    vi.unstubAllGlobals()
  })
})
