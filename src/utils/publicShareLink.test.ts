import { describe, it, expect } from 'vitest'
import {
  encodePublicDiagram,
  decodePublicDiagram,
  assemblePreviewUrl,
  PublicShareLinkError,
} from './publicShareLink'
import { decodePublicDiagram as serverDecode } from '../../api/_lib/publicShare'

/** Deterministic high-entropy string (won't compress under the URL cap). */
function pseudoRandom(n: number): string {
  let x = 123456789
  const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < n; i += 1) {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    s += alpha[x % alpha.length]
  }
  return s
}

describe('publicShareLink (client)', () => {
  it('round-trips encode → decode', async () => {
    const src = 'sequenceDiagram\n  A->>B: hi\n  B-->>A: hey'
    expect(await decodePublicDiagram(await encodePublicDiagram(src))).toBe(src)
  })

  it('client-encoded diagrams are readable by the server decoder', async () => {
    const src = 'graph LR; A-->B-->C'
    expect(serverDecode(await encodePublicDiagram(src))).toBe(src)
  })

  it('builds a /p?c= URL whose c the server can decode', async () => {
    const c = await encodePublicDiagram('graph TD; A-->B')
    const url = assemblePreviewUrl('https://mermalaid.com', c, 'dark')
    expect(url.startsWith('https://mermalaid.com/p?c=')).toBe(true)
    expect(url).toContain('&t=dark')
    expect(serverDecode(new URL(url).searchParams.get('c') as string)).toBe('graph TD; A-->B')
  })

  it('assemblePreviewUrl appends the signature when provided', () => {
    expect(assemblePreviewUrl('https://mermalaid.com', 'ABC', 'dark', 'SIGVAL')).toBe(
      'https://mermalaid.com/p?c=ABC&t=dark&s=SIGVAL',
    )
    expect(assemblePreviewUrl('https://mermalaid.com', 'ABC', 'dark')).toBe(
      'https://mermalaid.com/p?c=ABC&t=dark',
    )
  })

  it('throws oversized for a diagram too big for a link', async () => {
    const c = await encodePublicDiagram(pseudoRandom(12_000))
    expect(() => assemblePreviewUrl('https://mermalaid.com', c)).toThrow(PublicShareLinkError)
  })
})
