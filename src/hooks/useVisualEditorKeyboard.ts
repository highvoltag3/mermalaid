import { useEffect } from 'react'
import type { RefObject } from 'react'

interface KeyboardActions {
  onDelete: () => void
  onUndo: () => void
  onRedo: () => void
  onSelectAll: () => void
  onEscape: () => void
}

export function useVisualEditorKeyboard(
  containerRef: RefObject<HTMLDivElement | null>,
  actions: KeyboardActions
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys when editing an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const isMod = e.metaKey || e.ctrlKey

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        actions.onDelete()
      } else if (isMod && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        actions.onRedo()
      } else if (isMod && e.key === 'z') {
        e.preventDefault()
        actions.onUndo()
      } else if (isMod && e.key === 'y') {
        e.preventDefault()
        actions.onRedo()
      } else if (isMod && e.key === 'a') {
        e.preventDefault()
        actions.onSelectAll()
      } else if (e.key === 'Escape') {
        actions.onEscape()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, actions])
}
