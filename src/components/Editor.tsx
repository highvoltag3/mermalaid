import { useState, useEffect, useRef } from 'react'
import EditorComponent, { loader } from '@monaco-editor/react'
import { useTheme } from '../hooks/useTheme'
import { isAppThemeDark } from '../utils/mermaidThemes'
import { MERMLAID_EDITOR_AUTOSAVE_DEBOUNCE_MS } from '../constants/mermalaidTiming'
import type { MermaidBlock } from '../utils/mermaidCodeBlock'
import './Editor.css'

// Register Mermaid language
loader.init().then((monaco) => {
  monaco.languages.register({ id: 'mermaid' })
  
  monaco.languages.setMonarchTokensProvider('mermaid', {
    tokenizer: {
      root: [
        // Diagram type keywords
        [/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|requirement)/i, 'keyword'],
        
        // Direction keywords
        [/[TDLR][DB]/, 'keyword'],
        [/LR|RL|TD|BT/, 'keyword'],
        
        // Node shapes
        [/\[[^\]]*\]/, 'string'],
        [/\([^)]*\)/, 'string'],
        [/\{[^}]*\}/, 'string'],
        [/[<>]/, 'delimiter'],
        
        // Styling
        [/classDef|style|linkStyle/, 'keyword'],
        
        // Arrows
        [/[-.]+>/g, 'operator'],
        [/[-><]+|==[>=]|--/, 'operator'],
        
        // Comments
        [/%%.*$/, 'comment'],
        
        // Identifiers
        [/[a-zA-Z0-9_]+/, 'identifier'],
        
        // Strings in quotes
        [/"[^"]*"/, 'string'],
        [/('[^']*')/, 'string'],
        
        // Numbers
        [/\d+/, 'number'],
        
        // Special characters
        [/[{}[\]]/, 'delimiter.bracket'],
      ]
    }
  })
  
  monaco.languages.setLanguageConfiguration('mermaid', {
    comments: {
      lineComment: '%%'
    },
    brackets: [
      ['[', ']'],
      ['(', ')'],
      ['{', '}']
    ],
    autoClosingPairs: [
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '{', close: '}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '{', close: '}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  })
})

interface EditorProps {
  code: string
  setCode: (code: string) => void
  error: string | null
  mermaidBlocks: MermaidBlock[]
  selectedBlockIndex: number
  setSelectedBlockIndex: (index: number) => void
  isCollapsed: boolean
  onToggleCollapsed: () => void
  isMobile?: boolean
}

function CollapseEditorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 21L5 21C3.89543 21 3 20.1046 3 19L3 5C3 3.89543 3.89543 3 5 3L19 3C20.1046 3 21 3.89543 21 5L21 19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.25 10L5.5 12L7.25 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 21V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExpandEditorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 21L5 21C3.89543 21 3 20.1046 3 19L3 5C3 3.89543 3.89543 3 5 3L19 3C20.1046 3 21 3.89543 21 5L21 19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 21V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10L7.25 12L5.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Editor({
  code, setCode, error,
  mermaidBlocks, selectedBlockIndex, setSelectedBlockIndex,
  isCollapsed, onToggleCollapsed,
  isMobile = false,
}: EditorProps) {
  const { mermaidTheme } = useTheme()
  const debounceTimer = useRef<NodeJS.Timeout>()
  const editorRef = useRef<any>(null)
  const decorationIdsRef = useRef<string[]>([])
  /** Avoid scrolling on every keystroke: reveal block start only when selection or block list shape changes (issue #54). */
  const lastBlockRevealRef = useRef<{ selectedBlockIndex: number; blockCount: number } | null>(null)
  const [editorReady, setEditorReady] = useState(false)

  const readClipboardText = (clipboardData: DataTransfer | null): string => {
    if (!clipboardData) return ''

    const plainTextTypes = ['text/plain', 'text', 'Text']
    for (const type of plainTextTypes) {
      const value = clipboardData.getData(type)
      if (value) return value
    }

    const html = clipboardData.getData('text/html')
    if (!html) return ''

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const preformatted = doc.querySelector('pre, code')?.textContent
    const content = preformatted ?? doc.body?.textContent ?? ''
    return content.replace(/\u00a0/g, ' ')
  }

  // Update Monaco editor when code changes externally (e.g., from AI Fix)
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue()
      if (currentValue !== code) {
        editorRef.current.setValue(code)
      }
    }
  }, [code])

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = setTimeout(() => {
      localStorage.setItem('mermalaid-draft', code)
    }, MERMLAID_EDITOR_AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [code])

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    setEditorReady(true)
  }

  // Set up paste handler once editor is mounted
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const handlePaste = (e: ClipboardEvent) => {
      try {
        const pastedText = readClipboardText(e.clipboardData ?? null)
        if (!pastedText) return

        const normalizedText = pastedText.replace(/\r\n/g, '\n')

        // Only unwrap if the entire pasted text is a single ```mermaid code block
        const singleBlockRegex = /^```mermaid\s*\n([\s\S]*?)\n```\s*$/i
        const match = normalizedText.trim().match(singleBlockRegex)

        if (match && match[1]) {
          e.preventDefault()
          e.stopPropagation()
          const extracted = match[1].trim()
          editor.setValue(extracted)
          setCode(extracted)
          return
        }

        const hasPlainText = ['text/plain', 'text', 'Text'].some(
          (type) => Boolean(e.clipboardData?.getData(type)),
        )

        // Firefox + native WebView can expose only HTML clipboard payloads.
        // In that case Monaco may not paste anything by default, so insert text manually.
        if (!hasPlainText) {
          e.preventDefault()
          const selection = editor.getSelection()
          if (selection) {
            editor.executeEdits('clipboard-fallback', [
              {
                range: selection,
                text: normalizedText,
                forceMoveMarkers: true,
              },
            ])
            setCode(editor.getValue())
          }
        }
      } catch (err) {
        console.error('Error handling paste:', err)
      }
    }

    const editorContainer = editor.getContainerDomNode()
    if (editorContainer) {
      editorContainer.addEventListener('paste', handlePaste, true)
      return () => {
        editorContainer.removeEventListener('paste', handlePaste, true)
      }
    }
  }, [setCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply decorations to highlight the selected mermaid block
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const model = editor.getModel()
    if (!model) return

    if (mermaidBlocks.length <= 1) {
      decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, [])
      lastBlockRevealRef.current = null
      return
    }

    const block = mermaidBlocks[selectedBlockIndex]
    if (!block) {
      decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, [])
      return
    }

    const startPos = model.getPositionAt(block.start)
    const endPos = model.getPositionAt(block.end)

    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, [
      {
        range: {
          startLineNumber: startPos.lineNumber,
          startColumn: 1,
          endLineNumber: endPos.lineNumber,
          endColumn: model.getLineMaxColumn(endPos.lineNumber),
        },
        options: {
          isWholeLine: true,
          className: 'mermaid-block-highlight',
          glyphMarginClassName: 'mermaid-block-gutter',
        },
      },
    ])

    const blockCount = mermaidBlocks.length
    const prevReveal = lastBlockRevealRef.current
    const shouldRevealBlockStart =
      prevReveal === null ||
      prevReveal.selectedBlockIndex !== selectedBlockIndex ||
      prevReveal.blockCount !== blockCount

    if (shouldRevealBlockStart) {
      editor.revealLineInCenterIfOutsideViewport(startPos.lineNumber)
      lastBlockRevealRef.current = { selectedBlockIndex, blockCount }
    }
  }, [mermaidBlocks, selectedBlockIndex, code, editorReady])

  // Listen for cursor position changes to switch selected block
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || mermaidBlocks.length <= 1) return

    const disposable = editor.onDidChangeCursorPosition(
      (e: { position: { lineNumber: number; column: number }; reason?: number }) => {
        if (e.reason === 1) return

        const model = editor.getModel()
        if (!model) return

        const offset = model.getOffsetAt(e.position)

        for (let i = 0; i < mermaidBlocks.length; i++) {
          if (offset >= mermaidBlocks[i].start && offset <= mermaidBlocks[i].end) {
            if (i !== selectedBlockIndex) {
              setSelectedBlockIndex(i)
            }
            return
          }
        }
      }
    )

    return () => disposable.dispose()
  }, [mermaidBlocks, selectedBlockIndex, setSelectedBlockIndex, editorReady])

  return (
    <div className={`editor-container ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'editor-container-mobile' : ''}`}>
      <div className="editor-header">
        {!isCollapsed && <span>Editor</span>}
        <div className="editor-header-controls">
          {!isCollapsed && error && <span className="error-indicator">⚠️ Syntax Error</span>}
          {!isMobile && (
            <button
              type="button"
              className="editor-toggle-btn"
              onClick={onToggleCollapsed}
              title={isCollapsed ? 'Expand editor' : 'Collapse editor'}
              aria-label={isCollapsed ? 'Expand editor panel' : 'Collapse editor panel'}
            >
              {isCollapsed ? <ExpandEditorIcon /> : <CollapseEditorIcon />}
            </button>
          )}
        </div>
      </div>
      {!isCollapsed && (
        <>
          <div className="editor-monaco-host">
            <EditorComponent
              height="100%"
              defaultLanguage="mermaid"
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorDidMount}
              theme={isAppThemeDark(mermaidTheme) ? 'vs-dark' : 'vs'}
              options={{
                minimap: { enabled: false },
                fontSize: isMobile ? 16 : 14,
                tabSize: 2,
                wordWrap: 'on',
                automaticLayout: true,
                glyphMargin: !isMobile && mermaidBlocks.length > 1,
                lineNumbers: isMobile ? 'off' : 'on',
                folding: !isMobile,
                scrollBeyondLastLine: false,
              }}
            />
          </div>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  )
}

