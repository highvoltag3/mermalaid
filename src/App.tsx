import { useState, useEffect, useRef } from 'react'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import Editor from './components/Editor'
import Preview from './components/Preview'
import Toolbar from './components/Toolbar'
import { extractMermaidCode } from './utils/mermaidCodeBlock'
import './App.css'

function AppContent() {
  const { theme } = useTheme()
  const [code, setCode] = useState('graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E')
  const [error, setError] = useState<string | null>(null)
  const toolbarRef = useRef<{ handleNew: () => void; handleOpen: () => void; handleSave: () => void }>(null)

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
      // Extract Mermaid code from potential markdown code blocks
      const extractedCode = extractMermaidCode(content)
      setCode(extractedCode)
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div 
      className={`app ${theme}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Toolbar ref={toolbarRef} code={code} setCode={setCode} error={error} />
      <div className="app-content">
        <Editor code={code} setCode={setCode} error={error} />
        <Preview code={code} setError={setError} onCodeChange={setCode} />
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App

