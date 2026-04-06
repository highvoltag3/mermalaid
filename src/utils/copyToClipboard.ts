/**
 * Copy text after async generation. Resolves the string once, then tries Tauri native clipboard
 * (desktop), `navigator.clipboard.writeText`, and `execCommand('copy')`. We intentionally avoid
 * `clipboard.write(ClipboardItem)` with a deferred Blob: several Chromium builds never complete
 * that path (hang until timeout).
 */

import { isTauri } from '@tauri-apps/api/core'
import { writeText as writeClipboardTauri } from '@tauri-apps/plugin-clipboard-manager'

/** `isSecureContext` can be missing in some hosts; localhost still gets the Async Clipboard API. */
function isClipboardApiContext(): boolean {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext === true) return true
  const host = window.location?.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

const CLIPBOARD_WRITE_TIMEOUT_MS = 1200

async function tryClipboardWriteTextWithTimeout(
  writeText: (text: string) => Promise<void>,
  text: string,
): Promise<'ok' | 'failed' | 'timed-out'> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<'timed-out'>((resolve) => {
    timeoutId = setTimeout(() => resolve('timed-out'), CLIPBOARD_WRITE_TIMEOUT_MS)
  })

  try {
    const result = await Promise.race([
      writeText(text).then(() => 'ok' as const).catch(() => 'failed' as const),
      timeoutPromise,
    ])
    return result
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

function legacyCopyText(text: string): boolean {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', 'readonly')
    ta.setAttribute('aria-hidden', 'true')
    Object.assign(ta.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '0',
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      background: 'transparent',
      fontSize: '1px',
      opacity: '0.01',
      zIndex: '2147483647',
      pointerEvents: 'none',
    })
    document.body.appendChild(ta)
    ta.focus({ preventScroll: true })
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** User-facing message when every copy strategy fails. */
export function formatClipboardFailureMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return 'Could not copy: the browser blocked clipboard access. Try clicking the button again, use HTTPS or localhost, and allow clipboard permission for this site.'
    }
    if (err.message) {
      return `Could not copy: ${err.message}`
    }
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return 'Could not copy to the clipboard. Try again, check site permissions, or copy the link from the address bar after it appears.'
}

export async function copyPlainTextWhenReady(produceText: () => Promise<string>): Promise<void> {
  let pending: Promise<string> | null = null
  const getTextOnce = (): Promise<string> => {
    if (!pending) pending = produceText()
    return pending
  }

  const text = await getTextOnce()

  if (typeof window !== 'undefined') {
    try {
      window.focus()
    } catch {
      /* jsdom and some embedded hosts do not implement focus() */
    }
  }

  if (isTauri()) {
    try {
      await writeClipboardTauri(text)
      return
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[mermalaid] Tauri clipboard write failed; falling back to web clipboard APIs', err)
      }
    }
  }

  const secure = isClipboardApiContext()
  const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
  const hasWriteText = typeof clip?.writeText === 'function'

  if (secure && hasWriteText && clip) {
    const writeStatus = await tryClipboardWriteTextWithTimeout(
      (value) => clip.writeText(value),
      text,
    )
    if (writeStatus === 'ok') {
      return
    }
    if (import.meta.env.DEV) {
      if (writeStatus === 'timed-out') {
        console.warn('[mermalaid] clipboard.writeText timed out; falling back')
      } else {
        console.warn('[mermalaid] clipboard.writeText failed; falling back')
      }
    }
  }

  if (legacyCopyText(text)) {
    return
  }

  throw new DOMException(
    'All clipboard strategies failed (API and fallback).',
    'NotAllowedError',
  )
}
