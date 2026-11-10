import { ATTRS, SKILLS, type AttrKey, type SkillKey } from './rules'
import type { Lang } from './i18n'
import { buildDeck, shuffle } from './cards'
import type { RollRecord } from './dice'

export interface Whisper { id: string; path: string; dice: number; rituals: string[] }
export interface Weapon { id: string; type: string; name: string }
export interface HistoryEntry { t: number; key: string; from: number; to: number }
export type Status = 'active' | 'dead' | 'lost'

export interface Character {
  v: 1
  id: string
  example?: boolean
  name: string
  nationality: string
  rank: string
  unit: string
  attrs: Record<AttrKey, { max: number; cur: number }>
  armor: number
  skills: Record<SkillKey, { trained: boolean; dice: number }>
  whispers: Whisper[]
  corruption: number
  corruptionHidden: boolean
  weapons: Weapon[]
  gear: string
  serviceRecord: string
  personalHistory: string
  notes: string
  missions: number
  recruitCheck: boolean
  hand: string[]
  /** Set on the Narrator's device for soldiers who belong to players at the table. */
  remote?: { owner: string }
  history: HistoryEntry[]
  createdAt: number
  updatedAt: number
}

export interface Settings { lang: Lang; theme: 'system' | 'light' | 'dark'; textSize: number; origTerms: boolean }
/** char: who it concerns; priv: cards are private to that soldier; secret: Corruption result, private to soldier and Narrator. */
export interface DeckEvent { t: number; text: string; vars?: Record<string, string | number>; cards?: string[]; char?: string; priv?: boolean; secret?: boolean }
export interface DeckState { decks: 1 | 2; jokers: boolean; draw: string[]; discard: string[]; table: string[]; log: DeckEvent[] }
export interface InitEntry { id: string; kind: 'pc' | 'npc'; ref: string; name: string; card: string | null; value: number }
export interface AppData {
  v: 1; characters: Character[]; settings: Settings; seeded: boolean
  activeId: string | null
  deck: DeckState
  rolls: RollRecord[]
  initiative: InitEntry[]
  journey: Journey | null
  journeyPicks: Record<string, string[]>
}
export interface Journey { req: string; avoid: string; dealt: { to: string; card: string; revealed: boolean }[] }

export function newDeck(decks: 1 | 2 = 1, jokers = true): DeckState {
  return { decks, jokers, draw: shuffle(buildDeck({ decks, jokers })), discard: [], table: [], log: [] }
}

const STORAGE_KEY = 'ngh-companion.v1'
const HISTORY_LIMIT = 300
const MERGE_MS = 4000

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function blankCharacter(defaultGear: string): Character {
  const now = Date.now()
  const skills = {} as Character['skills']
  for (const s of SKILLS) skills[s.key] = { trained: false, dice: 0 }
  const attrs = {} as Character['attrs']
  for (const a of ATTRS) attrs[a] = { max: 1, cur: 1 }
  return {
    v: 1, id: uid(), name: '', nationality: '', rank: '', unit: '',
    attrs, armor: 0, skills, whispers: [], corruption: 0, corruptionHidden: false,
    weapons: [], gear: defaultGear, serviceRecord: '', personalHistory: '', notes: '',
    missions: 0, recruitCheck: true, hand: [], history: [{ t: now, key: 'created', from: 0, to: 0 }],
    createdAt: now, updatedAt: now,
  }
}

