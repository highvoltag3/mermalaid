/**
 * Types for parsed Mermaid flowchart elements
 */
export interface MermaidNode {
  id: string
  label: string
  shape: 'rect' | 'rounded' | 'stadium' | 'subroutine' | 'cylinder' | 'circle' | 'doublecircle' | 'diamond' | 'hexagon' | 'parallelogram' | 'trapezoid' | 'trapezoidAlt' | 'rhombus'
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

/**
 * Parses Mermaid flowchart/graph code into structured data
 */
export function parseMermaidFlowchart(code: string): ParsedMermaidDiagram | null {
  const trimmed = code.trim()
  
  // Check if it's a flowchart or graph
  const flowchartMatch = trimmed.match(/^(flowchart|graph)\s+(TD|BT|LR|RL|TB|DT)/i)
  if (!flowchartMatch) {
    return null
  }

  const type = flowchartMatch[1].toLowerCase() as 'flowchart' | 'graph'
  let directionRaw = flowchartMatch[2].toUpperCase()
  
  // Normalize direction
  let direction: 'TD' | 'BT' | 'LR' | 'RL' = 'TD'
  if (directionRaw === 'TB' || directionRaw === 'TD') direction = 'TD'
  else if (directionRaw === 'DT' || directionRaw === 'BT') direction = 'BT'
  else if (directionRaw === 'LR') direction = 'LR'
  else if (directionRaw === 'RL') direction = 'RL'

  const nodes: MermaidNode[] = []
  const edges: MermaidEdge[] = []
  const nodeMap = new Map<string, MermaidNode>()
  const subgraphs: Array<{ id: string; label?: string; nodes: string[] }> = []

  // Remove comments
  const withoutComments = trimmed.replace(/%%[^\n]*/g, '')

  // Split into lines
  const lines = withoutComments.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%'))

  // Parse nodes and edges
  for (const line of lines) {
    // Skip the diagram declaration line
    if (/^(flowchart|graph)\s+(TD|BT|LR|RL|TB|DT)/i.test(line)) {
      continue
    }

    // Parse subgraphs
    const subgraphMatch = line.match(/subgraph\s+(\w+)(?:\s+"([^"]+)")?/i)
    if (subgraphMatch) {
      subgraphs.push({
        id: subgraphMatch[1],
        label: subgraphMatch[2],
        nodes: []
      })
      continue
    }

    if (line === 'end') {
      continue
    }

    // Parse edges: A --> B, A -->|label| B, A --> B(label)
    const edgeMatch = line.match(/^(\w+)\s*([-=.]+>|--|==>|==>|-->)\s*(\|([^|]+)\|)?\s*(\w+)/)
    if (edgeMatch) {
      const source = edgeMatch[1]
      const target = edgeMatch[5]
      const label = edgeMatch[4] || undefined
      const arrowType = edgeMatch[2]

      // Determine edge type
      let type: 'arrow' | 'line' | 'thick' | 'dotted' = 'arrow'
      if (arrowType.includes('==')) type = 'thick'
      if (arrowType.includes('.')) type = 'dotted'
      if (arrowType === '--') type = 'line'

      edges.push({
        source,
        target,
        label,
        type
      })

      // Ensure nodes exist
      if (!nodeMap.has(source)) {
        nodes.push({ id: source, label: source, shape: 'rect' })
        nodeMap.set(source, nodes[nodes.length - 1])
      }
      if (!nodeMap.has(target)) {
        nodes.push({ id: target, label: target, shape: 'rect' })
        nodeMap.set(target, nodes[nodes.length - 1])
      }
      continue
    }

    // Parse node definitions: A[Label], A(Label), A{Label}, etc.
    // Patterns to match:
    // - [label] - rect
    // - (label) - rounded
    // - {label} - diamond
    // - [[label]] - subroutine
    // - ((label)) - stadium
    // - {{label}} - hexagon
    // - [/label/] - parallelogram
    // - [/label\] - trapezoid
    // - [\label/] - trapezoidAlt
    // - [\(label)] - cylinder
    // - [(label)] - circle
    // - (((label))) - doublecircle
    // - [[[label]]] - (not standard but included)
    const nodeMatch = line.match(/^(\w+)(\{\{([^}]+)\}\}|\[\\\\([^\]]+)\/\]|\[\/([^\]]+)\\\]|\[\/([^\]]+)\/\]|\[\[\[([^\]]+)\]\]\]|\(\(\(([^)]+)\)\)\)|\[\[([^\]]+)\]\]|\(\(([^)]+)\)\)|\[\(([^\]]+)\)\]|\(\[([^\]]+)\]\)|\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})/)
    if (nodeMatch) {
      const id = nodeMatch[1]
      const fullMatch = nodeMatch[2]
      
      // Extract label based on which pattern matched (check in order of specificity)
      const label = nodeMatch[3] || // hexagon {{label}}
                    nodeMatch[4] || // trapezoidAlt [\label/]
                    nodeMatch[5] || // trapezoid [/label\]
                    nodeMatch[6] || // parallelogram [/label/]
                    nodeMatch[7] || // [[[label]]]
                    nodeMatch[8] || // doublecircle (((label)))
                    nodeMatch[9] || // subroutine [[label]]
                    nodeMatch[10] || // stadium ((label))
                    nodeMatch[11] || // circle [\(label)]
                    nodeMatch[12] || // cylinder (\[label])
                    nodeMatch[13] || // rect [label]
                    nodeMatch[14] || // rounded (label)
                    nodeMatch[15] || // diamond {label}
                    id
      
      // Determine shape from brackets (check most specific patterns first)
      // IMPORTANT: Check hexagon BEFORE diamond ({{ vs {)
      let shape: MermaidNode['shape'] = 'rect'
      if (fullMatch?.startsWith('{{') && fullMatch?.endsWith('}}')) {
        shape = 'hexagon'
      } else if (fullMatch?.startsWith('{') && fullMatch?.endsWith('}')) {
        // Check diamond AFTER hexagon to avoid false matches
        shape = 'diamond'
      } else if (fullMatch?.startsWith('[\\') && fullMatch?.endsWith('/]')) {
        shape = 'trapezoidAlt'
      } else if (fullMatch?.startsWith('[/') && fullMatch?.endsWith('\\]')) {
        shape = 'trapezoid'
      } else if (fullMatch?.startsWith('[/') && fullMatch?.endsWith('/]')) {
        shape = 'parallelogram'
      } else if (fullMatch?.startsWith('[[[') && fullMatch?.endsWith(']]]')) {
        shape = 'rect' // not a standard shape, treat as rect
      } else if (fullMatch?.startsWith('(((') && fullMatch?.endsWith(')))')) {
        shape = 'doublecircle'
      } else if (fullMatch?.startsWith('[[') && fullMatch?.endsWith(']]')) {
        shape = 'subroutine'
      } else if (fullMatch?.startsWith('((') && fullMatch?.endsWith('))')) {
        shape = 'stadium'
      } else if (fullMatch?.startsWith('[(') && fullMatch?.endsWith(')]')) {
        shape = 'circle'
      } else if (fullMatch?.startsWith('([') && fullMatch?.endsWith('])')) {
        shape = 'cylinder'
      } else if (fullMatch?.startsWith('(') && fullMatch?.endsWith(')')) {
        shape = 'rounded'
      } else if (fullMatch?.startsWith('[') && fullMatch?.endsWith(']')) {
        shape = 'rect'
      }

      if (!nodeMap.has(id)) {
        const node: MermaidNode = { id, label, shape }
        nodes.push(node)
        nodeMap.set(id, node)
      } else {
        // Update existing node
        const existing = nodeMap.get(id)!
        existing.label = label
        existing.shape = shape
      }
    }
  }

  return {
    type,
    direction,
    nodes,
    edges,
    subgraphs: subgraphs.length > 0 ? subgraphs : undefined
  }
}

