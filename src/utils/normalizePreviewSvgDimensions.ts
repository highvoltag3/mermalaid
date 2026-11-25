/**
 * Mermaid SVGs often ship with width/height="100%". Pin pixel sizes from viewBox so
 * the zoom/pan host has a non-zero layout box.
 *
 * With securityLevel "antiscript", flowchart HTML labels emit raw `<br>` (not
 * `<br/>`). Strict `image/svg+xml` parsing then fails; fall back to `text/html`.
 */
export function normalizePreviewSvgDimensions(svgMarkup: string): string {
  const svg = parseSvgRoot(svgMarkup)
  if (!svg) return svgMarkup

  const viewBox = svg.getAttribute('viewBox')
  if (!viewBox) return serializeSvg(svg, svgMarkup)

  const [, , width, height] = viewBox
    .trim()
    .split(/\s+/)
    .map(Number)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return serializeSvg(svg, svgMarkup)
  }

  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.style.maxWidth = 'none'
  svg.style.width = `${width}px`
  svg.style.height = `${height}px`
  return serializeSvg(svg, svgMarkup)
}

function parseSvgRoot(svgMarkup: string): SVGSVGElement | null {
  const asXml = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  if (!asXml.querySelector('parsererror')) {
    const root = asXml.documentElement
    if (root && root.nodeName.toLowerCase() === 'svg') {
      return root as unknown as SVGSVGElement
    }
  }

  const asHtml = new DOMParser().parseFromString(svgMarkup, 'text/html')
  const fromHtml = asHtml.querySelector('svg')
  return fromHtml instanceof SVGSVGElement ? fromHtml : null
}

function serializeSvg(svg: SVGSVGElement, fallback: string): string {
  if (typeof svg.outerHTML === 'string' && svg.outerHTML.length > 0) {
    return svg.outerHTML
  }
  try {
    return new XMLSerializer().serializeToString(svg)
  } catch {
    return fallback
  }
}
