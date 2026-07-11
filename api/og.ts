/**
 * Open Graph image endpoint: GET /api/og?c=<compressed-mermaid>&t=<theme>
 *
 * Renders the diagram carried by a public preview link to a PNG, so link
 * unfurls (Slack, Discord, X, iMessage, …) show the diagram instead of a logo.
 * Reuses the same headless-Chromium renderer as the Slack integration.
 *
 * The response is content-addressed by (c, theme), so it's cached hard on the
 * CDN — only the first unfurl pays for a render.
 */
import { renderMermaidToPng } from './_lib/renderMermaid.js'
import { isServerMermaidTheme, type ServerMermaidTheme } from './_lib/serverThemes.js'
import { decodePublicDiagram } from './_lib/publicShare.js'
import { verifyPreview } from './_lib/previewSigning.js'
import { isRateLimited } from './_lib/rateLimit.js'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })

  const url = new URL(req.url)
  const c = url.searchParams.get('c')
  const themeParam = url.searchParams.get('t') ?? url.searchParams.get('theme') ?? 'default'
  const theme: ServerMermaidTheme = isServerMermaidTheme(themeParam) ? themeParam : 'default'

  // On any failure, fall back to the static logo so the unfurl still shows something.
  const fallback = () => Response.redirect(new URL('/og-image.png', url.origin).toString(), 302)

  // Over the per-IP limit → serve the logo (a cheap redirect, no render).
  if (await isRateLimited(req)) return fallback()

  if (!c) return fallback()

  // When signing is enabled, only render links this server vouched for.
  if (!verifyPreview(c, theme, url.searchParams.get('s'))) return fallback()

  let source: string
  try {
    source = decodePublicDiagram(c)
  } catch {
    return fallback()
  }

  try {
    const png = await renderMermaidToPng(source, theme)
    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('[mermalaid] og render failed:', err)
    return fallback()
  }
}
