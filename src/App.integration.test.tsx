import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => false,
  invoke: async () => [] as string[],
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: async () => () => {},
}))

vi.mock('./nativeAppMenu', () => ({
  initNativeAppMenu: async () => {},
  setNativeMenuHandlerSource: () => {},
}))

vi.mock('./hooks/useUpdateCheck', () => ({
  useUpdateCheck: () => ({ update: null, dismiss: () => {} }),
}))

vi.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: function MonacoEditorMock() {
    return <div data-testid="monaco-editor-mock" />
  },
  loader: {
    init: async () => ({
      languages: {
        register: () => {},
        setMonarchTokensProvider: () => {},
        setLanguageConfiguration: () => {},
      },
    }),
  },
}))

describe('App (web)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders landing with editor entry point on /', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /open editor/i })).toBeInTheDocument()
    })
  })

  it('renders editor shell on /editor', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(container.querySelector('.toolbar')).toBeTruthy()
      expect(container.querySelector('.editor-container')).toBeTruthy()
      expect(container.querySelector('.preview-container')).toBeTruthy()
    })
  })
})
