import { useCallback, useEffect, useRef, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { getAppVersion } from '../utils/env'

const SKIP_VERSION_STORAGE_KEY = 'mermalaid-skipped-update-version'
const STARTUP_CHECK_DELAY_MS = 3000

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'up-to-date'
  | 'error'
  | 'disabled'

export interface UpdateInfo {
  version: string
  currentVersion: string
  body: string | null
  date: string | null
}

export interface UpdateProgress {
  contentLength: number | null
  downloaded: number
}

export interface UpdaterState {
  status: UpdateStatus
  update: UpdateInfo | null
  progress: UpdateProgress | null
  error: string | null
  checkForUpdates: () => Promise<void>
  downloadAndInstall: () => Promise<void>
  skipVersion: () => void
  dismissUpdate: () => void
}

function readSkippedVersion(): string | null {
  try {
    return localStorage.getItem(SKIP_VERSION_STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function writeSkippedVersion(version: string): void {
  try {
    localStorage.setItem(SKIP_VERSION_STORAGE_KEY, version)
  } catch {
    // storage unavailable
  }
}

interface TauriUpdateResult {
  version: string
  body: string | null
  date: string | null
  downloadAndInstall: (
    onProgress?: (event: {
      event: string
      data: { contentLength?: number; chunkLength?: number }
    }) => void
  ) => Promise<void>
}

export function useUpdater(): UpdaterState {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const checkedOnStartup = useRef(false)
  const updateRef = useRef<TauriUpdateResult | null>(null)

  const checkForUpdates = useCallback(async (options?: { silent?: boolean }) => {
    if (!isTauri()) {
      if (!options?.silent) {
        setStatus('disabled')
        setError('Updates are only available in the desktop app.')
      }
      return
    }

    setStatus('checking')
    setError(null)

    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const result = await check() as TauriUpdateResult | null

      if (!result) {
        setStatus('up-to-date')
        setUpdate(null)
        return
      }

      const skippedVersion = readSkippedVersion()
      if (options?.silent && skippedVersion === result.version) {
        setStatus('idle')
        return
      }

      setUpdate({
        version: result.version,
        currentVersion: getAppVersion(),
        body: result.body ?? null,
        date: result.date ?? null,
      })
      updateRef.current = result
      setStatus('available')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      
      // If the pubkey is placeholder or invalid, treat as not configured
      if (message.includes('REPLACE_WITH_YOUR_PUBLIC_KEY') || 
          message.includes('invalid public key') ||
          message.includes('pubkey')) {
        if (!options?.silent) {
          setStatus('disabled')
          setError('Auto-updates are not yet configured for this build.')
        } else {
          setStatus('idle')
        }
        return
      }

      // Network errors during silent check are OK
      if (options?.silent && (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('offline') ||
        message.includes('404') ||
        message.includes('Could not fetch')
      )) {
        setStatus('idle')
        return
      }

      setStatus('error')
      setError(message)
    }
  }, [])

  const downloadAndInstall = useCallback(async () => {
    const updateResult = updateRef.current
    if (!isTauri() || !updateResult) {
      return
    }

    setStatus('downloading')
    setProgress({ contentLength: null, downloaded: 0 })
    setError(null)

    try {
      let totalDownloaded = 0
      
      await updateResult.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          setProgress({
            contentLength: event.data.contentLength ?? null,
            downloaded: 0,
          })
        } else if (event.event === 'Progress') {
          totalDownloaded += event.data.chunkLength ?? 0
          setProgress((prev) => ({
            contentLength: prev?.contentLength ?? null,
            downloaded: totalDownloaded,
          }))
        } else if (event.event === 'Finished') {
          setStatus('ready')
        }
      })

      setStatus('ready')

      // Restart the app
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed'
      setStatus('error')
      setError(message)
    }
  }, [])

  const skipVersion = useCallback(() => {
    if (update) {
      writeSkippedVersion(update.version)
    }
    setStatus('idle')
    setUpdate(null)
    updateRef.current = null
  }, [update])

  const dismissUpdate = useCallback(() => {
    setStatus('idle')
    setUpdate(null)
    updateRef.current = null
  }, [])

  // Startup check (silent, once per launch, with delay)
  useEffect(() => {
    if (checkedOnStartup.current || !isTauri()) return

    checkedOnStartup.current = true

    const timeoutId = setTimeout(() => {
      void checkForUpdates({ silent: true })
    }, STARTUP_CHECK_DELAY_MS)

    return () => clearTimeout(timeoutId)
  }, [checkForUpdates])

  return {
    status,
    update,
    progress,
    error,
    checkForUpdates,
    downloadAndInstall,
    skipVersion,
    dismissUpdate,
  }
}
