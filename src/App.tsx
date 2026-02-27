import { useState, useEffect, useRef } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { useTheme } from './hooks/useTheme'
import Editor from './components/Editor'
import Preview from './components/Preview'
import Toolbar from './components/Toolbar'
import { extractMermaidCode, extractAllMermaidBlocks } from './utils/mermaidCodeBlock'
import { getAppThemeCssVars } from './utils/mermaidThemes'
import './App.css'

function AppContent() {
  const { mermaidTheme } = useTheme()
  const [code, setCode] = useState('graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E')
  const [error, setError] = useState<string | null>(null)
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0)
  const toolbarRef = useRef<{ handleNew: () => void; handleOpen: () => void; handleSave: () => void }>(null)

  // Compute mermaid blocks from the code
  const mermaidBlocks = extractAllMermaidBlocks(code)
  const hasMultipleBlocks = mermaidBlocks.length > 1
  const activeCode = hasMultipleBlocks
    ? (mermaidBlocks[selectedBlockIndex]?.code ?? '')
    : extractMermaidCode(code)

  // Reset block index when block count changes
  const prevBlockCount = useRef(mermaidBlocks.length)
  useEffect(() => {
    if (mermaidBlocks.length !== prevBlockCount.current) {
      prevBlockCount.current = mermaidBlocks.length
      setSelectedBlockIndex(0)
    }
  }, [mermaidBlocks.length])

  useEffect(() => {
    const saved = localStorage.getItem('mermalaid-draft')
    if (saved) {
      setCode(saved)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        toolbarRef.current?.handleNew()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault()
        toolbarRef.current?.handleOpen()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        toolbarRef.current?.handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || (!file.name.endsWith('.mmd') && !file.name.endsWith('.txt') && !file.name.endsWith('.md'))) {
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCode(content)
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div
      className="app"
      style={getAppThemeCssVars(mermaidTheme) as React.CSSProperties}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Toolbar
        ref={toolbarRef}
        code={code}
        setCode={setCode}
        error={error}
        activeCode={activeCode}
        mermaidBlocks={mermaidBlocks}
      />
      <div className="app-content">
        <Editor
          code={code}
          setCode={setCode}
          error={error}
          mermaidBlocks={mermaidBlocks}
          selectedBlockIndex={selectedBlockIndex}
          setSelectedBlockIndex={setSelectedBlockIndex}
        />
        <Preview
          code={code}
          setError={setError}
          onCodeChange={setCode}
          activeCode={activeCode}
          mermaidBlocks={mermaidBlocks}
          selectedBlockIndex={selectedBlockIndex}
          setSelectedBlockIndex={setSelectedBlockIndex}
        />
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
