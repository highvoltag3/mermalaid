import { expect, test } from '@playwright/test'

/**
 * Visual Edit fill changes must leave node labels readable via CSS
 * (contrast-color or mix-blend-mode fallback). Does not write color into Mermaid.
 */
test.describe('Visual editor fill contrast', () => {
  test('dark fill keeps label contrast without emitting color in source', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/editor')
    await expect(page.locator('.preview-svg-host')).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: 'Visual Edit' }).click()
    await expect(page.locator('.visual-editor-container')).toBeVisible()

    // Prefer a lower node so the NodeToolbar is not covered by the VE header.
    const endNode = page.locator('.react-flow__node').filter({ hasText: 'End' }).first()
    await expect(endNode).toBeVisible()
    await endNode.click()

    const fillSwatch = page.getByRole('button', { name: 'Fill #99ccff' })
    await expect(fillSwatch).toBeVisible()
    await fillSwatch.click({ force: true })

    const visualNode = endNode.locator('.visual-node')
    await expect(visualNode).toHaveClass(/has-custom-fill/)
    await expect(visualNode).not.toHaveClass(/has-explicit-text-color/)

    const fillVar = await visualNode.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--ve-node-fill').trim(),
    )
    expect(fillVar.toLowerCase()).toBe('#99ccff')

    await page.locator('.toolbar-color-group input[type="color"]').evaluate((el) => {
      const input = el as HTMLInputElement
      input.value = '#111111'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await expect
      .poll(async () =>
        visualNode.evaluate((el) => getComputedStyle(el).getPropertyValue('--ve-node-fill').trim()),
      )
      .toBe('#111111')

    const labelStyle = await endNode.locator('.node-label').evaluate((el) => {
      const s = getComputedStyle(el)
      return { color: s.color, mixBlendMode: s.mixBlendMode }
    })

    const supportsContrastColor = await page.evaluate(() =>
      CSS.supports('color', 'contrast-color(red)'),
    )
    expect(labelStyle.color).toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/)
    if (supportsContrastColor) {
      expect(labelStyle.mixBlendMode).toBe('normal')
    } else {
      expect(labelStyle.mixBlendMode).toBe('difference')
    }

    await page.getByRole('button', { name: 'Preview Mode' }).click()
    await page.getByRole('button', { name: 'Copy Code' }).click()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toMatch(/style\s+E\s+fill:#111111/i)
    expect(clip).not.toMatch(/style\s+E\s+[^\n]*\bcolor:/i)
  })
})
