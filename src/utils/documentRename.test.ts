import { describe, expect, it } from 'vitest'
import { planDocumentRename } from './documentRename'

describe('planDocumentRename', () => {
  it('updates display name only when there is no path', () => {
    expect(
      planDocumentRename({
        rawInput: 'checkout-flow',
        documentPath: null,
        documentName: null,
      }),
    ).toEqual({ kind: 'display-only', nextName: 'checkout-flow.mmd' })
  })

  it('no-ops when the resolved name is unchanged', () => {
    expect(
      planDocumentRename({
        rawInput: 'flow',
        documentPath: null,
        documentName: 'flow.mmd',
      }),
    ).toEqual({ kind: 'noop', nextName: 'flow.mmd' })
  })

  it('plans a disk rename when a path is set', () => {
    expect(
      planDocumentRename({
        rawInput: 'checkout-flow',
        documentPath: '/Users/me/Documents/diagrams/old.mmd',
        documentName: 'old.mmd',
      }),
    ).toEqual({
      kind: 'disk',
      oldPath: '/Users/me/Documents/diagrams/old.mmd',
      newPath: '/Users/me/Documents/diagrams/checkout-flow.mmd',
      nextName: 'checkout-flow.mmd',
    })
  })

  it('no-ops disk renames that resolve to the same path', () => {
    expect(
      planDocumentRename({
        rawInput: 'old',
        documentPath: '/tmp/old.mmd',
        documentName: 'old.mmd',
      }),
    ).toEqual({ kind: 'noop', nextName: 'old.mmd' })
  })
})
