import { describe, expect, it } from 'vitest'
import { escapeHtml } from './escapeHtml'

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)"> & "q"`)).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &quot;q&quot;',
    )
  })
})
