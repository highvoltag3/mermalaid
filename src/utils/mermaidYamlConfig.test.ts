/**
 * README § beautiful-mermaid Themes / YAML — Mermaid YAML config header (issue #30).
 */
import { describe, expect, it } from 'vitest'
import {
  mapMermaidConfigToThemeOptions,
  parseMermaidConfigForOfficialRenderer,
  parseMermaidWithConfig,
  replaceDiagramInBlock,
} from './mermaidYamlConfig'

describe('parseMermaidWithConfig', () => {
  it('returns plain code when there is no frontmatter', () => {
    const raw = 'graph LR\n  A --> B'
    expect(parseMermaidWithConfig(raw)).toEqual({ code: 'graph LR\n  A --> B' })
  })

  it('strips YAML and returns diagram code', () => {
    const raw = `---
config:
  theme: dark
---

flowchart TD
  X --> Y`
    const r = parseMermaidWithConfig(raw)
    expect(r.code).toBe('flowchart TD\n  X --> Y')
    expect(r.yamlHeader).toBeDefined()
  })

  it('exposes config when themeVariables are present (for beautiful-mermaid path)', () => {
    const raw = `---
config:
  themeVariables:
    primaryColor: "#112233"
    primaryTextColor: "#aabbcc"
---

graph TD
  A-->B`
    const r = parseMermaidWithConfig(raw)
    expect(r.code).toBe('graph TD\n  A-->B')
    expect(r.config?.themeVariables?.primaryColor).toBe('#112233')
  })

  it('ignores broken YAML and still returns diagram body', () => {
    const raw = `---
this is: not: valid yaml [[[
---

pie title T
"x": 1`
    const r = parseMermaidWithConfig(raw)
    expect(r.code).toContain('pie title')
  })
})

describe('parseMermaidConfigForOfficialRenderer', () => {
  it('keeps theme-only config for official renderer', () => {
    const raw = `---
config:
  theme: forest
---

graph TD
  A-->B`
    const c = parseMermaidConfigForOfficialRenderer(raw)
    expect(c?.theme).toBe('forest')
  })
})

describe('mapMermaidConfigToThemeOptions', () => {
  it('maps themeVariables into beautiful-mermaid option shape', () => {
    const opts = mapMermaidConfigToThemeOptions({
      themeVariables: {
        tertiaryColor: '#111111',
        primaryTextColor: '#222222',
        lineColor: '#333333',
        secondaryColor: '#444444',
        primaryColor: '#555555',
        primaryBorderColor: '#666666',
      },
    })
    expect(opts.bg).toBe('#111111')
    expect(opts.fg).toBe('#222222')
    expect(opts.line).toBe('#333333')
  })
})

describe('replaceDiagramInBlock', () => {
  it('preserves YAML header when updating diagram body', () => {
    const block = `---
config:
  themeVariables:
    primaryColor: "#fff"
---

graph TD
  Old-->Gone`
    const next = replaceDiagramInBlock(block, 'graph TD\n  New-->Stay')
    expect(next.startsWith('---\n')).toBe(true)
    expect(next).toContain('graph TD\n  New-->Stay')
    expect(next).not.toContain('Old-->Gone')
  })

  it('returns only new code when block had no frontmatter', () => {
    expect(replaceDiagramInBlock('graph LR\nA-->B', 'pie title X\n"y": 1')).toBe(
      'pie title X\n"y": 1',
    )
  })
})
