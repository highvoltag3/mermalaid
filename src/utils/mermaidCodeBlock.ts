/**
 * Extracts Mermaid code from a string, handling both plain Mermaid syntax
 * and markdown code blocks with ```mermaid ... ``` wrapping.
 */
export function extractMermaidCode(text: string): string {
  if (!text) return ''
  
  const trimmed = text.trim()
  
  // Check if it's wrapped in markdown code blocks
  const codeBlockRegex = /^```mermaid\s*\n([\s\S]*?)\n```$/i
  const match = trimmed.match(codeBlockRegex)
  
  if (match && match[1]) {
    return match[1].trim()
  }
  
  // Return the original text if not a code block
  return trimmed
}

