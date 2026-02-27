/**
 * Extracts Mermaid code from a string, handling both plain Mermaid syntax
 * and markdown code blocks with ```mermaid ... ``` wrapping.
 */
export function extractMermaidCode(text: string): string {
  if (!text) return ''
  
  const trimmed = text.trim()
  
  // Find mermaid code block (supports blocks embedded within larger markdown)
  const codeBlockRegex = /```mermaid\s*\n([\s\S]*?)\n```/i
  const match = trimmed.match(codeBlockRegex)
  
  if (match && match[1]) {
    return match[1].trim()
  }
  
  // Return the original text if not a code block
  return trimmed
}

export interface MermaidBlock {
  code: string
  /** Character offset of the opening ``` in the original text */
  start: number
  /** Character offset just after the closing ``` in the original text */
  end: number
}

/**
 * Extracts all mermaid code blocks from a string.
 * Returns an empty array if no ```mermaid blocks are found.
 */
export function extractAllMermaidBlocks(text: string): MermaidBlock[] {
  if (!text) return []

  const blocks: MermaidBlock[] = []
  const regex = /```mermaid\s*\n([\s\S]*?)\n```/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      code: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return blocks
}

/**
 * Replaces a specific mermaid block in the original text with new code.
 */
export function replaceMermaidBlock(text: string, block: MermaidBlock, newCode: string): string {
  const before = text.slice(0, block.start)
  const after = text.slice(block.end)
  return before + '```mermaid\n' + newCode + '\n```' + after
}

