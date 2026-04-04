/**
 * Client-only private links: `#v1.<payload>` (fragment only — not sent to servers with navigations).
 * Payload is base64url(key || iv || AES-GCM(ciphertext)); ciphertext covers optional deflate + JSON.
 */

export const PRIVATE_SHARE_URL_PREFIX = '#v1.'
export const PRIVATE_SHARE_PAYLOAD_PREFIX = 'v1.'

/** Conservative cap so shared URLs stay under typical browser limits. */
export const PRIVATE_SHARE_MAX_URL_LENGTH = 28_000

const INNER_JSON_VERSION = 1
const PACKET_KEY_LEN = 32
const GCM_IV_LENGTH = 12
const FLAG_COMPRESSED = 0x01

export type ShareableEditorState = {
  code: string
}

export type PrivateShareErrorKind = 'oversized' | 'invalid' | 'unsupported'

export class PrivateShareError extends Error {
  readonly kind: PrivateShareErrorKind

  constructor(kind: PrivateShareErrorKind, message: string) {
    super(message)
    this.name = 'PrivateShareError'
    this.kind = kind
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array {
  const padLen = (4 - (s.length % 4)) % 4
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
  const bin = atob(padded)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i)
  }
  return out
}

async function compressIfSupported(data: Uint8Array): Promise<{ bytes: Uint8Array; compressed: boolean }> {
  if (typeof CompressionStream === 'undefined') {
    return { bytes: data, compressed: false }
  }
  const stream = new CompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  await writer.write(data as BufferSource)
  await writer.close()
  const buf = await new Response(stream.readable).arrayBuffer()
  const out = new Uint8Array(buf)
  if (out.length < data.length) {
    return { bytes: out, compressed: true }
  }
  return { bytes: data, compressed: false }
}

async function decompressIfNeeded(data: Uint8Array, compressed: boolean): Promise<Uint8Array> {
  if (!compressed) return data
  if (typeof DecompressionStream === 'undefined') {
    throw new PrivateShareError('unsupported', 'This link uses compression that your browser cannot decode.')
  }
  const stream = new DecompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  await writer.write(data as BufferSource)
  await writer.close()
  const buf = await new Response(stream.readable).arrayBuffer()
  return new Uint8Array(buf)
}

function getRandomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length)
  crypto.getRandomValues(out)
  return out
}

export function isPrivateShareHash(hash: string): boolean {
  return hash.startsWith(PRIVATE_SHARE_URL_PREFIX)
}

export function isPrivateSharePayload(payload: string): boolean {
  return payload.startsWith(PRIVATE_SHARE_PAYLOAD_PREFIX)
}

function parseInnerJson(bytes: Uint8Array): ShareableEditorState {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new PrivateShareError('invalid', 'This share link could not be read.')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new PrivateShareError('invalid', 'This share link could not be read.')
  }
  const rec = parsed as Record<string, unknown>
  if (rec.v !== INNER_JSON_VERSION || typeof rec.code !== 'string') {
    throw new PrivateShareError('invalid', 'This share link is not compatible with this version of Mermalaid.')
  }
  return { code: rec.code }
}

/**
 * Builds `#v1.<base64url(packet)>` for the current origin/path; caller should set `location` appropriately.
 */
export async function encodePrivateShareHash(state: ShareableEditorState): Promise<string> {
  if (!crypto?.subtle) {
    throw new PrivateShareError('unsupported', 'Your browser does not support private links.')
  }

  const json = JSON.stringify({ v: INNER_JSON_VERSION, code: state.code })
  const plain = new TextEncoder().encode(json)
  const { bytes: body, compressed } = await compressIfSupported(plain)

  const key = getRandomBytes(PACKET_KEY_LEN)
  const iv = getRandomBytes(GCM_IV_LENGTH)
  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['encrypt'])

  const flags = compressed ? FLAG_COMPRESSED : 0
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      cryptoKey,
      body as BufferSource,
    ),
  )

  const packet = new Uint8Array(1 + PACKET_KEY_LEN + GCM_IV_LENGTH + ciphertext.length)
  packet[0] = flags
  packet.set(key, 1)
  packet.set(iv, 1 + PACKET_KEY_LEN)
  packet.set(ciphertext, 1 + PACKET_KEY_LEN + GCM_IV_LENGTH)

  const b64 = bytesToBase64Url(packet)
  return `${PRIVATE_SHARE_URL_PREFIX}${b64}`
}

export async function decodePrivateShareHash(hash: string): Promise<ShareableEditorState> {
  if (!crypto?.subtle) {
    throw new PrivateShareError('unsupported', 'Your browser does not support private links.')
  }

  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw.startsWith(PRIVATE_SHARE_PAYLOAD_PREFIX)) {
    throw new PrivateShareError('invalid', 'This share link is not valid.')
  }
  const b64 = raw.slice(PRIVATE_SHARE_PAYLOAD_PREFIX.length)
  if (!b64) {
    throw new PrivateShareError('invalid', 'This share link is not valid.')
  }

  let packet: Uint8Array
  try {
    packet = base64UrlToBytes(b64)
  } catch {
    throw new PrivateShareError('invalid', 'This share link is damaged and could not be opened.')
  }

  const minLen = 1 + PACKET_KEY_LEN + GCM_IV_LENGTH + 16
  if (packet.length < minLen) {
    throw new PrivateShareError('invalid', 'This share link is damaged and could not be opened.')
  }

  const flags = packet[0]!
  const compressed = (flags & FLAG_COMPRESSED) !== 0
  const key = packet.subarray(1, 1 + PACKET_KEY_LEN)
  const iv = packet.subarray(1 + PACKET_KEY_LEN, 1 + PACKET_KEY_LEN + GCM_IV_LENGTH)
  const ciphertext = packet.subarray(1 + PACKET_KEY_LEN + GCM_IV_LENGTH)

  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['decrypt'])

  let plain: Uint8Array
  try {
    plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        cryptoKey,
        ciphertext as BufferSource,
      ),
    )
  } catch {
    throw new PrivateShareError('invalid', 'This share link is damaged or was changed and could not be opened.')
  }

  const jsonBytes = await decompressIfNeeded(plain, compressed)
  return parseInnerJson(jsonBytes)
}

export function getPrivateShareErrorMessage(err: unknown): string {
  if (err instanceof PrivateShareError) {
    return err.message
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return 'This share link could not be opened.'
}

/**
 * Full URL with hash for clipboard (uses current window location path).
 */
export function buildPrivateShareUrl(fullHash: string): string {
  const url = new URL(window.location.href)
  url.hash = fullHash.startsWith('#') ? fullHash.slice(1) : fullHash
  return url.toString()
}

/** Removes `#…` via `history.replaceState` (same path and query). */
export function clearUrlFragment(): void {
  const url = new URL(window.location.href)
  url.hash = ''
  history.replaceState(null, '', `${url.pathname}${url.search}`)
}

export function assertPrivateShareUrlFits(fullUrl: string): void {
  if (fullUrl.length > PRIVATE_SHARE_MAX_URL_LENGTH) {
    throw new PrivateShareError(
      'oversized',
      'This diagram is too large to share as a link. Try shortening the code or splitting it into smaller diagrams.',
    )
  }
}
