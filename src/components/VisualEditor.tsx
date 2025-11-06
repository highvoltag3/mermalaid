import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  NodeTypes,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ParsedMermaidDiagram } from '../utils/mermaidParser'
import { generateMermaidCode } from '../utils/mermaidGenerator'
import { useTheme } from '../contexts/ThemeContext'
import './VisualEditor.css'

interface VisualEditorProps {
  parsedDiagram: ParsedMermaidDiagram
  onCodeChange: (code: string) => void
}

// Custom node component for better visual representation
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const getShapeStyle = () => {
    const shape = data.shape || 'rect'
    switch (shape) {
      case 'rounded':
        return { borderRadius: '20px' }
      case 'diamond':
      case 'rhombus':
        return {
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        }
      case 'circle':
        return { borderRadius: '50%' }
      case 'doublecircle':
        return { 
          borderRadius: '50%',
          border: '3px solid',
          borderColor: isDark ? '#555' : '#ddd',
        }
      case 'stadium':
        return { borderRadius: '999px' }
      case 'subroutine':
        return { 
          borderRadius: '4px',
          border: '2px solid',
          borderColor: isDark ? '#555' : '#ddd',
        }
      case 'hexagon':
        return {
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
        }
      case 'parallelogram':
        return {
          clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)',
        }
      case 'trapezoid':
        return {
          clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
        }
      case 'trapezoidAlt':
        return {
          clipPath: 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)',
        }
      case 'cylinder':
        return {
          borderRadius: '4px 4px 50% 50%',
        }
      case 'rect':
      default:
        return { borderRadius: '4px' }
    }
  }

  return (
    <div
      className={`visual-node ${isDark ? 'dark' : ''} ${selected ? 'selected' : ''}`}
      style={{
        ...getShapeStyle(),
        backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
        border: `2px solid ${selected ? '#4a9eff' : isDark ? '#555' : '#ddd'}`,
        color: isDark ? '#d4d4d4' : '#333',
        position: 'relative',
      }}
    >
      {/* Source handles - allow connecting from this node */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ 
          background: isDark ? '#4a9eff' : '#1976d2',
          width: '12px',
          height: '12px',
          zIndex: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ 
          background: isDark ? '#4a9eff' : '#1976d2',
          width: '12px',
          height: '12px',
          zIndex: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ 
          background: isDark ? '#4a9eff' : '#1976d2',
          width: '12px',
          height: '12px',
          zIndex: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ 
          background: isDark ? '#4a9eff' : '#1976d2',
          width: '12px',
          height: '12px',
          zIndex: 10,
        }}
      />
      
      {/* Target handles - allow connecting to this node */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ 
          background: isDark ? '#4a9eff' : '#1976d2',
          width: '12px',
          height: '12px',
          zIndex: 10,
        }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ 
          background: isDark ? '#4a9eff' : '#1976d2',
          width: '12px',
          height: '12px',
          zIndex: 10,
        }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ 
          background: isDark ? '#4a9eff' : '#1976d2',
          width: '12px',
          height: '12px',
          zIndex: 10,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ 
          background: isDark ? '#4a9eff' : '#1976d2',
          width: '12px',
          height: '12px',
          zIndex: 10,
        }}
      />
      
      <div style={{ padding: '8px 12px', textAlign: 'center', pointerEvents: 'none' }}>
        {data.label || data.id}
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

