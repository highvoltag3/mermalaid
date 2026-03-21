/**
 * Rewrites common Mermaid flowchart edge labels into the pipe form that
 * beautiful-mermaid's parser accepts (`-->|label|`, `-.->|label|`, …).
 *
 * @see https://github.com/lukilabs/beautiful-mermaid — ARROW_REGEX only allows
 * labels as `|text|` immediately after the operator, not `-- "text" -->`.
 */

const FLOWCHART_START = /^\s*(?:graph|flowchart)\s+/i

const SKIP_LINE =
  /^\s*(?:subgraph\b|end\s*$|classDef\b|class\s|style\s|direction\s|linkStyle\b|click\b|%%)/i

function isFlowchartDocument(code: string): boolean {
  for (const line of code.split('\n')) {
    const t = line.trim()
    if (t.length === 0 || t.startsWith('%%')) continue
    return FLOWCHART_START.test(line)
  }
  return false
}

function replaceQuotedLabels(line: string, pattern: RegExp, arrow: string): string {
  return line.replace(pattern, (full, label: string) => {
    if (label.includes('|')) return full
    return `${arrow}|${label}|`
  })
}

function normalizeFlowchartLine(line: string): string {
  const trimmed = line.trim()
  if (trimmed.length === 0 || SKIP_LINE.test(trimmed)) {
    return line
  }

  let s = line

  // Longer `===` before `==>` so `== "x" ===` is not consumed as `== "x" ==` + `>`
  s = replaceQuotedLabels(s, /==\s*"([^"]*)"\s*===/g, '===')
  s = replaceQuotedLabels(s, /==\s*'([^']*)'\s*===/g, '===')
  s = replaceQuotedLabels(s, /==\s*"([^"]*)"\s*==>/g, '==>')
  s = replaceQuotedLabels(s, /==\s*'([^']*)'\s*==>/g, '==>')

  s = replaceQuotedLabels(s, /-\.\s*"([^"]*)"\s*\.->/g, '-.->')
  s = replaceQuotedLabels(s, /-\.\s*'([^']*)'\s*\.->/g, '-.->')
  // `-. "x" -.-` is nonstandard; treat as dotted arrow with label (same as `.->`).
  s = replaceQuotedLabels(s, /-\.\s*"([^"]*)"\s*-\.-/g, '-.->')
  s = replaceQuotedLabels(s, /-\.\s*'([^']*)'\s*-\.-/g, '-.->')

  s = replaceQuotedLabels(s, /--\s*"([^"]*)"\s*-->/g, '-->')
  s = replaceQuotedLabels(s, /--\s*'([^']*)'\s*-->/g, '-->')

  s = s.replace(/<--\s*"([^"]*)"\s*-->/g, (full, label: string) => {
    if (label.includes('|')) return full
    return `<-->|${label}|`
  })
  s = s.replace(/<--\s*'([^']*)'\s*-->/g, (full, label: string) => {
    if (label.includes('|')) return full
    return `<-->|${label}|`
  })

  s = replaceQuotedLabels(s, /--\s*"([^"]*)"\s*---/g, '---')
  s = replaceQuotedLabels(s, /--\s*'([^']*)'\s*---/g, '---')

  return s
}

/**
 * When the document is a flowchart/graph, normalizes edge syntax on each line.
 * Other diagram types are returned unchanged.
 */
export function normalizeMermaidForBeautifulMermaid(code: string): string {
  if (!isFlowchartDocument(code)) {
    return code
  }
  return code.split('\n').map(normalizeFlowchartLine).join('\n')
}
