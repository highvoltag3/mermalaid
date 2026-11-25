import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { MERMAID_UMD_INTEGRITY, verifyMermaidIntegrity } from './renderMermaid.js'

const require = createRequire(import.meta.url)

describe('Mermaid UMD integrity', () => {
  it('matches the installed mermaid.min.js bytes', async () => {
    const path = require.resolve('mermaid/dist/mermaid.min.js')
    const source = readFileSync(path)
    expect(await verifyMermaidIntegrity(source, MERMAID_UMD_INTEGRITY)).toBe(true)
  })

  it('rejects tampered content', async () => {
    expect(await verifyMermaidIntegrity('not-mermaid', MERMAID_UMD_INTEGRITY)).toBe(false)
  })
})
