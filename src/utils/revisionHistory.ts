/**
 * Revision history storage for Mermaid diagrams.
 *
 * Stores snapshots of diagram code in localStorage, allowing users to view
 * change history, compare versions, and restore previous states.
 *
 * Designed so a future VCS backend could replace the storage layer while
 * keeping the same data model.
 */

export interface Revision {
  id: string
  timestamp: number
  code: string
  name?: string
}

const STORAGE_KEY = 'mermalaid-revisions'
const MAX_REVISIONS = 50
const MIN_CHANGE_INTERVAL_MS = 5_000

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function safeParse(json: string): Revision[] {
  try {
    const v = JSON.parse(json) as unknown
    if (!Array.isArray(v)) return []
    return v.filter(
      (x): x is Revision =>
        typeof x === 'object' &&
        x !== null &&
        typeof x.id === 'string' &&
        typeof x.timestamp === 'number' &&
        typeof x.code === 'string',
    )
  } catch {
    return []
  }
}

export function getRevisions(): Revision[] {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRevisions(revisions: Revision[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(revisions))
  } catch {
    // Quota exceeded: prune more aggressively and retry
    const pruned = revisions.slice(-Math.floor(MAX_REVISIONS / 2))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
    } catch {
      // Still failing: clear and save just the latest
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(revisions.slice(-1)),
        )
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Add a new revision if enough time has passed and content differs from latest.
 * Returns the new revision if created, or null if skipped.
 */
export function addRevision(
  code: string,
  name?: string,
  options?: { force?: boolean },
): Revision | null {
  const revisions = getRevisions()
  const latest = revisions[revisions.length - 1]

  // Skip if code is identical to latest
  if (latest && latest.code === code) {
    return null
  }

  // Skip if too soon after last revision (unless forced)
  if (
    !options?.force &&
    latest &&
    Date.now() - latest.timestamp < MIN_CHANGE_INTERVAL_MS
  ) {
    return null
  }

  const revision: Revision = {
    id: generateId(),
    timestamp: Date.now(),
    code,
    name,
  }

  const updated = [...revisions, revision].slice(-MAX_REVISIONS)
  saveRevisions(updated)
  return revision
}

/**
 * Force-add a revision, updating the latest if very recent and unnamed.
 * Use this for explicit "save checkpoint" actions.
 */
export function saveCheckpoint(code: string, name?: string): Revision {
  const revisions = getRevisions()
  const latest = revisions[revisions.length - 1]

  // If latest is very recent and unnamed, update it instead of creating new
  if (
    latest &&
    !latest.name &&
    Date.now() - latest.timestamp < MIN_CHANGE_INTERVAL_MS * 2
  ) {
    latest.code = code
    latest.timestamp = Date.now()
    if (name) latest.name = name
    saveRevisions(revisions)
    return latest
  }

  const revision: Revision = {
    id: generateId(),
    timestamp: Date.now(),
    code,
    name,
  }

  const updated = [...revisions, revision].slice(-MAX_REVISIONS)
  saveRevisions(updated)
  return revision
}

export function renameRevision(id: string, name: string): boolean {
  const revisions = getRevisions()
  const revision = revisions.find((r) => r.id === id)
  if (!revision) return false
  revision.name = name
  saveRevisions(revisions)
  return true
}

export function deleteRevision(id: string): boolean {
  const revisions = getRevisions()
  const filtered = revisions.filter((r) => r.id !== id)
  if (filtered.length === revisions.length) return false
  saveRevisions(filtered)
  return true
}

export function clearRevisions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function getRevisionById(id: string): Revision | undefined {
  return getRevisions().find((r) => r.id === id)
}

/**
 * Compute a simple line-based diff between two code strings.
 * Returns an array of diff hunks with change type and content.
 */
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  oldLineNo?: number
  newLineNo?: number
}

export function computeDiff(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode.split('\n')
  const newLines = newCode.split('\n')

  // Simple LCS-based diff
  const lcs = computeLCS(oldLines, newLines)
  const result: DiffLine[] = []

  let oldIdx = 0
  let newIdx = 0
  let lcsIdx = 0

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
      if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
        result.push({
          type: 'unchanged',
          content: lcs[lcsIdx],
          oldLineNo: oldIdx + 1,
          newLineNo: newIdx + 1,
        })
        oldIdx++
        newIdx++
        lcsIdx++
      } else {
        result.push({
          type: 'added',
          content: newLines[newIdx],
          newLineNo: newIdx + 1,
        })
        newIdx++
      }
    } else if (lcsIdx < lcs.length && newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
      result.push({
        type: 'removed',
        content: oldLines[oldIdx],
        oldLineNo: oldIdx + 1,
      })
      oldIdx++
    } else if (oldIdx < oldLines.length) {
      result.push({
        type: 'removed',
        content: oldLines[oldIdx],
        oldLineNo: oldIdx + 1,
      })
      oldIdx++
    } else if (newIdx < newLines.length) {
      result.push({
        type: 'added',
        content: newLines[newIdx],
        newLineNo: newIdx + 1,
      })
      newIdx++
    }
  }

  return result
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const lcs: string[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return lcs
}

/**
 * Format a timestamp as a human-readable relative or absolute time.
 */
export function formatRevisionTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60_000) {
    return 'Just now'
  }
  if (diff < 3600_000) {
    const mins = Math.floor(diff / 60_000)
    return `${mins} min${mins === 1 ? '' : 's'} ago`
  }
  if (diff < 86400_000) {
    const hours = Math.floor(diff / 3600_000)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  if (diff < 604800_000) {
    const days = Math.floor(diff / 86400_000)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}
