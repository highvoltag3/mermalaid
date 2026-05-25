import { describe, expect, it, vi } from 'vitest'
import { copyPlainTextWhenReady, formatClipboardFailureMessage } from './copyToClipboard'

describe('formatClipboardFailureMessage', () => {
  it('maps NotAllowedError to a helpful string', () => {
    const msg = formatClipboardFailureMessage(new DOMException('nope', 'NotAllowedError'))
    expect(msg).toMatch(/blocked clipboard/i)
  })
})

describe('copyPlainTextWhenReady', () => {
  it('copies via writeText when API is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      clipboard: { write: undefined, writeText },
    })
    const secure = Object.getOwnPropertyDescriptor(window, 'isSecureContext')
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    })
    const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {})

    try {
      await copyPlainTextWhenReady(async () => 'fallback-text')
      expect(writeText).toHaveBeenCalledWith('fallback-text')
    } finally {
      focusSpy.mockRestore()
      if (secure) {
        Object.defineProperty(window, 'isSecureContext', secure)
      } else {
        Reflect.deleteProperty(window, 'isSecureContext')
      }
      vi.unstubAllGlobals()
    }
  })

  it('propagates errors from produceText', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        write: undefined,
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      },
    })
    document.execCommand = vi.fn().mockReturnValue(false)

    try {
      await expect(
        copyPlainTextWhenReady(async () => {
          throw new Error('bad payload')
        }),
      ).rejects.toThrow('bad payload')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('falls back when writeText hangs', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockImplementation(() => new Promise<void>(() => {}))
    vi.stubGlobal('navigator', {
      clipboard: { write: undefined, writeText },
    })
    document.execCommand = vi.fn().mockReturnValue(true)
    const secure = Object.getOwnPropertyDescriptor(window, 'isSecureContext')
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    })
    const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {})

    try {
      const copyPromise = copyPlainTextWhenReady(async () => 'stuck')
      await vi.advanceTimersByTimeAsync(1300)
      await expect(copyPromise).resolves.toBeUndefined()
      expect(document.execCommand).toHaveBeenCalledWith('copy')
      expect(writeText).toHaveBeenCalledWith('stuck')
    } finally {
      focusSpy.mockRestore()
      if (secure) {
        Object.defineProperty(window, 'isSecureContext', secure)
      } else {
        Reflect.deleteProperty(window, 'isSecureContext')
      }
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })
})
