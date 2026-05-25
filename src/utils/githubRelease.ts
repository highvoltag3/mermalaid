/**
 * Fetch latest GitHub release metadata for update notifications.
 */

const DEFAULT_REPO = 'highvoltag3/mermalaid'

export function getReleasesRepo(): string {
  const raw = import.meta.env.VITE_GITHUB_REPO?.trim()
  if (raw && /^\S+\/\S+$/.test(raw)) return raw
  return DEFAULT_REPO
}

export interface LatestReleaseInfo {
  tag: string
  version: string
  releaseUrl: string
  name: string | null
}

/** Strip leading "v" from tag names like "v1.2.3". */
export function normalizeVersionFromTag(tag: string): string {
  return tag.replace(/^v/i, '').trim()
}

/**
 * Parse leading numeric semver (major.minor.patch); ignores pre-release suffix for ordering.
 */
export function parseSemverParts(version: string): [number, number, number] | null {
  const cleaned = normalizeVersionFromTag(version)
  const m = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** True if `latest` is strictly newer than `current` (both treated as semver). */
export function isSemverGreaterThan(latest: string, current: string): boolean {
  const a = parseSemverParts(latest)
  const b = parseSemverParts(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true
    if (a[i] < b[i]) return false
  }
  return false
}

interface GitHubReleaseResponse {
  tag_name?: string
  html_url?: string
  name?: string | null
}

export async function fetchLatestRelease(
  signal?: AbortSignal
): Promise<LatestReleaseInfo | null> {
  const repo = getReleasesRepo()
  const url = `https://api.github.com/repos/${repo}/releases/latest`

  try {
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!res.ok) return null

    const data = (await res.json()) as GitHubReleaseResponse
    const tag = typeof data.tag_name === 'string' ? data.tag_name : ''
    const releaseUrl = typeof data.html_url === 'string' ? data.html_url : ''
    if (!tag || !releaseUrl) return null

    return {
      tag,
      version: normalizeVersionFromTag(tag),
      releaseUrl,
      name: typeof data.name === 'string' ? data.name : null,
    }
  } catch {
    return null
  }
}
