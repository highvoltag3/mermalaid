import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
  default: function MonacoEditorMock({ value }: { value?: string }) {
    return <div data-testid="monaco-editor-mock">{value}</div>
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
  const setViewportWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    })
    window.dispatchEvent(new Event('resize'))
  }

  beforeEach(() => {
    localStorage.clear()
    setViewportWidth(1280)
  })

  afterEach(() => {
    cleanup()
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

  it('switches between preview and editor in smartphone mode', async () => {
    setViewportWidth(390)
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>,
    )
    const queries = within(container)

    await waitFor(() => {
      expect(queries.getByRole('tab', { name: 'Code' })).toBeInTheDocument()
      expect(queries.getByRole('tab', { name: 'Preview' })).toBeInTheDocument()
      expect(container.querySelector('.toolbar-mobile')).toBeTruthy()
      expect(container.querySelector('.preview-container')).toBeTruthy()
      expect(container.querySelector('.editor-container')).toBeFalsy()
    })

    await user.click(queries.getByRole('tab', { name: 'Code' }))

    await waitFor(() => {
      expect(container.querySelector('.editor-container')).toBeTruthy()
      expect(container.querySelector('.preview-container')).toBeFalsy()
      expect(queries.getByTestId('monaco-editor-mock')).toHaveTextContent('graph TD')
    })
  })

  it('opens the compact mobile actions sheet on smartphones', async () => {
    setViewportWidth(412)
    const user = userEvent.setup()

    const { container } = render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>,
    )
    const queries = within(container)

    await waitFor(() => {
      expect(queries.getByRole('button', { name: 'More' })).toBeInTheDocument()
      expect(queries.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    })

    await user.click(queries.getByRole('button', { name: 'More' }))

    await waitFor(() => {
      expect(queries.getByRole('dialog', { name: 'More actions' })).toBeInTheDocument()
      expect(queries.getByRole('button', { name: 'Copy Code' })).toBeInTheDocument()
      expect(queries.getByRole('button', { name: 'SVG' })).toBeInTheDocument()
      expect(queries.getByLabelText('Theme')).toBeInTheDocument()
    })
  })
})
