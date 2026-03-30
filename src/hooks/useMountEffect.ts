import { useEffect } from 'react'

export function useMountEffect(callback: () => void | (() => void)): void {
  useEffect(callback, [])
}
