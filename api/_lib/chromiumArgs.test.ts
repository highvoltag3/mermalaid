import { describe, expect, it } from 'vitest'
import { localChromiumArgs } from './renderMermaid.js'

describe('localChromiumArgs', () => {
  it('omits --no-sandbox by default', () => {
    const args = localChromiumArgs({})
    expect(args).not.toContain('--no-sandbox')
    expect(args).toContain('--disable-dev-shm-usage')
  })

  it('adds --no-sandbox when PUPPETEER_NO_SANDBOX or CI is set', () => {
    expect(localChromiumArgs({ PUPPETEER_NO_SANDBOX: '1' })).toContain('--no-sandbox')
    expect(localChromiumArgs({ CI: 'true' })).toContain('--disable-setuid-sandbox')
  })
})
