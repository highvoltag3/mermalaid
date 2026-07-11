/**
 * Preview-link signing endpoint: POST /api/sign  { c, t }  →  { s }
 *
 * Validates the diagram (decodable + size-bounded) and returns an HMAC over
 * (c, theme). Does NOT render — it's cheap. Only reachable when signing is
 * enabled (PREVIEW_LINK_SECRET set); otherwise returns 503 and the client
 * builds an unsigned link.
 *
 * Permissive CORS so the desktop app can sign against the hosted origin.
 */
import { decodePublicDiagram, PublicShareDecodeError } from './_lib/publicShare.js'
import { isServerMermaidTheme } from './_lib/serverThemes.js'
import { signPreview, isSigningEnabled } from './_lib/previewSigning.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!isSigningEnabled()) return json({ error: 'signing_disabled' }, 503)

  let body: { c?: unknown; t?: unknown }
  try {
    body = (await req.json()) as { c?: unknown; t?: unknown }
  } catch {
    return json({ error: 'bad_json' }, 400)
  }

  const c = typeof body.c === 'string' ? body.c : ''
  const themeRaw = typeof body.t === 'string' ? body.t : ''
  const theme = isServerMermaidTheme(themeRaw) ? themeRaw : 'default'

  // Only sign valid, size-bounded diagrams — don't be an oracle for junk.
  try {
    decodePublicDiagram(c)
  } catch (err) {
    if (err instanceof PublicShareDecodeError) return json({ error: 'invalid_diagram' }, 400)
    throw err
  }

  return json({ s: signPreview(c, theme) })
}
