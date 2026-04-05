import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { useTheme } from './hooks/useTheme'
import { useUpdateCheck } from './hooks/useUpdateCheck'
import { useMountEffect } from './hooks/useMountEffect'
import { useToast } from './hooks/useToast'
import Editor from './components/Editor'
import Preview from './components/Preview'
import Toolbar, { type ToolbarRef } from './components/Toolbar'
import LandingPage from './components/LandingPage'
import UpdateAvailableBanner from './components/UpdateAvailableBanner'
import type { LatestReleaseInfo } from './utils/githubRelease'
import { isDiagramImportFileName } from './utils/diagramImportFiles'
import {
  clearUrlFragment,
  decodePrivateShareHash,
  getPrivateShareErrorMessage,
  isPrivateShareHash,
} from './utils/privateUrlShare'
import { extractMermaidCode, extractAllMermaidBlocks } from './utils/mermaidCodeBlock'
import { getAppThemeCssVars, isAppThemeDark } from './utils/mermaidThemes'
import { initNativeAppMenu, setNativeMenuHandlerSource } from './nativeAppMenu'
import './App.css'

const SMARTPHONE_BREAKPOINT_PX = 768

type MobileWorkspacePanel = 'editor' | 'preview'

function useIsSmartphoneLayout() {
  const [isSmartphoneLayout, setIsSmartphoneLayout] = useState(
    () => window.innerWidth <= SMARTPHONE_BREAKPOINT_PX,
  )

  useEffect(() => {
    const updateLayout = () => setIsSmartphoneLayout(window.innerWidth <= SMARTPHONE_BREAKPOINT_PX)

    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [])

  return isSmartphoneLayout
}

function useVisualViewportCssVars(isSmartphoneLayout: boolean) {
  useEffect(() => {
    if (!isSmartphoneLayout) return

    const vv = window.visualViewport
    if (!vv) return

    const apply = () => {
      // Use px so layout always matches the visual viewport (iOS Safari address bar + keyboard).
      document.documentElement.style.setProperty('--vvh', `${vv.height}px`)
      document.documentElement.style.setProperty('--vvw', `${vv.width}px`)
    }

    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    window.addEventListener('orientationchange', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      window.removeEventListener('orientationchange', apply)
    }
  }, [isSmartphoneLayout])
}

function useIsKeyboardOpen(isSmartphoneLayout: boolean) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    if (!isSmartphoneLayout) {
      setIsKeyboardOpen(false)
      return
    }

    const vv = window.visualViewport
    if (!vv) return

    const KEYBOARD_THRESHOLD_PX = 140
    const update = () => {
      // Heuristic: a sizable reduction from the *layout* viewport height implies a soft keyboard.
      // Using current values (not initial height) avoids “stuck open” on iOS when the URL bar collapses/expands.
      const delta = window.innerHeight - vv.height
      setIsKeyboardOpen(delta > KEYBOARD_THRESHOLD_PX)
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('focusin', update)
    window.addEventListener('focusout', update)
    return () => vv.removeEventListener('resize', update)
  }, [isSmartphoneLayout])

  return isKeyboardOpen
}

interface ReleaseBannerRouteProps {
  pendingRelease: LatestReleaseInfo | null
  onDismissPendingRelease: () => void
}

function PrivateShareHashRedirect() {
  const navigate = useNavigate()
  const location = useLocation()

  useLayoutEffect(() => {
    if (location.pathname !== '/') return
    const h = location.hash
    if (!isPrivateShareHash(h)) return
    navigate(`/editor${h}`, { replace: true })
  }, [location.pathname, location.hash, navigate])

  return null
}

