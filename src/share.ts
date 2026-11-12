// Share one soldier as a link or QR code: the record (without change log and cards) is
// compressed into the link's #s= part, so nothing goes through a server.
import { normalize, type Character } from './store'

export const SITE = 'https://ahabwhitewhail.github.io/ngh-companion/'

const toB64u = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0))

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

export async function soldierToken(c: Character): Promise<string> {
  const slim: Partial<Character> = { ...c, history: [], hand: [], example: false, remote: undefined }
  const bytes = new TextEncoder().encode(JSON.stringify(slim))
  try { return 'z' + toB64u(await pipe(bytes, new CompressionStream('deflate-raw'))) } catch { return 'r' + toB64u(bytes) }
}

export async function tokenToSoldier(token: string): Promise<Character | null> {
  try {
    let bytes = fromB64u(token.slice(1))
    if (token[0] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'))
    else if (token[0] !== 'r') return null
    return normalize(JSON.parse(new TextDecoder().decode(bytes)))
  } catch { return null }
}

/** Accepts a whole link, a bare token, or text containing a link. */
export function tokenFrom(text: string): string | null {
  const m = text.match(/#s=([A-Za-z0-9_-]+)/) ?? text.trim().match(/^([zr][A-Za-z0-9_-]{20,})$/)
  return m ? m[1] : null
}

export const soldierLink = (token: string) => `${SITE}#s=${token}`
