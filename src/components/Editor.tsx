import { useEffect, useRef } from 'react'
import EditorComponent, { loader } from '@monaco-editor/react'
import { useTheme } from '../contexts/ThemeContext'
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
  const { theme } = useTheme()
  const debounceTimer = useRef<NodeJS.Timeout>()

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
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
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

