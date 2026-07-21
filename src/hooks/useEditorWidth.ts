import { useEffect, useState } from 'react'

/** Persisted editor-panel width for the desktop split view (GitHub #91). Preview fills the rest. */
const STORAGE_KEY = 'mermalaid-editor-width'

/** Delay before a width change is written to storage — avoids a disk write on every drag frame. */
const PERSIST_DEBOUNCE_MS = 200

/** Resize bounds — keep both the editor and preview panes usable at any window size. */
export const MIN_EDITOR_WIDTH_PX = 280
export const MIN_PREVIEW_WIDTH_PX = 320

/** A sane desktop width to fall back on when the real viewport isn't measurable yet. */
const FALLBACK_VIEWPORT_WIDTH_PX = 1280

export function viewportWidth(): number {
  const w = typeof window !== 'undefined' ? window.innerWidth : 0
  return w > 0 ? w : FALLBACK_VIEWPORT_WIDTH_PX
}

/** Largest editor width that still leaves {@link MIN_PREVIEW_WIDTH_PX} for the preview pane. */
export function getMaxEditorWidth(containerWidth: number): number {
  return Math.max(MIN_EDITOR_WIDTH_PX, containerWidth - MIN_PREVIEW_WIDTH_PX)
}

export function clampEditorWidth(width: number, containerWidth: number): number {
  return Math.min(Math.max(width, MIN_EDITOR_WIDTH_PX), getMaxEditorWidth(containerWidth))
}

function readStoredWidth(): number | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const parsed = Number.parseInt(saved, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

/**
 * The user's preferred editor width in pixels, persisted to localStorage.
 *
 * This is the *desired* width and is deliberately never clamped here — consumers clamp it to
 * the live container for display, so a wide layout is restored when the window grows back rather
 * than being permanently shrunk. Defaults to half the viewport to match the previous 50/50 split.
 */
export function useEditorWidth() {
  const [width, setWidth] = useState<number>(
    () => readStoredWidth() ?? Math.round(viewportWidth() / 2),
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, String(Math.round(width)))
      } catch {}
    }, PERSIST_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [width])

  return [width, setWidth] as const
}
