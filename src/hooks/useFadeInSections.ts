import { useEffect, type RefObject } from 'react'

/**
 * Reveals `.fade-in-section` descendants of `rootRef` (adds the `.visible`
 * class) as they scroll into view, then stops observing each one.
 */
export function useFadeInSections(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const sections = root.querySelectorAll('.fade-in-section')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '-60px 0px' },
    )

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [rootRef])
}
