/**
 * README: Open `.mmd`, `.txt`, or `.md` — used for drag-and-drop import.
 * @see {@link ../App.tsx} handleDrop
 */
export function isDiagramImportFileName(fileName: string): boolean {
  const n = fileName.toLowerCase()
  return n.endsWith('.mmd') || n.endsWith('.txt') || n.endsWith('.md')
}
