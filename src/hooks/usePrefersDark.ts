import { useEffect, useState } from 'react'

/** Tracks the OS `prefers-color-scheme: dark` preference, updating on change. */
export function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setPrefersDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersDark
}
