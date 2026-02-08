import { useEffect, useRef, useState } from 'react'
import { renderMermaid } from 'beautiful-mermaid'
import { useTheme } from '../hooks/useTheme'
import { extractMermaidCode } from '../utils/mermaidCodeBlock'
import { getMermaidThemeOptions } from '../utils/mermaidThemes'
import { isEditableDiagram, parseMermaidFlowchart } from '../utils/mermaidParser'
import VisualEditor from './VisualEditor'
import './Preview.css'

interface PreviewProps {
  code: string
  setError: (error: string | null) => void
  onCodeChange?: (code: string) => void
}

export default function Preview({ code, setError, onCodeChange }: PreviewProps) {
  const { mermaidTheme } = useTheme()
  const previewRef = useRef<HTMLDivElement>(null)
  const renderIdRef = useRef(0)
  const [isEditMode, setIsEditMode] = useState(false)
  
  const extractedCode = extractMermaidCode(code)
  const trimmedCode = extractedCode.trim()
  const parsedDiagram = trimmedCode ? parseMermaidFlowchart(trimmedCode) : null
  const canEdit = parsedDiagram !== null && isEditableDiagram(trimmedCode)

  const handleCodeChange = (newCode: string) => {
    if (onCodeChange) {
      onCodeChange(newCode)
    }
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!previewRef.current) return

      const currentId = ++renderIdRef.current
      const container = previewRef.current

      // Don't render preview if we're in edit mode
      if (isEditMode && canEdit) {
        return
      }

      const trimmedCode = extractedCode.trim()

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
          container.innerHTML = `<div class="error-preview">${errorMsg}</div>`
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [code, setError, mermaidTheme, isEditMode, canEdit, extractedCode])

  // Show visual editor if in edit mode and diagram is editable
  if (isEditMode && canEdit && parsedDiagram) {
    return (
      <div className="preview-container">
        <div className="preview-header">
          <span>Visual Editor</span>
          <button
            className="mode-toggle-btn"
            onClick={() => setIsEditMode(false)}
            title="Switch to preview mode"
          >
            Preview Mode
          </button>
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
      <div className="preview-content" ref={previewRef}>
        <div className="empty-preview">Loading...</div>
      </div>
    </div>
  )
}

