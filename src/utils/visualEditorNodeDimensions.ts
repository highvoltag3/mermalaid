import type { MermaidNode, NodeShapeType } from './mermaidParser'
import type { MermaidNodeLayout } from './mermaidSvgLayout'

const DEFAULT_MIN = { width: 80, height: 40 }

/** Minimum render size per shape (matches CustomNode.css). */
const SHAPE_MIN_DIMENSIONS: Partial<Record<NodeShapeType, { width: number; height: number }>> = {
  diamond: { width: 120, height: 70 },
  rhombus: { width: 120, height: 70 },
  hexagon: { width: 120, height: 56 },
  parallelogram: { width: 120, height: 44 },
  trapezoid: { width: 120, height: 44 },
  trapezoidAlt: { width: 120, height: 44 },
  circle: { width: 64, height: 64 },
  doublecircle: { width: 64, height: 64 },
  stadium: { width: 100, height: 44 },
  cylinder: { width: 100, height: 52 },
  subroutine: { width: 100, height: 44 },
}

function minDimensionsForShape(shape: NodeShapeType, label?: string) {
  const base = SHAPE_MIN_DIMENSIONS[shape] ?? DEFAULT_MIN
  if (!label) return base
  const labelWidth = Math.max(base.width, label.length * 8 + 32)
  return { width: labelWidth, height: base.height }
}

/**
 * Mermaid SVG bboxes for clip-path shapes (e.g. diamonds) are often smaller than
 * our HTML nodes. Expand to shape minimums while keeping the SVG center fixed.
 */
export function normalizeLayoutForShape(
  shape: NodeShapeType,
  layout: MermaidNodeLayout,
  label?: string,
): MermaidNodeLayout {
  const mins = minDimensionsForShape(shape, label)
  const width = Math.max(layout.width, mins.width)
  const height = Math.max(layout.height, mins.height)

  return {
    x: layout.x - (width - layout.width) / 2,
    y: layout.y - (height - layout.height) / 2,
    width,
    height,
  }
}

export function resolveNodeDisplaySize(
  shape: NodeShapeType,
  width?: number,
  height?: number,
  label?: string,
): { width: number; height: number } | null {
  if (width === undefined || height === undefined) return null
  const normalized = normalizeLayoutForShape(shape, { x: 0, y: 0, width, height }, label)
  return { width: normalized.width, height: normalized.height }
}

export function layoutForMermaidNode(
  node: Pick<MermaidNode, 'id' | 'shape' | 'label'>,
  layout: MermaidNodeLayout,
): MermaidNodeLayout {
  return normalizeLayoutForShape(node.shape, layout, node.label)
}
