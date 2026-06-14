import { useEffect, useState } from 'react'
import { getMermaidThemeOptions, isAppThemeDark } from '../utils/mermaidThemes'
import { extractNodeLayoutsFromMermaidSvg, type MermaidNodeLayout } from '../utils/mermaidSvgLayout'
import { renderOfficialMermaidPreview } from '../utils/officialMermaidPreview'
import type { MermaidYamlConfig } from '../utils/mermaidYamlConfig'

export function useMermaidSvgLayout(
  diagramCode: string,
  nodeIds: string[],
  themeId: string,
  yamlConfig?: MermaidYamlConfig,
): Map<string, MermaidNodeLayout> | null {
  const [layouts, setLayouts] = useState<Map<string, MermaidNodeLayout> | null>(null)
  const nodeKey = nodeIds.join('\u0000')

  useEffect(() => {
    if (!diagramCode.trim() || nodeIds.length === 0) {
      setLayouts(new Map())
      return
    }

    let cancelled = false
    setLayouts(null)

    void (async () => {
      try {
        const svg = await renderOfficialMermaidPreview(
          diagramCode,
          isAppThemeDark(themeId),
          getMermaidThemeOptions(themeId),
          yamlConfig,
        )
        const extracted = extractNodeLayoutsFromMermaidSvg(svg, nodeIds)
        if (!cancelled) setLayouts(extracted)
      } catch {
        if (!cancelled) setLayouts(new Map())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [diagramCode, themeId, yamlConfig, nodeKey])

  return layouts
}
