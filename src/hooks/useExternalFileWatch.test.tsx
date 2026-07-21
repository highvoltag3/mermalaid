import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { ToastProvider } from '../contexts/ToastContext'
import { useExternalFileWatch } from './useExternalFileWatch'

const watchMock = vi.fn()
const readTextFileMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }))
vi.mock('@tauri-apps/plugin-fs', () => ({
  watch: (...args: unknown[]) => watchMock(...args),
  readTextFile: (...args: unknown[]) => readTextFileMock(...args),
}))

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

afterEach(() => {
  watchMock.mockReset()
  readTextFileMock.mockReset()
})

describe('useExternalFileWatch', () => {
  it('does not watch when there is no document path', () => {
    renderHook(() => useExternalFileWatch({ documentPath: null, code: 'A', setCode: vi.fn() }), { wrapper })
    expect(watchMock).not.toHaveBeenCalled()
  })

  it('registers a debounced watch for the document path', async () => {
    watchMock.mockResolvedValue(() => {})
    renderHook(() => useExternalFileWatch({ documentPath: '/tmp/a.mmd', code: 'A', setCode: vi.fn() }), { wrapper })
    await waitFor(() =>
      expect(watchMock).toHaveBeenCalledWith(
        '/tmp/a.mmd',
        expect.any(Function),
        expect.objectContaining({ delayMs: expect.any(Number) }),
      ),
    )
  })

  it('reloads via setCode on an external change with no local edits', async () => {
    let fsCallback: () => void = () => {}
    watchMock.mockImplementation(async (_path: string, cb: () => void) => {
      fsCallback = cb
      return () => {}
    })
    readTextFileMock.mockResolvedValue('EXTERNALLY EDITED')
    const setCode = vi.fn()
    renderHook(() => useExternalFileWatch({ documentPath: '/tmp/a.mmd', code: 'A', setCode }), { wrapper })

    await waitFor(() => expect(watchMock).toHaveBeenCalled())
    fsCallback()
    await waitFor(() => expect(setCode).toHaveBeenCalledWith('EXTERNALLY EDITED'))
  })

  it('ignores an event when the disk already matches the editor (our own save)', async () => {
    let fsCallback: () => void = () => {}
    watchMock.mockImplementation(async (_path: string, cb: () => void) => {
      fsCallback = cb
      return () => {}
    })
    readTextFileMock.mockResolvedValue('A')
    const setCode = vi.fn()
    renderHook(() => useExternalFileWatch({ documentPath: '/tmp/a.mmd', code: 'A', setCode }), { wrapper })

    await waitFor(() => expect(watchMock).toHaveBeenCalled())
    fsCallback()
    await waitFor(() => expect(readTextFileMock).toHaveBeenCalled())
    expect(setCode).not.toHaveBeenCalled()
  })
})
