/**
 * Tests for useRevisionHistory hook.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRevisionHistory } from './useRevisionHistory'
import { clearRevisions, getRevisions } from '../utils/revisionHistory'

describe('useRevisionHistory', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with existing revisions from storage', () => {
    clearRevisions()
    const { result } = renderHook(() =>
      useRevisionHistory({ code: 'graph TD', onRestore: vi.fn() }),
    )
    expect(result.current.revisions).toEqual([])
  })

  it('creates checkpoint on demand', () => {
    const { result } = renderHook(() =>
      useRevisionHistory({ code: 'graph TD', onRestore: vi.fn() }),
    )

    act(() => {
      result.current.createCheckpoint('Test checkpoint')
    })

    expect(result.current.revisions).toHaveLength(1)
    expect(result.current.revisions[0].name).toBe('Test checkpoint')
  })

  it('renames revision', () => {
    const { result } = renderHook(() =>
      useRevisionHistory({ code: 'graph TD', onRestore: vi.fn() }),
    )

    let revisionId: string
    act(() => {
      const checkpoint = result.current.createCheckpoint()
      revisionId = checkpoint.id
    })

    act(() => {
      result.current.rename(revisionId!, 'New name')
    })

    expect(result.current.revisions[0].name).toBe('New name')
  })

  it('removes revision', () => {
    const { result } = renderHook(() =>
      useRevisionHistory({ code: 'graph TD', onRestore: vi.fn() }),
    )

    let revisionId: string
    act(() => {
      const checkpoint = result.current.createCheckpoint()
      revisionId = checkpoint.id
    })

    act(() => {
      result.current.remove(revisionId!)
    })

    expect(result.current.revisions).toHaveLength(0)
  })

  it('clears all revisions', () => {
    const { result } = renderHook(() =>
      useRevisionHistory({ code: 'graph TD', onRestore: vi.fn() }),
    )

    act(() => {
      result.current.createCheckpoint('One')
    })

    act(() => {
      vi.advanceTimersByTime(6000)
      result.current.createCheckpoint('Two')
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.revisions).toHaveLength(0)
  })

  it('calls onRestore with revision code', () => {
    const onRestore = vi.fn()
    const { result } = renderHook(() =>
      useRevisionHistory({ code: 'graph TD', onRestore }),
    )

    let revisionId: string
    act(() => {
      const checkpoint = result.current.createCheckpoint()
      revisionId = checkpoint.id
    })

    act(() => {
      result.current.restore(revisionId!)
    })

    expect(onRestore).toHaveBeenCalledWith('graph TD')
  })

  it('gets revision by id', () => {
    const { result } = renderHook(() =>
      useRevisionHistory({ code: 'graph TD', onRestore: vi.fn() }),
    )

    let revisionId: string
    act(() => {
      const checkpoint = result.current.createCheckpoint('My checkpoint')
      revisionId = checkpoint.id
    })

    const retrieved = result.current.getRevision(revisionId!)
    expect(retrieved?.name).toBe('My checkpoint')
  })

  it('auto-snapshots on code changes after debounce', () => {
    const { result, rerender } = renderHook(
      ({ code }) => useRevisionHistory({ code, onRestore: vi.fn() }),
      { initialProps: { code: 'graph TD' } },
    )

    rerender({ code: 'graph LR' })

    act(() => {
      vi.advanceTimersByTime(15000)
    })

    result.current.refresh()
    expect(getRevisions().some(r => r.code === 'graph LR')).toBe(true)
  })
})
