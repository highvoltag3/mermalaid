import { useState, useCallback, useEffect, useRef } from 'react'
import {
  getRevisions,
  addRevision,
  saveCheckpoint,
  renameRevision,
  deleteRevision,
  clearRevisions,
  getRevisionById,
  type Revision,
} from '../utils/revisionHistory'

const AUTO_SNAPSHOT_DEBOUNCE_MS = 10_000

export interface UseRevisionHistoryOptions {
  code: string
  onRestore?: (code: string) => void
}

export interface UseRevisionHistoryResult {
  revisions: Revision[]
  refresh: () => void
  createCheckpoint: (name?: string) => Revision
  rename: (id: string, name: string) => boolean
  remove: (id: string) => boolean
  clear: () => void
  restore: (id: string) => void
  getRevision: (id: string) => Revision | undefined
}

export function useRevisionHistory({
  code,
  onRestore,
}: UseRevisionHistoryOptions): UseRevisionHistoryResult {
  const [revisions, setRevisions] = useState<Revision[]>(() => getRevisions())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const lastSnapshotCodeRef = useRef<string>(code)

  const refresh = useCallback(() => {
    setRevisions(getRevisions())
  }, [])

  // Auto-snapshot on code changes (debounced)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Skip if code hasn't meaningfully changed
    if (code === lastSnapshotCodeRef.current) {
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      const result = addRevision(code)
      if (result) {
        lastSnapshotCodeRef.current = code
        refresh()
      }
    }, AUTO_SNAPSHOT_DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [code, refresh])

  const createCheckpoint = useCallback(
    (name?: string) => {
      const result = saveCheckpoint(code, name)
      lastSnapshotCodeRef.current = code
      refresh()
      return result
    },
    [code, refresh],
  )

  const rename = useCallback(
    (id: string, name: string) => {
      const result = renameRevision(id, name)
      if (result) refresh()
      return result
    },
    [refresh],
  )

  const remove = useCallback(
    (id: string) => {
      const result = deleteRevision(id)
      if (result) refresh()
      return result
    },
    [refresh],
  )

  const clear = useCallback(() => {
    clearRevisions()
    refresh()
  }, [refresh])

  const restore = useCallback(
    (id: string) => {
      const revision = getRevisionById(id)
      if (revision && onRestore) {
        onRestore(revision.code)
        lastSnapshotCodeRef.current = revision.code
      }
    },
    [onRestore],
  )

  const getRevision = useCallback((id: string) => getRevisionById(id), [])

  return {
    revisions,
    refresh,
    createCheckpoint,
    rename,
    remove,
    clear,
    restore,
    getRevision,
  }
}
