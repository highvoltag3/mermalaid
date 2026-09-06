/**
 * Save a Blob via native dialog (Tauri), File System Access API (supported browsers),
 * or an anchor download fallback.
 */

import { isTauri } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs'

export type SaveFileFilter = {
  name: string
  extensions: string[]
}

export type SaveFileAcceptType = {
  description: string
  accept: Record<string, string[]>
}

export type SaveFileOptions = {
  suggestedName: string
  /** Tauri dialog default path (may be a full path when re-saving). */
  defaultPath?: string
  filters: SaveFileFilter[]
  acceptTypes: SaveFileAcceptType[]
}

export type SaveFileResult =
  | { outcome: 'saved'; fileName: string; path?: string }
  | { outcome: 'cancelled' }
  | { outcome: 'downloaded'; fileName: string }

type SaveFilePickerOptions = {
  suggestedName?: string
  types?: SaveFileAcceptType[]
}

type FileSystemWritableFileStreamLike = {
  write(data: Blob | BufferSource | string): Promise<void>
  close(): Promise<void>
}

type FileSystemFileHandleLike = {
  name: string
  createWritable(): Promise<FileSystemWritableFileStreamLike>
}

function getShowSaveFilePicker():
  | ((options?: SaveFilePickerOptions) => Promise<FileSystemFileHandleLike>)
  | undefined {
  const w = window as Window & {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandleLike>
  }
  return typeof w.showSaveFilePicker === 'function' ? w.showSaveFilePicker.bind(w) : undefined
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function fileNameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || path
}

/** Trigger a browser download with the given filename (no picker). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer()
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file data'))
    reader.readAsArrayBuffer(blob)
  })
}

async function writeBlobToTauriPath(path: string, blob: Blob): Promise<void> {
  const buffer = await readBlobAsArrayBuffer(blob)
  const isText =
    blob.type.startsWith('text/') || blob.type === 'image/svg+xml' || blob.type === ''
  if (isText) {
    await writeTextFile(path, new TextDecoder().decode(buffer))
    return
  }
  await writeFile(path, new Uint8Array(buffer))
}

/**
 * Prompt the user to save `blob` (or download it when no picker is available).
 * Cancellation returns `{ outcome: 'cancelled' }` without throwing.
 */
export async function saveBlob(blob: Blob, options: SaveFileOptions): Promise<SaveFileResult> {
  const suggestedName = options.suggestedName

  if (isTauri()) {
    const path = await save({
      filters: options.filters,
      defaultPath: options.defaultPath ?? suggestedName,
    })
    if (!path) return { outcome: 'cancelled' }
    await writeBlobToTauriPath(path, blob)
    return { outcome: 'saved', path, fileName: fileNameFromPath(path) }
  }

  const showSaveFilePicker = getShowSaveFilePicker()
  if (showSaveFilePicker) {
    try {
      const handle = await showSaveFilePicker({
        suggestedName,
        types: options.acceptTypes,
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return { outcome: 'saved', fileName: handle.name || suggestedName }
    } catch (err) {
      if (isAbortError(err)) return { outcome: 'cancelled' }
      throw err
    }
  }

  downloadBlob(blob, suggestedName)
  return { outcome: 'downloaded', fileName: suggestedName }
}
