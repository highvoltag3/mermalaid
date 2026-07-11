/**
 * Public preview page: GET /api/preview?c=<compressed-mermaid>&t=<theme>
 * (reachable as /p?c=… via a rewrite).
 *
 * Returns a small HTML page whose Open Graph tags point og:image at /api/og,
 * so when the link is pasted into Slack/Discord/X/etc. the rendered diagram is
 * unfurled. The page body shows the diagram and an "Open in editor" link.
 */
import { decodePublicDiagram, PublicShareDecodeError } from './_lib/publicShare.js'
import { isServerMermaidTheme } from './_lib/renderMermaid.js'

/** Escape a value for safe interpolation into an HTML attribute (double-quoted). */
function attr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const DIAGRAM_KINDS: Record<string, string> = {
  graph: 'flowchart',
  flowchart: 'flowchart',
  sequencediagram: 'sequence diagram',
  classdiagram: 'class diagram',
  statediagram: 'state diagram',
  'statediagram-v2': 'state diagram',
  erdiagram: 'ER diagram',
  gantt: 'Gantt chart',
  pie: 'pie chart',
  mindmap: 'mindmap',
  journey: 'user journey',
  timeline: 'timeline',
  gitgraph: 'Git graph',
  quadrantchart: 'quadrant chart',
}

function diagramTitle(source: string): string {
  const firstToken = source.trim().split(/[\s\n]/)[0]?.toLowerCase() ?? ''
  const kind = DIAGRAM_KINDS[firstToken]
  return kind ? `Mermaid ${kind}` : 'Mermaid diagram'
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const c = url.searchParams.get('c')
  const themeParam = url.searchParams.get('t') ?? url.searchParams.get('theme') ?? ''
  const theme = isServerMermaidTheme(themeParam) ? themeParam : ''

  const redirectToEditor = () =>
    Response.redirect(new URL('/editor', url.origin).toString(), 302)

  if (!c) return redirectToEditor()

  let source: string
  try {
    source = decodePublicDiagram(c)
  } catch (err) {
    if (err instanceof PublicShareDecodeError) return redirectToEditor()
    throw err
  }

  const query = `c=${encodeURIComponent(c)}${theme ? `&t=${encodeURIComponent(theme)}` : ''}`
  const ogImage = `${url.origin}/api/og?${query}`
  const editorUrl = `${url.origin}/editor?${query}`
  const title = diagramTitle(source)

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${attr(title)} · Mermalaid</title>
  <meta name="description" content="A ${attr(title)} rendered with Mermalaid, a free Mermaid diagram editor." />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Mermalaid" />
  <meta property="og:title" content="${attr(title)}" />
  <meta property="og:description" content="Rendered with Mermalaid — a free Mermaid diagram editor." />
  <meta property="og:image" content="${attr(ogImage)}" />
  <meta property="og:image:alt" content="${attr(title)}" />
  <meta property="og:url" content="${attr(`${url.origin}/p?${query}`)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${attr(title)}" />
  <meta name="twitter:description" content="Rendered with Mermalaid — a free Mermaid diagram editor." />
  <meta name="twitter:image" content="${attr(ogImage)}" />
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0; min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 20px; padding: 32px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #fbfaf8; color: #1c1917;
    }
    @media (prefers-color-scheme: dark) { body { background: #0c0a09; color: #e7e5e4; } }
    img { max-width: min(900px, 100%); height: auto; border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,.12); background: #fff; }
    h1 { font-size: 1.1rem; font-weight: 600; margin: 0; }
    a.btn { text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 9999px;
            background: #0d9488; color: #fff; }
    a.btn:hover { background: #0f766e; }
    footer { font-size: .85rem; opacity: .7; }
  </style>
</head>
<body>
  <h1>${attr(title)}</h1>
  <img src="${attr(ogImage)}" alt="${attr(title)}" />
  <a class="btn" href="${attr(editorUrl)}">Open in Mermalaid editor</a>
  <footer>Rendered with <a href="${attr(url.origin)}">Mermalaid</a></footer>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
