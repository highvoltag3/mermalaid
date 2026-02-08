/**
 * beautiful-mermaid theming alignment
 * @see https://github.com/lukilabs/beautiful-mermaid?tab=readme-ov-file#theming
 */
import { THEMES as BEAUTIFUL_MERMAID_THEMES } from 'beautiful-mermaid'

/** Fallback if package themes are missing or empty */
const FALLBACK_THEMES = {
  'github-light': { bg: '#ffffff', fg: '#1f2328', line: '#d1d9e0', accent: '#0969da', muted: '#59636e' },
} as const

const THEMES =
  BEAUTIFUL_MERMAID_THEMES && Object.keys(BEAUTIFUL_MERMAID_THEMES).length > 0
    ? BEAUTIFUL_MERMAID_THEMES
    : (FALLBACK_THEMES as typeof BEAUTIFUL_MERMAID_THEMES)

export type MermaidThemeId = keyof typeof THEMES

/** All built-in beautiful-mermaid theme keys (bg/fg + optional enrichment: line, accent, muted, surface, border) */
export const MERMAID_THEME_IDS = Object.keys(THEMES) as MermaidThemeId[]

/** Default diagram theme when none is set (light, neutral) */
export const DEFAULT_MERMAID_THEME_ID: MermaidThemeId =
  (MERMAID_THEME_IDS.includes('github-light')
    ? 'github-light'
    : MERMAID_THEME_IDS[0] ?? 'github-light') as MermaidThemeId

/** Human-readable labels for the theme dropdown (kebab-case → Title Case) */
export function getMermaidThemeLabel(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Resolve theme options for renderMermaid; validates and falls back to default */
export function getMermaidThemeOptions(themeId: string) {
  const key = MERMAID_THEME_IDS.includes(themeId as MermaidThemeId)
    ? (themeId as MermaidThemeId)
    : DEFAULT_MERMAID_THEME_ID
  return THEMES[key]
}

/** Check if a stored value is a valid theme id (e.g. from localStorage) */
export function isValidMermaidThemeId(value: string): value is MermaidThemeId {
  return MERMAID_THEME_IDS.includes(value as MermaidThemeId)
}

/**
 * CSS custom properties for the app UI, derived from the diagram theme.
 * Use these on the app root so the whole UI matches the selected diagram theme.
 */
export function getAppThemeCssVars(themeId: string): Record<string, string> {
  const t = getMermaidThemeOptions(themeId)
  if (!t || typeof t.bg !== 'string' || typeof t.fg !== 'string') {
    return {
      '--app-bg': '#ffffff',
      '--app-fg': '#333333',
      '--app-border': '#e0e0e0',
      '--app-accent': '#0969da',
      '--app-muted': '#666666',
      '--app-surface': '#f5f5f5',
    }
  }
  return {
    '--app-bg': t.bg,
    '--app-fg': t.fg,
    '--app-border': t.border ?? t.line ?? t.fg,
    '--app-accent': t.accent ?? t.fg,
    '--app-muted': t.muted ?? t.fg,
    '--app-surface': t.surface ?? t.bg,
  }
}

/** Dark theme ids (dark background); used for Monaco and modal styling */
const DARK_THEME_IDS = new Set<MermaidThemeId>([
  'zinc-dark',
  'tokyo-night',
  'tokyo-night-storm',
  'catppuccin-mocha',
  'nord',
  'dracula',
  'github-dark',
  'solarized-dark',
  'one-dark',
])

/** Whether the theme has a dark background (for Monaco editor and modals) */
export function isAppThemeDark(themeId: string): boolean {
  return DARK_THEME_IDS.has(themeId as MermaidThemeId)
}
