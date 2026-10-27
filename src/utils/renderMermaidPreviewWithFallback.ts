import mermaid from 'mermaid'
import { renderMermaid as renderBeautifulMermaid } from 'beautiful-mermaid'
import { isMermaidAboutKeywordOnly } from './mermalaidInfoText'
import { ensureReadableLineColor } from './colorContrast'
import { boostMermaidEdgeStrokes } from './mermaidEdgeVisibility'
import {
  mapMermaidConfigToThemeOptions,
  type BeautifulMermaidThemeOptions,
  type MermaidYamlConfig,
} from './mermaidYamlConfig'
import { normalizeMermaidForBeautifulMermaid } from './normalizeMermaidForBeautifulMermaid'
import { renderOfficialMermaidPreview } from './officialMermaidPreview'

function withReadableLine(
  themeOptions: BeautifulMermaidThemeOptions,
): BeautifulMermaidThemeOptions {
  const bg = themeOptions.bg
  const line = themeOptions.line ?? themeOptions.border ?? themeOptions.fg
  if (!bg || !line) return themeOptions
  return {
    ...themeOptions,
    line: ensureReadableLineColor(line, bg, themeOptions.fg ?? '#333333'),
  }
}

export type MermaidPreviewRenderResult = {
  svg: string
  /** Set when the primary official render failed and a fallback produced the SVG. */
  primaryError: string | null
  /**
   * True when primaryError is a render-time issue (syntax is valid but render failed,
   * e.g. namespace/class cycle). The caller can suppress the error indicator in this case.
   * False when primaryError is a genuine syntax/parse error that should be shown.
   */
  isRenderTimeError: boolean
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
    return { svg, primaryError: null, isRenderTimeError: false }
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
        // Compat rewrite still uses official Mermaid. Do not treat it as a
        // silent fallback that should keep the original error banner.
        return { svg, primaryError: null, isRenderTimeError: false }
      } catch {
        // Continue to about-panel / beautiful-mermaid fallbacks.
      }
    }

    if (isMermaidAboutKeywordOnly(normalizedForCompat)) {
      throw new MermaidAboutKeywordFallback()
    }

    // Check if syntax is valid (parse succeeds) but render failed.
    // If parse succeeds, it's a render-time error (e.g. namespace/class cycle)
    // that can be recovered by fallback without showing SYNTAX ERROR.
    // If parse fails, it's a genuine syntax error that should be shown.
    let isRenderTimeError = false
    try {
      await mermaid.parse(diagramCode)
      // Parse succeeded: this is a render-time error, not a syntax error
      isRenderTimeError = true
    } catch {
      // Parse failed: genuine syntax error
      isRenderTimeError = false
    }

    const themeOptions = withReadableLine(
      yamlConfig
        ? mapMermaidConfigToThemeOptions(yamlConfig)
        : previewThemeOptions,
    )
    try {
      const svg = await renderBeautifulMermaid(normalizedForCompat, themeOptions)
      return { svg: boostMermaidEdgeStrokes(svg), primaryError, isRenderTimeError }
    } catch {
      // Prefer the original official Mermaid error when every path fails.
      throw primaryErr instanceof Error ? primaryErr : new Error(primaryError)
    }
  }
}
