import { expect, test } from '@playwright/test'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

test.describe('Production deploy smoke', () => {
  test('og-image is served as a PNG static asset', async ({ request }) => {
    const response = await request.get('/og-image.png')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/image\/png/)
    const body = await response.body()
    expect(body.subarray(0, 8)).toEqual(PNG_SIGNATURE)
  })

  test('editor loads from the built bundle', async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('.toolbar')).toBeVisible()
    await expect(page.locator('.preview-svg-host')).toBeVisible({ timeout: 30_000 })
  })
})
