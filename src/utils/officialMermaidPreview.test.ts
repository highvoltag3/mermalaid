/**
 * README § Live preview / official Mermaid path — minimal render smoke.
 */
import { describe, expect, it } from 'vitest'
import { renderOfficialMermaidPreview } from './officialMermaidPreview'

const theme = { bg: '#ffffff', fg: '#333333', line: '#999999' }

describe('renderOfficialMermaidPreview', () => {
  it(
    'returns SVG markup for a trivial flowchart',
    { timeout: 20_000 },
    async () => {
      const svg = await renderOfficialMermaidPreview(
        'graph TD\n  A["Start"] --> B["End"]',
        false,
        theme,
      )
      expect(svg.trim().toLowerCase()).toContain('<svg')
    },
  )

  it(
    'keeps br / i label HTML under antiscript securityLevel',
    { timeout: 20_000 },
    async () => {
      const svg = await renderOfficialMermaidPreview(
        'graph TD\n  A["Hello<br/>World <i>x</i>"] --> B["End"]',
        false,
        theme,
      )
      const lower = svg.toLowerCase()
      expect(lower).toContain('<svg')
      expect(lower.includes('<br') || lower.includes('</br') || lower.includes('<br/')).toBe(true)
    },
  )
})
