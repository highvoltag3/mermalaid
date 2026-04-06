/**
 * Client-only private links: `#v1.<payload>` (fragment only — not sent to servers with navigations).
 * Payload is base64url(key || iv || AES-GCM(ciphertext)); ciphertext covers optional compressed JSON.
 */

export const PRIVATE_SHARE_URL_PREFIX = '#v1.'
export const PRIVATE_SHARE_PAYLOAD_PREFIX = 'v1.'

/**
 * Chat apps (notably Slack) effectively reject or break URLs much longer than ~4KB.
 * @see https://github.com/elastic/kibana/issues/158262
 */
export const PRIVATE_SHARE_MESSAGING_SAFE_MAX_URL_LENGTH = 3990

/** Hard ceiling so shared URLs stay under typical browser/document limits. */
export const PRIVATE_SHARE_BROWSER_MAX_URL_LENGTH = 28_000

/** @deprecated Use {@link PRIVATE_SHARE_MESSAGING_SAFE_MAX_URL_LENGTH} (same value). */
export const PRIVATE_SHARE_MAX_URL_LENGTH = PRIVATE_SHARE_MESSAGING_SAFE_MAX_URL_LENGTH

const INNER_JSON_VERSION = 1
const PACKET_KEY_LEN = 32
const GCM_IV_LENGTH = 12
/** Lower two bits of the flags byte: 0 = none, 1 = deflate-raw (legacy), 2 = gzip. */
const COMPRESSION_KIND_MASK = 0x03
const COMPRESSION_NONE = 0
const COMPRESSION_DEFLATE_RAW = 1
const COMPRESSION_GZIP = 2

type CompressionKind = typeof COMPRESSION_NONE | typeof COMPRESSION_DEFLATE_RAW | typeof COMPRESSION_GZIP

const STREAM_OPERATION_TIMEOUT_MS = 1500
const CRYPTO_OPERATION_TIMEOUT_MS = 2500

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

/** Web Crypto subtle exists only in secure contexts (HTTPS, localhost, 127.0.0.1 — not http://192.168…). */
function throwIfWebCryptoUnavailableForPrivateShare(): void {
  if (crypto?.subtle) return

  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    throw new PrivateShareError(
      'unsupported',
      'Private links need a secure page. Browsers disable Web Crypto on plain HTTP for LAN IPs (http://192.168…). Use http://localhost:5173 on this machine, serve HTTPS (e.g. vite --host with TLS), or use your HTTPS deployment.',
    )
  }

  throw new PrivateShareError(
    'unsupported',
    'Web Crypto is not available here, so private links cannot be created or opened. Try another browser or update.',
  )
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError: Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(timeoutError), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timeoutId)
        resolve(value)
      },
      (err) => {
        clearTimeout(timeoutId)
        reject(err)
      },
    )
  })
}

async function compressWithFormat(data: Uint8Array, format: 'deflate-raw' | 'gzip'): Promise<Uint8Array> {
  const stream = new CompressionStream(format)
  const writer = stream.writable.getWriter()
  await writer.write(data as BufferSource)
  await writer.close()
  const buf = await new Response(stream.readable).arrayBuffer()
  return new Uint8Array(buf)
}

async function compressPayload(data: Uint8Array): Promise<{ bytes: Uint8Array; kind: CompressionKind }> {
  let best: { bytes: Uint8Array; kind: CompressionKind } = { bytes: data, kind: COMPRESSION_NONE }

  if (typeof CompressionStream === 'undefined') {
    return best
  }

  const tryFormat = async (format: 'deflate-raw' | 'gzip', kind: CompressionKind) => {
    try {
      const out = await withTimeout(
        compressWithFormat(data, format),
        STREAM_OPERATION_TIMEOUT_MS,
        new Error('Compression stream timed out'),
      )
      if (out.length < best.bytes.length) {
        best = { bytes: out, kind }
      }
    } catch {
      /* try next format */
    }
  }

  await tryFormat('deflate-raw', COMPRESSION_DEFLATE_RAW)
  await tryFormat('gzip', COMPRESSION_GZIP)

  return best
}

async function decompressPayload(data: Uint8Array, kind: CompressionKind): Promise<Uint8Array> {
  if (kind === COMPRESSION_NONE) return data
  if (kind !== COMPRESSION_DEFLATE_RAW && kind !== COMPRESSION_GZIP) {
    throw new PrivateShareError('invalid', 'This share link is damaged and could not be opened.')
  }
  if (typeof DecompressionStream === 'undefined') {
    throw new PrivateShareError('unsupported', 'This link uses compression that your browser cannot decode.')
  }
  const format: 'deflate-raw' | 'gzip' = kind === COMPRESSION_DEFLATE_RAW ? 'deflate-raw' : 'gzip'
  try {
    return await withTimeout(
      (async () => {
        const stream = new DecompressionStream(format)
        const writer = stream.writable.getWriter()
        await writer.write(data as BufferSource)
        await writer.close()
        const buf = await new Response(stream.readable).arrayBuffer()
        return new Uint8Array(buf)
      })(),
      STREAM_OPERATION_TIMEOUT_MS,
      new Error('Decompression stream timed out'),
    )
  } catch {
    throw new PrivateShareError('invalid', 'This share link is damaged and could not be opened.')
  }
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
  const code = typeof rec.code === 'string' ? rec.code : typeof rec.c === 'string' ? rec.c : undefined
  if (rec.v !== INNER_JSON_VERSION || code === undefined) {
    throw new PrivateShareError('invalid', 'This share link is not compatible with this version of Mermalaid.')
  }
  return { code }
}