/** A filled example so the app opens in a working state. Clearly marked; deletable. */
export function exampleCharacter(lang: Lang): Character {
  const c = blankCharacter(lang === 'ru'
    ? 'Шанцевый инструмент, нож, котелок, паёк, противогаз. Пачка писем из дома, перевязанная бечёвкой.'
    : 'Entrenching tool, knife, mess kit, rations, gas mask. A bundle of letters from home tied with string.')
  const t0 = Date.now() - 1000 * 60 * 90
  Object.assign(c, {
    example: true,
    name: lang === 'ru' ? 'Артур Пенхаллоу' : 'Arthur Penhallow',
    nationality: 'britain',
    rank: lang === 'ru' ? 'Рядовой' : 'Private',
    unit: lang === 'ru' ? '9-й Корнуолльский, рота «C»' : '9th Cornwalls, C Company',
    missions: 2,
    recruitCheck: false,
    corruption: 2,
    serviceRecord: lang === 'ru'
      ? 'Миссия 1: Делвилль-Вуд, вынес раненого из воронки.\nМиссия 2: сопровождение обоза к Альберу.'
      : 'Mission 1: Delville Wood, carried a wounded man out of a shell crater.\nMission 2: escorted a supply column to Albert.',
    personalHistory: lang === 'ru'
      ? 'Сын рыбака из Сент-Айвса. Сестра Нелл пишет каждую неделю. С июля слышит шёпот в шуме прибоя, которого здесь нет.'
      : 'A fisherman’s son from St Ives. His sister Nell writes every week. Since July he hears whispering in surf that is not there.',
    createdAt: t0,
  })
  c.attrs = { brawn: { max: 4, cur: 3 }, smarts: { max: 3, cur: 3 }, guts: { max: 3, cur: 2 } }
  c.skills.ranged = { trained: true, dice: 2 }
  c.skills.athletics = { trained: true, dice: 0 }
  const w: Whisper = { id: uid(), path: 'oldWays', dice: 1, rituals: ['wolfsHead'] }
  c.whispers = [w]
  c.weapons = [{ id: uid(), type: 'rifle', name: '' }, { id: uid(), type: 'knife', name: '' }]
  c.history = [
    { t: t0, key: 'created', from: 0, to: 0 },
    { t: t0 + 60_000 * 20, key: 'corruption', from: 1, to: 2 },
    { t: t0 + 60_000 * 41, key: 'attr.brawn.cur', from: 4, to: 3 },
    { t: t0 + 60_000 * 63, key: 'attr.guts.cur', from: 3, to: 2 },
  ]
  return c
}

export function defaultSettings(): Settings {
  let lang: Lang = 'ru'
  try { if (!navigator.language.toLowerCase().startsWith('ru')) lang = 'en' } catch { /* keep ru */ }
  return { lang, theme: 'system', textSize: 100, origTerms: true }
}

export function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const d = JSON.parse(raw) as AppData
      if (d && d.v === 1 && Array.isArray(d.characters)) {
        d.settings = { ...defaultSettings(), ...d.settings }
        d.characters = d.characters.map(normalize).filter(Boolean) as Character[]
        const p = d as Partial<AppData>
        return repairDeck({ ...d, activeId: p.activeId ?? null, rolls: p.rolls ?? [], initiative: p.initiative ?? [], journey: p.journey ?? null, journeyPicks: p.journeyPicks ?? {}, deck: p.deck ?? newDeck() })
      }
    }
  } catch { /* storage unavailable or corrupt: start fresh */ }
  const settings = defaultSettings()
  const deck = newDeck()
  const ex = exampleCharacter(settings.lang)
  ex.hand = deck.draw.splice(0, 4)
  return { v: 1, characters: [ex], settings, seeded: true, activeId: ex.id, deck, rolls: [], initiative: [], journey: null, journeyPicks: {} }
}

/** Every card must live in exactly one place: draw pile, discard, table or a hand. */
export function repairDeck(d: AppData): AppData {
  const all = buildDeck({ decks: d.deck.decks, jokers: d.deck.jokers })
  const valid = new Set(all), seen = new Set<string>()
  const keep = (arr: string[]) => arr.filter(id => valid.has(id) && !seen.has(id) && (seen.add(id), true))
  const characters = d.characters.map(c => ({ ...c, hand: keep(c.hand ?? []) }))
  const discard = keep(d.deck.discard), table = keep(d.deck.table ?? [])
  const draw = keep(d.deck.draw)
  const missing = all.filter(id => !seen.has(id))
  return { ...d, characters, deck: { ...d.deck, table, discard, draw: [...draw, ...shuffle(missing)], log: d.deck.log ?? [] } }
}

