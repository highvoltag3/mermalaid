/**
 * README § Editor Features — Live preview debounce (500ms) & auto-save to localStorage (500ms).
 */
import { describe, expect, it } from 'vitest'
import { MERMLAID_EDITOR_AUTOSAVE_DEBOUNCE_MS, MERMLAID_PREVIEW_DEBOUNCE_MS } from './mermalaidTiming'

describe('mermalaidTiming (README debounce contract)', () => {
  it('preview and editor auto-save use the same documented delay', () => {
    expect(MERMLAID_PREVIEW_DEBOUNCE_MS).toBe(500)
    expect(MERMLAID_EDITOR_AUTOSAVE_DEBOUNCE_MS).toBe(500)
    expect(MERMLAID_PREVIEW_DEBOUNCE_MS).toBe(MERMLAID_EDITOR_AUTOSAVE_DEBOUNCE_MS)
  })
})
