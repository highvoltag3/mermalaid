import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ParsedMermaidDiagram, MermaidNode, MermaidEdge } from '../utils/mermaidParser'
import { generateMermaidCode } from '../utils/mermaidGenerator'
import { useTheme } from '../hooks/useTheme'
import { isAppThemeDark } from '../utils/mermaidThemes'
import { useAutoLayout } from '../hooks/useAutoLayout'
import { useUndoRedo } from '../hooks/useUndoRedo'
import { useVisualEditorKeyboard } from '../hooks/useVisualEditorKeyboard'
import CustomNode from './visual-editor/CustomNode'
import AddNodeToolbar from './visual-editor/AddNodeToolbar'
import ContextMenu, { ContextMenuState } from './visual-editor/ContextMenu'
import EdgeLabelEditor from './visual-editor/EdgeLabelEditor'
import './VisualEditor.css'

interface VisualEditorProps {
  parsedDiagram: ParsedMermaidDiagram
  onCodeChange: (code: string) => void
}

const nodeTypes: NodeTypes = { custom: CustomNode }

let nodeCounter = 0

function generateNodeId(existingNodes: Node[]): string {
  const existingIds = new Set(existingNodes.map((n) => n.id))
  while (existingIds.has(`node_${++nodeCounter}`)) {}
  return `node_${nodeCounter}`
}

