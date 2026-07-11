import { useCallback, useEffect, useRef } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { readTextFile, watch } from '@tauri-apps/plugin-fs'
import { useToast } from './useToast'
import { decideExternalReload } from '../utils/externalFileReload'

// Debounce coalesces the multiple filesystem events an external save often emits.
const WATCH_DELAY_MS = 250

interface UseExternalFileWatchParams {
  /** Absolute path of the file backing the editor, or null when there is no file. */
  documentPath: string | null
  code: string
  setCode: (code: string) => void
}

export interface ExternalFileWatchApi {
  /** Record content Mermalaid just wrote to disk so its own save isn't seen as external. */
  markSaved: (content: string) => void
}

/**
 * Desktop-only: live-reload the editor when the open document is modified in another
 * application (issue #91). Watches the file via the Tauri fs plugin and applies external
 * changes through `setCode`, guarding against clobbering unsaved in-app edits.
 */
export function useExternalFileWatch({
  documentPath,
  code,
  setCode,
}: UseExternalFileWatchParams): ExternalFileWatchApi {
  const { showToast } = useToast()
  const codeRef = useRef(code)
  const setCodeRef = useRef(setCode)
  const showToastRef = useRef(showToast)
  const lastDiskRef = useRef<string | null>(null)

  useEffect(() => {
    codeRef.current = code
  }, [code])
  useEffect(() => {
    setCodeRef.current = setCode
  }, [setCode])
  useEffect(() => {
    showToastRef.current = showToast
  }, [showToast])

  useEffect(() => {
    if (!isTauri() || !documentPath) return

    // The editor was just loaded/saved with this path, so its code is the current disk state.
    lastDiskRef.current = codeRef.current

    let unwatch: (() => void) | undefined
    let cancelled = false

    const onFsEvent = async () => {
      let disk: string
      try {
        disk = await readTextFile(documentPath)
      } catch {
        // File may be mid-write, moved, or deleted; ignore this event.
        return
      }
      const decision = decideExternalReload({
        editorCode: codeRef.current,
        lastKnownDiskContent: lastDiskRef.current,
        newDiskContent: disk,
      })
      lastDiskRef.current = disk
      if (decision.action === 'reload') {
        setCodeRef.current(decision.content)
        showToastRef.current('Reloaded from external change')
      } else if (decision.action === 'conflict') {
        showToastRef.current('File changed on disk — you have unsaved changes here', 'error')
      }
    }

    void (async () => {
      try {
        const fn = await watch(documentPath, () => void onFsEvent(), { delayMs: WATCH_DELAY_MS })
        if (cancelled) fn()
        else unwatch = fn
      } catch (err) {
        // Watch may be unsupported or out of the fs scope; degrade silently to no live reload.
        console.error('External file watch failed:', err)
      }
    })()

    return () => {
      cancelled = true
      unwatch?.()
    }
  }, [documentPath])

  const markSaved = useCallback((content: string) => {
    lastDiskRef.current = content
  }, [])

  return { markSaved }
}
