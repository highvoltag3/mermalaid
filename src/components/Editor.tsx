import { useEffect, useRef } from 'react'
import EditorComponent from '@monaco-editor/react'
import { useTheme } from '../contexts/ThemeContext'
import './Editor.css'

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
        defaultLanguage="markdown"
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

