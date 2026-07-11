/**
 * Server-side Mermaid → PNG rendering for the Slack integration.
 *
 * Mermaid needs a real browser DOM (it lays out text with getBBox and renders
 * HTML labels via <foreignObject>), so we drive a headless Chromium:
 *   - On Vercel/Lambda we use @sparticuz/chromium's bundled binary.
 *   - Locally we use a system Chrome (PUPPETEER_EXECUTABLE_PATH or a macOS default).
 *
 * The Mermaid library itself is injected from the locally-installed
 * `mermaid/dist/mermaid.min.js` (a self-contained UMD bundle with every diagram
 * type). Nothing about the user's diagram ever leaves this function — no CDN,
 * no third-party render service.
 */
import { mkdtempSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Browser, LaunchOptions } from 'puppeteer-core'
import type { ServerMermaidTheme } from './serverThemes.js'

// Re-export so existing importers of these from this module keep working.
export * from './serverThemes.js'

const require = createRequire(import.meta.url)

/** Background painted behind the diagram so the PNG reads well in Slack. */
const THEME_BACKGROUND: Record<ServerMermaidTheme, string> = {
  default: '#ffffff',
  neutral: '#ffffff',
  forest: '#ffffff',
  dark: '#1e1e2e',
}

const RENDER_TIMEOUT_MS = 25_000

/** Installed Mermaid version — keep in sync with package.json for the CDN fallback. */
const MERMAID_VERSION = '11.15.0'

/**
 * Read + cache the self-contained Mermaid UMD bundle (once per cold start).
 *
 * Primary path: the locally-installed `mermaid/dist/mermaid.min.js` — fully
 * offline, diagram content never leaves the function. If that file isn't
 * present in the deployed bundle (serverless file-tracing can miss files read
 * via fs), fall back to fetching the *library* from a pinned CDN. Only the
 * library JS is fetched — the user's diagram is still rendered in-process and
 * never sent anywhere.
 */
let mermaidSource: string | null = null
async function getMermaidSource(): Promise<string> {
  if (mermaidSource !== null) return mermaidSource

  try {
    const path = require.resolve('mermaid/dist/mermaid.min.js')
    mermaidSource = readFileSync(path, 'utf8')
    return mermaidSource
  } catch {
    // Fall through to the CDN fallback below.
  }

  const url =
    process.env.MERMAID_UMD_URL ||
    `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Could not load the Mermaid library (HTTP ${res.status} from ${url})`)
  }
  mermaidSource = await res.text()
  return mermaidSource
}

function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
}

async function resolveLaunchOptions(): Promise<LaunchOptions> {
  const baseViewport = { width: 1200, height: 800, deviceScaleFactor: 2 }

  if (isServerless()) {
    const chromium = (await import('@sparticuz/chromium')).default
    return {
      args: chromium.args,
      defaultViewport: baseViewport,
      executablePath: await chromium.executablePath(),
      // @sparticuz/chromium ships the headless-shell binary (its args already
      // include --headless='shell'), so match that mode here.
      headless: 'shell',
    }
  }

  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  // A throwaway profile dir lets us launch even when the user's Chrome is
  // already open with the default profile (otherwise the launch hangs).
  const userDataDir = mkdtempSync(join(tmpdir(), 'mermalaid-chrome-'))
  return {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: baseViewport,
    executablePath,
    headless: true,
    userDataDir,
    timeout: 60_000,
  }
}

const PAGE_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; }
      #container {
        display: inline-block;
        padding: 20px;
        font-family: "Trebuchet MS", "Segoe UI", Helvetica, Arial, sans-serif;
      }
      #container svg { display: block; }
    </style>
  </head>
  <body>
    <div id="container"></div>
  </body>
