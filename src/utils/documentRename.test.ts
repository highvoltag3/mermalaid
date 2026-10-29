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

  it('rejects path separators and reserved characters', () => {
    expect(
      planDocumentRename({
        rawInput: 'a/b',
        documentPath: null,
        documentName: null,
      }),
    ).toEqual({ kind: 'invalid', nextName: 'a/b.mmd' })

    expect(
      planDocumentRename({
        rawInput: 'bad:name',
        documentPath: '/tmp/old.mmd',
        documentName: 'old.mmd',
      }),
    ).toEqual({ kind: 'invalid', nextName: 'bad:name.mmd' })
  })

  it('keeps Untitled as Untitled when the stem is unchanged', () => {
    expect(
      planDocumentRename({
        rawInput: 'Untitled',
        documentPath: null,
        documentName: null,
      }),
    ).toEqual({ kind: 'noop', nextName: 'Untitled' })
  })

  it('rejects extension-only basenames', () => {
    expect(
      planDocumentRename({
        rawInput: '.mmd',
        documentPath: null,
        documentName: 'flow.mmd',
      }),
    ).toEqual({ kind: 'invalid', nextName: '.mmd' })
  })

  it('allows extension-only changes for the same stem', () => {
    expect(
      planDocumentRename({
        rawInput: 'flow.txt',
        documentPath: null,
        documentName: 'flow.mmd',
      }),
    ).toEqual({ kind: 'display-only', nextName: 'flow.txt' })
  })
})
