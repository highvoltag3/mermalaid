import { useEffect, useRef } from 'react'
import EditorComponent, { loader } from '@monaco-editor/react'
import { useTheme } from '../hooks/useTheme'
import { extractMermaidCode } from '../utils/mermaidCodeBlock'
import { isAppThemeDark } from '../utils/mermaidThemes'
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
}

export default function Editor({ code, setCode, error }: EditorProps) {
  const { mermaidTheme } = useTheme()
  const debounceTimer = useRef<NodeJS.Timeout>()
  const editorRef = useRef<any>(null)

  // Update Monaco editor when code changes externally (e.g., from AI Fix)
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue()
      if (currentValue !== code) {
        console.log('Updating Monaco editor with new code')
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
    }, 500)
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [code])

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
  }

  // Set up paste handler once editor is mounted
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const handlePaste = (e: ClipboardEvent) => {
      try {
        const pastedText = e.clipboardData?.getData('text') || ''
        const extractedCode = extractMermaidCode(pastedText)
        
        // If the pasted text was a code block and we extracted different content
        if (pastedText !== extractedCode) {
          e.preventDefault()
          e.stopPropagation()
          // Replace the entire editor content with the extracted code
          editor.setValue(extractedCode)
          // Update the state
          setCode(extractedCode)
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

  return (
    <div className="editor-container">
      <div className="editor-header">
        <span>Editor</span>
        {error && <span className="error-indicator">⚠️ Syntax Error</span>}
      </div>
      <EditorComponent
        height="100%"
        defaultLanguage="mermaid"
        value={code}
        onChange={(value) => setCode(value || '')}
        onMount={handleEditorDidMount}
        theme={isAppThemeDark(mermaidTheme) ? 'vs-dark' : 'vs'}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          tabSize: 2,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  )
}