function EditorView({ pendingRelease, onDismissPendingRelease }: ReleaseBannerRouteProps) {
  const { mermaidTheme } = useTheme()
  const { showToast } = useToast()
  const location = useLocation()
  const isSmartphoneLayout = useIsSmartphoneLayout()
  useVisualViewportCssVars(isSmartphoneLayout)
  const isKeyboardOpen = useIsKeyboardOpen(isSmartphoneLayout)
  const [code, setCode] = useState('graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E')
  const [error, setError] = useState<string | null>(null)
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false)
  const [mobileWorkspacePanel, setMobileWorkspacePanel] = useState<MobileWorkspacePanel>('preview')
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

  useMountEffect(() => {
    try { localStorage.setItem('mermalaid-has-used-editor', '1') } catch {}
  })

  /** Draft only when the first paint is not a private share URL (share handling is hash-subscribed below). */
  useMountEffect(() => {
    if (isTauri()) return
    if (isPrivateShareHash(window.location.hash)) return
    const saved = localStorage.getItem('mermalaid-draft')
    if (saved) setCode(saved)
  })

  /** Web: react to private `#v1…` on load and when the hash changes while staying on /editor. */
  useEffect(() => {
    if (isTauri()) return
    const hash = location.hash
    if (!isPrivateShareHash(hash)) return

    let cancelled = false
    void (async () => {
      try {
        const state = await decodePrivateShareHash(hash)
        if (cancelled) return
        setCode(state.code)
        documentPathRef.current = null
        clearUrlFragment()
        showToast('Opened diagram from private link')
      } catch (e) {
        if (cancelled) return
        showToast(getPrivateShareErrorMessage(e), 'error')
        clearUrlFragment()
        const saved = localStorage.getItem('mermalaid-draft')
        if (saved) setCode(saved)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [location.hash, showToast])

  /** Finder / Explorer / argv: open the requested file instead of restoring draft (issue #41). */
  useMountEffect(() => {
    if (!isTauri()) return

    const tryConsumePrivateShareHash = async (): Promise<'loaded' | 'none' | 'invalid'> => {
      const hash = window.location.hash
      if (!isPrivateShareHash(hash)) return 'none'
      try {
        const state = await decodePrivateShareHash(hash)
        setCode(state.code)
        documentPathRef.current = null
        clearUrlFragment()
        showToast('Opened diagram from private link')
        return 'loaded'
      } catch (e) {
        showToast(getPrivateShareErrorMessage(e), 'error')
        clearUrlFragment()
        return 'invalid'
      }
    }

    const openQueuedPaths = async () => {
      const paths = await invoke<string[]>('take_open_files')
      if (paths.length === 0) return false
      for (const p of paths) {
        await toolbarRef.current?.openPath(p)
      }
      return true
    }

    const restoreDraftIfNoOsFile = async () => {
      const shareOutcome = await tryConsumePrivateShareHash()
      if (shareOutcome === 'loaded') return
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
  })

  useMountEffect(() => {
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
  })

  useMountEffect(() => {
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
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !isDiagramImportFileName(file.name)) {
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

  const showEditorPanel = !isSmartphoneLayout || mobileWorkspacePanel === 'editor'
  const showPreviewPanel = !isSmartphoneLayout || mobileWorkspacePanel === 'preview'

  return (
    <div
      className={`app ${isAppThemeDark(mermaidTheme) ? 'app-theme-dark' : 'app-theme-light'} ${isSmartphoneLayout ? 'app-mobile' : ''} ${isKeyboardOpen ? 'app-mobile-keyboard-open' : ''}`}
      style={getAppThemeCssVars(mermaidTheme) as React.CSSProperties}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {pendingRelease && (
        <UpdateAvailableBanner
          update={pendingRelease}
          onDismiss={onDismissPendingRelease}
          variant="editor"
        />
      )}
      <Toolbar
        ref={toolbarRef}
        code={code}
        setCode={setCode}
        error={error}
        activeCode={activeCode}
        mermaidBlocks={mermaidBlocks}
        documentPathRef={documentPathRef}
        isMobile={isSmartphoneLayout}
      />
      <div className="app-content">
        {showEditorPanel && (
          <Editor
            code={code}
            setCode={setCode}
            error={error}
            mermaidBlocks={mermaidBlocks}
            selectedBlockIndex={selectedBlockIndex}
            setSelectedBlockIndex={setSelectedBlockIndex}
            isCollapsed={isSmartphoneLayout ? false : isEditorCollapsed}
            onToggleCollapsed={() => setIsEditorCollapsed((collapsed) => !collapsed)}
            isMobile={isSmartphoneLayout}
          />
        )}
        {showPreviewPanel && (
          <Preview
            code={code}
            setError={setError}
            onCodeChange={setCode}
            activeCode={activeCode}
            mermaidBlocks={mermaidBlocks}
            selectedBlockIndex={selectedBlockIndex}
            setSelectedBlockIndex={setSelectedBlockIndex}
            isMobile={isSmartphoneLayout}
          />
        )}
      </div>
      {isSmartphoneLayout && (
        <div className="mobile-bottom-bar" role="navigation" aria-label="Mobile workspace">
          <div className="mobile-bottom-bar-inner" role="tablist" aria-label="Mobile workspace tabs">
            <button
              type="button"
              role="tab"
              aria-selected={mobileWorkspacePanel === 'preview'}
              className={`mobile-bottom-bar-btn ${mobileWorkspacePanel === 'preview' ? 'active' : ''}`}
              onClick={() => setMobileWorkspacePanel('preview')}
            >
              Preview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileWorkspacePanel === 'editor'}
              className={`mobile-bottom-bar-btn ${mobileWorkspacePanel === 'editor' ? 'active' : ''}`}
              onClick={() => setMobileWorkspacePanel('editor')}
            >
              Code
            </button>
            <button
              type="button"
              className="mobile-bottom-bar-btn mobile-bottom-bar-more-btn"
              onClick={() => toolbarRef.current?.openMobileActions?.()}
              aria-haspopup="dialog"
            >
              More
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  const { update: pendingRelease, dismiss: dismissPendingRelease } = useUpdateCheck()

  useMountEffect(() => {
    if (!isTauri()) return
    void initNativeAppMenu()
  })

  return (
    <ThemeProvider>
      <ToastProvider>
        <PrivateShareHashRedirect />
        <Routes>
          <Route
            path="/"
            element={
              isTauri()
                ? <Navigate to="/editor" replace />
                : (
                  <LandingPage
                    pendingRelease={pendingRelease}
                    onDismissPendingRelease={dismissPendingRelease}
                  />
                )
            }
          />
          <Route
            path="/editor"
            element={
              <EditorView
                pendingRelease={pendingRelease}
                onDismissPendingRelease={dismissPendingRelease}
              />
            }
          />
        </Routes>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
