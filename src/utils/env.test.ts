/**
 * README § AI Syntax Fix — `VITE_ENABLE_AI_FIXER`, optional API key env.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('env helpers (README AI fixer toggles)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('isAIFixerEnabled is false when VITE_ENABLE_AI_FIXER is false', async () => {
    vi.stubEnv('VITE_ENABLE_AI_FIXER', 'false')
    const { isAIFixerEnabled } = await import('./env')
    expect(isAIFixerEnabled()).toBe(false)
  })

  it('isAIFixerEnabled defaults to true when unset', async () => {
    const { isAIFixerEnabled } = await import('./env')
    expect(isAIFixerEnabled()).toBe(true)
  })

  it('getOpenAIApiKey reads VITE_OPENAI_API_KEY', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-test')
    const { getOpenAIApiKey } = await import('./env')
    expect(getOpenAIApiKey()).toBe('sk-test')
  })
})
