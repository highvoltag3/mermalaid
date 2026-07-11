import { describe, it, expect } from 'vitest'
import { gzipSync } from 'node:zlib'
import { decodePublicDiagram, PublicShareDecodeError } from './publicShare.js'

const encode = (source: string) => gzipSync(Buffer.from(source, 'utf8')).toString('base64url')

describe('decodePublicDiagram (server)', () => {
  it('round-trips a gzip + base64url diagram', () => {
    const src = 'graph TD; A[Start] --> B{Works?}\n  B -->|Yes| C[Ship]'
    expect(decodePublicDiagram(encode(src))).toBe(src)
  })

  it('rejects non-base64url input', () => {
    expect(() => decodePublicDiagram('has spaces!!')).toThrow(PublicShareDecodeError)
  })

  it('rejects oversized encoded input', () => {
    expect(() => decodePublicDiagram('A'.repeat(9000))).toThrow(PublicShareDecodeError)
  })

  it('rejects input that is not valid gzip', () => {
    expect(() => decodePublicDiagram(Buffer.from('not gzip at all').toString('base64url'))).toThrow(
      PublicShareDecodeError,
    )
  })

  it('rejects a diagram that decompresses beyond the source cap', () => {
    expect(() => decodePublicDiagram(encode('x'.repeat(20_000)))).toThrow(PublicShareDecodeError)
  })
})
