import { getIdentifier, getTauriVersion, getVersion } from '@tauri-apps/api/app'
import { isTauri } from '@tauri-apps/api/core'
import packageJson from '../../package.json'

/**
 * True when the diagram source is only the keyword `info` (case-insensitive).
 * Uses the same non-empty / non-%% line filtering as beautiful-mermaid's parser so
 * `%%\ninfo` does not fall through to legacy render and throw "Invalid mermaid header".
 *
 * Mermaid also defines an `info` diagram type; we reserve this pattern for Mermalaid about text.
 */
export function isMermaidAboutKeywordOnly(diagramCode: string): boolean {
  const stripped = diagramCode.replace(/[\u200B-\u200D\uFEFF]/g, '')
  const lines = stripped
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('%%'))
  return lines.length === 1 && /^info$/i.test(lines[0])
}

function dependencyRange(name: keyof typeof packageJson.dependencies): string {
  const v = packageJson.dependencies?.[name]
  return typeof v === 'string' ? v : 'unknown'
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** HTML fragment for preview pane (styles from Preview.css). */
export function mermalaidAboutMarkupFromPlainText(text: string): string {
  return `<pre class="preview-about-mermalaid">${escapeHtml(text)}</pre>`
}

export async function buildMermalaidInfoText(): Promise<string> {
  const lines: string[] = [
    `Mermalaid ${packageJson.version}`,
    '',
    'Runtime:',
    isTauri() ? '  Desktop (Tauri)' : '  Web',
  ]

  if (isTauri()) {
    try {
      const [bundleVersion, tauriRuntime, identifier] = await Promise.all([
        getVersion(),
        getTauriVersion(),
        getIdentifier(),
      ])
      lines.push(
        `  App bundle version: ${bundleVersion}`,
        `  Tauri: ${tauriRuntime}`,
        `  Identifier: ${identifier}`,
      )
    } catch {
      lines.push('  (Could not read native app metadata.)')
    }
  }

  lines.push(
    '',
    'Diagram engines:',
    `  Official Mermaid: ${dependencyRange('mermaid')}`,
    `  beautiful-mermaid (legacy / some exports): ${dependencyRange('beautiful-mermaid')}`,
    '',
    'UI stack:',
    `  React: ${dependencyRange('react')}`,
    `  @tauri-apps/api: ${dependencyRange('@tauri-apps/api')}`,
    '',
    'Project:',
    '  https://github.com/highvoltag3/mermalaid',
  )

  return lines.join('\n')
}

export async function buildMermalaidAboutPreviewHtml(): Promise<string> {
  return mermalaidAboutMarkupFromPlainText(await buildMermalaidInfoText())
}