/**
 * Builds `#v1.<base64url(packet)>` for the current origin/path; caller should set `location` appropriately.
 */
export async function encodePrivateShareHash(state: ShareableEditorState): Promise<string> {
  throwIfWebCryptoUnavailableForPrivateShare()

  const json = JSON.stringify({ v: INNER_JSON_VERSION, c: state.code })
  const plain = new TextEncoder().encode(json)
  const { bytes: body, kind: compressionKind } = await compressPayload(plain)

  const key = getRandomBytes(PACKET_KEY_LEN)
  const iv = getRandomBytes(GCM_IV_LENGTH)
  let cryptoKey: CryptoKey
  try {
    cryptoKey = await withTimeout(
      crypto.subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['encrypt']),
      CRYPTO_OPERATION_TIMEOUT_MS,
      new Error('Web Crypto importKey timed out'),
    )
  } catch {
    throw new PrivateShareError(
      'unsupported',
      'Could not create a private link because Web Crypto timed out. Refresh the page and try again.',
    )
  }

  const flags = compressionKind
  let ciphertext: Uint8Array
  try {
    ciphertext = new Uint8Array(
      await withTimeout(
        crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv as BufferSource },
          cryptoKey,
          body as BufferSource,
        ),
        CRYPTO_OPERATION_TIMEOUT_MS,
        new Error('Web Crypto encrypt timed out'),
      ),
    )
  } catch {
    throw new PrivateShareError(
      'unsupported',
      'Could not create a private link because encryption timed out. Refresh the page and try again.',
    )
  }

  const packet = new Uint8Array(1 + PACKET_KEY_LEN + GCM_IV_LENGTH + ciphertext.length)
  packet[0] = flags
  packet.set(key, 1)
  packet.set(iv, 1 + PACKET_KEY_LEN)
  packet.set(ciphertext, 1 + PACKET_KEY_LEN + GCM_IV_LENGTH)

  const b64 = bytesToBase64Url(packet)
  return `${PRIVATE_SHARE_URL_PREFIX}${b64}`
}

export async function decodePrivateShareHash(hash: string): Promise<ShareableEditorState> {
  throwIfWebCryptoUnavailableForPrivateShare()

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
  const compressionKindRaw = flags & COMPRESSION_KIND_MASK
  if (compressionKindRaw > COMPRESSION_GZIP) {
    throw new PrivateShareError('invalid', 'This share link is not compatible with this version of Mermalaid.')
  }
  const compressionKind = compressionKindRaw as CompressionKind
  const key = packet.subarray(1, 1 + PACKET_KEY_LEN)
  const iv = packet.subarray(1 + PACKET_KEY_LEN, 1 + PACKET_KEY_LEN + GCM_IV_LENGTH)
  const ciphertext = packet.subarray(1 + PACKET_KEY_LEN + GCM_IV_LENGTH)

  let cryptoKey: CryptoKey
  try {
    cryptoKey = await withTimeout(
      crypto.subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['decrypt']),
      CRYPTO_OPERATION_TIMEOUT_MS,
      new Error('Web Crypto importKey timed out'),
    )
  } catch {
    throw new PrivateShareError('invalid', 'This share link could not be opened because key setup timed out.')
  }

  let plain: Uint8Array
  try {
    plain = new Uint8Array(
      await withTimeout(
        crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv as BufferSource },
          cryptoKey,
          ciphertext as BufferSource,
        ),
        CRYPTO_OPERATION_TIMEOUT_MS,
        new Error('Web Crypto decrypt timed out'),
      ),
    )
  } catch {
    throw new PrivateShareError('invalid', 'This share link is damaged or was changed and could not be opened.')
  }

  const jsonBytes = await decompressPayload(plain, compressionKind)
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

/**
 * Puts the full share URL in the address bar without reloading. Use when the system clipboard
 * is blocked so the user can ⌘L / Ctrl+L then ⌘C / Ctrl+C.
 */
export function applyPrivateShareFullUrlToHistory(fullUrl: string): void {
  const u = new URL(fullUrl)
  history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`)
}

export function assertPrivateShareUrlFits(fullUrl: string): void {
  if (fullUrl.length > PRIVATE_SHARE_BROWSER_MAX_URL_LENGTH) {
    throw new PrivateShareError(
      'oversized',
      'This diagram is too large to share as a link for this browser. Try shortening the code, splitting it into smaller diagrams, or exporting as SVG. You can also select specific blocks to share.',
    )
  }
  if (fullUrl.length > PRIVATE_SHARE_MESSAGING_SAFE_MAX_URL_LENGTH) {
    throw new PrivateShareError(
      'oversized',
      'This link is too long for common chat apps (including Slack), which usually reject URLs above about 4,000 characters. Try shortening the diagram, export as SVG or PNG, or use Copy Code to paste the Mermaid source into chat instead of a link.',
    )
  }
}
