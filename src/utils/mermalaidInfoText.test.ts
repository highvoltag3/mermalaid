import { describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => false,
}))

import {
  buildMermalaidInfoText,
  isMermaidAboutKeywordOnly,
  mermalaidAboutMarkupFromPlainText,
} from './mermalaidInfoText'

describe('isMermaidAboutKeywordOnly', () => {
  it('is true for lone info keyword (case-insensitive)', () => {
    expect(isMermaidAboutKeywordOnly('info')).toBe(true)
    expect(isMermaidAboutKeywordOnly('INFO')).toBe(true)
    expect(isMermaidAboutKeywordOnly('  info  ')).toBe(true)
  })

  it('ignores empty lines, whitespace, and %% comments', () => {
    expect(isMermaidAboutKeywordOnly('\n\n%% note\ninfo\n')).toBe(true)
    expect(isMermaidAboutKeywordOnly('%%\ninfo')).toBe(true)
  })

  it('is false when other content remains after filtering', () => {
    expect(isMermaidAboutKeywordOnly('info\ngraph TD')).toBe(false)
    expect(isMermaidAboutKeywordOnly('infoline')).toBe(false)
  })

  it('strips zero-width characters before matching', () => {
    expect(isMermaidAboutKeywordOnly('\u200Binfo')).toBe(true)
  })
})

describe('mermalaidAboutMarkupFromPlainText', () => {
  it('escapes HTML and wraps in preview class', () => {
    const html = mermalaidAboutMarkupFromPlainText('<Mermalaid> & "v"')
    expect(html).toContain('&lt;Mermalaid&gt;')
    expect(html).toContain('&amp;')
    expect(html).toContain('&quot;')
    expect(html).toContain('class="preview-about-mermalaid"')
  })
})

describe('buildMermalaidInfoText (web)', () => {
  it('includes version, Web runtime, engines, and project link', async () => {
    const text = await buildMermalaidInfoText()
    expect(text).toMatch(/Mermalaid \d+\.\d+\.\d+/)
    expect(text).toContain('Web')
    expect(text).not.toContain('App bundle version')
    expect(text).toContain('Official Mermaid')
    expect(text).toContain('beautiful-mermaid')
    expect(text).toContain('github.com/highvoltag3/mermalaid')
  })
})
