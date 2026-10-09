/** Expand #rgb → #rrggbb for comparison */
export function normalizeHexColor(hex: string): string | null {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  const h = m[1]
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase()
  }
  return `#${h}`.toLowerCase()
}

/** sRGB relative luminance (0–1) */
export function luminanceFromHex(hex: string): number | null {
  const norm = normalizeHexColor(hex)
  if (!norm) return null
  const r = parseInt(norm.slice(1, 3), 16) / 255
  const g = parseInt(norm.slice(3, 5), 16) / 255
  const b = parseInt(norm.slice(5, 7), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG relative-luminance contrast ratio between two hex colors. */
export function contrastRatioHex(a: string, b: string): number | null {
  const La = luminanceFromHex(a)
  const Lb = luminanceFromHex(b)
  if (La === null || Lb === null) return null
  const lighter = Math.max(La, Lb)
  const darker = Math.min(La, Lb)
  return (lighter + 0.05) / (darker + 0.05)
}

function mixHexToward(from: string, toward: string, t: number): string | null {
  const a = normalizeHexColor(from)
  const b = normalizeHexColor(toward)
  if (!a || !b) return null
  const mix = (i: number) => {
    const av = parseInt(a.slice(i, i + 2), 16)
    const bv = parseInt(b.slice(i, i + 2), 16)
    return Math.round(av + (bv - av) * t)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${mix(1)}${mix(3)}${mix(5)}`
}

/**
 * Darken or lighten a diagram line color until it contrasts enough with the
 * background (connection lines in light themes were often too faint).
 */
export function ensureReadableLineColor(
  line: string,
  bg: string,
  fallback: string = '#333333',
  minContrast: number = 3,
): string {
  const lineNorm = normalizeHexColor(line)
  const bgNorm = normalizeHexColor(bg)
  if (!lineNorm || !bgNorm) return line || fallback

  const bgLum = luminanceFromHex(bgNorm)
  if (bgLum === null) return lineNorm

  const toward = bgLum >= 0.45 ? '#000000' : '#ffffff'
  let best = lineNorm
  let bestContrast = contrastRatioHex(best, bgNorm) ?? 0
  if (bestContrast >= minContrast) return best

  for (let step = 1; step <= 20; step++) {
    const candidate = mixHexToward(lineNorm, toward, step / 20)
    if (!candidate) break
    const ratio = contrastRatioHex(candidate, bgNorm) ?? 0
    if (ratio > bestContrast) {
      best = candidate
      bestContrast = ratio
    }
    if (ratio >= minContrast) return candidate
  }

  return bestContrast > 0 ? best : fallback
}
