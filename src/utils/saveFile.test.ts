import { beforeEach, describe, expect, it, vi } from 'vitest'

const isTauri = vi.hoisted(() => vi.fn(() => false))
const saveDialog = vi.hoisted(() => vi.fn())
const writeFile = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({ isTauri }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: saveDialog }))
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile }))

import { downloadBlob, saveBlob, saveFileKind, toastMessageForSaveResult } from './saveFile'

const TEXT_OPTIONS = {
  suggestedName: 'diagram.mmd',
  filters: [{ name: 'Mermaid', extensions: ['mmd'] }],
  acceptTypes: [{ description: 'Mermaid', accept: { 'text/plain': ['.mmd'] } }],
}

describe('saveFileKind', () => {
  it('builds filter and accept metadata for one extension', () => {
    expect(saveFileKind('diagram.svg', 'SVG', 'svg', 'image/svg+xml')).toEqual({
      suggestedName: 'diagram.svg',
      filters: [{ name: 'SVG', extensions: ['svg'] }],
      acceptTypes: [{ description: 'SVG', accept: { 'image/svg+xml': ['.svg'] } }],
    })
  })
})

describe('toastMessageForSaveResult', () => {
  it('returns null for cancel and a verb+name otherwise', () => {
    expect(toastMessageForSaveResult({ outcome: 'cancelled' }, 'Saved')).toBeNull()
    expect(
      toastMessageForSaveResult({ outcome: 'downloaded', fileName: 'diagram.mmd' }, 'Saved'),
    ).toBe('Saved diagram.mmd')
  })
})

describe('downloadBlob', () => {
  it('creates an anchor download and revokes the object URL', () => {
    const click = vi.fn()
    const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    const removeChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement)

    try {
      downloadBlob(new Blob(['hi'], { type: 'text/plain' }), 'diagram.mmd')
      expect(createObjectURL).toHaveBeenCalled()
      expect(click).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    } finally {
      createElement.mockRestore()
      appendChild.mockRestore()
      removeChild.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})

describe('saveBlob', () => {
  beforeEach(() => {
    isTauri.mockReturnValue(false)
    saveDialog.mockReset()
    writeFile.mockReset()
  })

  it('uses the Tauri save dialog and writeFile', async () => {
    isTauri.mockReturnValue(true)
    saveDialog.mockResolvedValue('/Users/me/docs/flow.mmd')
    writeFile.mockResolvedValue(undefined)

    const result = await saveBlob(new Blob(['graph TD'], { type: 'text/plain' }), TEXT_OPTIONS)

    expect(saveDialog).toHaveBeenCalledWith({
      filters: TEXT_OPTIONS.filters,
      defaultPath: 'diagram.mmd',
    })
    expect(writeFile).toHaveBeenCalled()
    const [, bytes] = writeFile.mock.calls[0]
    expect(new TextDecoder().decode(bytes)).toBe('graph TD')
    expect(result).toEqual({
      outcome: 'saved',
      path: '/Users/me/docs/flow.mmd',
      fileName: 'flow.mmd',
    })
  })

  it('returns cancelled when the Tauri dialog is dismissed', async () => {
    isTauri.mockReturnValue(true)
    saveDialog.mockResolvedValue(null)

    const result = await saveBlob(new Blob(['x'], { type: 'text/plain' }), TEXT_OPTIONS)
    expect(result).toEqual({ outcome: 'cancelled' })
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('uses showSaveFilePicker when available on the web', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn().mockResolvedValue(undefined)
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      name: 'chosen.mmd',
      createWritable: async () => ({ write, close }),
    })
    vi.stubGlobal('showSaveFilePicker', showSaveFilePicker)

    try {
      const blob = new Blob(['code'], { type: 'text/plain' })
      const result = await saveBlob(blob, TEXT_OPTIONS)
      expect(showSaveFilePicker).toHaveBeenCalled()
      expect(write).toHaveBeenCalledWith(blob)
      expect(close).toHaveBeenCalled()
      expect(result).toEqual({ outcome: 'saved', fileName: 'chosen.mmd' })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('returns cancelled when the web picker is aborted', async () => {
    vi.stubGlobal(
      'showSaveFilePicker',
      vi.fn().mockRejectedValue(new DOMException('user cancel', 'AbortError')),
    )

    try {
      const result = await saveBlob(new Blob(['code'], { type: 'text/plain' }), TEXT_OPTIONS)
      expect(result).toEqual({ outcome: 'cancelled' })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it.each([
    ['SecurityError', 'Must be handling a user gesture'],
    ['NotAllowedError', 'Permission denied'],
  ] as const)(
    'falls back to anchor download when showSaveFilePicker throws %s',
    async (errorName, message) => {
      const click = vi.fn()
      vi.stubGlobal(
        'showSaveFilePicker',
        vi.fn().mockRejectedValue(new DOMException(message, errorName)),
      )
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:x'),
        revokeObjectURL: vi.fn(),
      })
      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click,
      } as unknown as HTMLAnchorElement)

      try {
        const result = await saveBlob(new Blob(['code'], { type: 'text/plain' }), TEXT_OPTIONS)
        expect(click).toHaveBeenCalled()
        expect(result).toEqual({ outcome: 'downloaded', fileName: 'diagram.mmd' })
      } finally {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
      }
    },
  )

  it('rethrows unexpected picker errors', async () => {
    vi.stubGlobal(
      'showSaveFilePicker',
      vi.fn().mockRejectedValue(new DOMException('disk full', 'QuotaExceededError')),
    )

    try {
      await expect(
        saveBlob(new Blob(['code'], { type: 'text/plain' }), TEXT_OPTIONS),
      ).rejects.toMatchObject({ name: 'QuotaExceededError' })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('falls back to anchor download when no picker is available', async () => {
    const click = vi.fn()
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement)

    try {
      const result = await saveBlob(new Blob(['code'], { type: 'text/plain' }), TEXT_OPTIONS)
      expect(click).toHaveBeenCalled()
      expect(result).toEqual({ outcome: 'downloaded', fileName: 'diagram.mmd' })
    } finally {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    }
  })
})
