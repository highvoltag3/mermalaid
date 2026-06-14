import { describe, it, expect } from 'vitest'
import { getVisualEditorCssVars, getVisualEditorEdgeStyle } from './visualEditorTheme'

describe('getVisualEditorCssVars', () => {
  it('maps beautiful-mermaid theme fields to visual editor CSS variables', () => {
    const vars = getVisualEditorCssVars('github-light')
    expect(vars['--ve-canvas-bg']).toBe('#ffffff')
    expect(vars['--ve-node-text']).toBe('#1f2328')
    expect(vars['--ve-edge-stroke']).toBeTruthy()
  })

  it('merges YAML themeVariables overrides', () => {
    const vars = getVisualEditorCssVars('github-light', {
      themeVariables: {
        primaryColor: '#112233',
        lineColor: '#445566',
      },
    })
    expect(vars['--ve-node-fill']).toBe('#112233')
    expect(vars['--ve-edge-stroke']).toBe('#445566')
  })
})

describe('getVisualEditorEdgeStyle', () => {
  it('returns themed stroke styles per edge type', () => {
    const vars = getVisualEditorCssVars('github-light')
    expect(getVisualEditorEdgeStyle(vars, 'thick').strokeWidth).toBe(3)
    expect(getVisualEditorEdgeStyle(vars, 'dotted').strokeDasharray).toBe('5 5')
    expect(getVisualEditorEdgeStyle(vars, 'line').strokeWidth).toBe(1.5)
  })
})