export function save(d: AppData): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); return true } catch { return false }
}

/** Fill in any missing fields so older or imported records keep working. */
export function normalize(x: unknown): Character | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Partial<Character>
  if (!o.attrs || !o.skills) return null
  const base = blankCharacter('')
  const c: Character = { ...base, ...o, v: 1 } as Character
  for (const a of ATTRS) {
    const v = o.attrs[a]
    const max = clamp(Number(v?.max) || 1, 1, 20)
    c.attrs[a] = { max, cur: clamp(Number(v?.cur ?? max), 0, max) }
  }
  for (const s of SKILLS) {
    const v = (o.skills as Character['skills'])[s.key]
    c.skills[s.key] = { trained: !!v?.trained, dice: clamp(Number(v?.dice) || 0, 0, 5) }
  }
  c.whispers = (o.whispers ?? []).map(w => ({ id: w.id || uid(), path: w.path || '', dice: clamp(Number(w.dice) || 0, 0, 5), rituals: Array.isArray(w.rituals) ? w.rituals : [] }))
  c.weapons = (o.weapons ?? []).map(w => ({ id: w.id || uid(), type: w.type || 'custom', name: w.name || '' }))
  c.history = Array.isArray(o.history) ? o.history : []
  c.hand = Array.isArray(o.hand) ? o.hand.filter(x => typeof x === 'string') : []
  c.corruption = clamp(Number(o.corruption) || 0, 0, 5)
  return c
}

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// ---- tracked numeric/boolean fields, addressed by key ----
// attr.<a>.cur | attr.<a>.max | skill.<s>.dice | skill.<s>.trained | wh.<id>.dice | corruption | armor | missions

export function getVal(c: Character, key: string): number | undefined {
  const [kind, a, b] = key.split('.')
  if (kind === 'attr') return (c.attrs as any)[a]?.[b]
  if (kind === 'skill') { const s = (c.skills as any)[a]; return s ? (b === 'trained' ? +s.trained : s.dice) : undefined }
  if (kind === 'wh') return c.whispers.find(w => w.id === a)?.dice
  if (kind === 'corruption') return c.corruption
  if (kind === 'armor') return c.armor
  if (kind === 'missions') return c.missions
  return undefined
}

function setValRaw(c: Character, key: string, v: number) {
  const [kind, a, b] = key.split('.')
  if (kind === 'attr') {
    const at = (c.attrs as any)[a]
    if (b === 'max') { at.max = clamp(v, 1, 20); at.cur = Math.min(at.cur, at.max) }
    else at.cur = clamp(v, 0, at.max)
  } else if (kind === 'skill') {
    const s = (c.skills as any)[a]
    if (b === 'trained') { s.trained = !!v; if (!v) s.dice = 0 } else { s.dice = clamp(v, 0, 5); if (s.dice > 0) s.trained = true }
  } else if (kind === 'wh') {
    const w = c.whispers.find(x => x.id === a)
    if (w) { w.dice = clamp(v, 0, 5); if (w.rituals.length > Math.max(w.dice, 1)) w.rituals = w.rituals.slice(0, Math.max(w.dice, 1)) }
  } else if (kind === 'corruption') c.corruption = clamp(v, 0, 5)
  else if (kind === 'armor') c.armor = clamp(v, 0, 20)
  else if (kind === 'missions') c.missions = Math.max(0, v)
}

