import { createContext, useState, useEffect, ReactNode } from 'react'
import {
  type MermaidThemeId,
  DEFAULT_MERMAID_THEME_ID,
  isValidMermaidThemeId,
} from '../utils/mermaidThemes'

interface ThemeContextType {
  mermaidTheme: MermaidThemeId
  setMermaidTheme: (theme: MermaidThemeId) => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mermaidTheme, setMermaidThemeState] = useState<MermaidThemeId>(() => {
    try {
      const saved = localStorage.getItem('mermalaid-mermaid-theme')
      const id = saved && isValidMermaidThemeId(saved) ? saved : DEFAULT_MERMAID_THEME_ID
      return id as MermaidThemeId
    } catch {
      return DEFAULT_MERMAID_THEME_ID as MermaidThemeId
    }
  })

  useEffect(() => {
    localStorage.setItem('mermalaid-mermaid-theme', mermaidTheme)
  }, [mermaidTheme])

  const setMermaidTheme = (newTheme: MermaidThemeId) => {
    setMermaidThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ mermaidTheme, setMermaidTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

