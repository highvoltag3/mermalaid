import { beforeEach, describe, expect, it, vi } from 'vitest'

const isTauri = vi.hoisted(() => vi.fn(() => false))
const saveDialog = vi.hoisted(() => vi.fn())
const writeTextFile = vi.hoisted(() => vi.fn())
const writeFile = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({ isTauri }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: saveDialog }))
vi.mock('@tauri-apps/plugin-fs', () => ({ writeTextFile, writeFile }))

import { downloadBlob, saveBlob } from './saveFile'

const TEXT_OPTIONS = {
  suggestedName: 'diagram.mmd',
  filters: [{ name: 'Mermaid', extensions: ['mmd'] }],
  acceptTypes: [{ description: 'Mermaid', accept: { 'text/plain': ['.mmd'] } }],
}

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
    writeTextFile.mockReset()
    writeFile.mockReset()
  })

  it('uses the Tauri save dialog and writeTextFile for text blobs', async () => {
    isTauri.mockReturnValue(true)
    saveDialog.mockResolvedValue('/Users/me/docs/flow.mmd')
    writeTextFile.mockResolvedValue(undefined)

    const result = await saveBlob(new Blob(['graph TD'], { type: 'text/plain' }), TEXT_OPTIONS)

    expect(saveDialog).toHaveBeenCalledWith({
      filters: TEXT_OPTIONS.filters,
      defaultPath: 'diagram.mmd',
    })
    expect(writeTextFile).toHaveBeenCalledWith('/Users/me/docs/flow.mmd', 'graph TD')
    expect(result).toEqual({
      outcome: 'saved',
      path: '/Users/me/docs/flow.mmd',
      fileName: 'flow.mmd',
    })
  })

  it('uses writeFile for binary blobs on Tauri', async () => {
    isTauri.mockReturnValue(true)
    saveDialog.mockResolvedValue('/tmp/diagram.png')
    writeFile.mockResolvedValue(undefined)
    const bytes = new Uint8Array([1, 2, 3])

    const result = await saveBlob(new Blob([bytes], { type: 'image/png' }), {
      suggestedName: 'diagram.png',
      filters: [{ name: 'PNG', extensions: ['png'] }],
      acceptTypes: [{ description: 'PNG', accept: { 'image/png': ['.png'] } }],
    })

    expect(writeFile).toHaveBeenCalled()
    expect(writeTextFile).not.toHaveBeenCalled()
    expect(result.outcome).toBe('saved')
  })

  it('returns cancelled when the Tauri dialog is dismissed', async () => {
    isTauri.mockReturnValue(true)
    saveDialog.mockResolvedValue(null)

    const result = await saveBlob(new Blob(['x'], { type: 'text/plain' }), TEXT_OPTIONS)
    expect(result).toEqual({ outcome: 'cancelled' })
    expect(writeTextFile).not.toHaveBeenCalled()
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
