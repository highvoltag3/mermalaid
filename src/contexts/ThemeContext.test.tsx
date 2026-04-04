/**
 * README § Dark/Light + beautiful-mermaid Themes — persisted diagram theme id.
 */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTheme } from '../hooks/useTheme'
import { DEFAULT_MERMAID_THEME_ID } from '../utils/mermaidThemes'
import { ThemeProvider } from './ThemeContext'

function ThemeLabel() {
  const { mermaidTheme } = useTheme()
  return <span data-testid="theme">{mermaidTheme}</span>
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('falls back to default when localStorage holds an unknown theme id', () => {
    localStorage.setItem('mermalaid-mermaid-theme', 'not-a-valid-theme-id')

    render(
      <ThemeProvider>
        <ThemeLabel />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme').textContent).toBe(DEFAULT_MERMAID_THEME_ID)
  })
})