</html>`

export class MermaidRenderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MermaidRenderError'
  }
}

/**
 * Runs inside the headless page (serialized by puppeteer). Browser globals are
 * read off `globalThis` so this file can type-check with a Node-only lib — the
 * DOM lib would clash with Node's fetch/Response globals used elsewhere in /api.
 */
const RENDER_IN_PAGE = async (args: { code: string; theme: string; background: string }) => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const g = globalThis as any
  const doc = g.document
  const container = doc.getElementById('container')
  if (!container) return { ok: false as const, error: 'Missing render container', kind: 'internal' as const }
  container.style.background = args.background

  const mermaid = g.mermaid

  // mermaid.render throws on invalid diagram syntax — a user-meaningful message
  // we want to show back. Keep it separate from the internal steps below so we
  // don't surface cryptic internal errors to users.
  let svg: string
  try {
    mermaid.initialize({
      startOnLoad: false,
      // 'strict' sanitizes HTML/script in labels. Unlike the local editor (which
      // renders a user's OWN diagram in their OWN browser), this renders other
      // users' input inside our server browser, so it must not execute their
      // markup. Network is additionally blocked at the page level (see below).
      securityLevel: 'strict',
      theme: args.theme,
    })
    ;({ svg } = (await mermaid.render('mermalaid-slack-graph', args.code)) as { svg: string })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false as const, error: message, kind: 'syntax' as const }
  }

  try {
    // Parse as HTML (lenient — tolerates unclosed tags like <br> inside
    // <foreignObject> labels) and lift out the <svg> with its correct namespace.
    // Avoids innerHTML entirely.
    const parsed = new g.DOMParser().parseFromString(svg, 'text/html')
    const parsedSvg = parsed.querySelector('svg')
    if (!parsedSvg) {
      return { ok: false as const, error: 'Could not parse the rendered diagram.', kind: 'internal' as const }
    }
    const svgEl = doc.importNode(parsedSvg, true)

    // Pin the SVG to its intrinsic pixel size so the element screenshot is
    // tightly bounded instead of stretching to a default width.
    const viewBox = svgEl.getAttribute('viewBox')
    if (viewBox) {
      const [, , w, h] = viewBox.trim().split(/\s+/).map(Number)
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        svgEl.setAttribute('width', String(w))
        svgEl.setAttribute('height', String(h))
        svgEl.style.maxWidth = 'none'
      }
    }
    container.replaceChildren(svgEl)
    return { ok: true as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false as const, error: message, kind: 'internal' as const }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/**
 * Render Mermaid source to a PNG buffer. Throws MermaidRenderError with a
 * human-readable message when the diagram syntax is invalid.
 */
export async function renderMermaidToPng(
  code: string,
  theme: ServerMermaidTheme = 'default',
): Promise<Buffer> {
  const puppeteer = (await import('puppeteer-core')).default
  const background = THEME_BACKGROUND[theme] ?? THEME_BACKGROUND.default

  let browser: Browser | null = null
  let renderTimeout: ReturnType<typeof setTimeout> | undefined
  try {
    browser = await puppeteer.launch(await resolveLaunchOptions())
    const page = await browser.newPage()

    // SSRF backstop: everything this page needs is injected inline, so block all
    // outbound network. A malicious diagram label (e.g. <img src=http://internal>)
    // therefore cannot make the server browser fetch anything.
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const url = req.url()
      const allowed =
        url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')
      if (allowed) {
        req.continue().catch(() => {})
      } else {
        req.abort().catch(() => {})
      }
    })

    await page.setContent(PAGE_HTML, { waitUntil: 'load' })
    await page.addScriptTag({ content: await getMermaidSource() })

    const outcome = (await Promise.race([
      page.evaluate(RENDER_IN_PAGE, { code, theme, background }),
      new Promise<never>((_, reject) => {
        renderTimeout = setTimeout(
          () =>
            reject(
              new MermaidRenderError('Rendering timed out. The diagram may be too large.'),
            ),
          RENDER_TIMEOUT_MS,
        )
      }),
    ])) as { ok: true } | { ok: false; error: string; kind: 'syntax' | 'internal' }

    if (!outcome.ok) {
      // Only genuine syntax errors are shown to the user (MermaidRenderError);
      // internal failures become a generic error the caller reports safely.
      if (outcome.kind === 'syntax') {
        throw new MermaidRenderError(outcome.error || 'Invalid Mermaid syntax')
      }
      throw new Error(`Mermaid render failed: ${outcome.error}`)
    }

    const container = await page.$('#container')
    if (!container) {
      throw new Error('Could not capture the rendered diagram.')
    }
    const buffer = await container.screenshot({ type: 'png' })
    return Buffer.from(buffer)
  } finally {
    if (renderTimeout) clearTimeout(renderTimeout)
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}
