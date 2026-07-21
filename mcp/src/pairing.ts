import { randomInt, timingSafeEqual } from 'node:crypto'

// Crockford-style base32 without visually ambiguous characters (no 0/1/I/L/O/U).
// The set is unambiguous by construction, so pairing codes are safe to read aloud/type.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Generate a fresh, session-only pairing code (default 8 chars ≈ 40 bits). */
export function generatePairingCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)]
  }
  return out
}

/** Uppercase and strip anything outside the alphabet (dashes, spaces) for comparison. */
export function normalizePairingCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, '')
}

/** Human-friendly grouping, e.g. `K7RM9QX2` -> `K7RM-9QX2`. */
export function formatPairingCode(code: string): string {
  const c = normalizePairingCode(code)
  if (c.length <= 4) return c
  return `${c.slice(0, 4)}-${c.slice(4)}`
}

/** Constant-time comparison of two pairing codes after normalization. */
export function pairingCodesMatch(a: string, b: string): boolean {
  const na = Buffer.from(normalizePairingCode(a), 'utf8')
  const nb = Buffer.from(normalizePairingCode(b), 'utf8')
  if (na.length === 0 || na.length !== nb.length) return false
  return timingSafeEqual(na, nb)
}
