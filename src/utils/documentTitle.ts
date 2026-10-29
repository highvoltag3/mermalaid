import { recentFileLabel } from './recentFiles'

export const UNTITLED_DOCUMENT_NAME = 'Untitled'

const DIAGRAM_EXTENSIONS = ['.mmd', '.markdown', '.md', '.txt'] as const

/** Basename for chrome / titles; `null`/empty → Untitled. */
export function getDocumentDisplayName(
  documentPath: string | null | undefined,
  documentName: string | null | undefined,
): string {
  if (documentPath) return recentFileLabel(documentPath)
  const trimmed = documentName?.trim()
  if (trimmed) return trimmed
  return UNTITLED_DOCUMENT_NAME
}

/** Browser tab / window title for the editor. */
export function formatEditorDocumentTitle(displayName: string): string {
  return `${displayName} - Mermalaid`
}

export type DocumentNameParts = {
  stem: string
  extension: string
}

/** Split a basename into stem + known diagram extension (extension includes the dot). */
export function splitDocumentName(name: string): DocumentNameParts {
  const trimmed = name.trim()
  const lower = trimmed.toLowerCase()
  for (const ext of DIAGRAM_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return {
        stem: trimmed.slice(0, -ext.length),
        extension: trimmed.slice(-ext.length),
      }
    }
  }
  return { stem: trimmed, extension: '' }
}

/** Stem shown in the centered title control (Untitled when empty). */
export function getDocumentTitleStem(displayName: string): string {
  const { stem } = splitDocumentName(displayName)
  const trimmed = stem.trim()
  return trimmed || UNTITLED_DOCUMENT_NAME
}

/** macOS-document-style label: `checkout-flow — Edited`. */
export function formatDocumentTitleControlLabel(
  displayName: string,
  isEdited: boolean,
): string {
  const stem = getDocumentTitleStem(displayName)
  return `${stem} \u2014 ${isEdited ? 'Edited' : 'Saved'}`
}

/**
 * Normalize a rename field value into a full basename.
 * Keeps a typed extension, otherwise preserves the previous extension (default `.mmd`).
 */
export function applyDocumentRename(
  rawInput: string,
  previousDisplayName: string,
): string {
  const trimmed = rawInput.trim()
  if (!trimmed) {
    return previousDisplayName.trim() || UNTITLED_DOCUMENT_NAME
  }

  const next = splitDocumentName(trimmed)
  if (next.extension) {
    return `${next.stem}${next.extension}`
  }

  const previous = splitDocumentName(
    previousDisplayName.trim() || UNTITLED_DOCUMENT_NAME,
  )
  const extension = previous.extension || '.mmd'
  return `${trimmed}${extension}`
}

/** Replace the final path segment, preserving the original separator style. */
export function buildRenamedPath(currentPath: string, nextFileName: string): string {
  const lastSlash = currentPath.lastIndexOf('/')
  const lastBackslash = currentPath.lastIndexOf('\\')
  const lastSep = Math.max(lastSlash, lastBackslash)
  if (lastSep < 0) return nextFileName
  return currentPath.slice(0, lastSep + 1) + nextFileName
}

/** Parent directory for the rename popover "Where" row. */
export function getDocumentDirectoryLabel(
  documentPath: string | null | undefined,
): string | null {
  if (!documentPath) return null
  const lastSlash = documentPath.lastIndexOf('/')
  const lastBackslash = documentPath.lastIndexOf('\\')
  const lastSep = Math.max(lastSlash, lastBackslash)
  if (lastSep < 0) return null
  const dir = documentPath.slice(0, lastSep)
  return abbreviateHomePath(dir)
}

/** Turn `/Users/me/Documents` into `~/Documents` when possible. */
export function abbreviateHomePath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const homeMatch = normalized.match(/^\/(?:Users|home)\/[^/]+(.*)$/i)
  if (homeMatch) {
    const rest = homeMatch[1] || ''
    return rest ? `~${rest}` : '~'
  }
  // Windows-style home via USERPROFILE is not knowable here; return as-is.
  return path
}

/** Suggested save/download basename before the first save (Untitled → diagram.mmd). */
export function suggestedSourceFileName(displayName: string): string {
  if (!displayName.trim() || displayName === UNTITLED_DOCUMENT_NAME) {
    return 'diagram.mmd'
  }
  const applied = applyDocumentRename(displayName, 'diagram.mmd')
  return applied === UNTITLED_DOCUMENT_NAME ? 'diagram.mmd' : applied
}

/** Export basename from the open document stem (Untitled → fallback). */
export function suggestedExportFileName(
  displayName: string,
  extension: string,
  untitledFallback: string,
): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  if (!displayName.trim() || displayName === UNTITLED_DOCUMENT_NAME) {
    return untitledFallback
  }
  const stem = getDocumentTitleStem(displayName)
  if (!stem || stem === UNTITLED_DOCUMENT_NAME) return untitledFallback
  return `${stem}${ext}`
}

/** True when running in a macOS (or iOS) user agent — used for overlay title chrome. */
export function isMacOsClient(): boolean {
  if (typeof navigator === 'undefined') return false
  const platform = navigator.platform || ''
  const ua = navigator.userAgent || ''
  return /Mac|iPhone|iPod|iPad/i.test(platform) || /Mac OS X/i.test(ua)
}
