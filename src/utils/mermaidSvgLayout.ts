export interface MermaidNodeLayout {
  x: number
  y: number
  width: number
  height: number
}

const FLOWCHART_NODE_ID = /^flowchart-(.+)-(\d+)$/

export function parseMermaidNodeIdFromSvgId(svgElementId: string): string | null {
  const match = svgElementId.match(FLOWCHART_NODE_ID)
  return match?.[1] ?? null
}

function parseTranslate(transform: string | null): { x: number; y: number } {
  if (!transform) return { x: 0, y: 0 }
  const match = transform.match(/translate\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/)
  if (!match) return { x: 0, y: 0 }
  return {
    x: Number.parseFloat(match[1]),
    y: Number.parseFloat(match[2] ?? '0'),
  }
}

function boundsFromRect(
  rect: SVGRectElement,
  originX: number,
  originY: number,
): MermaidNodeLayout {
  const x = Number.parseFloat(rect.getAttribute('x') ?? '0')
  const y = Number.parseFloat(rect.getAttribute('y') ?? '0')
  const width = Number.parseFloat(rect.getAttribute('width') ?? '0')
  const height = Number.parseFloat(rect.getAttribute('height') ?? '0')
  return {
    x: originX + x,
    y: originY + y,
    width,
    height,
  }
}

function boundsFromPolygonPoints(
  pointsAttr: string,
  originX: number,
  originY: number,
): MermaidNodeLayout | null {
  const coords = pointsAttr
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number.parseFloat))
    .filter((pair) => pair.length === 2 && pair.every(Number.isFinite))

  if (coords.length === 0) return null

  const xs = coords.map(([px]) => px)
  const ys = coords.map(([, py]) => py)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: originX + minX,
    y: originY + minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function layoutFromNodeGroup(nodeGroup: SVGGElement): MermaidNodeLayout | null {
  const { x: originX, y: originY } = parseTranslate(nodeGroup.getAttribute('transform'))

  const shape =
    nodeGroup.querySelector<SVGRectElement>('rect.label-container, rect.basic') ??
    nodeGroup.querySelector<SVGRectElement>('rect') ??
    nodeGroup.querySelector<SVGPolygonElement>('polygon.label-container, polygon') ??
    nodeGroup.querySelector<SVGCircleElement>('circle') ??
    nodeGroup.querySelector<SVGPathElement>('path')

  if (!shape) return null

  if (
    shape.tagName.toLowerCase() === 'rect' &&
    shape.getAttribute('width') &&
    shape.getAttribute('height')
  ) {
    const shapeOrigin = parseTranslate(shape.getAttribute('transform'))
    return boundsFromRect(shape as SVGRectElement, originX + shapeOrigin.x, originY + shapeOrigin.y)
  }

  if (shape.tagName.toLowerCase() === 'polygon' && shape.getAttribute('points')) {
    const shapeOrigin = parseTranslate(shape.getAttribute('transform'))
    return boundsFromPolygonPoints(
      shape.getAttribute('points')!,
      originX + shapeOrigin.x,
      originY + shapeOrigin.y,
    )
  }

  if (typeof (shape as SVGGraphicsElement).getBBox === 'function') {
    try {
      const bbox = (shape as SVGGraphicsElement).getBBox()
      return {
        x: originX + bbox.x,
        y: originY + bbox.y,
        width: bbox.width,
        height: bbox.height,
      }
    } catch {
      return null
    }
  }

  return null
}

/**
 * Reads node bounding boxes from an official Mermaid flowchart SVG.
 * Mounts the SVG off-screen so getBBox works in the browser.
 */
export function extractNodeLayoutsFromMermaidSvg(
  svgMarkup: string,
  expectedNodeIds?: string[],
): Map<string, MermaidNodeLayout> {
  const layouts = new Map<string, MermaidNodeLayout>()
  const expected = expectedNodeIds ? new Set(expectedNodeIds) : null

  const container = document.createElement('div')
  container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none'
  container.innerHTML = svgMarkup
  document.body.appendChild(container)

  try {
    const svg = container.querySelector('svg')
    if (!svg) return layouts

    const nodeGroups = svg.querySelectorAll<SVGGElement>('g.node')
    nodeGroups.forEach((nodeGroup) => {
      const mermaidId = parseMermaidNodeIdFromSvgId(nodeGroup.id)
      if (!mermaidId) return
      if (expected && !expected.has(mermaidId)) return

      const layout = layoutFromNodeGroup(nodeGroup)
      if (!layout || layout.width <= 0 || layout.height <= 0) return
      layouts.set(mermaidId, layout)
    })
  } finally {
    container.remove()
  }

  return layouts
}
