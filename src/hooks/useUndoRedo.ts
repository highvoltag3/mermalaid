import { useCallback, useRef } from 'react'
import type { Node, Edge } from '@xyflow/react'

interface HistoryEntry {
  nodes: Node[]
  edges: Edge[]
}

export function useUndoRedo(maxHistory: number = 50) {
  const pastRef = useRef<HistoryEntry[]>([])
  const futureRef = useRef<HistoryEntry[]>([])

  const pushState = useCallback((entry: HistoryEntry) => {
    pastRef.current = [...pastRef.current.slice(-(maxHistory - 1)), entry]
    futureRef.current = []
  }, [maxHistory])

  const undo = useCallback(
    (current: HistoryEntry): HistoryEntry | null => {
      const past = pastRef.current
      if (past.length === 0) return null

      const previous = past[past.length - 1]
      pastRef.current = past.slice(0, -1)
      futureRef.current = [...futureRef.current, current]

      return previous
    },
    []
  )

  const redo = useCallback(
    (current: HistoryEntry): HistoryEntry | null => {
      const future = futureRef.current
      if (future.length === 0) return null

      const next = future[future.length - 1]
      futureRef.current = future.slice(0, -1)
      pastRef.current = [...pastRef.current, current]

      return next
    },
    []
  )

  const canUndo = pastRef.current.length > 0
  const canRedo = futureRef.current.length > 0

  return { pushState, undo, redo, canUndo, canRedo }
}
