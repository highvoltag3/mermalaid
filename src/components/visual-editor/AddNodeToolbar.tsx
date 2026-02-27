import { useState, useRef, useEffect } from 'react'
import type { MermaidNode } from '../../utils/mermaidParser'
import { useTheme } from '../../contexts/ThemeContext'
import './AddNodeToolbar.css'

const SHAPE_OPTIONS: { value: MermaidNode['shape']; label: string }[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'stadium', label: 'Stadium' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'circle', label: 'Circle' },
  { value: 'doublecircle', label: 'Dbl Circle' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'subroutine', label: 'Subroutine' },
  { value: 'parallelogram', label: 'Parallel' },
  { value: 'trapezoid', label: 'Trapezoid' },
  { value: 'trapezoidAlt', label: 'Trap. Alt' },
]

interface AddNodeToolbarProps {
  onAddNode: (shape: MermaidNode['shape']) => void
}

export default function AddNodeToolbar({ onAddNode }: AddNodeToolbarProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="add-node-wrapper" ref={dropdownRef}>
      <button
        className={`ve-header-btn primary ${isDark ? 'dark' : ''}`}
        onClick={() => setOpen(!open)}
        title="Add a new node"
      >
        + Add Node
      </button>
      {open && (
        <div className={`add-node-dropdown ${isDark ? 'dark' : ''}`}>
          <div className="add-node-grid">
            {SHAPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className="add-node-option"
                onClick={() => {
                  onAddNode(opt.value)
                  setOpen(false)
                }}
              >
                <span className={`shape-preview ${opt.value}`} />
                <span className="shape-name">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
