/**
 * Public (non-encrypted) preview links.
 *
 * Unlike the private `#v1.` links (AES-GCM encrypted in the URL fragment, never
 * sent to a server), these carry the Mermaid source gzip-compressed +
 * base64url in a query param the server CAN read — so link unfurls (Slack,
 * Discord, X, iMessage, …) can render a diagram preview.
 *
 * Encoding must match the server decoder in api/_lib/publicShare.ts:
 *   c = base64url(gzip(utf8(source)))
 *
 * This is deliberately public: anyone with the link (and any server that
 * fetches it) can read the diagram. Use the private link for anything sensitive.
 */

import { bytesToBase64Url, base64UrlToBytes } from './base64url'

/** Keep pasted URLs under Slack's messaging-safe URL length. */
export const PUBLIC_PREVIEW_MAX_URL_LENGTH = 3990

export type PublicShareLinkErrorKind = 'oversized' | 'unsupported'

export class PublicShareLinkError extends Error {
  constructor(public kind: PublicShareLinkErrorKind, message: string) {
    super(message)
    this.name = 'PublicShareLinkError'
  }
}

async function streamThrough(mode: 'compress' | 'decompress', data: Uint8Array): Promise<Uint8Array> {
  const stream =
    mode === 'compress' ? new CompressionStream('gzip') : new DecompressionStream('gzip')
  const writer = stream.writable.getWriter()
  void writer.write(data as BufferSource)
  void writer.close()
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

export async function encodePublicDiagram(source: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') {
    throw new PublicShareLinkError('unsupported', 'This browser cannot create preview links.')
  }
  const bytes = new TextEncoder().encode(source)
  return bytesToBase64Url(await streamThrough('compress', bytes))
}

export async function decodePublicDiagram(c: string): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    throw new PublicShareLinkError('unsupported', 'This browser cannot open preview links.')
  }
  const bytes = await streamThrough('decompress', base64UrlToBytes(c))
  return new TextDecoder().decode(bytes)
}

/**
 * Assemble `${origin}/p?c=<compressed>&t=<theme>[&s=<signature>]` (network-free).
 * Throws PublicShareLinkError('oversized') if it exceeds the messaging limit.
 */
export function assemblePreviewUrl(
  origin: string,
  c: string,
  serverTheme?: string,
  signature?: string,
): string {
  const params = new URLSearchParams({ c })
  if (serverTheme) params.set('t', serverTheme)
  if (signature) params.set('s', signature)
  const url = `${origin}/p?${params.toString()}`
  if (url.length > PUBLIC_PREVIEW_MAX_URL_LENGTH) {
    throw new PublicShareLinkError(
      'oversized',
      `This diagram is too large for a shareable preview link (${url.length} characters). Try a smaller diagram, or use the private link.`,
    )
  }
  return url
}

/**
 * Ask the server to sign (c, theme) so the render endpoint will accept the link.
 * Returns the signature, or null when signing is disabled (503) or unreachable —
 * the caller then builds an unsigned link (which only renders on deployments
 * that have signing disabled).
 */
export async function requestPreviewSignature(
  origin: string,
  c: string,
  serverTheme: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/api/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ c, t: serverTheme }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { s?: unknown }
    return typeof data.s === 'string' ? data.s : null
  } catch {
    return null
  }
}
