import { expect, test } from '@playwright/test'

/**
 * Production-CSP + HTML-label regressions that blocked the 1.9.4 desktop release.
 * Prefer `npm run test:e2e:preview` so the production Vite build is what we exercise.
 */

/** Mirrors src-tauri/tauri.conf.json production CSP (strict script-src, local workers). */
const TAURI_LIKE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' blob: data: https:",
  "connect-src 'self' https://www.mermalaid.com https://mermalaid.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

test.describe('Monaco under production CSP', () => {
  test('editor mounts without CDN when Tauri-like CSP is applied', async ({ page }) => {
    // Vite dev needs unsafe-eval / module HMR hosts. This assertion is for the
    // production bundle under the same CSP the Tauri desktop app ships.
    test.skip(process.env.E2E_PREVIEW !== '1', 'Requires E2E_PREVIEW=1 (production build)')
    test.setTimeout(60_000)

    await page.route('**/*', async (route) => {
      const request = route.request()
      const url = request.url()
      if (url.includes('cdn.jsdelivr.net') || url.includes('unpkg.com') || url.includes('monaco-editor@')) {
        await route.abort()
        return
      }
      if (request.resourceType() === 'document') {
        const response = await route.fetch()
        const headers = {
          ...response.headers(),
          'content-security-policy': TAURI_LIKE_CSP,
        }
        await route.fulfill({ response, headers })
        return
      }
      await route.continue()
    })

    const cspViolations: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (/content security policy|refused to load|cdn\.jsdelivr/i.test(text)) {
        cspViolations.push(text)
      }
    })

    await page.goto('/editor')

    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Loading...')).toHaveCount(0)
    await expect(page.locator('.view-lines')).toBeVisible()
    expect(cspViolations).toEqual([])
  })
})

test.describe('HTML-label flowcharts', () => {
  test('preview keeps non-zero size for labels with <br/> / <b>', async ({ page }) => {
    test.setTimeout(60_000)

    const diagram = [
      'graph TD',
      '  A[<b>Bold</b><br/>line2]-->B',
      '  A2[line1<br/>line2]-->B',
    ].join('\n')

    await page.addInitScript((code) => {
      localStorage.setItem('mermalaid-draft', code)
    }, diagram)

    await page.goto('/editor')
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 30_000 })

    const svg = page.locator('.preview-svg-host svg')
    await expect(svg).toBeVisible({ timeout: 30_000 })

    await expect
      .poll(async () => {
        const box = await svg.boundingBox()
        return box ? box.width * box.height : 0
      }, { timeout: 30_000 })
      .toBeGreaterThan(40 * 40)

    await expect(page.locator('.preview-svg-host')).not.toContainText('parsererror')
  })
})
