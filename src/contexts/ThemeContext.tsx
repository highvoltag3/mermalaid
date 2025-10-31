import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'
type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral'

interface ThemeContextType {
  theme: Theme
  mermaidTheme: MermaidTheme
  toggleTheme: () => void
  setMermaidTheme: (theme: MermaidTheme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('mermalaid-theme')
    return (saved as Theme) || 'light'
  })
  const [mermaidTheme, setMermaidThemeState] = useState<MermaidTheme>(() => {
    const saved = localStorage.getItem('mermalaid-mermaid-theme')
    return (saved as MermaidTheme) || 'default'
  })

  useEffect(() => {
    localStorage.setItem('mermalaid-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('mermalaid-mermaid-theme', mermaidTheme)
  }, [mermaidTheme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const setMermaidTheme = (newTheme: MermaidTheme) => {
    setMermaidThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, mermaidTheme, toggleTheme, setMermaidTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

