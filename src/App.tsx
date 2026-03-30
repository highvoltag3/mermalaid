import { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { useTheme } from './hooks/useTheme'
import Editor from './components/Editor'
import Preview from './components/Preview'
import Toolbar, { type ToolbarRef } from './components/Toolbar'
import LandingPage from './components/LandingPage'
import { extractMermaidCode, extractAllMermaidBlocks } from './utils/mermaidCodeBlock'
import { getAppThemeCssVars, isAppThemeDark } from './utils/mermaidThemes'
import { initNativeAppMenu, setNativeMenuHandlerSource } from './nativeAppMenu'
import './App.css'

function EditorView() {
  const { mermaidTheme } = useTheme()
  const [code, setCode] = useState('graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E')
  const [error, setError] = useState<string | null>(null)
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false)
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0)
  const documentPathRef = useRef<string | null>(null)
  const toolbarRef = useRef<ToolbarRef>(null)

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
    try { localStorage.setItem('mermalaid-has-used-editor', '1') } catch {}
  }, [])

  useEffect(() => {
    if (isTauri()) return
    const saved = localStorage.getItem('mermalaid-draft')
    if (saved) setCode(saved)
  }, [])

  /** Finder / Explorer / argv: open the requested file instead of restoring draft (issue #41). */
  useEffect(() => {
    if (!isTauri()) return

    const openQueuedPaths = async () => {
      const paths = await invoke<string[]>('take_open_files')
      if (paths.length === 0) return false
      for (const p of paths) {
        await toolbarRef.current?.openPath(p)
      }
      return true
    }

    const restoreDraftIfNoOsFile = async () => {
      const opened = await openQueuedPaths()
      if (opened) return
      const saved = localStorage.getItem('mermalaid-draft')
      if (saved) setCode(saved)
    }

    void restoreDraftIfNoOsFile()

    let unlisten: (() => void) | undefined
    void listen('open-files', () => {
      void openQueuedPaths()
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        toolbarRef.current?.handleNew()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault()
        void toolbarRef.current?.handleOpen()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (e.shiftKey) {
          void toolbarRef.current?.handleSaveAs()
        } else {
          void toolbarRef.current?.handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!isTauri()) return
    setNativeMenuHandlerSource(() => ({
      onNew: () => toolbarRef.current?.handleNew(),
      onOpen: () => void toolbarRef.current?.handleOpen(),
      onSave: () => void toolbarRef.current?.handleSave(),
      onSaveAs: () => void toolbarRef.current?.handleSaveAs(),
      onPrint: () => toolbarRef.current?.handlePrint(),
      onShare: () => void toolbarRef.current?.handleShare(),
      onDuplicate: () => void toolbarRef.current?.handleDuplicate(),
      onEngineVersion: () => toolbarRef.current?.handleEngineVersionInfo(),
      onShowLicense: () => toolbarRef.current?.handleShowLicenseInfo(),
      onOpenRecent: (path) => void toolbarRef.current?.openPath(path),
    }))
    void initNativeAppMenu()
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
      className={`app ${isAppThemeDark(mermaidTheme) ? 'app-theme-dark' : 'app-theme-light'}`}
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
        documentPathRef={documentPathRef}
      />
      <div className="app-content">
        <Editor
          code={code}
          setCode={setCode}
          error={error}
          mermaidBlocks={mermaidBlocks}
          selectedBlockIndex={selectedBlockIndex}
          setSelectedBlockIndex={setSelectedBlockIndex}
          isCollapsed={isEditorCollapsed}
          onToggleCollapsed={() => setIsEditorCollapsed((collapsed) => !collapsed)}
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
  useEffect(() => {
    if (!isTauri()) return
    void initNativeAppMenu()
  }, [])

  return (
    <ThemeProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/editor" element={<EditorView />} />
        </Routes>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
