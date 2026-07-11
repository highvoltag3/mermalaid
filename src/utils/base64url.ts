/** base64url encoding for browser byte arrays (shared by the share-link utils). */

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  // Chunk the spread into fromCharCode so a large array can't overflow the stack.
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlToBytes(s: string): Uint8Array {
  const padLen = (4 - (s.length % 4)) % 4
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
  const bin = atob(padded)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}
