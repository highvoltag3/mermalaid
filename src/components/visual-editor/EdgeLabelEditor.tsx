import { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

interface EdgeLabelEditorProps {
  edgeId: string
  currentLabel: string
  position: { x: number; y: number }
  onLabelChange: (edgeId: string, label: string) => void
  onClose: () => void
}

export default function EdgeLabelEditor({
  edgeId,
  currentLabel,
  position,
  onLabelChange,
  onClose,
}: EdgeLabelEditorProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [value, setValue] = useState(currentLabel)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const commit = useCallback(() => {
    onLabelChange(edgeId, value.trim())
    onClose()
  }, [edgeId, value, onLabelChange, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
    e.stopPropagation()
  }, [commit, onClose])

  return (
    <div
      className="edge-label-editor"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      }}
    >
      <input
        ref={inputRef}
        className={`edge-label-input ${isDark ? 'dark' : ''}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder="Edge label"
        style={{ width: `${Math.max(value.length * 8, 60)}px` }}
      />
    </div>
  )
}
