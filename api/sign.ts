/**
 * Preview-link signing endpoint: POST /api/sign  { c, t }  →  { s }
 *
 * Validates the diagram (decodable + size-bounded) and returns an HMAC over
 * (c, theme). Does NOT render — it's cheap. Only reachable when signing is
 * enabled (PREVIEW_LINK_SECRET set); otherwise returns 503 and the client
 * builds an unsigned link.
 *
 * Origin-checked + tight CORS: only the Mermalaid editor (hosted web, Tauri
 * webview, optional env allowlist) may mint signatures. See signOrigin.ts.
 */
import { decodePublicDiagram, PublicShareDecodeError } from './_lib/publicShare.js'
import { isServerMermaidTheme } from './_lib/serverThemes.js'
import { signPreview, isSigningEnabled } from './_lib/previewSigning.js'
import { isRateLimited } from './_lib/rateLimit.js'
import { corsHeadersForSignOrigin } from './_lib/signOrigin.js'

function json(
  body: unknown,
  status: number,
  cors: Record<string, string> | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(cors ?? {}),
    },
  })
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('Origin')
  const cors = corsHeadersForSignOrigin(origin, process.env, req.url)

  if (req.method === 'OPTIONS') {
    if (!cors) return new Response(null, { status: 403 })
    return new Response(null, { status: 204, headers: cors })
  }

  if (!cors) return json({ error: 'origin_not_allowed' }, 403, null)
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors)
  if (!isSigningEnabled()) return json({ error: 'signing_disabled' }, 503, cors)
  if (await isRateLimited(req)) return json({ error: 'rate_limited' }, 429, cors)

  let body: { c?: unknown; t?: unknown }
  try {
    body = (await req.json()) as { c?: unknown; t?: unknown }
  } catch {
    return json({ error: 'bad_json' }, 400, cors)
  }

  const c = typeof body.c === 'string' ? body.c : ''
  const themeRaw = typeof body.t === 'string' ? body.t : ''
  const theme = isServerMermaidTheme(themeRaw) ? themeRaw : 'default'

  // Only sign valid, size-bounded diagrams — don't be an oracle for junk.
  try {
    decodePublicDiagram(c)
  } catch (err) {
    if (err instanceof PublicShareDecodeError) return json({ error: 'invalid_diagram' }, 400, cors)
    throw err
  }

  return json({ s: signPreview(c, theme) }, 200, cors)
}
