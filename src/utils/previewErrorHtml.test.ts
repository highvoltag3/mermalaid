import { describe, expect, it } from 'vitest'
import { formatPreviewErrorHtml } from './previewErrorHtml'

describe('formatPreviewErrorHtml', () => {
  it('does not produce executable HTML from a Mermaid-style error that embeds the diagram', () => {
    const payload = '<img src=x onerror="window.__xss=1">'
    const mermaidStyleError = `No diagram type detected matching given configuration for text: ${payload}`
    const html = formatPreviewErrorHtml(mermaidStyleError, { includeRecoveryHint: true })

    const root = document.createElement('div')
    root.innerHTML = html

    expect(root.querySelector('img')).toBeNull()
    expect(root.querySelector('.error-preview')?.textContent).toContain(payload)
    expect(root.querySelector('.error-recovery-hint')?.textContent).toContain('New button')
    expect(html).toContain('&lt;img')
    expect(html).not.toContain('<img')
  })

  it('omits the recovery hint when not requested', () => {
    const html = formatPreviewErrorHtml('boom')
    expect(html).toBe('<div class="error-preview">boom</div>')
    expect(html).not.toContain('error-recovery-hint')
  })
})
