// Editor-side adapters that let a connected agent validate and render the diagram.
// Reuses the app's official Mermaid render pipeline (which serializes through a shared
// queue) so agent renders never corrupt the visible preview.
import mermaid from 'mermaid'
import { renderOfficialMermaidPreview } from '../utils/officialMermaidPreview'
import type { RenderFormat } from './protocol'
import type { RenderOutcome, ValidateOutcome } from './bridgeClient'

const PNG_MIN_SCALE = 1
const PNG_MAX_SCALE = 4
const PNG_DEFAULT_SCALE = 2
// Cap the longest PNG side so a huge diagram can't produce a payload that exceeds the bridge's
// WebSocket message limit (which would drop the connection mid-render).
const PNG_MAX_DIMENSION = 4096

/** Headless syntax check via Mermaid's own parser (does not touch the visible preview). */
export async function validateMermaid(code: string): Promise<ValidateOutcome> {
  try {
    const result = await mermaid.parse(code)
    const diagramType =
      result && typeof result === 'object'
        ? ((result as { diagramType?: string }).diagramType ?? null)
        : null
    return { valid: true, error: null, diagramType }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err), diagramType: null }
  }
}

export async function renderForAgent(
  code: string,
  format: RenderFormat,
  opts: { scale?: number; theme?: string } = {},
): Promise<RenderOutcome> {
  const isDark = opts.theme === 'dark'
  const svg = await renderOfficialMermaidPreview(code, isDark, undefined)

  if (format === 'svg') {
    const { width, height } = readSvgSize(svg)
    return { ok: true, data: svg, mimeType: 'image/svg+xml', width, height, error: null }
  }

  const scale = clampScale(opts.scale)
  const png = await rasterizeSvgToPng(svg, scale, isDark)
  return { ok: true, data: png.base64, mimeType: 'image/png', width: png.width, height: png.height, error: null }
}

function clampScale(scale: number | undefined): number {
  if (!scale || !Number.isFinite(scale)) return PNG_DEFAULT_SCALE
  return Math.min(PNG_MAX_SCALE, Math.max(PNG_MIN_SCALE, scale))
}

function readSvgSize(svg: string): { width: number; height: number } {
  const viewBox = svg.match(/viewBox="([\d.\-\s]+)"/)
  if (viewBox) {
    const parts = viewBox[1].trim().split(/\s+/).map(Number)
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { width: parts[2], height: parts[3] }
    }
  }
  const w = svg.match(/\bwidth="([\d.]+)/)
  const h = svg.match(/\bheight="([\d.]+)/)
  return { width: w ? Number(w[1]) : 800, height: h ? Number(h[1]) : 600 }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load SVG for rasterization'))
    img.src = url
  })
}

async function rasterizeSvgToPng(
  svg: string,
  scale: number,
  isDark: boolean,
): Promise<{ base64: string; width: number; height: number }> {
  const { width, height } = readSvgSize(svg)
  let w = Math.max(1, Math.round(width * scale))
  let h = Math.max(1, Math.round(height * scale))
  const longest = Math.max(w, h)
  if (longest > PNG_MAX_DIMENSION) {
    const shrink = PNG_MAX_DIMENSION / longest
    w = Math.max(1, Math.round(w * shrink))
    h = Math.max(1, Math.round(h * shrink))
  }
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    // Fill an opaque background so text stays legible in the agent's image viewer.
    ctx.fillStyle = isDark ? '#1e1e1e' : '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/png')
    const base64 = dataUrl.split(',')[1] ?? ''
    return { base64, width: w, height: h }
  } finally {
    URL.revokeObjectURL(url)
  }
}
