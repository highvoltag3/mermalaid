import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import html2canvas from 'html2canvas'
import { useTheme } from '../contexts/ThemeContext'
import { extractMermaidCode } from '../utils/mermaidCodeBlock'
import { fixMermaidErrorWithAI, getStoredApiKey } from '../utils/aiErrorFixer'
import Settings from './Settings'
import './Toolbar.css'

interface ToolbarProps {
  code: string
  setCode: (code: string) => void
  error: string | null
}

export interface ToolbarRef {
  handleNew: () => void
  handleOpen: () => void
  handleSave: () => void
}

const Toolbar = forwardRef<ToolbarRef, ToolbarProps>(({ code, setCode, error }, ref) => {
  const { theme, toggleTheme, mermaidTheme, setMermaidTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isFixing, setIsFixing] = useState(false)

  const handleNew = () => {
    if (confirm('Create a new diagram? Unsaved changes will be lost.')) {
      setCode('graph TD\n    A[Start] --> B[End]')
    }
  }

  const handleOpen = () => {
    try {
      if (fileInputRef.current) {
        fileInputRef.current.click()
      } else {
        console.error('File input ref is not available')
        alert('Unable to open file dialog. Please try again.')
      }
    } catch (error) {
      console.error('Error opening file dialog:', error)
      alert('Failed to open file dialog. Please ensure your browser supports file selection.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    // Validate file type
    const validExtensions = ['.mmd', '.txt', '.md', '.markdown']
    const fileName = file.name.toLowerCase()
    const isValid = validExtensions.some(ext => fileName.endsWith(ext))
    
    if (!isValid) {
      alert(`Invalid file type. Please select a file with one of these extensions: ${validExtensions.join(', ')}`)
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onerror = () => {
      alert('Failed to read file. Please try again.')
      e.target.value = ''
    }
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        if (content) {
          // Extract Mermaid code from potential markdown code blocks
          const extractedCode = extractMermaidCode(content)
          setCode(extractedCode)
          console.log(`Successfully loaded file: ${file.name}`)
        } else {
          alert('File appears to be empty.')
        }
      } catch (error) {
        console.error('Error processing file:', error)
        alert('Failed to process file content.')
      }
      e.target.value = ''
    }
    
    reader.readAsText(file)
  }

  const handleSave = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.mmd'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportSVG = async () => {
    const svgElement = document.querySelector('.preview-content svg')
    if (!svgElement) {
      alert('No diagram to export')
      return
    }

    const svgCode = svgElement.outerHTML
    const blob = new Blob([svgCode], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPNG = async () => {
    const previewContainer = document.querySelector('.preview-content')
    const svgElement = previewContainer?.querySelector('svg') as SVGSVGElement | null
    
    if (!svgElement || !previewContainer) {
      alert('No diagram to export')
      return
    }

    try {
      // Use html2canvas to capture the SVG as PNG
      const canvas = await html2canvas(previewContainer as HTMLElement, {
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
        allowTaint: false,
      } as any)

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to generate PNG')
          return
        }
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'diagram.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (error) {
      console.error('PNG export error:', error)
      alert('Failed to export PNG: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleCopyCode = () => {
    // Extract plain Mermaid code if wrapped, then wrap it for markdown
    const plainCode = extractMermaidCode(code)
    const codeBlock = `\`\`\`mermaid\n${plainCode}\n\`\`\``
    navigator.clipboard.writeText(codeBlock)
    alert('Code copied to clipboard!')
  }

  const handleAIFix = async () => {
    const apiKey = getStoredApiKey()
    if (!apiKey) {
      alert('Please add your OpenAI API key in Settings to use AI Fix.')
      setShowSettings(true)
      return
    }

    if (!error || !code.trim()) {
      alert('No error to fix')
      return
    }

    setIsFixing(true)
    try {
      const fixedCode = await fixMermaidErrorWithAI(code, error, apiKey)
      console.log('Setting fixed code:', fixedCode)
      setCode(fixedCode)
      alert('Code fixed! Check if the diagram renders correctly.')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fix code'
      console.error('AI Fix error:', err)
      alert(`AI Fix failed: ${errorMsg}`)
    } finally {
      setIsFixing(false)
    }
  }

  useImperativeHandle(ref, () => ({
    handleNew,
    handleOpen,
    handleSave,
  }))

  return (
    <>
      <div className={`toolbar ${theme}`}>
        <div className="toolbar-section">
          <button onClick={handleNew} className="toolbar-btn" title="New (⌘N)">
            New
          </button>
          <button onClick={handleOpen} className="toolbar-btn" title="Open (⌘O)">
            Open
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mmd,.txt,.md,.markdown"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button onClick={handleSave} className="toolbar-btn" title="Save (⌘S)">
            Save
          </button>
        </div>

        <div className="toolbar-section">
          <button onClick={handleExportSVG} className="toolbar-btn" title="Export SVG">
            Export SVG
          </button>
          <button onClick={handleExportPNG} className="toolbar-btn" title="Export PNG">
            Export PNG
          </button>
          <button onClick={handleCopyCode} className="toolbar-btn" title="Copy Code">
            Copy Code
          </button>
          {error && (
            <button 
              onClick={handleAIFix} 
              className="toolbar-btn ai-fix-btn" 
              title="AI Fix Error (uses OpenAI)"
              disabled={isFixing}
            >
              {isFixing ? '🔄 Fixing...' : '🤖 AI Fix'}
            </button>
          )}
        </div>

        <div className="toolbar-section">
          <select
            value={mermaidTheme}
            onChange={(e) => setMermaidTheme(e.target.value as any)}
            className="toolbar-select"
            title="Mermaid Theme"
          >
            <option value="default">Default</option>
            <option value="dark">Dark</option>
            <option value="forest">Forest</option>
            <option value="neutral">Neutral</option>
          </select>
          <button onClick={toggleTheme} className="toolbar-btn" title="Toggle Theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={() => setShowSettings(true)} className="toolbar-btn" title="Settings">
            ⚙️
          </button>
        </div>
      </div>
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
})

Toolbar.displayName = 'Toolbar'

export default Toolbar

