/**
 * Decide what to do when the open document's file changes on disk (issue #91).
 *
 * `lastKnownDiskContent` is what Mermalaid last saw on disk for this file (the content it
 * loaded, last observed, or last wrote via Save). The rules avoid clobbering unsaved in-app
 * edits and ignoring stale events for changes we already know about:
 * - disk now equals the editor      -> nothing to do (our own save, or already in sync)
 * - disk unchanged from last-seen    -> nothing to do (a stale event for a change we recorded)
 * - editor matches last-seen disk    -> no local edits, so reload the external change
 * - both diverged                    -> conflict; keep the editor, warn the user
 */
export type ExternalReloadDecision =
  | { action: 'reload'; content: string }
  | { action: 'conflict' }
  | { action: 'none' }

export function decideExternalReload(params: {
  editorCode: string
  lastKnownDiskContent: string | null
  newDiskContent: string
}): ExternalReloadDecision {
  const { editorCode, lastKnownDiskContent, newDiskContent } = params

  if (newDiskContent === editorCode) return { action: 'none' }
  if (newDiskContent === lastKnownDiskContent) return { action: 'none' }
  if (lastKnownDiskContent === null || editorCode === lastKnownDiskContent) {
    return { action: 'reload', content: newDiskContent }
  }
  return { action: 'conflict' }
}
