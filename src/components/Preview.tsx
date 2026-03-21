import { useEffect, useRef, useState, type RefObject } from 'react'
import { renderMermaid } from 'beautiful-mermaid'
import {
  TransformComponent,
  TransformWrapper,
  getCenterPosition,
  useControls,
  type ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch'
import { useTheme } from '../hooks/useTheme'
import { replaceMermaidBlock, type MermaidBlock } from '../utils/mermaidCodeBlock'
import { getMermaidThemeOptions } from '../utils/mermaidThemes'
import { isEditableDiagram, parseMermaidFlowchart } from '../utils/mermaidParser'
import VisualEditor from './VisualEditor'
import './Preview.css'

const MIN_PREVIEW_ZOOM = 0.2
const MAX_PREVIEW_ZOOM = 4
const FIT_PADDING = 0.92

/**
 * TransformComponent renders: viewport (wrapper) > transformed layer (content) > children.
 * Measure those DOM nodes explicitly so fit math matches the visible viewport, not any outer stack.
 */
function getTransformViewportElements(svgHost: HTMLElement | null): {
  wrapper: HTMLElement
  content: HTMLElement
} | null {
  if (!svgHost) return null
  const content = svgHost.parentElement
  const wrapper = content?.parentElement ?? null
  if (!content || !wrapper) return null
  return { wrapper, content }
}

function fitPreviewToScreen(
  api: ReactZoomPanPinchContentRef | null,
  svgHost: HTMLElement | null,
) {
  if (!api) return
  let attempts = 0
  const run = () => {
    attempts += 1
    if (attempts > 32) return
    const fromDom = getTransformViewportElements(svgHost)
    const wrapper = fromDom?.wrapper ?? api.instance.wrapperComponent
    const content = fromDom?.content ?? api.instance.contentComponent
    if (!wrapper || !content) {
      requestAnimationFrame(run)
      return
    }
    const cw = content.offsetWidth
    const ch = content.offsetHeight
    if (cw < 2 || ch < 2) {
      requestAnimationFrame(run)
      return
    }
    const w = wrapper.offsetWidth
    const h = wrapper.offsetHeight
    if (w < 2 || h < 2) {
      requestAnimationFrame(run)
      return
    }
    const scale = Math.min(w / cw, h / ch) * FIT_PADDING
    const clamped = Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, scale))
    const { positionX, positionY } = getCenterPosition(
      clamped,
      wrapper as HTMLDivElement,
      content as HTMLDivElement,
    )
    api.setTransform(positionX, positionY, clamped, 200)
  }
  requestAnimationFrame(run)
}

function PreviewZoomToolbar({
  visible,
  svgHostRef,
}: {
  visible: boolean
  svgHostRef: RefObject<HTMLDivElement | null>
}) {
  const api = useControls()

  if (!visible) return null
  return (
    <div className="preview-zoom-toolbar" role="toolbar" aria-label="Preview zoom">
      <button
        type="button"
        className="preview-zoom-btn"
        onClick={() => api.zoomOut(0.4, 200)}
        title="Zoom out"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        type="button"
        className="preview-zoom-btn preview-zoom-btn-wide"
        onClick={() => fitPreviewToScreen(api, svgHostRef.current)}
        title="Fit diagram to view (scroll or pinch to zoom, drag to pan)"
        aria-label="Fit diagram to view"
      >
        Fit
      </button>
      <button
        type="button"
        className="preview-zoom-btn"
        onClick={() => api.zoomIn(0.4, 200)}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        className="preview-zoom-btn"
        onClick={() => api.resetTransform(200)}
        title="Reset zoom and position to defaults"
        aria-label="Reset zoom and position"
      >
        100%
      </button>
    </div>
  )
}

interface PreviewProps {
  code: string
  setError: (error: string | null) => void
  onCodeChange?: (code: string) => void
  activeCode: string
  mermaidBlocks: MermaidBlock[]
  selectedBlockIndex: number
  setSelectedBlockIndex: (index: number | ((prev: number) => number)) => void
}

