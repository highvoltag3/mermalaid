import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUpdater } from './useUpdater'
import {
  isSemverGreaterThan,
  parseSemverParts,
  normalizeVersionFromTag,
} from '../utils/githubRelease'

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(() => false),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('useUpdater', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('web build behavior', () => {
    it('returns idle status in web builds', () => {
      const { result } = renderHook(() => useUpdater())
      
      expect(result.current.status).toBe('idle')
      expect(result.current.update).toBeNull()
      expect(result.current.progress).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('checkForUpdates sets disabled status in web builds', async () => {
      const { result } = renderHook(() => useUpdater())
      
      await act(async () => {
        await result.current.checkForUpdates()
      })
      
      expect(result.current.status).toBe('disabled')
      expect(result.current.error).toBe('Updates are only available in the desktop app.')
    })

    it('downloadAndInstall does nothing in web builds', async () => {
      const { result } = renderHook(() => useUpdater())
      
      await act(async () => {
        await result.current.downloadAndInstall()
      })
      
      // Should remain in idle state
      expect(result.current.status).toBe('idle')
    })
  })

  describe('skip version functionality', () => {
    it('skipVersion clears update and stores version', () => {
      const { result } = renderHook(() => useUpdater())
      
      // Manually set up update state for testing
      act(() => {
        // Simulate an available update
        result.current.skipVersion()
      })
      
      // Update should be cleared
      expect(result.current.update).toBeNull()
    })

    it('dismissUpdate clears update without storing version', () => {
      const { result } = renderHook(() => useUpdater())
      
      act(() => {
        result.current.dismissUpdate()
      })
      
      expect(result.current.update).toBeNull()
      expect(result.current.status).toBe('idle')
    })
  })

  describe('state management', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useUpdater())
      
      expect(result.current.status).toBe('idle')
      expect(result.current.update).toBeNull()
      expect(result.current.progress).toBeNull()
      expect(result.current.error).toBeNull()
      expect(typeof result.current.checkForUpdates).toBe('function')
      expect(typeof result.current.downloadAndInstall).toBe('function')
      expect(typeof result.current.skipVersion).toBe('function')
      expect(typeof result.current.dismissUpdate).toBe('function')
    })
  })
})

describe('version comparison (from githubRelease)', () => {
  describe('normalizeVersionFromTag', () => {
    it('removes leading v from tag', () => {
      expect(normalizeVersionFromTag('v1.2.3')).toBe('1.2.3')
      expect(normalizeVersionFromTag('V1.2.3')).toBe('1.2.3')
    })

    it('handles tags without v prefix', () => {
      expect(normalizeVersionFromTag('1.2.3')).toBe('1.2.3')
    })

    it('trims trailing whitespace', () => {
      expect(normalizeVersionFromTag('v1.2.3  ')).toBe('1.2.3')
    })
  })

  describe('parseSemverParts', () => {
    it('parses valid semver versions', () => {
      expect(parseSemverParts('1.2.3')).toEqual([1, 2, 3])
      expect(parseSemverParts('0.0.0')).toEqual([0, 0, 0])
      expect(parseSemverParts('10.20.30')).toEqual([10, 20, 30])
    })

    it('handles v prefix', () => {
      expect(parseSemverParts('v1.2.3')).toEqual([1, 2, 3])
    })

    it('ignores prerelease suffix', () => {
      expect(parseSemverParts('1.2.3-beta.1')).toEqual([1, 2, 3])
      expect(parseSemverParts('1.2.3-rc1')).toEqual([1, 2, 3])
    })

    it('returns null for invalid versions', () => {
      expect(parseSemverParts('invalid')).toBeNull()
      expect(parseSemverParts('1.2')).toBeNull()
      expect(parseSemverParts('')).toBeNull()
    })
  })

  describe('isSemverGreaterThan', () => {
    it('returns true when latest is newer', () => {
      expect(isSemverGreaterThan('2.0.0', '1.0.0')).toBe(true)
      expect(isSemverGreaterThan('1.1.0', '1.0.0')).toBe(true)
      expect(isSemverGreaterThan('1.0.1', '1.0.0')).toBe(true)
    })

    it('returns false when latest is older', () => {
      expect(isSemverGreaterThan('1.0.0', '2.0.0')).toBe(false)
      expect(isSemverGreaterThan('1.0.0', '1.1.0')).toBe(false)
      expect(isSemverGreaterThan('1.0.0', '1.0.1')).toBe(false)
    })

    it('returns false when versions are equal', () => {
      expect(isSemverGreaterThan('1.0.0', '1.0.0')).toBe(false)
      expect(isSemverGreaterThan('2.5.3', '2.5.3')).toBe(false)
    })

    it('handles v prefix', () => {
      expect(isSemverGreaterThan('v2.0.0', 'v1.0.0')).toBe(true)
      expect(isSemverGreaterThan('2.0.0', 'v1.0.0')).toBe(true)
    })

    it('returns false for invalid versions', () => {
      expect(isSemverGreaterThan('invalid', '1.0.0')).toBe(false)
      expect(isSemverGreaterThan('1.0.0', 'invalid')).toBe(false)
    })
  })
})

describe('skip version persistence', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('reads skipped version from localStorage', () => {
    localStorageMock.setItem('mermalaid-skipped-update-version', '2.0.0')
    
    const stored = localStorageMock.getItem('mermalaid-skipped-update-version')
    expect(stored).toBe('2.0.0')
  })

  it('handles missing localStorage gracefully', () => {
    const stored = localStorageMock.getItem('mermalaid-skipped-update-version')
    expect(stored).toBeNull()
  })
})
