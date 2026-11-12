// Table codes. Kept apart from table.ts so the network code loads only when a table is used.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newCode(): string {
  const buf = new Uint32Array(6)
  crypto.getRandomValues(buf)
  return Array.from(buf, x => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('')
}
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

