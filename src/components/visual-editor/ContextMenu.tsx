import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { MermaidNode, MermaidEdge } from '../../utils/mermaidParser'
import { useTheme } from '../../contexts/ThemeContext'
import './ContextMenu.css'

const SHAPE_OPTIONS: { value: MermaidNode['shape']; label: string }[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'stadium', label: 'Stadium' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'circle', label: 'Circle' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'subroutine', label: 'Subroutine' },
]

const EDGE_TYPE_OPTIONS: { value: MermaidEdge['type']; label: string; symbol: string }[] = [
  { value: 'arrow', label: 'Arrow', symbol: '→' },
  { value: 'thick', label: 'Thick', symbol: '⇒' },
  { value: 'dotted', label: 'Dotted', symbol: '⇢' },
  { value: 'line', label: 'Line', symbol: '—' },
]

export interface ContextMenuState {
  x: number
  y: number
  type: 'canvas' | 'node' | 'edge'
  targetId?: string
}

interface ContextMenuProps {
  state: ContextMenuState | null
  onClose: () => void
  onAddNode: (shape: MermaidNode['shape'], position: { x: number; y: number }) => void
  onDeleteNode: (id: string) => void
  onDeleteEdge: (id: string) => void
  onChangeShape: (id: string, shape: MermaidNode['shape']) => void
  onChangeEdgeType: (id: string, type: MermaidEdge['type']) => void
  onDuplicateNode: (id: string) => void
  onEditLabel: (id: string) => void
  onAutoLayout: () => void
  flowPosition: { x: number; y: number } | null
}

export default function ContextMenu({
  state,
  onClose,
  onAddNode,
  onDeleteNode,
  onDeleteEdge,
  onChangeShape,
  onChangeEdgeType,
  onDuplicateNode,
  onEditLabel,
  onAutoLayout,
  flowPosition,
}: ContextMenuProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!state) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [state, onClose])

  if (!state) return null

  const renderCanvasMenu = () => (
    <>
      <div className="ctx-menu-group">
        <div className="ctx-menu-group-label">Add Node</div>
        <div className="ctx-menu-shape-grid">
          {SHAPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className="ctx-menu-item compact"
              onClick={() => {
                if (flowPosition) {
                  onAddNode(opt.value, flowPosition)
                }
                onClose()
              }}
            >
              <span className={`shape-preview-sm ${opt.value}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ctx-menu-divider" />
      <button className="ctx-menu-item" onClick={() => { onAutoLayout(); onClose() }}>
        Auto Layout
      </button>
    </>
  )

  const renderNodeMenu = () => (
    <>
      <button className="ctx-menu-item" onClick={() => { onEditLabel(state.targetId!); onClose() }}>
        Edit Label
      </button>
      <button className="ctx-menu-item" onClick={() => { onDuplicateNode(state.targetId!); onClose() }}>
        Duplicate
      </button>
      <div className="ctx-menu-divider" />
      <div className="ctx-menu-group">
        <div className="ctx-menu-group-label">Change Shape</div>
        <div className="ctx-menu-shape-grid">
          {SHAPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className="ctx-menu-item compact"
              onClick={() => { onChangeShape(state.targetId!, opt.value); onClose() }}
            >
              <span className={`shape-preview-sm ${opt.value}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ctx-menu-divider" />
      <button className="ctx-menu-item danger" onClick={() => { onDeleteNode(state.targetId!); onClose() }}>
        Delete
      </button>
    </>
  )

  const renderEdgeMenu = () => (
    <>
      <button className="ctx-menu-item" onClick={() => { onEditLabel(state.targetId!); onClose() }}>
        Edit Label
      </button>
      <div className="ctx-menu-divider" />
      <div className="ctx-menu-group">
        <div className="ctx-menu-group-label">Edge Style</div>
        {EDGE_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className="ctx-menu-item"
            onClick={() => { onChangeEdgeType(state.targetId!, opt.value); onClose() }}
          >
            <span className="edge-type-symbol">{opt.symbol}</span>
            {opt.label}
          </button>
        ))}
      </div>
      <div className="ctx-menu-divider" />
      <button className="ctx-menu-item danger" onClick={() => { onDeleteEdge(state.targetId!); onClose() }}>
        Delete
      </button>
    </>
  )

  return createPortal(
    <div
      ref={menuRef}
      className={`ctx-menu ${isDark ? 'dark' : ''}`}
      style={{ left: state.x, top: state.y }}
    >
      {state.type === 'canvas' && renderCanvasMenu()}
      {state.type === 'node' && renderNodeMenu()}
      {state.type === 'edge' && renderEdgeMenu()}
    </div>,
    document.body
  )
}
