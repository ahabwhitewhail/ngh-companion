// Every action on cards, rolls, Initiative and Journey as plain data.
// The same reducer runs on a solo device and on the Narrator's device for the whole table,
// so a player's tap and the Narrator's tap follow exactly the same rules.
import { info, initiativeValue, shuffle } from './cards'
import { corruptionDraw, drawToHand, playFromHand, rebuildDeck, revealTop, shuffleDiscards, type CorruptionResult } from './deckOps'
import type { RollRecord } from './dice'
import { applySets, status, uid, type AppData } from './store'

type Vars = Record<string, string | number>

export type Op =
  | { t: 'draw'; char: string; n: number; reason?: 'logDraw' | 'logReward' }
  /** Spend cards from a hand. `sets` are tracked values applied to the soldier afterwards (healing, growth). */
  | { t: 'play'; char: string; cards: string[]; reason: string; vars?: Vars; sets?: [string, number][] }
  | { t: 'corruption'; char: string }
  | { t: 'reveal' }
  | { t: 'whisperDeck'; char: string }
  | { t: 'shuffle' }
  | { t: 'rebuild'; decks: 1 | 2; jokers: boolean }
  | { t: 'initShow'; char: string; card: string | null }
  | { t: 'initDeck'; char: string }
  | { t: 'initNpc'; name: string; value: number }
  | { t: 'initRemove'; id: string }
  | { t: 'initClear' }
  | { t: 'jPick'; char: string; cards: string[] }
  | { t: 'jDeal'; req: string; avoid: string; extra: number; narr: number; seats: string[] }
  | { t: 'jReveal'; i: number }
  | { t: 'jFinish' }
  | { t: 'adjust'; char: string; sets: [string, number][] }
  | { t: 'rollPut'; rec: RollRecord }
  | { t: 'rollsClear' }

/** Ops only the Narrator (or a solo device) may send. */
export const HOST_ONLY: Op['t'][] = ['reveal', 'shuffle', 'rebuild', 'initNpc', 'initRemove', 'initClear', 'jDeal', 'jFinish', 'adjust', 'rollsClear']

/** to: 'actor' = whoever sent the op; a soldier id = that soldier's player; 'all' = everyone at the table. */
export type Ev =
  | { to: string; kind: 'toast'; key: string; vars?: Vars }
  | { to: string; kind: 'corr'; r: CorruptionResult; who: string }
  | { to: string; kind: 'card'; card: string }

const ROLL_LIMIT = 60
const nameOf = (d: AppData, id: string) => d.characters.find(c => c.id === id)?.name || '—'
const has = (d: AppData, char: string, cards: string[]) => {
  const c = d.characters.find(x => x.id === char)
  return !!c && cards.every(x => c.hand.includes(x))
}

function corrFor(d: AppData, char: string, ev: Ev[]): AppData {
  const r = corruptionDraw(d, char)
  ev.push({ to: char, kind: 'corr', r, who: nameOf(d, char) })
  return r.d
}

