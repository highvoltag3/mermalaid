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

        <div className="toolbar-section toolbar-section-right">
          <a
            href="https://github.com/highvoltag3/mermalaid"
            target="_blank"
            rel="noopener noreferrer"
            className="toolbar-btn github-btn"
            title="View source code on GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
})

Toolbar.displayName = 'Toolbar'

export default Toolbar

