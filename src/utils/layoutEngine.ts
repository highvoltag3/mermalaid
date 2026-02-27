import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'

interface LayoutOptions {
  direction: 'TB' | 'BT' | 'LR' | 'RL'
  nodeWidth?: number
  nodeHeight?: number
  rankSep?: number
  nodeSep?: number
}

const DIRECTION_MAP: Record<string, 'TB' | 'BT' | 'LR' | 'RL'> = {
  TD: 'TB',
  BT: 'BT',
  LR: 'LR',
  RL: 'RL',
}

export function mermaidDirectionToDagre(direction: string): 'TB' | 'BT' | 'LR' | 'RL' {
  return DIRECTION_MAP[direction] ?? 'TB'
}

export function computeLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  if (nodes.length === 0) return nodes

  const nodeWidth = options.nodeWidth ?? 172
  const nodeHeight = options.nodeHeight ?? 50

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: options.direction,
    ranksep: options.rankSep ?? 80,
    nodesep: options.nodeSep ?? 50,
  })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const positioned = g.node(node.id)
    return {
      ...node,
      position: {
        x: positioned.x - nodeWidth / 2,
        y: positioned.y - nodeHeight / 2,
      },
    }
  })
}
