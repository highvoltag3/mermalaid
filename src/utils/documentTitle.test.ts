import { describe, expect, it } from 'vitest'
import {
  UNTITLED_DOCUMENT_NAME,
  formatEditorDocumentTitle,
  getDocumentDisplayName,
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
