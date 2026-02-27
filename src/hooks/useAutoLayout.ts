import { useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { computeLayout, mermaidDirectionToDagre } from '../utils/layoutEngine'

export function useAutoLayout(
  direction: 'TD' | 'BT' | 'LR' | 'RL'
) {
  const applyLayout = useCallback(
    (nodes: Node[], edges: Edge[]): Node[] => {
      return computeLayout(nodes, edges, {
        direction: mermaidDirectionToDagre(direction),
      })
    },
    [direction]
  )

  return { applyLayout }
}
