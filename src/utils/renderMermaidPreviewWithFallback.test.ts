import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MermaidAboutKeywordFallback,
  renderMermaidPreviewWithFallback,
} from './renderMermaidPreviewWithFallback'

const {
  renderOfficialMermaidPreview,
  renderBeautifulMermaid,
  normalizeMermaidForBeautifulMermaid,
  isMermaidAboutKeywordOnly,
} = vi.hoisted(() => ({
  renderOfficialMermaidPreview: vi.fn(),
  renderBeautifulMermaid: vi.fn(),
  normalizeMermaidForBeautifulMermaid: vi.fn((code: string) => code),
  isMermaidAboutKeywordOnly: vi.fn(() => false),
}))

vi.mock('./officialMermaidPreview', () => ({
  renderOfficialMermaidPreview,
}))

vi.mock('beautiful-mermaid', () => ({
  renderMermaid: renderBeautifulMermaid,
}))

vi.mock('./normalizeMermaidForBeautifulMermaid', () => ({
  normalizeMermaidForBeautifulMermaid,
}))

vi.mock('./mermalaidInfoText', () => ({
  isMermaidAboutKeywordOnly,
}))

const baseOptions = {
  diagramCode: 'flowchart TD\n  A-->B',
  isDark: false,
  previewThemeOptions: { bg: '#fff', fg: '#000' },
  officialYamlConfig: undefined,
  yamlConfig: undefined,
}

describe('renderMermaidPreviewWithFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    normalizeMermaidForBeautifulMermaid.mockImplementation((code: string) => code)
    isMermaidAboutKeywordOnly.mockReturnValue(false)
  })

  it('returns svg with no primaryError when official render succeeds', async () => {
    renderOfficialMermaidPreview.mockResolvedValue('<svg>ok</svg>')

    const result = await renderMermaidPreviewWithFallback(baseOptions)

    expect(result).toEqual({ svg: '<svg>ok</svg>', primaryError: null })
    expect(renderBeautifulMermaid).not.toHaveBeenCalled()
  })

  it('keeps primaryError when official fails and beautiful-mermaid fallback succeeds', async () => {
    renderOfficialMermaidPreview.mockRejectedValue(
      new Error('Namespace and class share the same name'),
    )
    renderBeautifulMermaid.mockResolvedValue('<svg>fallback</svg>')

    const result = await renderMermaidPreviewWithFallback({
      ...baseOptions,
      diagramCode: 'classDiagram\nnamespace Foo {\n  class Foo\n}',
    })

    expect(result.svg).toBe('<svg>fallback</svg>')
    expect(result.primaryError).toBe('Namespace and class share the same name')
  })

  it('clears primaryError when compat-normalized official render succeeds', async () => {
    normalizeMermaidForBeautifulMermaid.mockImplementation(
      (code: string) => `${code}\n%% normalized`,
    )
    renderOfficialMermaidPreview
      .mockRejectedValueOnce(new Error('Parse error on line 2'))
      .mockResolvedValueOnce('<svg>compat</svg>')

    const result = await renderMermaidPreviewWithFallback({
      ...baseOptions,
      diagramCode: 'graph TD\n  A-->B',
      isDark: true,
      previewThemeOptions: { bg: '#000', fg: '#fff' },
    })

    expect(result).toEqual({
      svg: '<svg>compat</svg>',
      primaryError: null,
    })
    expect(renderBeautifulMermaid).not.toHaveBeenCalled()
  })

  it('rethrows the primary official error when every fallback fails', async () => {
    const primary = new Error('Primary official failure')
    renderOfficialMermaidPreview.mockRejectedValue(primary)
    renderBeautifulMermaid.mockRejectedValue(new Error('Legacy renderer failed'))

    await expect(
      renderMermaidPreviewWithFallback({
        ...baseOptions,
        diagramCode: 'classDiagram\nclass A',
      }),
    ).rejects.toThrow('Primary official failure')
  })

  it('throws MermaidAboutKeywordFallback when normalized code is about-only', async () => {
    normalizeMermaidForBeautifulMermaid.mockImplementation(() => 'mermaid')
    renderOfficialMermaidPreview.mockRejectedValue(new Error('Parse error'))
    isMermaidAboutKeywordOnly.mockReturnValue(true)

    await expect(
      renderMermaidPreviewWithFallback({
        ...baseOptions,
        diagramCode: 'graph TD\nA-->B',
      }),
    ).rejects.toBeInstanceOf(MermaidAboutKeywordFallback)
    expect(renderBeautifulMermaid).not.toHaveBeenCalled()
  })
})
