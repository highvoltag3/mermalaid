import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { useTheme } from '../contexts/ThemeContext'
import './Preview.css'

interface PreviewProps {
  code: string
  setError: (error: string | null) => void
}

export default function Preview({ code, setError }: PreviewProps) {
  const { mermaidTheme } = useTheme()
  const previewRef = useRef<HTMLDivElement>(null)
  const renderIdRef = useRef(0)

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

      const trimmedCode = code.trim()
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
  }, [code, setError, mermaidTheme])

  return (
    <div className="preview-container">
      <div className="preview-header">
        <span>Preview</span>
      </div>
      <div className="preview-content" ref={previewRef}>
        <div className="empty-preview">Loading...</div>
      </div>
    </div>
  )
}

