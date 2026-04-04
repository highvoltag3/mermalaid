/**
 * README § Live preview / official Mermaid path — minimal render smoke.
 */
import { describe, expect, it } from 'vitest'
import { renderOfficialMermaidPreview } from './officialMermaidPreview'

describe('renderOfficialMermaidPreview', () => {
  it(
    'returns SVG markup for a trivial flowchart',
    { timeout: 20_000 },
    async () => {
      const svg = await renderOfficialMermaidPreview(
        'graph TD\n  A["Start"] --> B["End"]',
        false,
        { bg: '#ffffff', fg: '#333333', line: '#999999' },
      )
      expect(svg.trim().toLowerCase()).toContain('<svg')
    },
  )
})
