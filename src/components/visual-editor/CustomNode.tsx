import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeToolbar } from '@xyflow/react'
import { normalizeMermaidColor, type MermaidNode } from '../../utils/mermaidParser'
import { useTheme } from '../../hooks/useTheme'
import { isAppThemeDark } from '../../utils/mermaidThemes'
import './CustomNode.css'

export interface CustomNodeData {
  label: string
  shape: MermaidNode['shape']
  id: string
  fill?: string
  stroke?: string
  styleExtra?: string
  isEditing?: boolean
  onLabelChange?: (id: string, label: string) => void
  onStartEditing?: (id: string) => void
  onStopEditing?: (id: string) => void
  onDeleteNode?: (id: string) => void
  onDuplicateNode?: (id: string) => void
  onChangeShape?: (id: string, shape: MermaidNode['shape']) => void
  onChangeColor?: (id: string, colors: { fill?: string; stroke?: string }) => void
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

/** Quick-pick fills for analysts (draw.io-style); custom via native picker. */
const FILL_PRESETS = [
  '#ffcc00',
  '#ff9999',
  '#99ccff',
  '#99e699',
  '#e6b3ff',
  '#ffd9b3',
  '#ffffff',
] as const

/** `<input type="color">` requires #rrggbb. */
function toColorInputValue(color: string | undefined, fallback: string): string {
  const normalized = color ? normalizeMermaidColor(color) : undefined
  if (normalized && /^#[0-9a-f]{6}$/i.test(normalized)) return normalized
  return fallback
}

export default function CustomNode({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  const { mermaidTheme } = useTheme()
  const isDark = isAppThemeDark(mermaidTheme)
  const [editValue, setEditValue] = useState(data.label)
  const [showShapePicker, setShowShapePicker] = useState(false)
  /** Keep NodeToolbar mounted while the OS/native color dialog is open (selection often drops). */
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const showToolbar = (selected || colorPickerOpen) && !data.isEditing

  // Native color dialogs blur the window; when focus returns the picker has closed.
  useEffect(() => {
    if (!colorPickerOpen) return
    const onWindowFocus = () => setColorPickerOpen(false)
    window.addEventListener('focus', onWindowFocus)
    return () => window.removeEventListener('focus', onWindowFocus)
  }, [colorPickerOpen])

  useEffect(() => {
    if (data.isEditing && inputRef.current) {
      setEditValue(data.label)
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [data.isEditing, data.label])

  const beginColorPick = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    setColorPickerOpen(true)
  }, [])

  const applyFill = useCallback(
    (value: string) => {
      data.onChangeColor?.(data.id, { fill: value, stroke: data.stroke })
    },
    [data],
  )

  const applyStroke = useCallback(
    (value: string) => {
      data.onChangeColor?.(data.id, { fill: data.fill, stroke: value })
    },
    [data],
  )

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
  const defaultFill = isDark ? '#2d2d2d' : '#ffffff'
  const defaultStroke = isDark ? '#555555' : '#dddddd'
  const fillValue = toColorInputValue(data.fill, defaultFill)
  const strokeValue = toColorInputValue(data.stroke, defaultStroke)

  const clipPathShapes = new Set([
    'diamond',
    'rhombus',
    'hexagon',
    'parallelogram',
    'trapezoid',
    'trapezoidAlt',
  ])

  return (
    <>
      {showToolbar && (
        <NodeToolbar offset={8} isVisible>
          <div
            className={`node-toolbar nodrag nopan ${isDark ? 'dark' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
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
            <div className="toolbar-color-group" title="Fill color">
              <span className="toolbar-color-label">Fill</span>
              <div className="toolbar-color-presets">
                {FILL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`toolbar-color-swatch ${fillValue === preset ? 'active' : ''}`}
                    style={{ backgroundColor: preset }}
                    title={preset}
                    aria-label={`Fill ${preset}`}
                    onClick={() => applyFill(preset)}
                  />
                ))}
              </div>
              <input
                type="color"
                className="toolbar-color-input nodrag nopan"
                value={fillValue}
                title="Custom fill"
                aria-label="Custom fill color"
                onPointerDown={beginColorPick}
                onInput={(e) => applyFill((e.target as HTMLInputElement).value)}
                onChange={(e) => applyFill(e.target.value)}
              />
            </div>
            <label className="toolbar-color" title="Border color">
              <span className="toolbar-color-label">Border</span>
              <input
                type="color"
                className="toolbar-color-input nodrag nopan"
                value={strokeValue}
                aria-label="Border color"
                onPointerDown={beginColorPick}
                onInput={(e) => applyStroke((e.target as HTMLInputElement).value)}
                onChange={(e) => applyStroke(e.target.value)}
              />
            </label>
            {(data.fill || data.stroke) && (
              <button
                className="toolbar-btn"
                onClick={() => data.onChangeColor?.(data.id, {})}
                title="Clear custom colors"
              >
                Clear
              </button>
            )}
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
        className={`visual-node ${getShapeClass()} ${isDark ? 'dark' : ''} ${selected ? 'selected' : ''} ${data.fill || data.stroke ? 'has-custom-color' : ''}`}
        style={{
          ...(data.fill ? { backgroundColor: data.fill } : {}),
          ...(data.stroke && !clipPathShapes.has(data.shape) ? { borderColor: data.stroke } : {}),
          ...(data.stroke && clipPathShapes.has(data.shape)
            ? { filter: `drop-shadow(0 0 0 ${data.stroke}) drop-shadow(0 0 2px ${data.stroke})` }
            : {}),
        }}
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
