/**
 * Types for parsed Mermaid flowchart elements
 */
export type NodeShapeType = 'rect' | 'rounded' | 'stadium' | 'subroutine' | 'cylinder' | 'circle' | 'doublecircle' | 'diamond' | 'hexagon' | 'parallelogram' | 'trapezoid' | 'trapezoidAlt' | 'rhombus'

export interface MermaidNode {
  id: string
  label: string
  shape: NodeShapeType
  style?: string
  class?: string
}

export interface MermaidEdge {
  source: string
  target: string
  label?: string
  style?: string
  type: 'arrow' | 'line' | 'thick' | 'dotted'
}

export interface ParsedMermaidDiagram {
  type: 'flowchart' | 'graph' | 'unsupported'
  direction: 'TD' | 'BT' | 'LR' | 'RL'
  nodes: MermaidNode[]
  edges: MermaidEdge[]
  subgraphs?: Array<{ id: string; label?: string; nodes: string[] }>
}

/**
 * Detects if a Mermaid diagram is a flowchart/graph that can be visually edited
 */
export function isEditableDiagram(code: string): boolean {
  const trimmed = code.trim()
  const flowchartRegex = /^(flowchart|graph)\s+(TD|BT|LR|RL|TB|DT)/i
  return flowchartRegex.test(trimmed)
}

// Node shape patterns ordered from most specific to least specific
const NODE_SHAPE_PATTERNS: { regex: RegExp; shape: NodeShapeType; labelGroup: number }[] = [
  { regex: /(\w+)\{\{([^}]+)\}\}/, shape: 'hexagon', labelGroup: 2 },
  { regex: /(\w+)\[\[([^\]]+)\]\]/, shape: 'subroutine', labelGroup: 2 },
  { regex: /(\w+)\(\(([^)]+)\)\)/, shape: 'doublecircle', labelGroup: 2 },
  { regex: /(\w+)\[\(([^)\]]*)\)\]/, shape: 'cylinder', labelGroup: 2 },
  { regex: /(\w+)\(\[([^\]]*)\]\)/, shape: 'stadium', labelGroup: 2 },
  { regex: /(\w+)\[\/([^\]\\]+)\\]/, shape: 'trapezoid', labelGroup: 2 },
  { regex: /(\w+)\[\\([^\]\/]+)\/]/, shape: 'trapezoidAlt', labelGroup: 2 },
  { regex: /(\w+)\[\/([^\]\/]+)\/]/, shape: 'parallelogram', labelGroup: 2 },
  { regex: /(\w+)\{([^}]+)\}/, shape: 'diamond', labelGroup: 2 },
  { regex: /(\w+)\[([^\]]+)\]/, shape: 'rect', labelGroup: 2 },
  { regex: /(\w+)\(([^)]+)\)/, shape: 'rounded', labelGroup: 2 },
]

/**
 * Extract all node definitions from a line and register them in the nodeMap.
 */
function extractNodesFromLine(
  line: string,
  nodeMap: Map<string, MermaidNode>,
  nodes: MermaidNode[]
): void {
  // Track IDs matched in this line so less-specific patterns don't overwrite
  const matchedInThisLine = new Set<string>()

  for (const pattern of NODE_SHAPE_PATTERNS) {
    const globalRegex = new RegExp(pattern.regex.source, 'g')
    let match
    while ((match = globalRegex.exec(line)) !== null) {
      const id = match[1]
      if (matchedInThisLine.has(id)) continue
      matchedInThisLine.add(id)

      const label = match[pattern.labelGroup] || id

      if (!nodeMap.has(id)) {
        const node: MermaidNode = { id, label, shape: pattern.shape }
        nodes.push(node)
        nodeMap.set(id, node)
      } else {
        // Update existing bare node with shape info from this definition
        const existing = nodeMap.get(id)!
        existing.label = label
        existing.shape = pattern.shape
      }
    }
  }
}

