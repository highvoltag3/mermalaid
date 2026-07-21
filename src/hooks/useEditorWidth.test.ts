import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  MIN_EDITOR_WIDTH_PX,
  MIN_PREVIEW_WIDTH_PX,
  clampEditorWidth,
  getMaxEditorWidth,
  useEditorWidth,
} from './useEditorWidth'

const STORAGE_KEY = 'mermalaid-editor-width'

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

describe('editor width bounds', () => {
  it('leaves room for the preview pane', () => {
    expect(getMaxEditorWidth(1280)).toBe(1280 - MIN_PREVIEW_WIDTH_PX)
  })

  it('never lets the max drop below the editor minimum', () => {
    // A window too small for both minimums pins the max at the editor minimum.
    expect(getMaxEditorWidth(MIN_EDITOR_WIDTH_PX)).toBe(MIN_EDITOR_WIDTH_PX)
  })

  it('clamps values into [min, max]', () => {
    expect(clampEditorWidth(600, 1280)).toBe(600)
    expect(clampEditorWidth(50, 1280)).toBe(MIN_EDITOR_WIDTH_PX)
    expect(clampEditorWidth(5000, 1280)).toBe(getMaxEditorWidth(1280))
  })
})

describe('useEditorWidth', () => {
  beforeEach(() => {
    localStorage.clear()
    setViewportWidth(1280)
  })

  it('defaults to half the viewport when nothing is stored', () => {
    const { result } = renderHook(() => useEditorWidth())
    expect(result.current[0]).toBe(640)
  })

  it('restores a stored width verbatim', () => {
    localStorage.setItem(STORAGE_KEY, '450')
    const { result } = renderHook(() => useEditorWidth())
    expect(result.current[0]).toBe(450)
  })

  it('keeps an oversized stored width unclamped (consumers clamp for display)', () => {
    // The saved preference is preserved so a wide layout returns when the window grows back.
    localStorage.setItem(STORAGE_KEY, '5000')
    const { result } = renderHook(() => useEditorWidth())
    expect(result.current[0]).toBe(5000)
  })

  it('falls back to the default for a non-numeric or non-positive stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-number')
    expect(renderHook(() => useEditorWidth()).result.current[0]).toBe(640)

    localStorage.setItem(STORAGE_KEY, '-100')
    expect(renderHook(() => useEditorWidth()).result.current[0]).toBe(640)
  })

  it('persists width changes to localStorage, debounced', () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useEditorWidth())
      act(() => {
        result.current[1](720)
      })
      // The write is debounced, so nothing has hit storage yet.
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      act(() => {
        vi.runAllTimers()
      })
      expect(localStorage.getItem(STORAGE_KEY)).toBe('720')
    } finally {
      vi.useRealTimers()
    }
  })
})
