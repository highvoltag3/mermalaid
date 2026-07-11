/**
 * Mermaid built-in themes the server renders. Kept in its own tiny module so
 * light endpoints (/api/sign, /api/preview) can validate a theme without
 * importing the headless-Chromium renderer.
 */
export type ServerMermaidTheme = 'default' | 'dark' | 'forest' | 'neutral'

export const SERVER_MERMAID_THEMES: ServerMermaidTheme[] = [
  'default',
  'dark',
  'forest',
  'neutral',
]

export function isServerMermaidTheme(value: string): value is ServerMermaidTheme {
  return (SERVER_MERMAID_THEMES as string[]).includes(value)
}
