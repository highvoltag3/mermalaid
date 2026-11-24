import { escapeHtml } from './escapeHtml'

const RECOVERY_HINT =
  'Try creating a new diagram (New button) or opening a valid .mmd file.'

/** Safe HTML for the preview pane when Mermaid rendering fails. */
export function formatPreviewErrorHtml(
  errorMessage: string,
  options: { includeRecoveryHint?: boolean } = {},
): string {
  const safe = escapeHtml(errorMessage)
  if (options.includeRecoveryHint) {
    return `<div class="error-preview">${safe}<div class="error-recovery-hint">${RECOVERY_HINT}</div></div>`
  }
  return `<div class="error-preview">${safe}</div>`
}
