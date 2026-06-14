import { getMermaidThemeOptions } from './mermaidThemes'
import { buildThemeVariablesFromBeautifulTheme } from './mermaidThemeVariables'
import type { MermaidYamlConfig } from './mermaidYamlConfig'

export type VisualEditorCssVars = Record<string, string>

function pick(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value) return value
  }
  return undefined
}

/** CSS custom properties for the React Flow visual editor, aligned with preview theming. */
export function getVisualEditorCssVars(
  themeId: string,
  yamlConfig?: MermaidYamlConfig,
): VisualEditorCssVars {
  const themeOptions = getMermaidThemeOptions(themeId)
  const fromTheme = buildThemeVariablesFromBeautifulTheme(themeOptions)
  const yamlVars = yamlConfig?.themeVariables ?? {}
  const merged: Record<string, string> = { ...fromTheme }

  for (const [key, value] of Object.entries(yamlVars)) {
    if (typeof value === 'string' && value.trim()) {
      merged[key] = value
    }
  }

  const canvasBg = pick(merged.background, themeOptions.bg, '#f8f9fa')
  const nodeFill = pick(merged.primaryColor, merged.mainBkg, themeOptions.surface, '#ffffff')
  const nodeBorder = pick(merged.nodeBorder, merged.primaryBorderColor, themeOptions.border, themeOptions.line, '#999999')
  const nodeText = pick(merged.textColor, merged.primaryTextColor, themeOptions.fg, '#333333')
  const edgeStroke = pick(merged.lineColor, merged.defaultLinkColor, themeOptions.line, themeOptions.border, '#999999')
  const edgeLabelBg = pick(merged.edgeLabelBackground, canvasBg, '#ffffff')
  const accent = pick(themeOptions.accent, merged.signalColor, '#4a9eff')
  const headerBg = pick(themeOptions.surface, canvasBg, '#fafafa')
  const headerBorder = pick(themeOptions.border, themeOptions.line, '#e0e0e0')
  const mutedText = pick(themeOptions.muted, nodeText, '#666666')

  return {
    '--ve-canvas-bg': canvasBg ?? '#f8f9fa',
    '--ve-node-fill': nodeFill ?? '#ffffff',
    '--ve-node-border': nodeBorder ?? '#999999',
    '--ve-node-text': nodeText ?? '#333333',
    '--ve-edge-stroke': edgeStroke ?? '#999999',
    '--ve-edge-label-bg': edgeLabelBg ?? '#ffffff',
    '--ve-accent': accent ?? '#4a9eff',
    '--ve-header-bg': headerBg ?? '#fafafa',
    '--ve-header-border': headerBorder ?? '#e0e0e0',
    '--ve-muted-text': mutedText ?? '#666666',
    '--ve-toolbar-bg': pick(themeOptions.surface, nodeFill, '#ffffff') ?? '#ffffff',
    '--ve-toolbar-border': headerBorder ?? '#e0e0e0',
    '--ve-diamond-fill': nodeFill ?? '#ffffff',
    '--ve-hexagon-fill': nodeFill ?? '#ffffff',
  }
}

export function getVisualEditorEdgeStyle(
  cssVars: VisualEditorCssVars,
  edgeType: 'arrow' | 'line' | 'thick' | 'dotted',
): { stroke: string; strokeWidth?: number; strokeDasharray?: string } {
  const stroke = cssVars['--ve-edge-stroke'] ?? '#999999'
  switch (edgeType) {
    case 'thick':
      return { stroke, strokeWidth: 3 }
    case 'dotted':
      return { stroke, strokeDasharray: '5 5' }
    case 'line':
      return { stroke, strokeWidth: 1.5 }
    default:
      return { stroke, strokeWidth: 2 }
  }
}
