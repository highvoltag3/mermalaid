import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PROTOCOL_VERSION } from './protocol'

// The editor bundles its own copy of the wire protocol (bundler resolution) while the
// `mermalaid-mcp` package compiles the source-of-truth copy (NodeNext). They must stay
// byte-identical so both ends speak the same protocol. Vitest runs from the repo root.
const root = process.cwd()
const editorProtocol = readFileSync(resolve(root, 'src/agentBridge/protocol.ts'), 'utf8')
const serverProtocol = readFileSync(resolve(root, 'mcp/src/protocol.ts'), 'utf8')

describe('agent bridge protocol', () => {
  it('editor and mcp copies of protocol.ts are byte-identical', () => {
    expect(editorProtocol).toBe(serverProtocol)
  })

  it('exports a numeric PROTOCOL_VERSION', () => {
    expect(typeof PROTOCOL_VERSION).toBe('number')
    expect(PROTOCOL_VERSION).toBe(1)
  })
})
