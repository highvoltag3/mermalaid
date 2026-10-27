/**
 * Tests for revision history storage utility.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getRevisions,
  addRevision,
  saveCheckpoint,
  renameRevision,
  deleteRevision,
  clearRevisions,
  getRevisionById,
  computeDiff,
  formatRevisionTime,
  type Revision,
} from './revisionHistory'

const STORAGE_KEY = 'mermalaid-revisions'

describe('revisionHistory', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getRevisions', () => {
    it('returns empty array when storage is empty', () => {
      expect(getRevisions()).toEqual([])
    })

    it('returns parsed revisions from storage', () => {
      const revisions: Revision[] = [
        { id: '1', timestamp: 1000, code: 'graph TD' },
        { id: '2', timestamp: 2000, code: 'graph LR' },
      ]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(revisions))
      expect(getRevisions()).toEqual(revisions)
    })

    it('handles malformed JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'not valid json')
      expect(getRevisions()).toEqual([])
    })

    it('filters invalid entries', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        { id: '1', timestamp: 1000, code: 'valid' },
        { id: 123, timestamp: 1000, code: 'invalid id type' },
        { id: '2', timestamp: 'bad', code: 'invalid timestamp' },
        { id: '3', timestamp: 3000 },
      ]))
      expect(getRevisions()).toEqual([
        { id: '1', timestamp: 1000, code: 'valid' },
      ])
    })
  })

  describe('addRevision', () => {
    it('creates a revision when storage is empty', () => {
      const result = addRevision('graph TD')
      expect(result).not.toBeNull()
      expect(result?.code).toBe('graph TD')
      expect(getRevisions()).toHaveLength(1)
    })

    it('skips if code is identical to latest', () => {
      addRevision('graph TD', undefined, { force: true })
      vi.advanceTimersByTime(10000)
      const result = addRevision('graph TD')
      expect(result).toBeNull()
      expect(getRevisions()).toHaveLength(1)
    })

    it('skips if added too quickly (debouncing)', () => {
      addRevision('graph TD', undefined, { force: true })
      const result = addRevision('graph LR')
      expect(result).toBeNull()
      expect(getRevisions()).toHaveLength(1)
    })

    it('allows adding after debounce interval', () => {
      addRevision('graph TD', undefined, { force: true })
      vi.advanceTimersByTime(6000)
      const result = addRevision('graph LR')
      expect(result).not.toBeNull()
      expect(getRevisions()).toHaveLength(2)
    })

    it('respects force option', () => {
      addRevision('graph TD', undefined, { force: true })
      const result = addRevision('graph LR', undefined, { force: true })
      expect(result).not.toBeNull()
      expect(getRevisions()).toHaveLength(2)
    })

    it('limits to MAX_REVISIONS', () => {
      for (let i = 0; i < 60; i++) {
        vi.advanceTimersByTime(6000)
        addRevision(`graph TD\n${i}`, undefined, { force: true })
      }
      const revisions = getRevisions()
      expect(revisions.length).toBeLessThanOrEqual(50)
    })
  })

  describe('saveCheckpoint', () => {
    it('creates a named checkpoint', () => {
      const result = saveCheckpoint('graph TD', 'Initial version')
      expect(result.name).toBe('Initial version')
      expect(result.code).toBe('graph TD')
    })

    it('updates recent unnamed revision', () => {
      addRevision('graph TD', undefined, { force: true })
      vi.advanceTimersByTime(5000)
      const result = saveCheckpoint('graph LR', 'Checkpoint')
      expect(result.name).toBe('Checkpoint')
      expect(getRevisions()).toHaveLength(1)
    })
  })

  describe('renameRevision', () => {
    it('renames an existing revision', () => {
      const rev = addRevision('graph TD', undefined, { force: true })!
      const success = renameRevision(rev.id, 'New Name')
      expect(success).toBe(true)
      expect(getRevisionById(rev.id)?.name).toBe('New Name')
    })

    it('returns false for non-existent id', () => {
      expect(renameRevision('fake-id', 'Name')).toBe(false)
    })
  })

  describe('deleteRevision', () => {
    it('deletes an existing revision', () => {
      const rev = addRevision('graph TD', undefined, { force: true })!
      expect(deleteRevision(rev.id)).toBe(true)
      expect(getRevisions()).toHaveLength(0)
    })

    it('returns false for non-existent id', () => {
      expect(deleteRevision('fake-id')).toBe(false)
    })
  })

  describe('clearRevisions', () => {
    it('removes all revisions', () => {
      addRevision('graph TD', undefined, { force: true })
      vi.advanceTimersByTime(6000)
      addRevision('graph LR', undefined, { force: true })
      clearRevisions()
      expect(getRevisions()).toHaveLength(0)
    })
  })

  describe('getRevisionById', () => {
    it('returns revision by id', () => {
      const rev = addRevision('graph TD', undefined, { force: true })!
      expect(getRevisionById(rev.id)).toEqual(rev)
    })

    it('returns undefined for non-existent id', () => {
      expect(getRevisionById('fake-id')).toBeUndefined()
    })
  })
})

describe('computeDiff', () => {
  it('returns empty array for identical strings', () => {
    const result = computeDiff('hello', 'hello')
    expect(result.every(line => line.type === 'unchanged')).toBe(true)
  })

  it('detects added lines', () => {
    const result = computeDiff('line1', 'line1\nline2')
    expect(result.some(line => line.type === 'added' && line.content === 'line2')).toBe(true)
  })

  it('detects removed lines', () => {
    const result = computeDiff('line1\nline2', 'line1')
    expect(result.some(line => line.type === 'removed' && line.content === 'line2')).toBe(true)
  })

  it('handles multi-line changes', () => {
    const old = 'A\nB\nC'
    const newCode = 'A\nX\nC'
    const result = computeDiff(old, newCode)
    expect(result.some(line => line.type === 'removed' && line.content === 'B')).toBe(true)
    expect(result.some(line => line.type === 'added' && line.content === 'X')).toBe(true)
    expect(result.filter(line => line.type === 'unchanged').length).toBe(2)
  })
})

describe('formatRevisionTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "Just now" for recent times', () => {
    const timestamp = Date.now() - 30000
    expect(formatRevisionTime(timestamp)).toBe('Just now')
  })

  it('shows minutes for times < 1 hour', () => {
    const timestamp = Date.now() - 5 * 60000
    expect(formatRevisionTime(timestamp)).toBe('5 mins ago')
  })

  it('shows hours for times < 1 day', () => {
    const timestamp = Date.now() - 3 * 3600000
    expect(formatRevisionTime(timestamp)).toBe('3 hours ago')
  })

  it('shows days for times < 1 week', () => {
    const timestamp = Date.now() - 2 * 86400000
    expect(formatRevisionTime(timestamp)).toBe('2 days ago')
  })

  it('shows date for older times', () => {
    const timestamp = Date.now() - 10 * 86400000
    const result = formatRevisionTime(timestamp)
    expect(result).toMatch(/Jun 5/)
  })
})