export default function VisualEditor({ parsedDiagram, onCodeChange }: VisualEditorProps) {
  const { theme } = useTheme()

  // Convert parsed diagram to react-flow format
  const initialNodes = useMemo<Node[]>(() => {
    return parsedDiagram.nodes.map((node, index) => ({
      id: node.id,
      type: 'custom',
      position: {
        x: (index % 3) * 200 + 50,
        y: Math.floor(index / 3) * 150 + 50,
      },
      data: {
        label: node.label,
        shape: node.shape,
        id: node.id,
      },
    }))
  }, [parsedDiagram.nodes])

  const initialEdges = useMemo<Edge[]>(() => {
    return parsedDiagram.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      data: {
        type: edge.type,
      },
    }))
  }, [parsedDiagram.edges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Track if we're updating from code to prevent cycles
  const isUpdatingFromCodeRef = useRef(false)

  // Update nodes/edges when parsed diagram changes (from code changes)
  useEffect(() => {
    // Check if nodes/edges actually changed to avoid unnecessary updates
    const nodeIds = new Set(nodes.map(n => n.id))
    const edgeIds = new Set(edges.map(e => e.id))
    const parsedNodeIds = new Set(parsedDiagram.nodes.map(n => n.id))
    const parsedEdgeIds = new Set(
      parsedDiagram.edges.map(e => `${e.source}-${e.target}`)
    )

    const nodesChanged = 
      nodes.length !== parsedDiagram.nodes.length ||
      [...parsedNodeIds].some(id => !nodeIds.has(id)) ||
      nodes.some(n => {
        const parsed = parsedDiagram.nodes.find(p => p.id === n.id)
        return !parsed || parsed.label !== (n.data.label || n.id) || parsed.shape !== n.data.shape
      })

    const edgesChanged =
      edges.length !== parsedDiagram.edges.length ||
      [...parsedEdgeIds].some(id => !edgeIds.has(id))

    if (!nodesChanged && !edgesChanged) {
      return
    }

    isUpdatingFromCodeRef.current = true

    const newNodes = parsedDiagram.nodes.map((node, index) => {
      // Try to preserve positions of existing nodes
      const existingNode = nodes.find((n) => n.id === node.id)
      return {
        id: node.id,
        type: 'custom' as const,
        position: existingNode?.position || {
          x: (index % 3) * 200 + 50,
          y: Math.floor(index / 3) * 150 + 50,
        },
        data: {
          label: node.label,
          shape: node.shape,
          id: node.id,
        },
      }
    })

    const newEdges = parsedDiagram.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      type: 'smoothstep' as const,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      data: {
        type: edge.type,
      },
    }))

    setNodes(newNodes)
    setEdges(newEdges)

    // Reset flag after a short delay
    setTimeout(() => {
      isUpdatingFromCodeRef.current = false
    }, 100)
  }, [parsedDiagram]) // eslint-disable-line react-hooks/exhaustive-deps

  // Generate code when nodes or edges change (but not when updating from code)
  useEffect(() => {
    if (isUpdatingFromCodeRef.current) {
      return
    }

    const code = generateMermaidCode(
      nodes,
      edges,
      parsedDiagram.direction,
      parsedDiagram.type === 'unsupported' ? 'flowchart' : parsedDiagram.type
    )
    onCodeChange(code)
  }, [nodes, edges, parsedDiagram.direction, parsedDiagram.type, onCodeChange])

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds))
      }
    },
    [setEdges]
  )

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const currentLabel = typeof node.data?.label === 'string' ? node.data.label : node.id || ''
    const newLabel = prompt('Enter new label:', currentLabel)
    if (newLabel !== null) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, label: newLabel } }
            : n
        )
      )
    }
  }, [setNodes])

  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    const currentLabel = typeof edge.label === 'string' ? edge.label : ''
    const newLabel = prompt('Enter edge label:', currentLabel)
    if (newLabel !== null) {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edge.id ? { ...e, label: newLabel } : e
        )
      )
    }
  }, [setEdges])

  const isDark = theme === 'dark'

  return (
    <div className="visual-editor-container">
      <div className="visual-editor-header">
        <span className="visual-editor-hint">Drag nodes • Connect by dragging from handle to handle • Double-click to edit labels</span>
      </div>
      <div className="visual-editor-content">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          className={isDark ? 'dark' : ''}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
        >
          <Background color={isDark ? '#2d2d2d' : '#f5f5f5'} />
          <Controls />
          <MiniMap
            nodeColor={isDark ? '#2d2d2d' : '#fff'}
            maskColor={isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)'}
          />
        </ReactFlow>
      </div>
    </div>
  )
}