export function applyOp(d: AppData, op: Op): { d: AppData; ev: Ev[] } {
  const ev: Ev[] = []
  switch (op.t) {
    case 'draw': {
      const r = drawToHand(d, op.char, op.n, op.reason ?? 'logDraw')
      if (r.blocked) ev.push({ to: 'actor', kind: 'toast', key: 'handFull', vars: { n: r.blocked } })
      else if (!r.drawn.length) ev.push({ to: 'actor', kind: 'toast', key: 'deckEmpty' })
      return { d: r.d, ev }
    }
    case 'play': {
      if (!op.cards.length || !has(d, op.char, op.cards)) return { d, ev }
      const r = playFromHand(d, op.char, op.cards, op.reason, op.vars)
      let out = r.d
      if (op.sets?.length) out = { ...out, characters: out.characters.map(c => (c.id === op.char ? applySets(c, op.sets!) : c)) }
      if (r.blackJoker) { ev.push({ to: op.char, kind: 'toast', key: 'corrBlackJoker' }); out = corrFor(out, op.char, ev) }
      else if (r.joker) ev.push({ to: 'actor', kind: 'toast', key: 'logJoker' })
      return { d: out, ev }
    }
    case 'corruption':
      return { d: corrFor(d, op.char, ev), ev }
    case 'reveal': {
      const r = revealTop(d)
      if (r.card) ev.push({ to: 'actor', kind: 'card', card: r.card })
      else ev.push({ to: 'actor', kind: 'toast', key: 'deckEmpty' })
      return { d: r.d, ev }
    }
    case 'whisperDeck': {
      const r = revealTop(d, 'logWhisperCost', { who: nameOf(d, op.char) })
      let out = r.d
      if (r.card && !info(r.card).red) { ev.push({ to: op.char, kind: 'toast', key: 'blackFromDeck' }); out = corrFor(out, op.char, ev) }
      return { d: out, ev }
    }
    case 'shuffle':
      return { d: shuffleDiscards(d), ev }
    case 'rebuild':
      return { d: { ...rebuildDeck(d, op.decks, op.jokers), journey: null, journeyPicks: {} }, ev }

    case 'initShow': {
      const rest = d.initiative.filter(e => !(e.kind === 'pc' && e.ref === op.char))
      if (op.card && !has(d, op.char, [op.card])) return { d, ev }
      const initiative = op.card
        ? [...rest, { id: uid(), kind: 'pc' as const, ref: op.char, name: nameOf(d, op.char), card: op.card, value: initiativeValue(op.card) }]
        : rest
      return { d: { ...d, initiative }, ev }
    }
    case 'initDeck': {
      const r = revealTop(d, 'logInit', { who: nameOf(d, op.char) })
      if (!r.card) return { d, ev }
      const e = { id: uid(), kind: 'pc' as const, ref: op.char, name: nameOf(d, op.char), card: r.card, value: initiativeValue(r.card) }
      return { d: { ...r.d, initiative: [...r.d.initiative.filter(x => !(x.kind === 'pc' && x.ref === op.char)), e] }, ev }
    }
    case 'initNpc':
      return { d: { ...d, initiative: [...d.initiative, { id: uid(), kind: 'npc', ref: '', name: op.name, card: null, value: op.value }] }, ev }
    case 'initRemove':
      return { d: { ...d, initiative: d.initiative.filter(e => e.id !== op.id) }, ev }
    case 'initClear':
      return { d: { ...d, initiative: [] }, ev }

    case 'jPick': {
      if (!has(d, op.char, op.cards)) return { d, ev }
      return { d: { ...d, journeyPicks: { ...d.journeyPicks, [op.char]: op.cards } }, ev }
    }
    case 'jDeal': {
      if (d.journey) return { d, ev }
      const active = d.characters.filter(c => op.seats.includes(c.id) && status(c) === 'active')
      const missing = active.find(c => c.hand.length > 0 && !(d.journeyPicks[c.id] ?? []).some(x => c.hand.includes(x)))
      if (missing) { ev.push({ to: 'actor', kind: 'toast', key: 'jNeedOne', vars: { who: missing.name || '—' } }); return { d, ev } }
      let out = d
      const pool: { card: string; from: string }[] = []
      const take = () => { const r = out.deck.draw[0]; if (r) { out = { ...out, deck: { ...out.deck, draw: out.deck.draw.slice(1) } }; pool.push({ card: r, from: '' }) } }
      for (const c of active) {
        const mine = (d.journeyPicks[c.id] ?? []).filter(x => c.hand.includes(x))
        if (mine.length) {
          out = { ...out, characters: out.characters.map(x => (x.id === c.id ? { ...x, hand: x.hand.filter(h => !mine.includes(h)) } : x)) }
          mine.forEach(card => pool.push({ card, from: c.id }))
        } else take()
      }
      for (let i = 0; i < op.extra + op.narr; i++) take()
      const dealt = shuffle(pool).map((p, i) => ({ to: i < active.length ? active[i].id : 'narrator', card: p.card, revealed: false }))
      const black = pool.find(p => p.card.startsWith('XB'))
      if (black) ev.push({ to: 'actor', kind: 'toast', key: 'jBlack' })
      return { d: { ...out, deck: { ...out.deck, table: [...out.deck.table, ...dealt.map(x => x.card)] }, journey: { req: op.req, avoid: op.avoid, dealt }, journeyPicks: {} }, ev }
    }
    case 'jReveal': {
      if (!d.journey) return { d, ev }
      return { d: { ...d, journey: { ...d.journey, dealt: d.journey.dealt.map((x, k) => (k === op.i ? { ...x, revealed: !x.revealed } : x)) } }, ev }
    }
    case 'jFinish': {
      if (!d.journey) return { d, ev }
      const cards = d.journey.dealt.map(x => x.card)
      let deck = { ...d.deck, table: d.deck.table.filter(x => !cards.includes(x)) }
      const jokers = cards.filter(x => info(x).joker)
      deck = { ...deck, discard: [...deck.discard, ...cards.filter(x => !info(x).joker)] }
      if (jokers.length) deck = { ...deck, draw: shuffle([...deck.draw, ...jokers]) }
      deck = { ...deck, log: [...deck.log, { t: Date.now(), text: 'logJourney', cards }, ...(jokers.length ? [{ t: Date.now(), text: 'logJoker' }] : [])].slice(-80) }
      return { d: { ...d, deck, journey: null }, ev }
    }

    case 'adjust':
      return { d: { ...d, characters: d.characters.map(c => (c.id === op.char ? applySets(c, op.sets) : c)) }, ev }
    case 'rollPut': {
      const i = d.rolls.findIndex(r => r.id === op.rec.id)
      const rolls = i >= 0 ? d.rolls.map(r => (r.id === op.rec.id ? { ...op.rec, t: r.t } : r)) : [...d.rolls, op.rec].slice(-ROLL_LIMIT)
      return { d: { ...d, rolls }, ev }
    }
    case 'rollsClear':
      return { d: { ...d, rolls: [] }, ev }
  }
}
