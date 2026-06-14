import mermaid from 'mermaid'
import type { BeautifulMermaidThemeOptions, MermaidYamlConfig } from './mermaidYamlConfig'
import { buildThemeVariablesFromBeautifulTheme } from './mermaidThemeVariables'

let renderCounter = 0

/**
 * Mermaid shares global config and DOM scratch nodes across `initialize` + `render`.
 * Concurrent calls (e.g. preview debounce + block switch) can interleave and break the
 * first render or leave the engine in a bad state — serialize all official renders.
 */
let renderQueue: Promise<unknown> = Promise.resolve()

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

function buildPreviewConfig(
  isDarkTheme: boolean,
  themeOptions: BeautifulMermaidThemeOptions | undefined,
  yamlConfig?: MermaidYamlConfig,
): Parameters<typeof mermaid.initialize>[0] {
  const baseThemeVariables = buildThemeVariablesFromBeautifulTheme(themeOptions)
  return {
    startOnLoad: false,
    // User-authored diagrams often use <br/>, <i>, etc. in flowchart labels. `strict`
    // sanitizes/rewrites HTML aggressively and breaks many real-world graphs; `loose`
    // matches typical editor behavior (e.g. mermaid.live) for trusted local input.
    securityLevel: 'loose',
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
  const run = renderQueue.then(async () => {
    renderCounter += 1
    mermaid.initialize(buildPreviewConfig(isDarkTheme, themeOptions, yamlConfig))
    const renderId = `mermalaid-preview-${renderCounter}`
    const { svg } = await mermaid.render(renderId, diagramCode)
    return svg
  })
  renderQueue = run.catch(() => {
    /* keep the queue alive even when a render throws */
  })
  return run
}
