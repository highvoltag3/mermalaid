/**
 * Public preview links carry the Mermaid source gzip-compressed + base64url in
 * a query param the SERVER can read (unlike the private, end-to-end-encrypted
 * `#v1.` fragment links). Used to render social/Slack unfurl previews.
 *
 * Encoding must match the client encoder in src/utils/publicShareLink.ts:
 *   c = base64url(gzip(utf8(source)))
 */
import { gunzipSync } from 'node:zlib'

/** Reject oversized encoded input before doing any work. */
const MAX_ENCODED_LENGTH = 8_000
/** Cap the decompressed source (guards against zip bombs + matches the modal cap). */
const MAX_DECODED_LENGTH = 12_000
/** Hard ceiling on gunzip output so a malicious payload can't exhaust memory. */
const MAX_OUTPUT_BYTES = 256 * 1024

export class PublicShareDecodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PublicShareDecodeError'
  }
}

/** Decode a `c` param back into Mermaid source. Throws PublicShareDecodeError on bad input. */
export function decodePublicDiagram(c: string): string {
  if (!c || c.length > MAX_ENCODED_LENGTH || !/^[A-Za-z0-9_-]+$/.test(c)) {
    throw new PublicShareDecodeError('Invalid diagram parameter')
  }

  let source: string
  try {
    const compressed = Buffer.from(c, 'base64url')
    const bytes = gunzipSync(compressed, { maxOutputLength: MAX_OUTPUT_BYTES })
    source = bytes.toString('utf8')
  } catch {
    throw new PublicShareDecodeError('Could not decode the diagram')
  }

  if (source.length > MAX_DECODED_LENGTH) {
    throw new PublicShareDecodeError('Diagram is too large')
  }
  return source
}
