import { expect, test } from '@playwright/test'

/**
 * README: keyboard shortcuts (⌘/Ctrl+N), Save, SVG/ASCII export, Copy Code, themes.
 * Runs against web build only (no Tauri dialogs).
 */
test.describe('Editor toolbar (web)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    await expect(page.locator('.preview-svg-host')).toBeVisible({ timeout: 30_000 })
  })

  test('Copy Code puts fenced mermaid in the clipboard', async ({ page }) => {
    await page.getByRole('button', { name: 'Copy Code' }).click()
    await expect(page.getByText('Code copied to clipboard')).toBeVisible()

    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip.trimStart()).toMatch(/^```mermaid\s*\n/)
    expect(clip).toContain('graph TD')
    expect(clip.trimEnd()).toMatch(/```\s*$/)
  })

  test('Save downloads diagram.mmd', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Save' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('diagram.mmd')
    await expect(page.getByText('Saved diagram.mmd')).toBeVisible()
  })

  test('Export SVG downloads diagram.svg', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export SVG' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('diagram.svg')
    await expect(page.getByText('Exported diagram.svg')).toBeVisible()
  })

  test('Export ASCII downloads diagram.txt', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export ASCII' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('diagram.txt')
    await expect(page.getByText('Exported diagram.txt')).toBeVisible()
  })

  test('theme select toggles app dark class for github-dark', async ({ page }) => {
    await page.locator('select.toolbar-select').selectOption('github-dark')
    await expect(page.locator('.app.app-theme-dark')).toBeVisible()
    await page.locator('select.toolbar-select').selectOption('github-light')
    await expect(page.locator('.app.app-theme-light')).toBeVisible()
  })

  test('Ctrl+N confirms and keeps a valid preview', async ({ page }) => {
    page.once('dialog', (d) => d.accept())
    await page.keyboard.press('Control+KeyN')
    await expect(page.locator('.error-indicator')).toHaveCount(0)
    await expect(page.locator('.preview-svg-host')).toBeVisible({ timeout: 30_000 })
  })
})
