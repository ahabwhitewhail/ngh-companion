// Playing cards for Never Going Home (pp.6–8, 60–65).
// A card id looks like "10H", "AS", "XR" (red joker), "XB" (black joker); a second deck adds "~2".

export type Suit = 'S' | 'C' | 'H' | 'D'
export const SUITS: Suit[] = ['S', 'C', 'H', 'D']
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const
export const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', C: '♣', H: '♥', D: '♦' }

export interface DeckOptions { decks: 1 | 2; jokers: boolean }

export function buildDeck(o: DeckOptions): string[] {
  const out: string[] = []
  for (let d = 1; d <= o.decks; d++) {
    const sfx = d === 1 ? '' : `~${d}`
    for (const s of SUITS) for (const r of RANKS) out.push(`${r}${s}${sfx}`)
    if (o.jokers) out.push(`XR${sfx}`, `XB${sfx}`)
  }
  return out
}

export interface CardInfo { id: string; rank: string; suit: Suit | null; joker: 'red' | 'black' | null; red: boolean; value: number; face: boolean; deckNo: number }

export function info(id: string): CardInfo {
  const [base, d] = id.split('~')
  const deckNo = d ? Number(d) : 1
  if (base === 'XR' || base === 'XB') {
    const red = base === 'XR'
    return { id, rank: 'Joker', suit: null, joker: red ? 'red' : 'black', red, value: 15, face: false, deckNo }
  }
  const suit = base.slice(-1) as Suit
  const rank = base.slice(0, -1)
  const value = RANKS.indexOf(rank as (typeof RANKS)[number]) + 2
  return { id, rank, suit, joker: null, red: suit === 'H' || suit === 'D', value, face: ['J', 'Q', 'K', 'A'].includes(rank), deckNo }
}

export const label = (id: string) => {
  const c = info(id)
  return c.joker ? (c.red ? 'Joker ●' : 'Joker ○') : `${c.rank}${SUIT_SYMBOL[c.suit!]}`
}

/** Fair random integer in [0, n) from the platform's crypto source. */
export function randInt(n: number): number {
  const buf = new Uint32Array(1)
  const limit = Math.floor(0x1_0000_0000 / n) * n
  let x: number
  do { crypto.getRandomValues(buf); x = buf[0] } while (x >= limit)
  return x % n
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/** Initiative value: ranks 2–14 (Ace high). A joker is wild, so it counts as an Ace. */
export const initiativeValue = (id: string) => Math.min(info(id).value, 14)
export const valueLabel = (v: number) => (v <= 10 ? String(v) : ['J', 'Q', 'K', 'A'][v - 11])

/** Pips for Star / Holiday: face cards count as 10, ace as 1. */
export const pipValue = (id: string) => { const c = info(id); if (c.joker) return 0; if (c.rank === 'A') return 1; return c.face ? 10 : c.value }

// ---- Character growth with cards (p.27–28) ----
export type GrowthTarget =
  | { kind: 'attr'; key: string; newRank: number }
  | { kind: 'pip'; key: string; newPip: number }
  | { kind: 'skill'; key: string; extraIndex: number }

export function growthCheck(cards: string[], target: GrowthTarget) {
  const infos = cards.map(info)
  // A joker is wild: it can stand in for any card, so it never breaks a suit or colour rule.
  const real = infos.filter(c => !c.joker)
  const base = target.kind === 'attr' ? 1 + target.newRank : target.kind === 'pip' ? 1 + target.newPip : 1 + target.extraIndex
  const sameSuit = cards.length > 0 && real.every(c => c.suit === real[0]?.suit)
  const allFace = cards.length > 0 && infos.every(c => c.joker || c.face)
  const allRed = infos.every(c => c.joker || c.red)
  const problems: string[] = []
  if (target.kind === 'attr' && !allRed) problems.push('needRed')
  // Same suit: you still need the full set, but keep one card of your choice.
  const enough = cards.length >= base
  if (!enough) problems.push('notEnough')
  return { base, sameSuit, allFace, ok: problems.length === 0, problems, keepOne: sameSuit && cards.length >= 2, bonus: allFace ? 1 : 0 }
}

/** Journey themes by suit (p.6). */
export const SUIT_THEME: Record<Suit, string> = { S: 'themeS', C: 'themeC', H: 'themeH', D: 'themeD' }