// Edge arrow pattern: captures source ID, skips optional node syntax, matches arrow, optional label, target ID
const ARROW_PATTERN = /(\w+)\s*(?:\{\{[^}]+\}\}|\[\[[^\]]+\]\]|\(\(\([^)]+\)\)\)|\(\([^)]+\)\)|\[\([^\]]*\)\]|\(\[[^\]]*\]\)|\[\/[^\]]+\\]|\[\\[^\]]+\/]|\[\/[^\]]+\/]|\{[^}]+\}|\[[^\]]+\]|\([^)]+\))?\s*([-=.]+>|==>|-->|---?|-.->)\s*(?:\|([^|]+)\|)?\s*(\w+)/

/**
 * Parses Mermaid flowchart/graph code into structured data.
 * Uses a two-pass approach per line:
 * 1. Extract all node definitions (including inline with edges)
 * 2. Extract edge connections
 */
export function parseMermaidFlowchart(code: string): ParsedMermaidDiagram | null {
  const trimmed = code.trim()

  const flowchartMatch = trimmed.match(/^(flowchart|graph)\s+(TD|BT|LR|RL|TB|DT)/i)
  if (!flowchartMatch) {
    return null
  }

  const type = flowchartMatch[1].toLowerCase() as 'flowchart' | 'graph'
  const directionRaw = flowchartMatch[2].toUpperCase()

  let direction: 'TD' | 'BT' | 'LR' | 'RL' = 'TD'
  if (directionRaw === 'TB' || directionRaw === 'TD') direction = 'TD'
  else if (directionRaw === 'DT' || directionRaw === 'BT') direction = 'BT'
  else if (directionRaw === 'LR') direction = 'LR'
  else if (directionRaw === 'RL') direction = 'RL'

  const nodes: MermaidNode[] = []
  const edges: MermaidEdge[] = []
  const nodeMap = new Map<string, MermaidNode>()
  const subgraphs: Array<{ id: string; label?: string; nodes: string[] }> = []

  const withoutComments = trimmed.replace(/%%[^\n]*/g, '')
  const lines = withoutComments.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('%'))

  for (const line of lines) {
    if (/^(flowchart|graph)\s+(TD|BT|LR|RL|TB|DT)/i.test(line)) continue

    const subgraphMatch = line.match(/subgraph\s+(\w+)(?:\s+"([^"]+)")?/i)
    if (subgraphMatch) {
      subgraphs.push({ id: subgraphMatch[1], label: subgraphMatch[2], nodes: [] })
      continue
    }

    if (line === 'end') continue

    // Pass 1: Extract all node definitions from the line
    extractNodesFromLine(line, nodeMap, nodes)

    // Pass 2: Extract edges
    const edgeMatch = line.match(ARROW_PATTERN)
    if (edgeMatch) {
      const source = edgeMatch[1]
      const arrowType = edgeMatch[2]
      const label = edgeMatch[3] || undefined
      const target = edgeMatch[4]

      let edgeType: MermaidEdge['type'] = 'arrow'
      if (arrowType.includes('==')) edgeType = 'thick'
      else if (arrowType.includes('.')) edgeType = 'dotted'
      else if (arrowType === '--' || arrowType === '---') edgeType = 'line'

      edges.push({ source, target, label, type: edgeType })

      // Ensure source/target nodes exist (as bare nodes if not already defined)
      if (!nodeMap.has(source)) {
        const node: MermaidNode = { id: source, label: source, shape: 'rect' }
        nodes.push(node)
        nodeMap.set(source, node)
      }
      if (!nodeMap.has(target)) {
        const node: MermaidNode = { id: target, label: target, shape: 'rect' }
        nodes.push(node)
        nodeMap.set(target, node)
      }
    }
  }

  return {
    type,
    direction,
    nodes,
    edges,
    subgraphs: subgraphs.length > 0 ? subgraphs : undefined,
  }
}
