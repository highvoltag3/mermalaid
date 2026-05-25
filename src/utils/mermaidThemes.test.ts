import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MERMAID_THEME_ID,
  getAppThemeCssVars,
  getMermaidThemeLabel,
  getMermaidThemeOptions,
  isAppThemeDark,
  isValidMermaidThemeId,
} from './mermaidThemes'

describe('getMermaidThemeLabel', () => {
  it('title-cases kebab-case ids', () => {
    expect(getMermaidThemeLabel('github-light')).toBe('Github Light')
    expect(getMermaidThemeLabel('tokyo-night')).toBe('Tokyo Night')
  })
})

describe('isValidMermaidThemeId', () => {
  it('accepts known theme keys', () => {
    expect(isValidMermaidThemeId(DEFAULT_MERMAID_THEME_ID)).toBe(true)
  })

  it('rejects unknown strings', () => {
    expect(isValidMermaidThemeId('not-a-real-theme-xyz')).toBe(false)
  })
})

describe('getMermaidThemeOptions', () => {
  it('falls back to default for invalid id', () => {
    const opt = getMermaidThemeOptions('__invalid__')
    expect(opt).toEqual(getMermaidThemeOptions(DEFAULT_MERMAID_THEME_ID))
  })
})

describe('getAppThemeCssVars', () => {
  it('maps invalid theme id to the same vars as the default theme', () => {
    const invalid = getAppThemeCssVars('__invalid__')
    const def = getAppThemeCssVars(DEFAULT_MERMAID_THEME_ID)
    expect(invalid).toEqual(def)
  })

  it('maps a valid theme to string CSS variables', () => {
    const vars = getAppThemeCssVars(DEFAULT_MERMAID_THEME_ID)
    expect(typeof vars['--app-bg']).toBe('string')
    expect(vars['--app-bg'].length).toBeGreaterThan(0)
  })
})

describe('isAppThemeDark', () => {
  it('marks known dark themes', () => {
    expect(isAppThemeDark('github-dark')).toBe(true)
    expect(isAppThemeDark('dracula')).toBe(true)
  })

  it('treats default light theme as not dark', () => {
    expect(isAppThemeDark(DEFAULT_MERMAID_THEME_ID)).toBe(false)
  })
})
