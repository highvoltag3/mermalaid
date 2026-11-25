/**
 * Bundle Monaco locally (no CDN) so the Tauri CSP `script-src 'self'` can stay strict.
 * Use the editor.api entry (no built-in language services) and only the editor worker:
 * Mermaid is a custom Monarch language, so JSON/CSS/HTML/TS workers are unused.
 */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { loader } from '@monaco-editor/react'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import 'monaco-editor/min/vs/editor/editor.main.css'

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (_workerId: string, _label: string) => Worker
    }
  }
}

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}

loader.config({ monaco })
