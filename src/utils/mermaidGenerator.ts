import { Node, Edge } from '@xyflow/react'
import { ParsedMermaidDiagram } from './mermaidParser'

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
  const nodeMap = new Map<string, Node>()
  nodes.forEach(node => {
    nodeMap.set(node.id, node)
    const label = node.data?.label || node.id
    const shape = node.data?.shape || 'rect'
    
    let shapeSyntax = ''
    switch (shape) {
      case 'rect':
        shapeSyntax = `[${label}]`
        break
      case 'rounded':
        shapeSyntax = `(${label})`
        break
      case 'diamond':
        shapeSyntax = `{${label}}`
        break
      case 'stadium':
        shapeSyntax = `([${label}])`
        break
      case 'subroutine':
        shapeSyntax = `[[${label}]]`
        break
      case 'parallelogram':
        shapeSyntax = `[/${label}/]`
        break
      case 'cylinder':
        shapeSyntax = `[(${label})]`
        break
      case 'circle':
        shapeSyntax = `((${label}))`
        break
      case 'doublecircle':
        shapeSyntax = `(((${label})))`
        break
      case 'hexagon':
        shapeSyntax = `{{${label}}}`
        break
      case 'trapezoid':
        shapeSyntax = `[/${label}\\]`
        break
      case 'trapezoidAlt':
        shapeSyntax = `[\\${label}/]`
        break
      case 'rhombus':
        shapeSyntax = `{${label}}`
        break
      default:
        shapeSyntax = `[${label}]`
    }
    
    lines.push(`    ${node.id}${shapeSyntax}`)
  })

  lines.push('')

  // Generate edge definitions
  edges.forEach(edge => {
    const source = edge.source
    const target = edge.target
    const label = edge.label || ''
    
    // Determine arrow type from edge data
    const edgeType = edge.data?.type || 'arrow'
    let arrow: string
    switch (edgeType) {
      case 'thick':
        arrow = '==>'
        break
      case 'dotted':
        arrow = '-.->'
        break
      case 'line':
        arrow = '---'
        break
      default:
        arrow = '-->'
    }
    
    if (label) {
      lines.push(`    ${source} ${arrow}|${label}| ${target}`)
    } else {
      lines.push(`    ${source} ${arrow} ${target}`)
    }
  })

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
    let shapeSyntax = ''
    switch (node.shape) {
      case 'rect':
        shapeSyntax = `[${node.label}]`
        break
      case 'rounded':
        shapeSyntax = `(${node.label})`
        break
      case 'diamond':
        shapeSyntax = `{${node.label}}`
        break
      case 'stadium':
        shapeSyntax = `([${node.label}])`
        break
      case 'subroutine':
        shapeSyntax = `[[${node.label}]]`
        break
      case 'parallelogram':
        shapeSyntax = `[/${node.label}/]`
        break
      case 'cylinder':
        shapeSyntax = `[(${node.label})]`
        break
      case 'circle':
        shapeSyntax = `((${node.label}))`
        break
      case 'doublecircle':
        shapeSyntax = `(((${node.label})))`
        break
      case 'hexagon':
        shapeSyntax = `{{${node.label}}}`
        break
      case 'trapezoid':
        shapeSyntax = `[/${node.label}\\]`
        break
      case 'trapezoidAlt':
        shapeSyntax = `[\\${node.label}/]`
        break
      case 'rhombus':
        shapeSyntax = `{${node.label}}`
        break
      default:
        shapeSyntax = `[${node.label}]`
    }
    
    lines.push(`    ${node.id}${shapeSyntax}`)
  })

  lines.push('')

  // Add edge definitions
  parsed.edges.forEach(edge => {
    let arrow: string
    switch (edge.type) {
      case 'thick':
        arrow = '==>'
        break
      case 'dotted':
        arrow = '-.->'
        break
      case 'line':
        arrow = '---'
        break
      default:
        arrow = '-->'
    }
    
    if (edge.label) {
      lines.push(`    ${edge.source} ${arrow}|${edge.label}| ${edge.target}`)
    } else {
      lines.push(`    ${edge.source} ${arrow} ${edge.target}`)
    }
  })

  return lines.join('\n')
}

