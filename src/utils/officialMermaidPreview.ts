import mermaid from 'mermaid'
import type { BeautifulMermaidThemeOptions, MermaidYamlConfig } from './mermaidYamlConfig'

let renderCounter = 0

const OFFICIAL_MERMAID_THEMES = new Set([
  'default',
  'base',
  'dark',
  'forest',
  'neutral',
] as const)

type OfficialMermaidTheme = 'default' | 'base' | 'dark' | 'forest' | 'neutral'

function resolveOfficialTheme(
  requestedTheme: string | undefined,
  isDarkTheme: boolean,
): OfficialMermaidTheme {
  if (requestedTheme && OFFICIAL_MERMAID_THEMES.has(requestedTheme as OfficialMermaidTheme)) {
    return requestedTheme as OfficialMermaidTheme
  }
  return isDarkTheme ? 'dark' : 'default'
}

function buildThemeVariablesFromBeautifulTheme(
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

function buildPreviewConfig(
  isDarkTheme: boolean,
  themeOptions: BeautifulMermaidThemeOptions | undefined,
  yamlConfig?: MermaidYamlConfig,
): Parameters<typeof mermaid.initialize>[0] {
  const baseThemeVariables = buildThemeVariablesFromBeautifulTheme(themeOptions)
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    // Use Mermaid "base" when no explicit Mermaid theme is requested so we can
    // project the selected beautiful-mermaid palette into Mermaid variables.
    theme: yamlConfig?.theme
      ? resolveOfficialTheme(yamlConfig.theme, isDarkTheme)
      : 'base',
    themeVariables: {
      ...baseThemeVariables,
      ...(yamlConfig?.themeVariables ?? {}),
    },
  }
}

export async function renderOfficialMermaidPreview(
  diagramCode: string,
  isDarkTheme: boolean,
  themeOptions: BeautifulMermaidThemeOptions | undefined,
  yamlConfig?: MermaidYamlConfig,
): Promise<string> {
  renderCounter += 1
  mermaid.initialize(buildPreviewConfig(isDarkTheme, themeOptions, yamlConfig))
  const renderId = `mermalaid-preview-${renderCounter}`
  const { svg } = await mermaid.render(renderId, diagramCode)
  return svg
}
