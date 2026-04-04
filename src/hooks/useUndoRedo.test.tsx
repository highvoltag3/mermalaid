/**
 * README § Visual Editor — undo/redo stack for React Flow edits.
 */
import type { Edge, Node } from '@xyflow/react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useUndoRedo } from './useUndoRedo'

function stubNode(id: string): Node {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {},
  }
}

describe('useUndoRedo', () => {
  it('undo returns the latest pushed snapshot (state before last change)', () => {
    const { result } = renderHook(() => useUndoRedo(10))

    const beforeOp1 = { nodes: [stubNode('1')], edges: [] as Edge[] }
    const beforeOp2 = { nodes: [stubNode('1'), stubNode('2')], edges: [] as Edge[] }
    const current = { nodes: [stubNode('1'), stubNode('2'), stubNode('3')], edges: [] as Edge[] }

    act(() => {
      result.current.pushState(beforeOp1)
      result.current.pushState(beforeOp2)
    })

    let restored: typeof beforeOp1 | null = null
    act(() => {
      restored = result.current.undo(current)
    })

    expect(restored).toEqual(beforeOp2)

    let redone: typeof current | null = null
    act(() => {
      redone = result.current.redo(beforeOp2)
    })

    expect(redone).toEqual(current)
  })
})
