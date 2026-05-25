import { describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
}))

import { buildPrivateShareUrl } from './privateUrlShare'

describe('privateUrlShare (Tauri mock)', () => {
  it('buildPrivateShareUrl uses public https origin, not tauri://', () => {
    const prev = `${window.location.pathname}${window.location.search}`
    try {
      history.replaceState(null, '', '/editor')
      const url = buildPrivateShareUrl('#v1.abc')
      expect(url).toBe('https://mermalaid.com/editor#v1.abc')
      expect(url).not.toMatch(/^tauri:/)
    } finally {
      history.replaceState(null, '', prev || '/')
    }
  })
})
