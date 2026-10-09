import { recentFileLabel } from './recentFiles'

export const UNTITLED_DOCUMENT_NAME = 'Untitled'

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
