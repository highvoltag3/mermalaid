import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import * as privateUrlShare from './utils/privateUrlShare'

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

vi.mock('./utils/privateUrlShare', async () => {
  const actual = await vi.importActual<typeof import('./utils/privateUrlShare')>('./utils/privateUrlShare')
  return {
    ...actual,
    encodePrivateShareHash: vi.fn(actual.encodePrivateShareHash),
  }
})

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
    vi.restoreAllMocks()
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
      expect(screen.getAllByRole('link', { name: /try online/i }).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('link', { name: /download for mac/i }).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('link', { name: /view on github/i }).length).toBeGreaterThan(0)
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
    })

    await user.click(queries.getByRole('button', { name: 'More' }))

    await waitFor(() => {
      expect(queries.getByRole('dialog', { name: 'More actions' })).toBeInTheDocument()
      expect(queries.getByRole('button', { name: 'Copy Code' })).toBeInTheDocument()
      expect(queries.getByRole('button', { name: 'SVG' })).toBeInTheDocument()
      expect(queries.getByLabelText('Theme')).toBeInTheDocument()
    })
  })

  it('shows the mobile Share button as busy while creating a private link', async () => {
    setViewportWidth(412)
    const user = userEvent.setup()

    const encodePrivateShareHashMock = vi
      .mocked(privateUrlShare.encodePrivateShareHash)
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('#v1.mock-link'), 50)
          }),
      )

    render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>,
    )

    const moreButton = await screen.findByRole('button', { name: 'More' })
    await user.click(moreButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'More actions' })).toBeInTheDocument()
    })

    const shareButton = await screen.findByRole('button', { name: 'Share' })
    await user.click(shareButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating link…' })).toBeDisabled()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Share' })).not.toBeDisabled()
    })

    expect(encodePrivateShareHashMock).toHaveBeenCalled()
  })
})
