import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('public path helpers', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('keeps root-hosted public asset paths absolute', async () => {
    vi.stubEnv('BASE_URL', '/')
    vi.resetModules()
    const { publicAssetPath, routerBasename } = await import('./publicPath')

    expect(publicAssetPath('/editor-hero-demo.svg')).toBe('/editor-hero-demo.svg')
    expect(routerBasename()).toBeUndefined()
  })

  it('prefixes public asset paths and router basename for project pages', async () => {
    vi.stubEnv('BASE_URL', '/mermalaid/')
    vi.resetModules()
    const { publicAssetPath, routerBasename } = await import('./publicPath')

    expect(publicAssetPath('/editor-hero-demo.svg')).toBe('/mermalaid/editor-hero-demo.svg')
    expect(routerBasename()).toBe('/mermalaid')
  })
})
