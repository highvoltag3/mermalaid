import { useEffect, useRef } from 'react'
import {
  MIN_EDITOR_WIDTH_PX,
  clampEditorWidth,
  getMaxEditorWidth,
} from '../hooks/useEditorWidth'
import './PanelDivider.css'

interface PanelDividerProps {
  /** Current applied editor width in px — where the divider sits and where drags start. */
  width: number
  onWidthChange: (width: number) => void
  /** Live width of the `.app-content` row, used to clamp so the preview stays usable. */
  containerWidth: number
}

/** Keyboard nudge per arrow-key press. */
const KEYBOARD_STEP_PX = 24

/**
 * Draggable separator that sets the editor panel width (GitHub #91). Desktop-only;
 * the caller omits it on the stacked smartphone layout and while the editor is collapsed.
 */
export default function PanelDivider({ width, onWidthChange, containerWidth }: PanelDividerProps) {
  const dragRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)

  // If the divider unmounts mid-drag (e.g. a tablet rotates into the stacked mobile layout),
  // endDrag never fires — make sure the global resize cursor / text-selection lock is cleared.
  useEffect(() => () => document.body.classList.remove('is-resizing-panels'), [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startWidth: width }
    e.currentTarget.setPointerCapture(e.pointerId)
    document.body.classList.add('is-resizing-panels')
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const nextWidth = drag.startWidth + (e.clientX - drag.startX)
    onWidthChange(clampEditorWidth(nextWidth, containerWidth))
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    document.body.classList.remove('is-resizing-panels')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        onWidthChange(clampEditorWidth(width - KEYBOARD_STEP_PX, containerWidth))
        break
      case 'ArrowRight':
        e.preventDefault()
        onWidthChange(clampEditorWidth(width + KEYBOARD_STEP_PX, containerWidth))
        break
      case 'Home':
        e.preventDefault()
        onWidthChange(clampEditorWidth(MIN_EDITOR_WIDTH_PX, containerWidth))
        break
      case 'End':
        e.preventDefault()
        onWidthChange(getMaxEditorWidth(containerWidth))
        break
    }
  }

  return (
    <div
      className="panel-divider"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize editor and preview panels"
      aria-valuenow={Math.round(width)}
      aria-valuemin={MIN_EDITOR_WIDTH_PX}
      aria-valuemax={Math.round(getMaxEditorWidth(containerWidth))}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
    >
      <span className="panel-divider-handle" aria-hidden="true" />
    </div>
  )
}