/** Set a tracked value and record it in the change log (rapid repeats on one field merge). */
export function setTracked(c: Character, key: string, v: number): Character {
  const n = structuredClone(c)
  const from = getVal(n, key)
  if (from === undefined) return c
  setValRaw(n, key, v)
  const to = getVal(n, key)!
  if (to === from) return c
  // cascade: lowering an attribute rank can lower current
  if (key.endsWith('.max')) {
    const curKey = key.replace('.max', '.cur')
    const curFrom = getVal(c, curKey)!, curTo = getVal(n, curKey)!
    if (curFrom !== curTo) log(n, curKey, curFrom, curTo)
  }
  log(n, key, from, to)
  n.updatedAt = Date.now()
  return n
}

function log(c: Character, key: string, from: number, to: number) {
  const now = Date.now()
  const last = c.history[c.history.length - 1]
  if (last && last.key === key && now - last.t < MERGE_MS) {
    last.to = to; last.t = now
    if (last.from === last.to) c.history.pop()
  } else c.history.push({ t: now, key, from, to })
  if (c.history.length > HISTORY_LIMIT) c.history.splice(0, c.history.length - HISTORY_LIMIT)
}

export const isUndoable = (e?: HistoryEntry) => !!e && e.key !== 'created' && e.key !== 'mission'

export function undoLast(c: Character): Character {
  const last = c.history[c.history.length - 1]
  if (!isUndoable(last)) return c
  const n = structuredClone(c)
  n.history.pop()
  if (getVal(n, last.key) !== undefined) setValRaw(n, last.key, last.from)
  n.updatedAt = Date.now()
  return n
}

export function endMission(c: Character): Character {
  const n = structuredClone(c)
  for (const a of ATTRS) n.attrs[a].cur = n.attrs[a].max
  n.history.push({ t: Date.now(), key: 'mission', from: n.missions, to: n.missions + 1 })
  n.missions += 1
  n.updatedAt = Date.now()
  return n
}

export function status(c: Character): Status {
  if (ATTRS.some(a => c.attrs[a].cur <= 0)) return 'dead'
  if (c.corruption >= 5) return 'lost'
  return 'active'
}

/** Counts for the recruitment check (p.24–27). Whisper Paths count as trained skills. */
export function recruitTotals(c: Character) {
  const attr = ATTRS.reduce((s, a) => s + c.attrs[a].max, 0)
  const skillsTrained = SKILLS.filter(s => c.skills[s.key].trained).length + c.whispers.filter(w => w.path).length
  const dice = SKILLS.reduce((s, k) => s + c.skills[k.key].dice, 0) + c.whispers.reduce((s, w) => s + w.dice, 0)
  return { attr, skillsTrained, dice }
}

const TRACKED_ROOT = ['corruption', 'armor', 'missions']
/** Every tracked value of a soldier as key → value (see getVal). */
export function trackedValues(c: Character): Record<string, number> {
  const out: Record<string, number> = {}
  for (const a of ATTRS) { out[`attr.${a}.max`] = c.attrs[a].max; out[`attr.${a}.cur`] = c.attrs[a].cur }
  for (const s of SKILLS) { out[`skill.${s.key}.trained`] = +c.skills[s.key].trained; out[`skill.${s.key}.dice`] = c.skills[s.key].dice }
  for (const w of c.whispers) out[`wh.${w.id}.dice`] = w.dice
  for (const k of TRACKED_ROOT) out[k] = getVal(c, k)!
  return out
}
/** Tracked values that changed from a to b, in an order that applies cleanly (ranks before current). */
export function diffTracked(a: Character, b: Character): [string, number][] {
  const va = trackedValues(a), vb = trackedValues(b)
  const keys = Object.keys(vb).filter(k => va[k] !== vb[k])
  const rank = (k: string) => (k.endsWith('.max') || k.endsWith('.trained') ? 0 : 1)
  return keys.sort((x, y) => rank(x) - rank(y)).map(k => [k, vb[k]] as [string, number])
}
export function applySets(c: Character, sets: [string, number][]): Character {
  return sets.reduce((x, [k, v]) => setTracked(x, k, v), c)
}
