import { useEffect, useRef, useState } from 'react'
import { renderMermaid } from 'beautiful-mermaid'
import { useTheme } from '../hooks/useTheme'
import { replaceMermaidBlock, type MermaidBlock } from '../utils/mermaidCodeBlock'
import { getMermaidThemeOptions } from '../utils/mermaidThemes'
import { isEditableDiagram, parseMermaidFlowchart } from '../utils/mermaidParser'
import VisualEditor from './VisualEditor'
import './Preview.css'

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
  const renderIdRef = useRef(0)
  const [isEditMode, setIsEditMode] = useState(false)

  const hasMultipleBlocks = mermaidBlocks.length > 1
  const trimmedCode = activeCode.trim()
  const parsedDiagram = trimmedCode ? parseMermaidFlowchart(trimmedCode) : null
  const canEdit = parsedDiagram !== null && isEditableDiagram(trimmedCode)

  const handleCodeChange = (newCode: string) => {
    if (!onCodeChange) return

    if (hasMultipleBlocks && mermaidBlocks[selectedBlockIndex]) {
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
        }
        return
      }

      try {
        const themeOptions = getMermaidThemeOptions(mermaidTheme)
        const svg = await renderMermaid(trimmedCode, themeOptions)

        if (renderIdRef.current === currentId && container) {
          container.innerHTML = svg
          setError(null)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Invalid Mermaid syntax'
        setError(errorMsg)
        if (renderIdRef.current === currentId && container) {
          container.innerHTML = `<div class="error-preview">${errorMsg}<div class="error-recovery-hint">Try creating a new diagram (New button) or opening a valid .mmd file.</div></div>`
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [code, setError, mermaidTheme, isEditMode, canEdit, trimmedCode])

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
      <div className="preview-content" ref={previewRef}>
        <div className="empty-preview">Loading...</div>
      </div>
    </div>
  )
}
