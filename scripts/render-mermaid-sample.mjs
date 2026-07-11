/**
 * Render a Mermaid diagram to a PNG with headless Chromium — a local smoke test
 * that mirrors the Slack integration's renderer (api/_lib/renderMermaid.ts).
 *
 * Usage:
 *   node scripts/render-mermaid-sample.mjs "graph TD; A-->B" out.png [theme]
 *   node scripts/render-mermaid-sample.mjs                     # renders a sample
 *
 * Requires a local Chrome/Chromium. Set PUPPETEER_EXECUTABLE_PATH to override
 * the default macOS Chrome location. This is a standalone helper (no build step)
 * so it runs on any supported Node version.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const require = createRequire(import.meta.url)

const DEFAULT_CODE = `graph TD
  A[Start] --> B{Works?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Fix it]
  D --> B`

const THEME_BACKGROUND = {
  default: '#ffffff',
  neutral: '#ffffff',
  forest: '#ffffff',
  dark: '#1e1e2e',
}

const code = process.argv[2] || DEFAULT_CODE
const outPath = process.argv[3] || 'mermalaid-sample.png'
const theme = process.argv[4] || 'default'
const background = THEME_BACKGROUND[theme] || THEME_BACKGROUND.default

const PAGE_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:transparent}
  #container{display:inline-block;padding:20px;font-family:"Trebuchet MS","Segoe UI",Helvetica,Arial,sans-serif}
  #container svg{display:block}
</style></head><body><div id="container"></div></body></html>`

const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const mermaidSource = readFileSync(require.resolve('mermaid/dist/mermaid.min.js'), 'utf8')

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1200, height: 800, deviceScaleFactor: 2 },
  executablePath,
  headless: true,
  userDataDir: mkdtempSync(join(tmpdir(), 'mermalaid-chrome-')),
  timeout: 60_000,
})

try {
  const page = await browser.newPage()
  await page.setContent(PAGE_HTML, { waitUntil: 'load' })
  await page.addScriptTag({ content: mermaidSource })

  const outcome = await page.evaluate(
    async ({ code, theme, background }) => {
      const g = /** @type {any} */ (globalThis)
      const container = g.document.getElementById('container')
      container.style.background = background
      try {
        g.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme })
        const { svg } = await g.mermaid.render('mermalaid-slack-graph', code)
        const parsed = new g.DOMParser().parseFromString(svg, 'text/html')
        const svgEl = parsed.querySelector('svg')
        if (!svgEl) return { ok: false, error: 'Could not parse the rendered diagram.' }
        const imported = g.document.importNode(svgEl, true)
        const viewBox = imported.getAttribute('viewBox')
        if (viewBox) {
          const [, , w, h] = viewBox.trim().split(/\s+/).map(Number)
          if (w > 0 && h > 0) {
            imported.setAttribute('width', String(w))
            imported.setAttribute('height', String(h))
            imported.style.maxWidth = 'none'
          }
        }
        container.replaceChildren(imported)
        const rect = container.getBoundingClientRect()
        return { ok: true, width: Math.ceil(rect.width), height: Math.ceil(rect.height) }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    },
    { code, theme, background },
  )

  if (!outcome.ok) throw new Error(outcome.error)

  const el = await page.$('#container')
  const png = Buffer.from(await el.screenshot({ type: 'png' }))
  writeFileSync(outPath, png)
  console.log(`Rendered ${outcome.width}x${outcome.height} (${png.length} bytes) → ${outPath}`)
} finally {
  await browser.close().catch(() => {})
}
