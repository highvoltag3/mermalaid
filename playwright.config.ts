import { defineConfig, devices } from '@playwright/test'

const useProductionPreview = process.env.E2E_PREVIEW === '1'
const port = Number(process.env.PORT || (useProductionPreview ? 4173 : 5173))
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'on',
    // Copy Code / clipboard E2E
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: useProductionPreview
    ? {
        command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      }
    : {
        // Avoid `host: true` from vite.config (networkInterfaces); keep E2E stable in CI/sandbox.
        command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
