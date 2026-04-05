import {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  type MutableRefObject,
} from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { message, open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import html2canvas from 'html2canvas'
import { renderMermaidAscii, renderMermaid } from 'beautiful-mermaid'
import { useTheme } from '../hooks/useTheme'
import { useToast } from '../hooks/useToast'
import { extractMermaidCode, type MermaidBlock } from '../utils/mermaidCodeBlock'
import { normalizeMermaidForBeautifulMermaid } from '../utils/normalizeMermaidForBeautifulMermaid'
import { fixMermaidErrorWithAI, getStoredApiKey } from '../utils/aiErrorFixer'
import {
  MERMAID_THEME_IDS,
  getMermaidThemeLabel,
  getMermaidThemeOptions,
  isAppThemeDark,
  type MermaidThemeId,
} from '../utils/mermaidThemes'
import {
  parseMermaidWithConfig,
  parseMermaidConfigForOfficialRenderer,
  mapMermaidConfigToThemeOptions,
} from '../utils/mermaidYamlConfig'
import { renderOfficialMermaidPreview } from '../utils/officialMermaidPreview'
import {
  buildMermalaidAboutPreviewHtml,
  buildMermalaidInfoText,
  isMermaidAboutKeywordOnly,
} from '../utils/mermalaidInfoText'
import Settings from './Settings'
import { rebuildNativeAppMenu } from '../nativeAppMenu'
import { addRecentFile, recentFileLabel, removeRecentFile } from '../utils/recentFiles'
import { copyPlainTextWhenReady, formatClipboardFailureMessage } from '../utils/copyToClipboard'
import {
  applyPrivateShareFullUrlToHistory,
  assertPrivateShareUrlFits,
  buildPrivateShareUrl,
  encodePrivateShareHash,
  getPrivateShareErrorMessage,
  PrivateShareError,
} from '../utils/privateUrlShare'
import './Toolbar.css'

const PRIVATE_LINK_ENCODE_TIMEOUT_MS = 2500
const PRIVATE_LINK_BUSY_MIN_MS = 300
const PRIVATE_LINK_BUTTON_TITLE = 'Copy a private link (encrypted in the URL fragment only). The URL also appears in the address bar.'

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timeoutId)
        resolve(value)
      },
      (err) => {
        clearTimeout(timeoutId)
        reject(err)
      },
    )
  })
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const OPEN_FILTERS = [
  { name: 'Mermaid / Text', extensions: ['mmd', 'txt', 'md', 'markdown'] as string[] },
]

const LICENSE_INFO_TEXT = `Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

Copyright © 2025-present Dario Novoa (highvoltag3)

You are free to:
- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

Under the following terms:
- Attribution — Give credit, provide a license link, and indicate changes.
- NonCommercial — No commercial use.
- ShareAlike — Distribute contributions under the same license.

Project license file:
https://github.com/highvoltag3/mermalaid/blob/main/LICENSE

Full license text:
https://creativecommons.org/licenses/by-nc-sa/4.0/`

interface ToolbarProps {
  code: string
  setCode: (code: string) => void
  error: string | null
  activeCode: string
  mermaidBlocks: MermaidBlock[]
  /** Tauri: path of the file last opened or saved (null = unsaved) */
  documentPathRef: MutableRefObject<string | null>
  isMobile?: boolean
  /** Smartphone bottom bar uses the same sheet; this toggles it. */
  showMobileActions?: boolean
  setShowMobileActions?: (open: boolean) => void
}

export interface ToolbarRef {
  handleNew: () => void
  handleOpen: () => void
  handleSave: () => void
  handleSaveAs: () => void
  handlePrint: () => void
  handleShare: () => void
  handleDuplicate: () => void
  handleEngineVersionInfo: () => void
  handleShowLicenseInfo: () => void
  openPath: (path: string) => Promise<void>
  openMobileActions?: () => void
}

