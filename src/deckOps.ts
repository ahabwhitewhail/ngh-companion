// Deck operations. Each takes the whole app state and returns a new one, so cards never duplicate or vanish.
import { buildDeck, info, shuffle } from './cards'
import { HAND_MAX } from './rules'
import { setTracked, type AppData, type Character, type DeckEvent, type DeckState } from './store'

const LOG_LIMIT = 80

function pushLog(deck: DeckState, e: Omit<DeckEvent, 't'>): DeckState {
  const log = [...deck.log, { t: Date.now(), ...e }]
  return { ...deck, log: log.slice(-LOG_LIMIT) }
}
const nameOf = (d: AppData, id: string | null) => d.characters.find(c => c.id === id)?.name || ''
const withChar = (d: AppData, id: string, f: (c: Character) => Character): AppData =>
  ({ ...d, characters: d.characters.map(c => (c.id === id ? f(c) : c)) })

/** Take the top card; when the draw pile is empty, the discards are shuffled back in first. */
function takeTop(deck: DeckState): { deck: DeckState; card: string | null; reshuffled: boolean } {
  let reshuffled = false
  if (deck.draw.length === 0 && deck.discard.length > 0) {
    deck = { ...deck, draw: shuffle(deck.discard), discard: [] }
    reshuffled = true
  }
  if (deck.draw.length === 0) return { deck, card: null, reshuffled }
  const [card, ...rest] = deck.draw
  return { deck: { ...deck, draw: rest }, card, reshuffled }
}

/** A joker that is played or revealed goes back into the deck, and the deck is shuffled (p.7). */
function returnJoker(deck: DeckState, card: string): DeckState {
  return { ...deck, draw: shuffle([...deck.draw, card]), discard: deck.discard.filter(x => x !== card), table: deck.table.filter(x => x !== card) }
}

export interface DrawResult { d: AppData; drawn: string[]; blocked: number; reshuffled: boolean }

export function drawToHand(d: AppData, charId: string, n: number, reason = 'logDraw'): DrawResult {
  const c = d.characters.find(x => x.id === charId)
  if (!c) return { d, drawn: [], blocked: n, reshuffled: false }
  const room = Math.max(0, HAND_MAX - c.hand.length)
  const want = Math.min(n, room)
  let deck = d.deck, reshuffled = false
  const drawn: string[] = []
  for (let i = 0; i < want; i++) {
    const r = takeTop(deck); deck = r.deck; reshuffled ||= r.reshuffled
    if (!r.card) break
    drawn.push(r.card)
  }
  if (reshuffled) deck = pushLog(deck, { text: 'logReshuffle' })
  if (drawn.length) deck = pushLog(deck, { text: reason, vars: { who: c.name || '—', n: drawn.length }, cards: drawn })
  const out = withChar({ ...d, deck }, charId, x => ({ ...x, hand: [...x.hand, ...drawn] }))
  return { d: out, drawn, blocked: n - want, reshuffled }
}

export interface PlayResult { d: AppData; joker: boolean; blackJoker: boolean }

/** Spend cards from a hand (discard). Jokers go back into the deck. */
export function playFromHand(d: AppData, charId: string, cards: string[], reason: string, vars: Record<string, string | number> = {}): PlayResult {
  const set = new Set(cards)
  let deck: DeckState = { ...d.deck, discard: [...d.deck.discard, ...cards] }
  let joker = false, blackJoker = false
  for (const id of cards) {
    const ci = info(id)
    if (ci.joker) { joker = true; if (ci.joker === 'black') blackJoker = true; deck = returnJoker(deck, id) }
  }
  deck = pushLog(deck, { text: reason, vars: { who: nameOf(d, charId) || '—', ...vars }, cards })
  if (joker) deck = pushLog(deck, { text: 'logJoker' })
  const out = withChar({ ...d, deck }, charId, c => ({ ...c, hand: c.hand.filter(x => !set.has(x)) }))
  return { d: out, joker, blackJoker }
}

