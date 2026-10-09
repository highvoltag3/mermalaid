/**
 * Post-process Mermaid SVG so connection paths are easier to see.
 * Thick edges (`==>`) already use a larger stroke; we only bump thin defaults.
 */

const MIN_STROKE_WIDTH = 2
const THICK_EDGE_THRESHOLD = 2.5

function bumpStrokeWidth(current: string | null): string | null {
  if (current === null || current === '') return String(MIN_STROKE_WIDTH)
  const n = Number.parseFloat(current)
  if (!Number.isFinite(n)) return String(MIN_STROKE_WIDTH)
  if (n >= THICK_EDGE_THRESHOLD) return current
  if (n >= MIN_STROKE_WIDTH) return current
  return String(MIN_STROKE_WIDTH)
}

/**
 * Increase stroke-width on flowchart / sequence link paths that are thinner
 * than {@link MIN_STROKE_WIDTH}. Leaves thicker stylized edges alone.
 */
export function boostMermaidEdgeStrokes(svgMarkup: string): string {
  if (!svgMarkup || !svgMarkup.toLowerCase().includes('<svg')) return svgMarkup

  const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  const svg = doc.documentElement
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') return svgMarkup
  if (doc.querySelector('parsererror')) return svgMarkup

  const selectors = [
    '.edgePath path',
    '.flowchart-link',
    'path.flowchart-link',
    '.messageLine0',
    '.messageLine1',
    'g.edgePaths path',
    'g.edgePath path',
  ]

  const seen = new Set<Element>()
  for (const selector of selectors) {
    for (const el of Array.from(svg.querySelectorAll(selector))) {
      if (seen.has(el)) continue
      seen.add(el)
      const attr = el.getAttribute('stroke-width')
      const styleWidth = (el as SVGElement).style?.strokeWidth || null
      const next = bumpStrokeWidth(attr ?? (styleWidth || null))
      if (next !== null) {
        el.setAttribute('stroke-width', next)
        if (styleWidth) {
          ;(el as SVGElement).style.strokeWidth = next
        }
      }
    }
  }

  // Fallback: paths that look like edges (common Mermaid class names vary by version).
  if (seen.size === 0) {
    for (const el of Array.from(svg.querySelectorAll('path[class*="edge"], path[class*="link"]'))) {
      const next = bumpStrokeWidth(el.getAttribute('stroke-width'))
      if (next !== null) el.setAttribute('stroke-width', next)
    }
  }

  return new XMLSerializer().serializeToString(svg)
}
