import { describe, expect, it } from 'vitest'
import {
  UNTITLED_DOCUMENT_NAME,
  abbreviateHomePath,
  applyDocumentRename,
  buildRenamedPath,
  formatDocumentTitleControlLabel,
  formatEditorDocumentTitle,
  getDocumentDirectoryLabel,
  getDocumentDisplayName,
  getDocumentTitleStem,
  suggestedExportFileName,
  suggestedSourceFileName,
} from './documentTitle'

describe('getDocumentDisplayName', () => {
  it('uses the path basename when a path is set', () => {
    expect(getDocumentDisplayName('/Users/me/diagrams/flow.mmd', 'ignored.mmd')).toBe('flow.mmd')
    expect(getDocumentDisplayName('C:\\docs\\chart.md', null)).toBe('chart.md')
  })

  it('uses documentName when there is no path', () => {
    expect(getDocumentDisplayName(null, 'dropped.mmd')).toBe('dropped.mmd')
  })

  it('falls back to Untitled when both are empty', () => {
    expect(getDocumentDisplayName(null, null)).toBe(UNTITLED_DOCUMENT_NAME)
    expect(getDocumentDisplayName(null, '   ')).toBe(UNTITLED_DOCUMENT_NAME)
  })
})

describe('formatEditorDocumentTitle', () => {
  it('appends the product name', () => {
    expect(formatEditorDocumentTitle('flow.mmd')).toBe('flow.mmd - Mermalaid')
    expect(formatEditorDocumentTitle(UNTITLED_DOCUMENT_NAME)).toBe('Untitled - Mermalaid')
  })
})

describe('getDocumentTitleStem', () => {
  it('strips known diagram extensions', () => {
    expect(getDocumentTitleStem('checkout-flow.mmd')).toBe('checkout-flow')
    expect(getDocumentTitleStem('notes.markdown')).toBe('notes')
    expect(getDocumentTitleStem('readme.md')).toBe('readme')
    expect(getDocumentTitleStem('log.txt')).toBe('log')
  })

  it('returns Untitled for empty stems', () => {
    expect(getDocumentTitleStem('')).toBe(UNTITLED_DOCUMENT_NAME)
    expect(getDocumentTitleStem('.mmd')).toBe(UNTITLED_DOCUMENT_NAME)
  })
})

describe('formatDocumentTitleControlLabel', () => {
  it('shows Edited or Saved after an em dash', () => {
    expect(formatDocumentTitleControlLabel('checkout-flow.mmd', true)).toBe(
      'checkout-flow \u2014 Edited',
    )
    expect(formatDocumentTitleControlLabel('checkout-flow.mmd', false)).toBe(
      'checkout-flow \u2014 Saved',
    )
  })
})

describe('applyDocumentRename', () => {
  it('preserves the previous extension when the user omits one', () => {
    expect(applyDocumentRename('checkout-flow', 'old.mmd')).toBe('checkout-flow.mmd')
    expect(applyDocumentRename('notes', 'doc.md')).toBe('notes.md')
  })

  it('keeps a typed extension', () => {
    expect(applyDocumentRename('flow.txt', 'old.mmd')).toBe('flow.txt')
  })

  it('defaults Untitled renames to .mmd', () => {
    expect(applyDocumentRename('checkout-flow', UNTITLED_DOCUMENT_NAME)).toBe(
      'checkout-flow.mmd',
    )
  })

  it('rejects blank input by keeping the previous name', () => {
    expect(applyDocumentRename('   ', 'keep.mmd')).toBe('keep.mmd')
  })
})

describe('buildRenamedPath', () => {
  it('replaces the final path segment', () => {
    expect(buildRenamedPath('/Users/me/docs/a.mmd', 'b.mmd')).toBe('/Users/me/docs/b.mmd')
    expect(buildRenamedPath('C:\\docs\\a.mmd', 'b.mmd')).toBe('C:\\docs\\b.mmd')
  })

  it('handles a bare filename', () => {
    expect(buildRenamedPath('a.mmd', 'b.mmd')).toBe('b.mmd')
  })
})

describe('getDocumentDirectoryLabel', () => {
  it('returns an abbreviated parent directory', () => {
    expect(getDocumentDirectoryLabel('/Users/me/Documents/diagrams/a.mmd')).toBe(
      '~/Documents/diagrams',
    )
  })

  it('returns null when there is no path', () => {
    expect(getDocumentDirectoryLabel(null)).toBeNull()
  })
})

describe('abbreviateHomePath', () => {
  it('shortens macOS and Linux home prefixes', () => {
    expect(abbreviateHomePath('/Users/me/Documents')).toBe('~/Documents')
    expect(abbreviateHomePath('/home/me')).toBe('~')
  })
})

describe('suggestedSourceFileName', () => {
  it('uses diagram.mmd for Untitled', () => {
    expect(suggestedSourceFileName(UNTITLED_DOCUMENT_NAME)).toBe('diagram.mmd')
  })

  it('uses the display name when set', () => {
    expect(suggestedSourceFileName('checkout-flow.mmd')).toBe('checkout-flow.mmd')
    expect(suggestedSourceFileName('checkout-flow')).toBe('checkout-flow.mmd')
  })
})

describe('suggestedExportFileName', () => {
  it('derives exports from the document stem', () => {
    expect(suggestedExportFileName('checkout-flow.mmd', 'svg', 'diagram.svg')).toBe(
      'checkout-flow.svg',
    )
    expect(suggestedExportFileName('checkout-flow.mmd', '.png', 'diagram.png')).toBe(
      'checkout-flow.png',
    )
  })

  it('falls back for Untitled', () => {
    expect(suggestedExportFileName(UNTITLED_DOCUMENT_NAME, 'svg', 'diagram.svg')).toBe(
      'diagram.svg',
    )
  })
})