const Toolbar = forwardRef<ToolbarRef, ToolbarProps>(({
  code,
  setCode,
  error,
  activeCode,
  mermaidBlocks,
  documentPathRef,
  isMobile = false,
  showMobileActions: showMobileActionsProp,
  setShowMobileActions: setShowMobileActionsProp,
}, ref) => {
  const { mermaidTheme, setMermaidTheme } = useTheme()
  const { showToast } = useToast()
  const isDark = isAppThemeDark(mermaidTheme)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showMobileActionsState, setShowMobileActionsState] = useState(false)
  const showMobileActions = showMobileActionsProp ?? showMobileActionsState
  const setShowMobileActions = setShowMobileActionsProp ?? setShowMobileActionsState
  const [isFixing, setIsFixing] = useState(false)
  const [isCopyingPrivateLink, setIsCopyingPrivateLink] = useState(false)
  const hasMultipleBlocks = mermaidBlocks.length > 1

  useEffect(() => {
    if (!isMobile) {
      setShowMobileActions(false)
    }
  }, [isMobile])

  useEffect(() => {
    if (!showMobileActions) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMobileActions(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showMobileActions])

  const openBrowserFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
      return
    }
    console.error('File input ref is not available')
    showToast('Unable to open file dialog. Please try again.', 'error')
  }

  const handleNew = () => {
    if (confirm('Create a new diagram? Unsaved changes will be lost.')) {
      setCode('graph TD\n    A[Start] --> B[End]')
      documentPathRef.current = null
    }
  }

  const handleOpen = async () => {
    if (isTauri()) {
      try {
        const selected = await open({
          multiple: false,
          directory: false,
          filters: OPEN_FILTERS,
        })
        const path = Array.isArray(selected) ? selected[0] : selected
        if (!path || typeof path !== 'string') return
        await openPath(path)
      } catch (err) {
        console.error('Open dialog error:', err)
        // Some desktop/web hybrid contexts can report Tauri=true but fail to open native dialog.
        // Fall back to browser picker so Open always does something useful.
        openBrowserFilePicker()
      }
      return
    }
    try {
      openBrowserFilePicker()
    } catch (err) {
      console.error('Error opening file dialog:', err)
      showToast('Failed to open file dialog. Please ensure your browser supports file selection.', 'error')
    }
  }

  const openPath = async (path: string) => {
    if (!isTauri()) return
    try {
      const content = await readTextFile(path)
      setCode(content)
      documentPathRef.current = path
      addRecentFile(path)
      await rebuildNativeAppMenu()
      showToast(`Loaded ${recentFileLabel(path)}`)
    } catch (err) {
      console.error('Read file error:', err)
      showToast('Could not read that file. It may have been moved or deleted.', 'error')
      removeRecentFile(path)
      await rebuildNativeAppMenu()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    const validExtensions = ['.mmd', '.txt', '.md', '.markdown']
    const fileName = file.name.toLowerCase()
    const isValid = validExtensions.some(ext => fileName.endsWith(ext))

    if (!isValid) {
      showToast(`Invalid file type. Use: ${validExtensions.join(', ')}`, 'error')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onerror = () => {
      showToast('Failed to read file. Please try again.', 'error')
      e.target.value = ''
    }

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        if (content) {
          setCode(content)
          showToast(`Loaded ${file.name}`)
        } else {
          showToast('File appears to be empty.', 'error')
        }
      } catch (err) {
        console.error('Error processing file:', err)
        showToast('Failed to process file content.', 'error')
      }
      e.target.value = ''
    }

    reader.readAsText(file)
  }

  const handleSave = async () => {
    if (isTauri() && documentPathRef.current) {
      try {
        await writeTextFile(documentPathRef.current, code)
        showToast(`Saved ${recentFileLabel(documentPathRef.current)}`)
      } catch (err) {
        console.error('Save error:', err)
        showToast('Could not save to that location.', 'error')
      }
      return
    }
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.mmd'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Saved diagram.mmd')
  }

  const handleSaveAs = async () => {
    if (!isTauri()) {
      await handleSave()
      return
    }
    try {
      const path = await save({
        filters: OPEN_FILTERS,
        defaultPath: documentPathRef.current ?? 'diagram.mmd',
      })
      if (!path) return
      await writeTextFile(path, code)
      documentPathRef.current = path
      addRecentFile(path)
      await rebuildNativeAppMenu()
      showToast(`Saved ${recentFileLabel(path)}`)
    } catch (err) {
      console.error('Save As error:', err)
      showToast('Could not save file.', 'error')
    }
  }

  const handleDuplicate = async () => {
    if (!isTauri()) {
      await handleSave()
      return
    }
    const base = documentPathRef.current
    const suggested =
      base && /\.(mmd|txt|md|markdown)$/i.test(base)
        ? base.replace(/(\.[^.]+)$/, '-copy$1')
        : 'diagram-copy.mmd'
    try {
      const path = await save({
        filters: OPEN_FILTERS,
        defaultPath: suggested,
      })
      if (!path) return
      await writeTextFile(path, code)
      documentPathRef.current = path
      addRecentFile(path)
      await rebuildNativeAppMenu()
      showToast(`Saved ${recentFileLabel(path)}`)
    } catch (err) {
      console.error('Duplicate save error:', err)
      showToast('Could not save duplicate.', 'error')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    const body = code.trim()
    if (!body) {
      showToast('Nothing to share yet.', 'error')
      return
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mermaid diagram', text: body })
      } else {
        await navigator.clipboard.writeText(body)
        showToast('Diagram text copied — paste it into Mail, Messages, etc.')
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(body)
        showToast('Diagram text copied — paste it into Mail, Messages, etc.')
      } catch {
        showToast('Sharing is not available here.', 'error')
      }
    }
  }

  const handleEngineVersionInfo = () => {
    const show = async () => {
      const text = await buildMermalaidInfoText()
      if (isTauri()) {
        await message(text, { title: 'About Mermalaid', kind: 'info' })
      } else {
        window.alert(text)
      }
    }
    void show().catch((err) => {
      console.error('Failed to show Mermalaid info:', err)
      showToast('Failed to show Mermalaid info.', 'error')
    })
  }

  const handleShowLicenseInfo = () => {
    const show = async () => {
      if (isTauri()) {
        await message(LICENSE_INFO_TEXT, { title: 'Mermalaid License', kind: 'info' })
      } else {
        window.alert(LICENSE_INFO_TEXT)
      }
    }
    void show().catch((err) => {
      console.error('Failed to show license info:', err)
      showToast('Failed to show license info.', 'error')
    })
  }

  const handleExportSVG = async () => {
    const svgElement = document.querySelector('.preview-content svg')
    if (!svgElement) {
      showToast('No diagram to export', 'error')
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
    showToast('Exported diagram.svg')
  }

  const handleExportPNG = async () => {
    const previewContainer = document.querySelector('.preview-content')
    const svgElement = previewContainer?.querySelector('svg') as SVGSVGElement | null

    if (!svgElement || !previewContainer) {
      showToast('No diagram to export', 'error')
      return
    }

    try {
      const canvas = await html2canvas(previewContainer as HTMLElement, {
        backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
      } as any)

      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('Failed to generate PNG', 'error')
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
        showToast('Exported diagram.png')
      }, 'image/png')
    } catch (err) {
      console.error('PNG export error:', err)
      showToast('Failed to export PNG: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error')
    }
  }

  const handleExportASCII = () => {
    const { code: diagramCode } = parseMermaidWithConfig(activeCode.trim())
    if (!diagramCode) {
      showToast('No diagram to export', 'error')
      return
    }
    if (isMermaidAboutKeywordOnly(diagramCode)) {
      void (async () => {
        try {
          const text = await buildMermalaidInfoText()
          const blob = new Blob([text], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'diagram.txt'
          a.click()
          URL.revokeObjectURL(url)
          showToast('Exported diagram.txt')
        } catch (err) {
          console.error('ASCII export error:', err)
          showToast('Failed to export Mermalaid info.', 'error')
        }
      })()
      return
    }
    try {
      const ascii = renderMermaidAscii(
        normalizeMermaidForBeautifulMermaid(diagramCode),
      )
      const blob = new Blob([ascii], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'diagram.txt'
      a.click()
      URL.revokeObjectURL(url)
      showToast('Exported diagram.txt')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('ASCII export error:', err)
      showToast(`Export failed: ${msg}. Supported: flowcharts, state, sequence, class, ER.`, 'error')
    }
  }

  const handleCopyCode = () => {
    const plainCode = activeCode.trim() || extractMermaidCode(code)
    const codeBlock = `\`\`\`mermaid\n${plainCode}\n\`\`\``
    navigator.clipboard.writeText(codeBlock)
    showToast('Code copied to clipboard')
  }

  const handleCopyPrivateLink = async () => {
    if (isCopyingPrivateLink) return
    setIsCopyingPrivateLink(true)
    const startedAt = Date.now()
    try {
      if (!code.trim()) {
        showToast('Nothing to share yet.', 'error')
        return
      }

      const hash = await withTimeout(
        encodePrivateShareHash({ code }),
        PRIVATE_LINK_ENCODE_TIMEOUT_MS,
        'Creating the private link took too long. Please refresh and try again.',
      )
      const fullUrl = buildPrivateShareUrl(hash)
      assertPrivateShareUrlFits(fullUrl)

      // Always show the link in the address bar (intuitive fallback; replaceState does not fire hashchange).
      applyPrivateShareFullUrlToHistory(fullUrl)

      let clipboardOk = false
      try {
        await copyPlainTextWhenReady(() => Promise.resolve(fullUrl))
        clipboardOk = true
      } catch {
        clipboardOk = false
      }

      if (clipboardOk) {
        showToast(
          'Private link copied to clipboard. The same URL (with #v1…) is in the address bar if you need it again.',
        )
      } else {
        showToast(
          'Private link is in the address bar. Press ⌘L or Ctrl+L to focus it, then ⌘C or Ctrl+C to copy (clipboard API was blocked).',
        )
      }
    } catch (err) {
      if (err instanceof PrivateShareError) {
        showToast(getPrivateShareErrorMessage(err), 'error')
        return
      }
      console.error('[mermalaid] Copy private link failed', err)
      showToast(formatClipboardFailureMessage(err), 'error')
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < PRIVATE_LINK_BUSY_MIN_MS) {
        await wait(PRIVATE_LINK_BUSY_MIN_MS - elapsed)
      }
      setIsCopyingPrivateLink(false)
    }
  }

  const handleExportAllSVG = async () => {
    if (mermaidBlocks.length === 0) {
      showToast('No diagrams to export', 'error')
      return
    }

    const defaultThemeOptions = getMermaidThemeOptions(mermaidTheme)
    const svgs: string[] = []

    for (let i = 0; i < mermaidBlocks.length; i++) {
      const rawBlock = mermaidBlocks[i].code
      const { code: diagramCode, config: blockConfig } = parseMermaidWithConfig(
        rawBlock
      )
      const officialYamlConfig = parseMermaidConfigForOfficialRenderer(rawBlock)
      const themeOptions = blockConfig
        ? mapMermaidConfigToThemeOptions(blockConfig)
        : defaultThemeOptions
      const normalizedForCompat = normalizeMermaidForBeautifulMermaid(diagramCode)
      try {
        if (isMermaidAboutKeywordOnly(diagramCode)) {
          svgs.push(await buildMermalaidAboutPreviewHtml())
          continue
        }
        let svg: string
        try {
          svg = await renderOfficialMermaidPreview(
            diagramCode,
            isDark,
            themeOptions,
            officialYamlConfig,
          )
        } catch (primaryErr) {
          try {
            if (normalizedForCompat !== diagramCode) {
              svg = await renderOfficialMermaidPreview(
                normalizedForCompat,
                isDark,
                themeOptions,
                officialYamlConfig,
              )
            } else {
              throw primaryErr
            }
          } catch {
            svg = await renderMermaid(
              normalizedForCompat,
              themeOptions,
            )
          }
        }
        svgs.push(svg)
      } catch (err) {
        console.error(`Failed to render block ${i + 1}:`, err)
        svgs.push(`<p>Failed to render diagram ${i + 1}</p>`)
      }
    }

    const bg = isDark ? '#1e1e1e' : '#ffffff'
    const fg = isDark ? '#e0e0e0' : '#333333'
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Mermaid Diagrams</title>
<style>body{background:${bg};color:${fg};font-family:system-ui;padding:2rem}
.diagram{margin:2rem 0;padding:1rem;border:1px solid ${isDark ? '#444' : '#ddd'};border-radius:8px}
.diagram h2{margin:0 0 1rem;font-size:1rem}
.diagram svg{max-width:100%;height:auto}
.preview-about-mermalaid{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.45;margin:0}</style></head><body>
<h1>Mermaid Diagrams (${svgs.length})</h1>
${svgs.map((svg, i) => `<div class="diagram"><h2>Diagram ${i + 1}</h2>${svg}</div>`).join('\n')}
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagrams.html'
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${svgs.length} diagrams as HTML`)
  }

  const handleAIFix = async () => {
    const apiKey = getStoredApiKey()
    if (!apiKey) {
      showToast('Add your OpenAI API key in Settings to use AI Fix.', 'error')
      setShowSettings(true)
      return
    }

    if (!error || !code.trim()) {
      showToast('No error to fix', 'error')
      return
    }

    setIsFixing(true)
    try {
      const fixedCode = await fixMermaidErrorWithAI(code, error, apiKey)
      console.log('Setting fixed code:', fixedCode)
      setCode(fixedCode)
      showToast('Code fixed! Check if the diagram renders correctly.')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fix code'
      console.error('AI Fix error:', err)
      showToast(`AI Fix failed: ${errorMsg}`, 'error')
    } finally {
      setIsFixing(false)
    }
  }

  useImperativeHandle(ref, () => ({
    handleNew,
    handleOpen,
    handleSave,
    handleSaveAs,
    handlePrint,
    handleShare,
    handleDuplicate,
    handleEngineVersionInfo,
    handleShowLicenseInfo,
    openPath,
    openMobileActions: () => setShowMobileActions(true),
  }))

  const mobileToolbar = isMobile && (
    <>
      <div className="toolbar toolbar-mobile toolbar-mobile-sticky">
        <div className="toolbar-mobile-header">
          <div className="toolbar-mobile-brand">
            <img
              className="toolbar-mobile-logo"
              src="/apple-touch-icon.png"
              width={56}
              height={56}
              alt="Mermalaid"
              loading="eager"
              decoding="async"
            />
            <div className="toolbar-mobile-title">Mermalaid</div>
          </div>
          {error && <span className="toolbar-mobile-error">Syntax error</span>}
        </div>
      </div>

      {showMobileActions && (
        <div
          className="toolbar-mobile-sheet-backdrop"
          onClick={() => setShowMobileActions(false)}
        >
          <div
            className="toolbar-mobile-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More actions"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="toolbar-mobile-sheet-header">
              <div>
                <div className="toolbar-mobile-sheet-title">More actions</div>
                <div className="toolbar-mobile-sheet-subtitle">Everything else you need on a phone</div>
              </div>
              <button
                type="button"
                className="toolbar-btn toolbar-mobile-close-btn"
                onClick={() => setShowMobileActions(false)}
                aria-label="Close more actions"
              >
                Close
              </button>
            </div>

            <div className="toolbar-mobile-sheet-section">
              <span className="toolbar-mobile-section-label">Workspace</span>
              <div className="toolbar-mobile-action-grid">
                <button type="button" onClick={() => { void handleOpen(); setShowMobileActions(false) }} className="toolbar-btn">
                  Open
                </button>
                <button type="button" onClick={() => { void handleSave(); setShowMobileActions(false) }} className="toolbar-btn">
                  Save
                </button>
                <button type="button" onClick={() => { handleNew(); setShowMobileActions(false) }} className="toolbar-btn">
                  New
                </button>
                <button
                  type="button"
                  disabled={isCopyingPrivateLink}
                  aria-busy={isCopyingPrivateLink}
                  onClick={() => {
                    // Keep the sheet open so the user can see the busy/disabled state,
                    // then close it after the operation finishes.
                    void (async () => {
                      try {
                        await handleCopyPrivateLink()
                      } catch (e) {
                        console.error('[mermalaid] Copy private link: unexpected error', e)
                        showToast(
                          e instanceof Error ? e.message : 'Could not create a private link. Please try again.',
                          'error',
                        )
                      } finally {
                        setShowMobileActions(false)
                      }
                    })()
                  }}
                  className="toolbar-btn"
                  title={PRIVATE_LINK_BUTTON_TITLE}
                >
                  {isCopyingPrivateLink ? 'Creating link…' : 'Share'}
                </button>
                <button type="button" onClick={() => { handleCopyCode(); setShowMobileActions(false) }} className="toolbar-btn">
                  Copy Code
                </button>
                {error && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleAIFix().finally(() => setShowMobileActions(false))
                    }}
                    className="toolbar-btn ai-fix-btn"
                    disabled={isFixing}
                  >
                    {isFixing ? 'Fixing…' : 'AI Fix'}
                  </button>
                )}
              </div>
            </div>

            <div className="toolbar-mobile-sheet-section">
              <span className="toolbar-mobile-section-label">Export</span>
              <div className="toolbar-mobile-action-grid">
                <button type="button" onClick={() => { void handleExportSVG(); setShowMobileActions(false) }} className="toolbar-btn">
                  SVG
                </button>
                <button type="button" onClick={() => { void handleExportPNG(); setShowMobileActions(false) }} className="toolbar-btn">
                  PNG
                </button>
                <button type="button" onClick={() => { handleExportASCII(); setShowMobileActions(false) }} className="toolbar-btn">
                  ASCII
                </button>
                {hasMultipleBlocks && (
                  <button type="button" onClick={() => { void handleExportAllSVG(); setShowMobileActions(false) }} className="toolbar-btn">
                    Export All
                  </button>
                )}
              </div>
            </div>

            <div className="toolbar-mobile-sheet-section">
              <label className="toolbar-mobile-section-label" htmlFor="mobile-theme-select">
                Theme
              </label>
              <select
                id="mobile-theme-select"
                value={mermaidTheme}
                onChange={(e) => setMermaidTheme(e.target.value as MermaidThemeId)}
                className="toolbar-select toolbar-mobile-select"
                title="Theme (diagram + app UI)"
              >
                {MERMAID_THEME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {getMermaidThemeLabel(id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-mobile-sheet-section toolbar-mobile-sheet-footer">
              <button
                type="button"
                onClick={() => {
                  setShowMobileActions(false)
                  setShowSettings(true)
                }}
                className="toolbar-btn"
              >
                Settings
              </button>
              <a
                href="https://github.com/highvoltag3/mermalaid"
                target="_blank"
                rel="noopener noreferrer"
                className="toolbar-btn"
                onClick={() => setShowMobileActions(false)}
                title="View source code on GitHub"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mmd,.txt,.md,.markdown"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {isMobile ? mobileToolbar : (
        <div className="toolbar">
          <div className="toolbar-section">
            <button type="button" onClick={handleNew} className="toolbar-btn" title="New (⌘N)">
              New
            </button>
            <button type="button" onClick={handleOpen} className="toolbar-btn" title="Open (⌘O)">
              Open
            </button>
            <button type="button" onClick={handleSave} className="toolbar-btn" title="Save (⌘S)">
              Save
            </button>
          </div>

          <div className="toolbar-section">
            <button onClick={handleExportSVG} className="toolbar-btn" title={hasMultipleBlocks ? 'Export selected block as SVG' : 'Export SVG'}>
              Export SVG
            </button>
            <button onClick={handleExportPNG} className="toolbar-btn" title={hasMultipleBlocks ? 'Export selected block as PNG' : 'Export PNG'}>
              Export PNG
            </button>
            <button onClick={handleExportASCII} className="toolbar-btn" title={hasMultipleBlocks ? 'Export selected block as ASCII' : 'Export ASCII (Unicode box-drawing for terminals)'}>
              Export ASCII
            </button>
            {hasMultipleBlocks && (
              <button onClick={handleExportAllSVG} className="toolbar-btn" title="Export all mermaid blocks in a single HTML file">
                Export All
              </button>
            )}
            <button onClick={handleCopyCode} className="toolbar-btn" title="Copy Code">
              Copy Code
            </button>
            <button
              type="button"
              disabled={isCopyingPrivateLink}
              aria-busy={isCopyingPrivateLink}
              onClick={() => {
                void handleCopyPrivateLink().catch((e) => {
                  console.error('[mermalaid] Copy private link: unexpected error', e)
                  showToast(
                    e instanceof Error ? e.message : 'Could not create a private link. Please try again.',
                    'error',
                  )
                })
              }}
              className="toolbar-btn"
              title={PRIVATE_LINK_BUTTON_TITLE}
            >
              {isCopyingPrivateLink ? 'Creating link…' : 'Share'}
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
              onChange={(e) => setMermaidTheme(e.target.value as MermaidThemeId)}
              className="toolbar-select"
              title="Theme (diagram + app UI)"
            >
              {MERMAID_THEME_IDS.map((id) => (
                <option key={id} value={id}>
                  {getMermaidThemeLabel(id)}
                </option>
              ))}
            </select>
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
      )}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
})

Toolbar.displayName = 'Toolbar'

export default Toolbar
