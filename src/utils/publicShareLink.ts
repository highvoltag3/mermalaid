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

/** Keep pasted URLs under Slack's messaging-safe URL length. */
export const PUBLIC_PREVIEW_MAX_URL_LENGTH = 3990

export type PublicShareLinkErrorKind = 'oversized' | 'unsupported'

export class PublicShareLinkError extends Error {
  constructor(public kind: PublicShareLinkErrorKind, message: string) {
    super(message)
    this.name = 'PublicShareLinkError'
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array {
  const padLen = (4 - (s.length % 4)) % 4
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
  const bin = atob(padded)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

async function collectStream(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      total += value.length
    }
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const ch of chunks) {
    out.set(ch, offset)
    offset += ch.length
  }
  return out
}

async function streamThrough(mode: 'compress' | 'decompress', data: Uint8Array): Promise<Uint8Array> {
  const stream =
    mode === 'compress' ? new CompressionStream('gzip') : new DecompressionStream('gzip')
  const writer = stream.writable.getWriter()
  // Write + close without awaiting first, so reading can drain concurrently.
  const pump = (async () => {
    await writer.write(data as BufferSource)
    await writer.close()
  })()
  const out = await collectStream(stream.readable as ReadableStream<Uint8Array>)
  await pump
  return out
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
 * Build a shareable preview URL: `${origin}/p?c=<compressed>&t=<theme>`.
 * Throws PublicShareLinkError('oversized') if it exceeds the messaging limit.
 */
export async function buildPublicPreviewUrl(
  origin: string,
  source: string,
  serverTheme?: string,
): Promise<string> {
  const c = await encodePublicDiagram(source)
  // base64url is URL-safe, so `c` needs no further encoding.
  const url = `${origin}/p?c=${c}${serverTheme ? `&t=${encodeURIComponent(serverTheme)}` : ''}`
  if (url.length > PUBLIC_PREVIEW_MAX_URL_LENGTH) {
    throw new PublicShareLinkError(
      'oversized',
      `This diagram is too large for a shareable preview link (${url.length} characters). Try a smaller diagram, or use the private link.`,
    )
  }
  return url
}
