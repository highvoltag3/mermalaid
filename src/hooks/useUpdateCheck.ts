import { useCallback, useEffect, useState } from 'react'
import { getAppVersion } from '../utils/env'
import {
  fetchLatestRelease,
  isSemverGreaterThan,
  type LatestReleaseInfo,
} from '../utils/githubRelease'

const DISMISS_STORAGE_KEY = 'mermalaid-dismissed-release-tag'
const CHECK_DELAY_MS = 2500
const FETCH_TIMEOUT_MS = 12_000

function readDismissedTag(): string | null {
  try {
    const v = localStorage.getItem(DISMISS_STORAGE_KEY)
    return v?.trim() || null
  } catch {
    return null
  }
}

function writeDismissedTag(tag: string) {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, tag)
  } catch {
    /* ignore */
  }
}

export interface UpdateCheckState {
  /** Latest release from GitHub when newer than this build */
  update: LatestReleaseInfo | null
  /** User closed the banner for this release */
  dismiss: () => void
}

/**
 * One-shot check after mount: compares GitHub latest release tag to getAppVersion().
 */
export function useUpdateCheck(): UpdateCheckState {
  const [update, setUpdate] = useState<LatestReleaseInfo | null>(null)

  const dismiss = useCallback(() => {
    setUpdate((current) => {
      if (current) writeDismissedTag(current.tag)
      return null
    })
  }, [])

  useEffect(() => {
    const currentVersion = getAppVersion()
    const dismissed = readDismissedTag()
    const ac = new AbortController()
    let fetchTimeoutId: number | undefined
    let active = true

    const delayId = window.setTimeout(() => {
      fetchTimeoutId = window.setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)

      void (async () => {
        try {
          const latest = await fetchLatestRelease(ac.signal)
          if (!active || ac.signal.aborted) return
          if (!latest) return
          if (dismissed && dismissed === latest.tag) return
          if (!isSemverGreaterThan(latest.version, currentVersion)) return
          setUpdate(latest)
        } finally {
          if (fetchTimeoutId !== undefined) window.clearTimeout(fetchTimeoutId)
          fetchTimeoutId = undefined
        }
      })()
    }, CHECK_DELAY_MS)

    return () => {
      active = false
      ac.abort()
      window.clearTimeout(delayId)
      if (fetchTimeoutId !== undefined) window.clearTimeout(fetchTimeoutId)
    }
  }, [])

  return { update, dismiss }
}
