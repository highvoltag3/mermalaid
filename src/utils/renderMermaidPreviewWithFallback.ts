import { renderMermaid as renderBeautifulMermaid } from 'beautiful-mermaid'
import { isMermaidAboutKeywordOnly } from './mermalaidInfoText'
import {
  mapMermaidConfigToThemeOptions,
  type BeautifulMermaidThemeOptions,
  type MermaidYamlConfig,
} from './mermaidYamlConfig'
import { normalizeMermaidForBeautifulMermaid } from './normalizeMermaidForBeautifulMermaid'
import { renderOfficialMermaidPreview } from './officialMermaidPreview'

export type MermaidPreviewRenderResult = {
  svg: string
  /** Set when the primary official render failed and a fallback produced the SVG. */
  primaryError: string | null
}

/** Thrown when the fallback path should show the built-in about panel instead of an SVG. */
export class MermaidAboutKeywordFallback extends Error {
  constructor() {
    super('MERMAID_ABOUT_KEYWORD')
    this.name = 'MermaidAboutKeywordFallback'
  }
}

/**
 * Renders with official Mermaid first, then compat normalization, then beautiful-mermaid.
 * Callers keep the SVG on success and should still surface `primaryError` when non-null
 * so definition errors are not silently hidden by a fallback render.
 */
export async function renderMermaidPreviewWithFallback(options: {
  diagramCode: string
  isDark: boolean
  previewThemeOptions: BeautifulMermaidThemeOptions
  officialYamlConfig: MermaidYamlConfig | undefined
  yamlConfig: MermaidYamlConfig | undefined
}): Promise<MermaidPreviewRenderResult> {
  const {
    diagramCode,
    isDark,
    previewThemeOptions,
    officialYamlConfig,
    yamlConfig,
  } = options
  const normalizedForCompat = normalizeMermaidForBeautifulMermaid(diagramCode)

  try {
    const svg = await renderOfficialMermaidPreview(
      diagramCode,
      isDark,
      previewThemeOptions,
      officialYamlConfig,
    )
    return { svg, primaryError: null }
  } catch (primaryErr) {
    const primaryError =
      primaryErr instanceof Error ? primaryErr.message : 'Invalid Mermaid syntax'

    if (normalizedForCompat !== diagramCode) {
      try {
        const svg = await renderOfficialMermaidPreview(
          normalizedForCompat,
          isDark,
          previewThemeOptions,
          officialYamlConfig,
        )
        return { svg, primaryError }
      } catch {
        // Continue to about-panel / beautiful-mermaid fallbacks.
      }
    }

    if (isMermaidAboutKeywordOnly(normalizedForCompat)) {
      throw new MermaidAboutKeywordFallback()
    }

    const themeOptions = yamlConfig
      ? mapMermaidConfigToThemeOptions(yamlConfig)
      : previewThemeOptions
    try {
      const svg = await renderBeautifulMermaid(normalizedForCompat, themeOptions)
      return { svg, primaryError }
    } catch {
      // Prefer the original official Mermaid error when every path fails.
      throw primaryErr instanceof Error ? primaryErr : new Error(primaryError)
    }
  }
}