export default function Preview({
  code, setError, onCodeChange,
  activeCode, mermaidBlocks, selectedBlockIndex, setSelectedBlockIndex,
}: PreviewProps) {
  const { mermaidTheme } = useTheme()
  const previewRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null)
  const renderIdRef = useRef(0)
  const [isEditMode, setIsEditMode] = useState(false)
  const [diagramReady, setDiagramReady] = useState(false)
  const [previewFitTick, setPreviewFitTick] = useState(0)
  const prevBlockIndex = useRef(selectedBlockIndex)

  // Reset edit mode when switching blocks
  useEffect(() => {
    if (selectedBlockIndex !== prevBlockIndex.current) {
      prevBlockIndex.current = selectedBlockIndex
      setIsEditMode(false)
    }
  }, [selectedBlockIndex])

  const hasMultipleBlocks = mermaidBlocks.length > 1
  const trimmedCode = activeCode.trim()
  const parsedDiagram = trimmedCode ? parseMermaidFlowchart(trimmedCode) : null
  const canEdit = parsedDiagram !== null && isEditableDiagram(trimmedCode)

  const handleCodeChange = (newCode: string) => {
    if (!onCodeChange) return

    if (mermaidBlocks.length > 0 && mermaidBlocks[selectedBlockIndex]) {
      const updated = replaceMermaidBlock(code, mermaidBlocks[selectedBlockIndex], newCode)
      onCodeChange(updated)
    } else {
      onCodeChange(newCode)
    }
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!previewRef.current) return

      const currentId = ++renderIdRef.current
      const container = previewRef.current

      if (isEditMode && canEdit) {
        return
      }

      if (!trimmedCode) {
        if (renderIdRef.current === currentId) {
          container.innerHTML = '<div class="empty-preview">Start typing your Mermaid diagram...</div>'
          setError(null)
          setDiagramReady(false)
        }
        return
      }

      try {
        const themeOptions = getMermaidThemeOptions(mermaidTheme)
        const svg = await renderMermaid(trimmedCode, themeOptions)

        if (renderIdRef.current === currentId && container) {
          container.innerHTML = svg
          setError(null)
          setDiagramReady(true)
          setPreviewFitTick((t) => t + 1)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Invalid Mermaid syntax'
        setError(errorMsg)
        if (renderIdRef.current === currentId && container) {
          container.innerHTML = `<div class="error-preview">${errorMsg}<div class="error-recovery-hint">Try creating a new diagram (New button) or opening a valid .mmd file.</div></div>`
          setDiagramReady(false)
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [code, setError, mermaidTheme, isEditMode, canEdit, trimmedCode])

  // Run fit in useEffect (not useLayoutEffect): TransformWrapper applies `disabled` via instance.update
  // in useEffect. Child effects run before parent effects, so this runs after `disabled` is false.
  // `setTransform` no-ops while disabled. previewFitTick bumps on each successful SVG inject.
  useEffect(() => {
    if (!diagramReady) return
    const id = requestAnimationFrame(() =>
      fitPreviewToScreen(transformRef.current, previewRef.current),
    )
    return () => cancelAnimationFrame(id)
  }, [diagramReady, previewFitTick])

  const blockSelector = hasMultipleBlocks && (
    <div className="block-selector">
      <button
        className="block-selector-btn"
        onClick={() => setSelectedBlockIndex((i: number) => Math.max(0, i - 1))}
        disabled={selectedBlockIndex === 0}
      >
        ‹
      </button>
      <span className="block-selector-label">
        Block {selectedBlockIndex + 1} of {mermaidBlocks.length}
      </span>
      <button
        className="block-selector-btn"
        onClick={() => setSelectedBlockIndex((i: number) => Math.min(mermaidBlocks.length - 1, i + 1))}
        disabled={selectedBlockIndex === mermaidBlocks.length - 1}
      >
        ›
      </button>
    </div>
  )

  if (isEditMode && canEdit && parsedDiagram) {
    return (
      <div className="preview-container">
        <div className="preview-header">
          <span>Visual Editor</span>
          <div className="preview-header-controls">
            {blockSelector}
            <button
              className="mode-toggle-btn"
              onClick={() => setIsEditMode(false)}
              title="Switch to preview mode"
            >
              Preview Mode
            </button>
          </div>
        </div>
        <VisualEditor
          parsedDiagram={parsedDiagram}
          onCodeChange={handleCodeChange}
        />
      </div>
    )
  }

  return (
    <div className="preview-container">
      <div className="preview-header">
        <span>Preview</span>
        <div className="preview-header-controls">
          {blockSelector}
          {canEdit && (
            <button
              className="mode-toggle-btn"
              onClick={() => setIsEditMode(true)}
              title="Switch to visual edit mode"
            >
              Visual Edit
            </button>
          )}
        </div>
      </div>
      <div className="preview-content">
        <TransformWrapper
          ref={transformRef}
          disabled={!diagramReady}
          minScale={MIN_PREVIEW_ZOOM}
          maxScale={MAX_PREVIEW_ZOOM}
          limitToBounds={false}
          centerOnInit={false}
          wheel={{ step: 0.12, smoothStep: 0.002 }}
          panning={{ velocityDisabled: false, allowLeftClickPan: true }}
          pinch={{ disabled: false }}
          doubleClick={{ disabled: true }}
        >
          <div className="preview-zoom-stack">
            <PreviewZoomToolbar visible={diagramReady} svgHostRef={previewRef} />
            <TransformComponent
              wrapperClass="preview-transform-viewport"
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentClass="preview-transform-content"
            >
              <div ref={previewRef} className="preview-svg-host" />
            </TransformComponent>
          </div>
        </TransformWrapper>
      </div>
    </div>
  )
}
