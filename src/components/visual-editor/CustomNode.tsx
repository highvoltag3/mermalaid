import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeToolbar } from '@xyflow/react'
import type { MermaidNode } from '../../utils/mermaidParser'
import { useTheme } from '../../contexts/ThemeContext'
import './CustomNode.css'

export interface CustomNodeData {
  label: string
  shape: MermaidNode['shape']
  id: string
  isEditing?: boolean
  onLabelChange?: (id: string, label: string) => void
  onStartEditing?: (id: string) => void
  onStopEditing?: (id: string) => void
  onDeleteNode?: (id: string) => void
  onDuplicateNode?: (id: string) => void
  onChangeShape?: (id: string, shape: MermaidNode['shape']) => void
  [key: string]: unknown
}

const SHAPE_OPTIONS: { value: MermaidNode['shape']; label: string }[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'stadium', label: 'Stadium' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'circle', label: 'Circle' },
  { value: 'doublecircle', label: 'Double Circle' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'subroutine', label: 'Subroutine' },
  { value: 'parallelogram', label: 'Parallelogram' },
  { value: 'trapezoid', label: 'Trapezoid' },
  { value: 'trapezoidAlt', label: 'Trapezoid Alt' },
]

const HANDLE_POSITIONS = [
  { position: Position.Top, id: 'top' },
  { position: Position.Right, id: 'right' },
  { position: Position.Bottom, id: 'bottom' },
  { position: Position.Left, id: 'left' },
] as const

export default function CustomNode({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [editValue, setEditValue] = useState(data.label)
  const [showShapePicker, setShowShapePicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (data.isEditing && inputRef.current) {
      setEditValue(data.label)
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [data.isEditing, data.label])

  const commitEdit = useCallback(() => {
    if (editValue.trim() && editValue !== data.label) {
      data.onLabelChange?.(data.id, editValue.trim())
    }
    data.onStopEditing?.(data.id)
  }, [editValue, data])

  const cancelEdit = useCallback(() => {
    setEditValue(data.label)
    data.onStopEditing?.(data.id)
  }, [data])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
    e.stopPropagation()
  }, [commitEdit, cancelEdit])

  const getShapeClass = () => {
    const shape = data.shape || 'rect'
    return `node-shape-${shape}`
  }

  const handleColor = isDark ? '#4a9eff' : '#1976d2'

  return (
    <>
      {selected && !data.isEditing && (
        <NodeToolbar offset={8}>
          <div className={`node-toolbar ${isDark ? 'dark' : ''}`}>
            <div className="node-toolbar-shape">
              <button
                className="toolbar-btn"
                onClick={() => setShowShapePicker(!showShapePicker)}
                title="Change shape"
              >
                Shape
              </button>
              {showShapePicker && (
                <div className={`shape-picker-dropdown ${isDark ? 'dark' : ''}`}>
                  {SHAPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`shape-option ${data.shape === opt.value ? 'active' : ''}`}
                      onClick={() => {
                        data.onChangeShape?.(data.id, opt.value)
                        setShowShapePicker(false)
                      }}
                    >
                      <span className={`shape-preview ${opt.value}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="toolbar-btn"
              onClick={() => data.onDuplicateNode?.(data.id)}
              title="Duplicate node"
            >
              Duplicate
            </button>
            <button
              className="toolbar-btn danger"
              onClick={() => data.onDeleteNode?.(data.id)}
              title="Delete node"
            >
              Delete
            </button>
          </div>
        </NodeToolbar>
      )}

      <div
        className={`visual-node ${getShapeClass()} ${isDark ? 'dark' : ''} ${selected ? 'selected' : ''}`}
        onDoubleClick={(e) => {
          e.stopPropagation()
          data.onStartEditing?.(data.id)
        }}
      >
        {HANDLE_POSITIONS.map(({ position, id }) => (
          <Handle
            key={`source-${id}`}
            type="source"
            position={position}
            id={`${id}-source`}
            style={{ background: handleColor }}
          />
        ))}
        {HANDLE_POSITIONS.map(({ position, id }) => (
          <Handle
            key={`target-${id}`}
            type="target"
            position={position}
            id={`${id}-target`}
            style={{ background: handleColor }}
          />
        ))}

        <div className="node-content">
          {data.isEditing ? (
            <input
              ref={inputRef}
              className={`node-edit-input ${isDark ? 'dark' : ''}`}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitEdit}
              style={{ width: `${Math.max(editValue.length * 8, 40)}px` }}
            />
          ) : (
            <span className="node-label">{data.label || data.id}</span>
          )}
        </div>
      </div>
    </>
  )
}