function VisualEditorInner({ parsedDiagram, onCodeChange }: VisualEditorProps) {
  const { mermaidTheme } = useTheme()
  const isDark = isAppThemeDark(mermaidTheme)
  const containerRef = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useReactFlow()

  const { applyLayout } = useAutoLayout(parsedDiagram.direction)
  const { pushState, undo, redo, canUndo, canRedo } = useUndoRedo()

  const isUpdatingFromCodeRef = useRef(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingEdge, setEditingEdge] = useState<{ id: string; label: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [contextFlowPos, setContextFlowPos] = useState<{ x: number; y: number } | null>(null)

  // Build initial nodes from parsed diagram with dagre layout
  const initialNodes = useMemo<Node[]>(() => {
    const rawNodes = parsedDiagram.nodes.map((node) => ({
      id: node.id,
      type: 'custom' as const,
      position: { x: 0, y: 0 },
      data: { label: node.label, shape: node.shape, id: node.id },
    }))
    const rawEdges = parsedDiagram.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
    }))
    return applyLayout(rawNodes, rawEdges)
  }, [parsedDiagram.nodes, parsedDiagram.edges, applyLayout])

  const initialEdges = useMemo<Edge[]>(() => {
    return parsedDiagram.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      type: 'smoothstep',
      markerEnd: edge.type !== 'line' ? { type: MarkerType.ArrowClosed } : undefined,
      style: edge.type === 'thick'
        ? { strokeWidth: 3 }
        : edge.type === 'dotted'
          ? { strokeDasharray: '5 5' }
          : undefined,
      data: { type: edge.type },
    }))
  }, [parsedDiagram.edges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Inject callbacks into node data so CustomNode can call them
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isEditing: editingNodeId === node.id,
        onLabelChange: (id: string, label: string) => {
          pushState({ nodes, edges })
          setNodes((nds) =>
            nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n))
          )
        },
        onStartEditing: (id: string) => setEditingNodeId(id),
        onStopEditing: () => setEditingNodeId(null),
        onDeleteNode: (id: string) => deleteNodes([id]),
        onDuplicateNode: (id: string) => duplicateNode(id),
        onChangeShape: (id: string, shape: MermaidNode['shape']) => {
          pushState({ nodes, edges })
          setNodes((nds) =>
            nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, shape } } : n))
          )
        },
      },
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, editingNodeId])

  // Sync from code changes
  useEffect(() => {
    const nodeIds = new Set(nodes.map((n) => n.id))
    const edgeIds = new Set(edges.map((e) => e.id))
    const parsedNodeIds = new Set(parsedDiagram.nodes.map((n) => n.id))
    const parsedEdgeIds = new Set(parsedDiagram.edges.map((e) => `${e.source}-${e.target}`))

    const nodesChanged =
      nodes.length !== parsedDiagram.nodes.length ||
      [...parsedNodeIds].some((id) => !nodeIds.has(id)) ||
      nodes.some((n) => {
        const parsed = parsedDiagram.nodes.find((p) => p.id === n.id)
        return !parsed || parsed.label !== (n.data.label || n.id) || parsed.shape !== n.data.shape
      })

    const edgesChanged =
      edges.length !== parsedDiagram.edges.length ||
      [...parsedEdgeIds].some((id) => !edgeIds.has(id))

    if (!nodesChanged && !edgesChanged) return

    isUpdatingFromCodeRef.current = true

    const newNodes = parsedDiagram.nodes.map((node, index) => {
      const existingNode = nodes.find((n) => n.id === node.id)
      return {
        id: node.id,
        type: 'custom' as const,
        position: existingNode?.position || {
          x: (index % 3) * 200 + 50,
          y: Math.floor(index / 3) * 150 + 50,
        },
        data: { label: node.label, shape: node.shape, id: node.id },
      }
    })

    // Apply dagre layout only if there are new nodes without positions
    const hasNewNodes = parsedDiagram.nodes.some(
      (n) => !nodes.find((existing) => existing.id === n.id)
    )

    const newEdges = parsedDiagram.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      type: 'smoothstep' as const,
      markerEnd: edge.type !== 'line' ? { type: MarkerType.ArrowClosed } : undefined,
      style: edge.type === 'thick'
        ? { strokeWidth: 3 }
        : edge.type === 'dotted'
          ? { strokeDasharray: '5 5' }
          : undefined,
      data: { type: edge.type },
    }))

    if (hasNewNodes) {
      setNodes(applyLayout(newNodes, newEdges))
    } else {
      setNodes(newNodes)
    }
    setEdges(newEdges)

    setTimeout(() => {
      isUpdatingFromCodeRef.current = false
    }, 100)
  }, [parsedDiagram]) // eslint-disable-line react-hooks/exhaustive-deps

  // Generate code when nodes/edges change from user actions
  useEffect(() => {
    if (isUpdatingFromCodeRef.current) return

    const code = generateMermaidCode(
      nodes,
      edges,
      parsedDiagram.direction,
      parsedDiagram.type === 'unsupported' ? 'flowchart' : parsedDiagram.type
    )
    onCodeChange(code)
  }, [nodes, edges, parsedDiagram.direction, parsedDiagram.type, onCodeChange])

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        pushState({ nodes, edges })
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
              data: { type: 'arrow' },
            },
            eds
          )
        )
      }
    },
    [setEdges, pushState, nodes, edges]
  )

  // Node drag stop -> push undo state
  const onNodeDragStop = useCallback(() => {
    pushState({ nodes, edges })
  }, [pushState, nodes, edges])

  // Delete functions
  const deleteNodes = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      pushState({ nodes, edges })
      const idSet = new Set(ids)
      setEdges((eds) => eds.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)))
      setNodes((nds) => nds.filter((n) => !idSet.has(n.id)))
    },
    [pushState, nodes, edges, setNodes, setEdges]
  )

  const deleteEdges = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      pushState({ nodes, edges })
      const idSet = new Set(ids)
      setEdges((eds) => eds.filter((e) => !idSet.has(e.id)))
    },
    [pushState, nodes, edges, setEdges]
  )

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id)
    const selectedEdgeIds = edges.filter((e) => e.selected).map((e) => e.id)
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return

    pushState({ nodes, edges })
    const nodeIdSet = new Set(selectedNodeIds)
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !selectedEdgeIds.includes(e.id) &&
          !nodeIdSet.has(e.source) &&
          !nodeIdSet.has(e.target)
      )
    )
    setNodes((nds) => nds.filter((n) => !nodeIdSet.has(n.id)))
  }, [nodes, edges, pushState, setNodes, setEdges])

  // Add node
  const addNode = useCallback(
    (shape: MermaidNode['shape'], position?: { x: number; y: number }) => {
      pushState({ nodes, edges })
      const id = generateNodeId(nodes)
      const pos = position || reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
      const newNode: Node = {
        id,
        type: 'custom',
        position: pos,
        data: { label: id, shape, id },
      }
      setNodes((nds) => [...nds, newNode])
      // Start editing immediately so user can name it
      setTimeout(() => setEditingNodeId(id), 50)
    },
    [pushState, nodes, edges, setNodes, reactFlowInstance]
  )

  // Duplicate node
  const duplicateNode = useCallback(
    (sourceId: string) => {
      const sourceNode = nodes.find((n) => n.id === sourceId)
      if (!sourceNode) return
      pushState({ nodes, edges })
      const id = generateNodeId(nodes)
      const newNode: Node = {
        id,
        type: 'custom',
        position: { x: sourceNode.position.x + 30, y: sourceNode.position.y + 30 },
        data: { label: sourceNode.data.label, shape: sourceNode.data.shape, id },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [nodes, edges, pushState, setNodes]
  )

  // Auto layout
  const handleAutoLayout = useCallback(() => {
    pushState({ nodes, edges })
    setNodes(applyLayout(nodes, edges))
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 50)
  }, [pushState, nodes, edges, setNodes, applyLayout, reactFlowInstance])

  // Undo/Redo handlers - don't set isUpdatingFromCodeRef so code-gen useEffect runs
  const handleUndo = useCallback(() => {
    const prev = undo({ nodes, edges })
    if (prev) {
      setNodes(prev.nodes)
      setEdges(prev.edges)
    }
  }, [undo, nodes, edges, setNodes, setEdges])

  const handleRedo = useCallback(() => {
    const next = redo({ nodes, edges })
    if (next) {
      setNodes(next.nodes)
      setEdges(next.edges)
    }
  }, [redo, nodes, edges, setNodes, setEdges])

  // Select all
  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })))
    setEdges((eds) => eds.map((e) => ({ ...e, selected: true })))
  }, [setNodes, setEdges])

  // Escape handler
  const handleEscape = useCallback(() => {
    setEditingNodeId(null)
    setEditingEdge(null)
    setContextMenu(null)
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })))
  }, [setNodes, setEdges])

  // Keyboard shortcuts
  useVisualEditorKeyboard(containerRef, {
    onDelete: deleteSelected,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSelectAll: selectAll,
    onEscape: handleEscape,
  })

  // Context menu handlers
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      const flowPos = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      setContextFlowPos(flowPos)
      setContextMenu({ x: event.clientX, y: event.clientY, type: 'canvas' })
    },
    [reactFlowInstance]
  )

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      event.stopPropagation()
      setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', targetId: node.id })
    },
    []
  )

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      event.stopPropagation()
      setContextMenu({ x: event.clientX, y: event.clientY, type: 'edge', targetId: edge.id })
    },
    []
  )

  // Double-click edge to edit label
  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    const label = typeof edge.label === 'string' ? edge.label : ''
    setEditingEdge({ id: edge.id, label })
  }, [])

  // Edge label change
  const handleEdgeLabelChange = useCallback(
    (edgeId: string, label: string) => {
      pushState({ nodes, edges })
      setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, label } : e)))
    },
    [pushState, nodes, edges, setEdges]
  )

  // Change edge type
  const handleChangeEdgeType = useCallback(
    (edgeId: string, edgeType: MermaidEdge['type']) => {
      pushState({ nodes, edges })
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId
            ? {
                ...e,
                data: { ...e.data, type: edgeType },
                markerEnd: edgeType !== 'line' ? { type: MarkerType.ArrowClosed } : undefined,
                style: edgeType === 'thick'
                  ? { strokeWidth: 3 }
                  : edgeType === 'dotted'
                    ? { strokeDasharray: '5 5' }
                    : undefined,
              }
            : e
        )
      )
    },
    [pushState, nodes, edges, setEdges]
  )

  // Edit label from context menu
  const handleEditLabel = useCallback(
    (targetId: string) => {
      // Check if it's a node or edge
      const isNode = nodes.some((n) => n.id === targetId)
      if (isNode) {
        setEditingNodeId(targetId)
      } else {
        const edge = edges.find((e) => e.id === targetId)
        if (edge) {
          setEditingEdge({ id: edge.id, label: typeof edge.label === 'string' ? edge.label : '' })
        }
      }
    },
    [nodes, edges]
  )

  // Compute edge label editor position
  const getEdgeLabelPosition = useCallback(
    (edgeId: string) => {
      const edge = edges.find((e) => e.id === edgeId)
      if (!edge) return { x: 0, y: 0 }
      const sourceNode = nodes.find((n) => n.id === edge.source)
      const targetNode = nodes.find((n) => n.id === edge.target)
      if (!sourceNode || !targetNode) return { x: 0, y: 0 }

      return {
        x: (sourceNode.position.x + targetNode.position.x) / 2 + 80,
        y: (sourceNode.position.y + targetNode.position.y) / 2 + 25,
      }
    },
    [edges, nodes]
  )

  return (
    <div className="visual-editor-container" ref={containerRef} tabIndex={0}>
      <div className={`visual-editor-header ${isDark ? 'dark' : ''}`}>
        <div className="ve-header-actions">
          <AddNodeToolbar onAddNode={(shape) => addNode(shape)} />
          <div className="ve-header-divider" />
          <button
            className={`ve-header-btn ${isDark ? 'dark' : ''}`}
            onClick={handleAutoLayout}
            title="Auto-arrange nodes"
          >
            Layout
          </button>
          <div className="ve-header-divider" />
          <button
            className={`ve-header-btn ${isDark ? 'dark' : ''}`}
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            className={`ve-header-btn ${isDark ? 'dark' : ''}`}
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo
          </button>
          <div className="ve-header-divider" />
          <button
            className={`ve-header-btn danger ${isDark ? 'dark' : ''}`}
            onClick={deleteSelected}
            title="Delete selected (Del)"
          >
            Delete
          </button>
        </div>
        <span className="visual-editor-hint">
          Double-click to edit &middot; Right-click for menu &middot; Drag handles to connect
        </span>
      </div>
      <div className="visual-editor-content">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onContextMenu={handleContextMenu}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          nodeTypes={nodeTypes}
          fitView
          className={isDark ? 'dark' : ''}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          deleteKeyCode={null}
        >
          <Background color={isDark ? '#333' : '#e8e8e8'} gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={isDark ? '#3d3d3d' : '#e8e8e8'}
            maskColor={isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)'}
          />

          {editingEdge && (
            <EdgeLabelEditor
              edgeId={editingEdge.id}
              currentLabel={editingEdge.label}
              position={getEdgeLabelPosition(editingEdge.id)}
              onLabelChange={handleEdgeLabelChange}
              onClose={() => setEditingEdge(null)}
            />
          )}
        </ReactFlow>
      </div>

      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddNode={(shape, position) => addNode(shape, position)}
        onDeleteNode={(id) => deleteNodes([id])}
        onDeleteEdge={(id) => deleteEdges([id])}
        onChangeShape={(id, shape) => {
          pushState({ nodes, edges })
          setNodes((nds) =>
            nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, shape } } : n))
          )
        }}
        onChangeEdgeType={handleChangeEdgeType}
        onDuplicateNode={duplicateNode}
        onEditLabel={handleEditLabel}
        onAutoLayout={handleAutoLayout}
        flowPosition={contextFlowPos}
      />
    </div>
  )
}

export default function VisualEditor(props: VisualEditorProps) {
  return (
    <ReactFlowProvider>
      <VisualEditorInner {...props} />
    </ReactFlowProvider>
  )
}
