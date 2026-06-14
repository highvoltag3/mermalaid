import type { BeautifulMermaidThemeOptions } from './mermaidYamlConfig'

/** Maps beautiful-mermaid palette fields to official Mermaid themeVariables keys. */
export function buildThemeVariablesFromBeautifulTheme(
  themeOptions: BeautifulMermaidThemeOptions | undefined,
): Record<string, string> {
  if (!themeOptions) return {}
  const bg = themeOptions.bg
  const fg = themeOptions.fg
  const line = themeOptions.line ?? themeOptions.border ?? fg
  const surface = themeOptions.surface ?? bg
  const accent = themeOptions.accent ?? line
  const border = themeOptions.border ?? line

  const vars: Record<string, string> = {}
  if (bg) vars.background = bg
  if (fg) {
    vars.textColor = fg
    vars.primaryTextColor = fg
    vars.secondaryTextColor = fg
    vars.tertiaryTextColor = fg
  }
  if (surface) {
    vars.mainBkg = surface
    vars.primaryColor = surface
    vars.secondaryColor = surface
  }
  if (bg) vars.tertiaryColor = bg
  if (border) {
    vars.primaryBorderColor = border
    vars.secondaryBorderColor = border
    vars.tertiaryBorderColor = border
    vars.clusterBorder = border
    vars.nodeBorder = border
  }
  if (line) {
    vars.lineColor = line
    vars.defaultLinkColor = line
    vars.edgeLabelBackground = bg ?? surface ?? '#ffffff'
  }
  if (accent) {
    vars.actorBorder = accent
    vars.actorBkg = bg ?? surface ?? '#ffffff'
    vars.signalColor = accent
    vars.noteBorderColor = accent
    vars.noteBkgColor = surface ?? bg ?? '#ffffff'
  }
  return vars
}
