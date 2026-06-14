import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
import type { MermaidYamlConfig } from '../utils/mermaidYamlConfig'
import { generateMermaidCode } from '../utils/mermaidGenerator'
import { useTheme } from '../hooks/useTheme'
import { isAppThemeDark } from '../utils/mermaidThemes'
import { useAutoLayout } from '../hooks/useAutoLayout'
import { useMermaidSvgLayout } from '../hooks/useMermaidSvgLayout'
import { useUndoRedo } from '../hooks/useUndoRedo'
import { useVisualEditorKeyboard } from '../hooks/useVisualEditorKeyboard'
import { buildFlowEdges, buildFlowNodes } from '../utils/visualEditorGraph'
import {
  getVisualEditorCssVars,
  getVisualEditorEdgeStyle,
} from '../utils/visualEditorTheme'
import CustomNode from './visual-editor/CustomNode'
import AddNodeToolbar from './visual-editor/AddNodeToolbar'
import ContextMenu, { ContextMenuState } from './visual-editor/ContextMenu'
import EdgeLabelEditor from './visual-editor/EdgeLabelEditor'
import './VisualEditor.css'

interface VisualEditorProps {
  parsedDiagram: ParsedMermaidDiagram
  diagramCode: string
  yamlConfig?: MermaidYamlConfig
  onCodeChange: (code: string) => void
}

const nodeTypes: NodeTypes = { custom: CustomNode }

let nodeCounter = 0

function generateNodeId(existingNodes: Node[]): string {
  const existingIds = new Set(existingNodes.map((n) => n.id))
  while (existingIds.has(`node_${++nodeCounter}`)) {}
  return `node_${nodeCounter}`
}

function VisualEditorInner({
  parsedDiagram,
  diagramCode,
  yamlConfig,
  onCodeChange,
}: VisualEditorProps) {
  const { mermaidTheme } = useTheme()
  const isDark = isAppThemeDark(mermaidTheme)
  const themeVars = useMemo(
    () => getVisualEditorCssVars(mermaidTheme, yamlConfig),
    [mermaidTheme, yamlConfig],
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useReactFlow()
  const svgLayoutAppliedRef = useRef('')

  const nodeIds = useMemo(
    () => parsedDiagram.nodes.map((node) => node.id),
    [parsedDiagram.nodes],
  )
  const svgLayouts = useMermaidSvgLayout(diagramCode, nodeIds, mermaidTheme, yamlConfig)

  const { applyLayout } = useAutoLayout(parsedDiagram.direction)
  const { pushState, undo, redo, canUndo, canRedo } = useUndoRedo()

  const isUpdatingFromCodeRef = useRef(false)
  const preserveNodePositionsOnNextSyncRef = useRef(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingEdge, setEditingEdge] = useState<{ id: string; label: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [contextFlowPos, setContextFlowPos] = useState<{ x: number; y: number } | null>(null)

  const initialNodes = useMemo(
    () => buildFlowNodes(parsedDiagram, { applyLayout }),
    [parsedDiagram, applyLayout],
  )

  const initialEdges = useMemo(
    () => buildFlowEdges(parsedDiagram.edges, themeVars),
    [parsedDiagram.edges, themeVars],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    if (svgLayouts !== null) return
    const timer = setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 80)
    return () => clearTimeout(timer)
  }, [svgLayouts, reactFlowInstance])

  useEffect(() => {
    if (svgLayouts === null) return

    const layoutKey = `${diagramCode}\u0000${svgLayouts.size}`
    if (svgLayoutAppliedRef.current === layoutKey) return
    svgLayoutAppliedRef.current = layoutKey

    if (svgLayouts.size === 0) {
      setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 50)
      return
    }

    setNodes((current) =>
      buildFlowNodes(parsedDiagram, { layouts: svgLayouts, existingNodes: current }),
    )
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 50)
  }, [svgLayouts, diagramCode, parsedDiagram, reactFlowInstance, setNodes])

  useEffect(() => {
    setEdges((current) =>
      current.map((edge) => {
        const edgeType = (edge.data?.type as MermaidEdge['type'] | undefined) ?? 'arrow'
        return {
          ...edge,
          markerEnd:
            edgeType !== 'line'
              ? { type: MarkerType.ArrowClosed, color: themeVars['--ve-edge-stroke'] }
              : undefined,
          style: getVisualEditorEdgeStyle(themeVars, edgeType),
          labelStyle: {
            fill: themeVars['--ve-node-text'],
            fontWeight: 500,
          },
          labelBgStyle: {
            fill: themeVars['--ve-edge-label-bg'],
            fillOpacity: 0.95,
          },
        }
      }),
    )
  }, [themeVars, setEdges])

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

    const newNodes = buildFlowNodes(parsedDiagram, {
      layouts: svgLayouts,
      existingNodes: nodes,
    })

    const newEdges = buildFlowEdges(parsedDiagram.edges, themeVars)

    if (preserveNodePositionsOnNextSyncRef.current) {
      preserveNodePositionsOnNextSyncRef.current = false
      setEdges(newEdges)
      setTimeout(() => {
        isUpdatingFromCodeRef.current = false
      }, 100)
      return
    }

    // Keep user-placed positions stable during code/edge sync.
    setNodes(newNodes)
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
        preserveNodePositionsOnNextSyncRef.current = true
        pushState({ nodes, edges })
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              type: 'smoothstep',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: themeVars['--ve-edge-stroke'],
              },
              style: getVisualEditorEdgeStyle(themeVars, 'arrow'),
              data: { type: 'arrow' },
            },
            eds
          )
        )
      }
    },
    [setEdges, pushState, nodes, edges, themeVars]
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
                markerEnd:
                  edgeType !== 'line'
                    ? { type: MarkerType.ArrowClosed, color: themeVars['--ve-edge-stroke'] }
                    : undefined,
                style: getVisualEditorEdgeStyle(themeVars, edgeType),
              }
            : e
        )
      )
    },
    [pushState, nodes, edges, setEdges, themeVars]
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
    <div
      className="visual-editor-container"
      ref={containerRef}
      tabIndex={0}
      style={themeVars as CSSProperties}
    >
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
          defaultEdgeOptions={{
            style: getVisualEditorEdgeStyle(themeVars, 'arrow'),
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: themeVars['--ve-edge-stroke'],
            },
          }}
          fitView={false}
          className={isDark ? 'dark' : ''}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          deleteKeyCode={null}
        >
          <Background color={themeVars['--ve-header-border']} gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={themeVars['--ve-node-fill']}
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
