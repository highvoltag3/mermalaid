/** Split a Mermaid style body on commas, keeping commas inside `rgb()` / `hsl()`. */
function splitStyleParts(body: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  for (const ch of body) {
    if (ch === '(') depth += 1
    else if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      if (current.trim()) parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) parts.push(current)
  return parts
}

/**
 * Pull an explicit Mermaid `color:` from a node's leftover style body
 * (`styleExtra`). Used so auto-contrast CSS does not override user text color.
 */
export function parseStyleExtraTextColor(styleExtra?: string): string | undefined {
  if (!styleExtra) return undefined

  for (const part of splitStyleParts(styleExtra)) {
    const idx = part.indexOf(':')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim().toLowerCase()
    if (key !== 'color') continue
    const value = part.slice(idx + 1).trim()
    if (!value || /^(none|transparent)$/i.test(value)) return undefined
    return value
  }

  return undefined
}
