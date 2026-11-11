import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { isTauri } from '@tauri-apps/api/core'
import App from './App'
import * as updaterHook from './hooks/useUpdater'
import * as privateUrlShare from './utils/privateUrlShare'
import desktopCapabilities from '../src-tauri/capabilities/default.json'

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(() => false),
  invoke: async () => [] as string[],
}))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ setTitle: async () => {} }),
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

const precedes = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('Desktop update banner layout', () => {
  let updater: ReturnType<typeof updaterHook.useUpdater>

  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    updater = {
      status: 'up-to-date',
      update: { version: '2.0.0', currentVersion: '1.9.2', body: null, date: null },
      progress: { downloaded: 512, contentLength: 1024 },
      error: 'Network unavailable',
      checkForUpdates: vi.fn(),
      downloadAndInstall: vi.fn(),
      skipVersion: vi.fn(),
      dismissUpdate: vi.fn(),
    }
    vi.spyOn(updaterHook, 'useUpdater').mockReturnValue(updater)
  })

  afterEach(() => {
    cleanup()
    vi.mocked(isTauri).mockReturnValue(false)
    vi.restoreAllMocks()
  })

  it.each([
    'checking', 'up-to-date', 'disabled', 'error', 'available', 'downloading', 'ready',
  ] as const)('keeps the macOS titlebar above the %s banner', (status) => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel')
    vi.mocked(updaterHook.useUpdater).mockReturnValue({ ...updater, status })
    const { container } = render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>,
    )
    const titlebar = container.querySelector('.app-titlebar')!
    const banner = container.querySelector('.update-banner')!

    expect(titlebar).toHaveClass('app-titlebar--overlay')
    expect(precedes(titlebar, banner)).toBe(true)
    expect(titlebar).toHaveAttribute('data-tauri-drag-region', 'true')
    expect(desktopCapabilities.windows).toContain('main')
    expect(desktopCapabilities.permissions).toContain('core:window:allow-start-dragging')

    if (status === 'up-to-date') {
      screen.getByRole('button', { name: 'OK' }).click()
      expect(updater.dismissUpdate).toHaveBeenCalledOnce()
    }
  })

  it.each([
    { desktop: false, platform: 'MacIntel', userAgent: 'Mac OS X' },
    { desktop: true, platform: 'Win32', userAgent: 'Windows NT' },
    { desktop: true, platform: 'Linux x86_64', userAgent: 'Linux' },
  ])('preserves titlebar ordering for $platform (desktop: $desktop)', ({ desktop, platform, userAgent }) => {
    vi.mocked(isTauri).mockReturnValue(desktop)
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue(platform)
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent)
    const { container } = render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>,
    )
    const titlebar = container.querySelector('.app-titlebar')!

    expect(titlebar).not.toHaveClass('app-titlebar--overlay')
    expect(titlebar).not.toHaveAttribute('data-tauri-drag-region')
    if (desktop) {
      expect(precedes(container.querySelector('.update-banner')!, titlebar)).toBe(true)
    }
  })

  it('focuses the macOS document title before the update banner actions', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel')
    vi.mocked(updaterHook.useUpdater).mockReturnValue({ ...updater, status: 'available' })
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>,
    )

    await user.tab()
    expect(screen.getByRole('button', { name: /^Rename / })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Update & Restart' })).toHaveFocus()
  })
})

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
      expect(screen.getAllByRole('link', { name: /go to editor/i }).length).toBeGreaterThan(0)
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

  it('shows Untitled for a new document and updates the tab title', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(container.querySelector('.document-title-trigger')).toHaveTextContent(/Untitled/)
      expect(document.title).toBe('Untitled - Mermalaid')
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
