import {
  applyDocumentRename,
  buildRenamedPath,
  getDocumentDisplayName,
} from './documentTitle'
import { recentFileLabel } from './recentFiles'

export type DocumentRenamePlan =
  | { kind: 'noop'; nextName: string }
  | { kind: 'display-only'; nextName: string }
  | { kind: 'disk'; oldPath: string; newPath: string; nextName: string }

/**
 * Decide how a title-bar rename should apply.
 * Path-backed docs rename on disk. Unsaved docs only update the suggested name.
 */
export function planDocumentRename(args: {
  rawInput: string
  documentPath: string | null | undefined
  documentName: string | null | undefined
}): DocumentRenamePlan {
  const currentName = getDocumentDisplayName(args.documentPath, args.documentName)
  const nextName = applyDocumentRename(args.rawInput, currentName)

  if (args.documentPath) {
    const newPath = buildRenamedPath(args.documentPath, nextName)
    if (newPath === args.documentPath) {
      return { kind: 'noop', nextName }
    }
    return {
      kind: 'disk',
      oldPath: args.documentPath,
      newPath,
      nextName: recentFileLabel(newPath),
    }
  }

  if (nextName === currentName) {
    return { kind: 'noop', nextName }
  }

  return { kind: 'display-only', nextName }
}
