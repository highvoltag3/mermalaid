const STORAGE_KEY = 'mermalaid-recent-files'
const MAX_RECENT = 10

function safeParse(json: string): string[] {
  try {
    const v = JSON.parse(json) as unknown
    if (!Array.isArray(v)) return []
    return v.filter((x): x is string => typeof x === 'string' && x.length > 0)
  } catch {
    return []
  }
}

export function getRecentPaths(): string[] {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addRecentFile(path: string): void {
  const prev = getRecentPaths().filter((p) => p !== path)
  const next = [path, ...prev].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

export function removeRecentFile(path: string): void {
  const next = getRecentPaths().filter((p) => p !== path)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Last path segment for menu labels */
export function recentFileLabel(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  const name = parts[parts.length - 1]
  return name || path
}
