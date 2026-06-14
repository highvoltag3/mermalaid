import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { MermaidEdge, ParsedMermaidDiagram } from './mermaidParser'
import type { MermaidNodeLayout } from './mermaidSvgLayout'
import {
  getVisualEditorEdgeStyle,
  type VisualEditorCssVars,
} from './visualEditorTheme'

export function buildFlowEdges(
  edges: MermaidEdge[],
  themeVars: VisualEditorCssVars,
): Edge[] {
  return edges.map((edge) => ({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
    type: 'smoothstep',
    markerEnd: edge.type !== 'line' ? { type: MarkerType.ArrowClosed, color: themeVars['--ve-edge-stroke'] } : undefined,
    style: getVisualEditorEdgeStyle(themeVars, edge.type),
    labelStyle: {
      fill: themeVars['--ve-node-text'],
      fontWeight: 500,
    },
    labelBgStyle: {
      fill: themeVars['--ve-edge-label-bg'],
      fillOpacity: 0.95,
    },
    data: { type: edge.type },
  }))
}

export function buildFlowNodes(
  parsedDiagram: ParsedMermaidDiagram,
  options: {
    layouts?: Map<string, MermaidNodeLayout> | null
    existingNodes?: Node[]
    applyLayout?: (nodes: Node[], edges: Edge[]) => Node[]
  } = {},
): Node[] {
  const { layouts, existingNodes, applyLayout } = options
  const existingById = new Map((existingNodes ?? []).map((node) => [node.id, node]))

  const rawNodes = parsedDiagram.nodes.map((node, index) => {
    const existing = existingById.get(node.id)
    const layout = layouts?.get(node.id)

    const position = existing?.position ?? (layout
      ? { x: layout.x, y: layout.y }
      : {
          x: (index % 3) * 200 + 50,
          y: Math.floor(index / 3) * 150 + 50,
        })

    const width = layout?.width ?? existing?.data?.width
    const height = layout?.height ?? existing?.data?.height

    return {
      id: node.id,
      type: 'custom' as const,
      position,
      data: {
        label: node.label,
        shape: node.shape,
        id: node.id,
        ...(typeof width === 'number' ? { width } : {}),
        ...(typeof height === 'number' ? { height } : {}),
      },
    }
  })

  if (layouts && layouts.size > 0) {
    return rawNodes
  }

  if (applyLayout) {
    const rawEdges = parsedDiagram.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
    }))
    return applyLayout(rawNodes, rawEdges)
  }

  return rawNodes
}