/** Reveal the top card to the table (Narrator draw, Initiative from the deck, Journey filler). */
export function revealTop(d: AppData, reason = 'logReveal', vars: Record<string, string | number> = {}): { d: AppData; card: string | null; joker: boolean } {
  const r = takeTop(d.deck)
  if (!r.card) return { d, card: null, joker: false }
  let deck = r.deck
  if (r.reshuffled) deck = pushLog(deck, { text: 'logReshuffle' })
  const joker = !!info(r.card).joker
  deck = joker ? returnJoker(deck, r.card) : { ...deck, discard: [...deck.discard, r.card] }
  deck = pushLog(deck, { text: reason, vars, cards: [r.card] })
  if (joker) deck = pushLog(deck, { text: 'logJoker' })
  return { d: { ...d, deck }, card: r.card, joker }
}

export interface CorruptionResult { d: AppData; card: string | null; jokers: string[]; gained: boolean }

/** Draw for Corruption (p.8, p.65): jokers are revealed, shuffled back and redrawn; black card = +1 Corruption. */
export function corruptionDraw(d: AppData, charId: string): CorruptionResult {
  let deck = d.deck
  const jokers: string[] = []
  for (let guard = 0; guard < 10; guard++) {
    const r = takeTop(deck); deck = r.deck
    if (r.reshuffled) deck = pushLog(deck, { text: 'logReshuffle' })
    if (!r.card) return { d: { ...d, deck }, card: null, jokers, gained: false }
    if (info(r.card).joker) { jokers.push(r.card); deck = returnJoker(deck, r.card); continue }
    const gained = !info(r.card).red
    deck = { ...deck, discard: [...deck.discard, r.card] }
    const c = d.characters.find(x => x.id === charId)!
    // The card is secret: the log does not show it when the soldier hides Corruption.
    deck = pushLog(deck, c.corruptionHidden
      ? { text: 'logCorrHidden', vars: { who: c.name || '—' } }
      : { text: gained ? 'logCorrYes' : 'logCorrNo', vars: { who: c.name || '—' }, cards: [r.card] })
    let out: AppData = { ...d, deck }
    if (gained) out = withChar(out, charId, x => setTracked(x, 'corruption', x.corruption + 1))
    return { d: out, card: r.card, jokers, gained }
  }
  return { d: { ...d, deck }, card: null, jokers, gained: false }
}

/** End of Mission: all discards (and table cards) are shuffled back into the deck (p.60). */
export function shuffleDiscards(d: AppData): AppData {
  const deck = { ...d.deck, draw: shuffle([...d.deck.draw, ...d.deck.discard, ...d.deck.table]), discard: [], table: [] }
  return { ...d, deck: pushLog(deck, { text: 'logShuffle' }) }
}

/** Build a fresh deck. All hands are emptied. */
export function rebuildDeck(d: AppData, decks: 1 | 2, jokers: boolean): AppData {
  const deck: DeckState = { decks, jokers, draw: shuffle(buildDeck({ decks, jokers })), discard: [], table: [], log: [] }
  return { ...d, deck: pushLog(deck, { text: 'logNewDeck', vars: { n: deck.draw.length } }), characters: d.characters.map(c => ({ ...c, hand: [] })), initiative: [] }
}

/** Move a soldier's hand to the discard pile (record deleted, soldier died or left). */
export function discardHand(d: AppData, charId: string): AppData {
  const c = d.characters.find(x => x.id === charId)
  if (!c || c.hand.length === 0) return d
  return playFromHand(d, charId, c.hand, 'logHandGone').d
}

export function where(d: AppData, card: string): { kind: 'draw' | 'discard' | 'table' | 'hand'; who?: string } {
  if (d.deck.discard.includes(card)) return { kind: 'discard' }
  if (d.deck.table.includes(card)) return { kind: 'table' }
  const c = d.characters.find(x => x.hand.includes(card))
  if (c) return { kind: 'hand', who: c.name }
  return { kind: 'draw' }
}
