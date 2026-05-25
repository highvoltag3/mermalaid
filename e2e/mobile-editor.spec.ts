import { expect, test } from '@playwright/test'

const smartphoneProfiles = [
  {
    name: 'iphone-14',
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  {
    name: 'galaxy-s9-plus',
    viewport: { width: 320, height: 658 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 10; SM-G965U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
  },
  {
    name: 'pixel-7',
    viewport: { width: 412, height: 915 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
  },
] as const

for (const profile of smartphoneProfiles) {
  test.describe(`Mobile editor (${profile.name})`, () => {
    test.use({
      viewport: profile.viewport,
      userAgent: profile.userAgent,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    })

    test('uses the smartphone workspace switcher and compact actions', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: async () => {
            await new Promise((resolve) => setTimeout(resolve, 300))
          },
        })
      })

      await page.goto('/editor')
      await expect(page.locator('.toolbar-mobile')).toBeVisible()
      await expect(page.locator('.mobile-bottom-bar')).toBeVisible()
      await expect(page.locator('.preview-container')).toBeVisible()
      await expect(page.locator('.editor-container')).toHaveCount(0)

      await page.locator('.mobile-bottom-bar').getByRole('tab', { name: 'Code' }).click()
      await expect(page.locator('.editor-container')).toBeVisible()
      await expect(page.locator('.preview-container')).toHaveCount(0)
      await expect(page.locator('.editor-monaco-host .view-lines')).toContainText('graph TD')

      await page.locator('.mobile-bottom-bar').getByRole('button', { name: 'More' }).click()
      await expect(page.getByRole('dialog', { name: 'More actions' })).toBeVisible()
      const shareButton = page.getByRole('button', { name: 'Share' })
      await shareButton.click()
      await expect(page.getByRole('button', { name: 'Creating link…' })).toBeDisabled()
      // When the private link flow completes, the sheet closes (so the Share button disappears).
      await expect(page.getByRole('dialog', { name: 'More actions' })).toHaveCount(0)

      await page.locator('.mobile-bottom-bar').getByRole('tab', { name: 'Preview' }).click()
      await expect(page.locator('.preview-container')).toBeVisible({ timeout: 30_000 })
      await page.locator('.mobile-bottom-bar').getByRole('button', { name: 'More' }).click()
      await expect(page.getByRole('dialog', { name: 'More actions' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Copy Code' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'SVG' })).toBeVisible()

      await page.locator('#mobile-theme-select').selectOption('github-dark')
      await expect(page.locator('.app.app-theme-dark')).toBeVisible()
    })
  })
}
