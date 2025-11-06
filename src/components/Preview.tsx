import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useTheme } from '../contexts/ThemeContext'
import { extractMermaidCode } from '../utils/mermaidCodeBlock'
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
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      securityLevel: 'loose',
      fontFamily: 'inherit',
    })
  }, [mermaidTheme])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!previewRef.current) return

      const currentId = ++renderIdRef.current
      const container = previewRef.current

      // Don't render preview if we're in edit mode
      if (isEditMode && canEdit) {
        return
      }
      
      // Extract Mermaid code from potential markdown code blocks
      const trimmedCode = extractedCode.trim()
      
      if (!trimmedCode) {
        if (renderIdRef.current === currentId) {
          container.innerHTML = '<div class="empty-preview">Start typing your Mermaid diagram...</div>'
          setError(null)
        }
        return
      }

      try {
        // Validate syntax first
        mermaid.parse(trimmedCode)
        const id = `mermaid-${currentId}-${Date.now()}`
        
        // Render into a hidden element first
        const renderContainer = document.createElement('div')
        renderContainer.id = id
        renderContainer.style.position = 'absolute'
        renderContainer.style.left = '-9999px'
        renderContainer.style.top = '-9999px'
        document.body.appendChild(renderContainer)

        try {
          const result = await mermaid.render(id, trimmedCode)
          
          if (renderIdRef.current === currentId && container) {
            container.innerHTML = result.svg
            setError(null)
          }
        } finally {
          // Clean up
          if (renderContainer.parentNode) {
            renderContainer.parentNode.removeChild(renderContainer)
          }
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

