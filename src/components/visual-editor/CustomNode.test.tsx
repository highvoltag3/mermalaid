import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { ThemeProvider } from '../../contexts/ThemeContext'
import CustomNode, { type CustomNodeData } from './CustomNode'

function renderNode(data: Partial<CustomNodeData> & Pick<CustomNodeData, 'id' | 'label' | 'shape'>) {
  return render(
    <ThemeProvider>
      <ReactFlowProvider>
        <CustomNode
          selected={false}
          data={{
            ...data,
          }}
        />
      </ReactFlowProvider>
    </ThemeProvider>,
  )
}

describe('CustomNode label contrast hooks', () => {
  afterEach(() => {
    cleanup()
  })

  it('exposes --ve-node-fill and has-custom-fill when fill is set', () => {
    renderNode({ id: 'A', label: 'Start', shape: 'rect', fill: '#1a1a1a' })

    const node = document.querySelector('.visual-node') as HTMLElement
    expect(node).toBeTruthy()
    expect(node.classList.contains('has-custom-fill')).toBe(true)
    expect(node.classList.contains('has-explicit-text-color')).toBe(false)
    expect(node.style.getPropertyValue('--ve-node-fill')).toBe('#1a1a1a')
    expect(node.style.backgroundColor).toBe('rgb(26, 26, 26)')
    expect(screen.getByText('Start').classList.contains('node-label')).toBe(true)
  })

  it('marks explicit Mermaid color: and does not treat it as auto-contrast', () => {
    renderNode({
      id: 'B',
      label: 'Pinned',
      shape: 'rect',
      fill: '#000000',
      styleExtra: 'color:#ff00aa',
    })

    const node = document.querySelector('.visual-node') as HTMLElement
    expect(node.classList.contains('has-custom-fill')).toBe(true)
    expect(node.classList.contains('has-explicit-text-color')).toBe(true)
    expect(node.style.color).toBe('rgb(255, 0, 170)')
  })

  it('does not add has-custom-fill when only stroke is customized', () => {
    renderNode({ id: 'C', label: 'Border', shape: 'rect', stroke: '#333333' })

    const node = document.querySelector('.visual-node') as HTMLElement
    expect(node.classList.contains('has-custom-color')).toBe(true)
    expect(node.classList.contains('has-custom-fill')).toBe(false)
    expect(node.style.getPropertyValue('--ve-node-fill')).toBe('')
  })
})

describe('CustomNode contrast CSS', () => {
  it('ships contrast-color and mix-blend-mode fallback rules', async () => {
    const cssModule = await import('./CustomNode.css?raw')
    const css = String(cssModule.default ?? cssModule)

    expect(css).toContain('@supports (color: contrast-color(red))')
    expect(css).toContain('contrast-color(var(--ve-node-fill')
    expect(css).toContain('mix-blend-mode: difference')
    expect(css).toContain('.has-custom-fill:not(.has-explicit-text-color)')
  })
})
