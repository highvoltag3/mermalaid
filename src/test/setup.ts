import '@testing-library/jest-dom/vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

globalThis.ResizeObserver = class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/** Mermaid measures labels via `getBBox`; jsdom does not implement it. */
if (typeof SVGElement !== 'undefined') {
  const proto = SVGElement.prototype as SVGElement & { getBBox?: () => DOMRect }
  if (typeof proto.getBBox !== 'function') {
    proto.getBBox = function (): DOMRect {
      return {
        x: 0,
        y: 0,
        width: 80,
        height: 20,
        top: 0,
        right: 80,
        bottom: 20,
        left: 0,
        toJSON() {
          return {}
        },
      }
    }
  }
}

globalThis.IntersectionObserver = class IntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  readonly root: Element | Document | null = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
} as unknown as typeof IntersectionObserver
