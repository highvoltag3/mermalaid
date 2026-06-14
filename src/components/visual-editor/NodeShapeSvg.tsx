import type { NodeShapeType } from '../../utils/mermaidParser'

const SVG_SHAPE_POINTS: Partial<Record<NodeShapeType, string>> = {
  diamond: '50,1 99,50 50,99 1,50',
  rhombus: '50,1 99,50 50,99 1,50',
  hexagon: '25,1 75,1 99,50 75,99 25,99 1,50',
  parallelogram: '15,1 99,1 85,99 1,99',
  trapezoid: '20,1 80,1 99,99 1,99',
  trapezoidAlt: '1,1 99,1 80,99 20,99',
}

export const SVG_BACKDROP_SHAPES = new Set<NodeShapeType>(
  Object.keys(SVG_SHAPE_POINTS) as NodeShapeType[],
)

export function usesSvgShapeBackdrop(shape: NodeShapeType | undefined): boolean {
  return shape !== undefined && SVG_BACKDROP_SHAPES.has(shape)
}

export default function NodeShapeSvg({ shape }: { shape: NodeShapeType }) {
  const points = SVG_SHAPE_POINTS[shape]
  if (!points) return null

  return (
    <svg
      className="node-shape-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
