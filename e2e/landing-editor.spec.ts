import { expect, test } from '@playwright/test'

test.describe('Landing and editor', () => {
  test('landing exposes Open Editor; /editor loads toolbar and panes', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Open Editor' })).toBeVisible()

    await page.goto('/editor')
    await expect(page.locator('.toolbar')).toBeVisible()
    await expect(page.locator('.editor-container')).toBeVisible()
    await expect(page.locator('.preview-container')).toBeVisible()
  })

  test('default flowchart preview renders without a global error banner', async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('.error-indicator')).toHaveCount(0)
    await expect(page.locator('.preview-svg-host')).toBeVisible({ timeout: 30_000 })
  })
})
