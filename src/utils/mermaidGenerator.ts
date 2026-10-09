import { Node, Edge } from '@xyflow/react'
import {
  formatNodeStyleBody,
  type MermaidEdge,
  type MermaidNode,
  type NodeShapeType,
  type ParsedMermaidDiagram,
} from './mermaidParser'

const NODE_SHAPES = new Set<NodeShapeType>([
  'rect',
  'rounded',
  'stadium',
  'subroutine',
  'cylinder',
  'circle',
  'doublecircle',
  'diamond',
  'hexagon',
  'parallelogram',
  'trapezoid',
  'trapezoidAlt',
  'rhombus',
])

function asNodeShape(shape: unknown): NodeShapeType {
  return typeof shape === 'string' && NODE_SHAPES.has(shape as NodeShapeType)
    ? (shape as NodeShapeType)
    : 'rect'
}

function shapeSyntaxFor(shape: NodeShapeType, label: string): string {
  switch (shape) {
    case 'rect':
      return `[${label}]`
    case 'rounded':
      return `(${label})`
    case 'diamond':
      return `{${label}}`
    case 'stadium':
      return `([${label}])`
    case 'subroutine':
      return `[[${label}]]`
    case 'parallelogram':
      return `[/${label}/]`
    case 'cylinder':
      return `[(${label})]`
    case 'circle':
    case 'doublecircle':
      return `((${label}))`
    case 'hexagon':
      return `{{${label}}}`
    case 'trapezoid':
      return `[/${label}\\]`
    case 'trapezoidAlt':
      return `[\\${label}/]`
    case 'rhombus':
      return `{${label}}`
    default: {
      const _exhaustive: never = shape
      void _exhaustive
      return `[${label}]`
    }
  }
}

function arrowForEdgeType(edgeType: MermaidEdge['type']): string {
  switch (edgeType) {
    case 'thick':
      return '==>'
    case 'dotted':
      return '-.->'
    case 'line':
      return '---'
    case 'arrow':
      return '-->'
    default: {
      const _exhaustive: never = edgeType
      void _exhaustive
      return '-->'
    }
  }
}

function asEdgeType(value: unknown): MermaidEdge['type'] {
  switch (value) {
    case 'thick':
    case 'dotted':
    case 'line':
    case 'arrow':
      return value
    default:
      return 'arrow'
  }
}

function emitStyleLines(
  nodes: Array<Pick<MermaidNode, 'id' | 'fill' | 'stroke' | 'styleExtra'>>,
  lines: string[],
): void {
  const styleLines: string[] = []
  for (const node of nodes) {
    const body = formatNodeStyleBody(node)
    if (body) styleLines.push(`    style ${node.id} ${body}`)
  }
  if (styleLines.length > 0) {
    lines.push('')
    lines.push(...styleLines)
  }
}

/**
 * Converts react-flow nodes and edges back to Mermaid flowchart code
 */
export function generateMermaidCode(
  nodes: Node[],
  edges: Edge[],
  direction: 'TD' | 'BT' | 'LR' | 'RL' = 'TD',
  diagramType: 'flowchart' | 'graph' = 'flowchart'
): string {
  const lines: string[] = []

  // Add diagram declaration
  lines.push(`${diagramType} ${direction}`)
  lines.push('')

  // Generate node definitions with their shapes
  nodes.forEach(node => {
    const label = (node.data?.label as string) || node.id
    const shape = asNodeShape(node.data?.shape)
    lines.push(`    ${node.id}${shapeSyntaxFor(shape, label)}`)
  })

  lines.push('')

  // Generate edge definitions
  edges.forEach(edge => {
    const source = edge.source
    const target = edge.target
    const label = edge.label || ''
    const edgeType = asEdgeType(edge.data?.type)
    const arrow = arrowForEdgeType(edgeType)

    if (label) {
      lines.push(`    ${source} ${arrow}|${label}| ${target}`)
    } else {
      lines.push(`    ${source} ${arrow} ${target}`)
    }
  })

  emitStyleLines(
    nodes.map((node) => ({
      id: node.id,
      fill: typeof node.data?.fill === 'string' ? node.data.fill : undefined,
      stroke: typeof node.data?.stroke === 'string' ? node.data.stroke : undefined,
      styleExtra: typeof node.data?.styleExtra === 'string' ? node.data.styleExtra : undefined,
    })),
    lines,
  )

  return lines.join('\n')
}

/**
 * Converts a ParsedMermaidDiagram back to Mermaid code
 */
export function parsedDiagramToCode(parsed: ParsedMermaidDiagram): string {
  const lines: string[] = []

  lines.push(`${parsed.type} ${parsed.direction}`)
  lines.push('')

  // Add node definitions
  parsed.nodes.forEach(node => {
    lines.push(`    ${node.id}${shapeSyntaxFor(node.shape, node.label)}`)
  })

  lines.push('')

  // Add edge definitions
  parsed.edges.forEach(edge => {
    const arrow = arrowForEdgeType(edge.type)

    if (edge.label) {
      lines.push(`    ${edge.source} ${arrow}|${edge.label}| ${edge.target}`)
    } else {
      lines.push(`    ${edge.source} ${arrow} ${edge.target}`)
    }
  })

  emitStyleLines(parsed.nodes, lines)

  return lines.join('\n')
}
