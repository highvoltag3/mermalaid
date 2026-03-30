/**
 * YAML config header support for Mermaid diagrams.
 * @see https://mermaid.js.org/config/configuration.html
 * @see https://github.com/highvoltag3/mermalaid/issues/30
 */
import { parse as parseYaml } from 'yaml'

/** Mermaid themeVariables (subset we support for rendering) */
export interface MermaidThemeVariables {
  primaryColor?: string
  primaryTextColor?: string
  primaryBorderColor?: string
  lineColor?: string
  secondaryColor?: string
  tertiaryColor?: string
  [key: string]: string | undefined
}

/** Mermaid config block from YAML frontmatter */
export interface MermaidYamlConfig {
  theme?: string
  themeVariables?: MermaidThemeVariables
}

/** Result of parsing a Mermaid block that may include YAML frontmatter */
export interface ParsedMermaidWithConfig {
  /** Diagram code only (no frontmatter) */
  code: string
  /** Parsed config if frontmatter was present and valid */
  config?: MermaidYamlConfig
  /** Raw YAML block including --- delimiters, for preserving on replace */
  yamlHeader?: string
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/**
 * Parses a Mermaid block that may start with a YAML config header.
 * Returns the diagram code (without frontmatter) and optional config.
 */
export function parseMermaidWithConfig(raw: string): ParsedMermaidWithConfig {
  const trimmed = raw.trim()
  const match = trimmed.match(FRONTMATTER_REGEX)
  if (!match) {
    return { code: trimmed }
  }

  const yamlBlock = match[1]
  const diagramCode = match[2].trim()
  const yamlHeader = '---\n' + yamlBlock + '\n---\n'

  let config: MermaidYamlConfig | undefined
  try {
    const parsed = parseYaml(yamlBlock) as Record<string, unknown> | null
    if (parsed && typeof parsed === 'object' && parsed.config) {
      const c = parsed.config as Record<string, unknown>
      config = {
        theme: typeof c.theme === 'string' ? c.theme : undefined,
        themeVariables:
          c.themeVariables && typeof c.themeVariables === 'object'
            ? (c.themeVariables as MermaidThemeVariables)
            : undefined,
      }
    }
  } catch {
    // Invalid YAML: treat as no config, keep diagram code as-is
  }

  // Only expose config when we have themeVariables to apply. Theme-only (e.g. theme: dark)
  // is ignored for rendering so we fall back to app theme; mapMermaidConfigToThemeOptions
  // does not map Mermaid theme names and would otherwise force light defaults.
  const hasThemeVariables =
    config?.themeVariables &&
    typeof config.themeVariables === 'object' &&
    Object.keys(config.themeVariables).length > 0
  return {
    code: diagramCode,
    config: hasThemeVariables ? config : undefined,
    yamlHeader,
  }
}

/**
 * Parses Mermaid YAML frontmatter strictly for official Mermaid rendering.
 * Unlike parseMermaidWithConfig(), this keeps theme-only config blocks.
 */
export function parseMermaidConfigForOfficialRenderer(
  raw: string
): MermaidYamlConfig | undefined {
  const trimmed = raw.trim()
  const match = trimmed.match(FRONTMATTER_REGEX)
  if (!match) return undefined

  const yamlBlock = match[1]
  try {
    const parsed = parseYaml(yamlBlock) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== 'object' || !parsed.config) return undefined
    const c = parsed.config as Record<string, unknown>
    const theme = typeof c.theme === 'string' ? c.theme : undefined
    const themeVariables =
      c.themeVariables && typeof c.themeVariables === 'object'
        ? (c.themeVariables as MermaidThemeVariables)
        : undefined
    if (!theme && !themeVariables) return undefined
    return { theme, themeVariables }
  } catch {
    return undefined
  }
}

/** beautiful-mermaid theme options (bg, fg, line, accent, etc.) */
export interface BeautifulMermaidThemeOptions {
  bg?: string
  fg?: string
  line?: string
  accent?: string
  muted?: string
  surface?: string
  border?: string
}

/**
 * Maps Mermaid themeVariables to beautiful-mermaid theme options.
 * Used when rendering with inline YAML config instead of app theme.
 */
export function mapMermaidConfigToThemeOptions(
  config: MermaidYamlConfig
): BeautifulMermaidThemeOptions {
  const v = config.themeVariables ?? {}
  return {
    bg: v.tertiaryColor ?? '#ffffff',
    fg: v.primaryTextColor ?? '#333333',
    line: v.lineColor,
    accent: v.secondaryColor,
    muted: v.secondaryColor,
    surface: v.primaryColor,
    border: v.primaryBorderColor ?? v.lineColor,
  }
}

/**
 * Builds the full block content when replacing only the diagram part.
 * If the block had a YAML header, it is preserved; otherwise returns newDiagramCode.
 */
export function replaceDiagramInBlock(
  fullBlockCode: string,
  newDiagramCode: string
): string {
  const { yamlHeader } = parseMermaidWithConfig(fullBlockCode)
  // If there was no frontmatter, replace entire block with new diagram
  if (!yamlHeader) {
    return newDiagramCode
  }
  return yamlHeader + newDiagramCode
}
