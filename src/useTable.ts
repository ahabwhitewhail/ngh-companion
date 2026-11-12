import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { applyOp, HOST_ONLY, type Ev, type Op } from './ops'
import { blankCharacter, diffTracked, applySets, normalize, repairDeck, status, type AppData, type Character } from './store'
import { normalizeCode, newCode } from './tableCode'
import type { Seat, TableHost, TablePlayer, TableView } from './table'

export type Role = 'solo' | 'host' | 'player'
interface Session { role: Role; code: string; charId?: string; narrator?: string }
const SESSION_KEY = 'ngh-companion.table'

const loadSession = (): Session => {
  try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); if (s?.role && s.code) return s } catch { /* ignore */ }
  return { role: 'solo', code: '' }
}
const saveSession = (s: Session) => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* ignore */ } }

/** The table as one player's device may see it. */
export function buildView(d: AppData, me: string, narrator: string, code: string, online: Set<string>): TableView {
  const seats: Seat[] = d.characters.filter(c => c.remote).map(c => ({
    id: c.id, name: c.name, rank: c.rank, missions: c.missions, attrs: c.attrs, armor: c.armor,
    handCount: c.hand.length, corruption: c.id === me ? c.corruption : null, online: online.has(c.id), host: false,
  }))
  const log = d.deck.log.map(e => {
    if (!e.char || e.char === me) return e
    if (e.secret) return { ...e, text: 'logCorrHidden', cards: undefined }
    if (e.priv) return { ...e, cards: undefined }
    return e
  })
  const journey = d.journey && {
    ...d.journey,
    dealt: d.journey.dealt.map(x => (x.revealed || x.to === me ? x : { ...x, card: '?' })),
  }
  const picks: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(d.journeyPicks)) picks[k] = k === me ? v : v.map(() => '?')
  return {
    code, narrator, seats,
    deck: { decks: d.deck.decks, jokers: d.deck.jokers, drawCount: d.deck.draw.length, discard: d.deck.discard, table: d.deck.table, log },
    hand: d.characters.find(c => c.id === me)?.hand ?? [],
    rolls: d.rolls, initiative: d.initiative, journey, picks,
  }
}

/** A player's local data with the table laid over it: the shared deck, the other seats, the feed. */
function overlay(local: AppData, v: TableView, me: string): AppData {
  const mine = local.characters.find(c => c.id === me)
  const others = v.seats.filter(s => s.id !== me).map(s => {
    const c = blankCharacter('')
    return { ...c, id: s.id, name: s.name, rank: s.rank, missions: s.missions, attrs: s.attrs, armor: s.armor,
      corruption: 0, corruptionHidden: true, hand: Array(s.handCount).fill('?'), remote: { owner: 'table' } }
  })
  return {
    ...local,
    activeId: me,
    characters: mine ? [{ ...mine, hand: v.hand }, ...others] : others,
    deck: { decks: v.deck.decks, jokers: v.deck.jokers, draw: Array(v.deck.drawCount).fill('?'), discard: v.deck.discard, table: v.deck.table, log: v.deck.log },
    rolls: v.rolls, initiative: v.initiative, journey: v.journey, journeyPicks: v.picks,
  }
}

export interface TableApi {
  role: Role
  code: string
  status: 'off' | 'searching' | 'online'
  me: string | null
  narrator: string
  onlineIds: Set<string>
  view: TableView | null
  /** Data the screens should show: local data, or the table overlay for a player. */
  shown: AppData
  dispatch: (op: Op) => void
  canControl: (charId: string) => boolean
  seatIds: string[]
  host: (narrator: string) => void
  join: (code: string, charId: string) => void
  leave: () => void
  kick: (charId: string) => void
}

export function useTable(data: AppData, setData: (f: (d: AppData) => AppData) => void, onEvent: (e: Ev) => void): TableApi {
  const [session, setSession] = useState<Session>(loadSession)
  const [status, setStatus] = useState<'off' | 'searching' | 'online'>('off')
  const [view, setView] = useState<TableView | null>(null)
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const hostRef = useRef<TableHost | null>(null)
  const playerRef = useRef<TablePlayer | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const charPeer = useRef(new Map<string, string>())
  const peerChar = useRef(new Map<string, string>())
  const pending = useRef<{ ev: Ev[]; actor: string | null; before: AppData; after: AppData }[]>([])
  const evRef = useRef(onEvent)
  evRef.current = onEvent

  const refreshOnline = () => setOnlineIds(new Set([...charPeer.current.keys()]))

  // ---- apply an op locally (solo or Narrator), queue its effects for after the render ----
  const runLocal = (op: Op, actorPeer: string | null) => {
    setData(prev => {
      const r = applyOp(prev, op)
      pending.current.push({ ev: r.ev, actor: actorPeer, before: prev, after: r.d })
      return r.d
    })
  }

  // Flush effects: route events, and push changes on remote soldiers back to their players.
  useEffect(() => {
    if (!pending.current.length) return
    const items = pending.current.splice(0)
    for (const { ev, actor, before, after } of items) {
      for (const e of ev) {
        if (e.to === 'actor') { if (actor && hostRef.current) hostRef.current.ev(actor, e); else evRef.current(e); continue }
        if (e.to === 'all') { evRef.current(e); continue }
        const peer = charPeer.current.get(e.to)
        if (peer && hostRef.current) {
          hostRef.current.ev(peer, e)
          // The Narrator knows the result, but gets a short notice instead of the player's private card.
          if (e.kind === 'corr' && e.r.card) evRef.current({ to: 'actor', kind: 'toast', key: e.r.gained ? 'tblCorrYes' : 'tblCorrNo', vars: { who: e.who } })
        }
        else evRef.current(e)
      }
      if (hostRef.current) {
        for (const c of after.characters) {
          if (!c.remote) continue
          const b = before.characters.find(x => x.id === c.id)
          const peer = charPeer.current.get(c.id)
          if (!b || !peer) continue
          const sets = diffTracked(b, c)
          if (sets.length) hostRef.current.sets(peer, c.id, sets)
        }
      }
    }
  })

  // ---- Narrator: send every player their filtered view whenever the table changes ----
  useEffect(() => {
    if (session.role !== 'host' || !hostRef.current) return
    const h = setTimeout(() => {
      for (const [charId, peer] of charPeer.current) hostRef.current!.view(peer, buildView(dataRef.current, charId, session.narrator || '', session.code, new Set(charPeer.current.keys())))
    }, 120)
    return () => clearTimeout(h)
  }, [data, onlineIds, session.role])

  // ---- Player: send our soldier to the Narrator after local edits ----
  const myChar = session.role === 'player' ? data.characters.find(c => c.id === session.charId) : undefined
  useEffect(() => {
    if (session.role !== 'player' || !myChar || !playerRef.current) return
    const h = setTimeout(() => playerRef.current?.char(myChar), 300)
    return () => clearTimeout(h)
  }, [myChar?.updatedAt, status])

  // ---- connect / reconnect for the saved session ----
  useEffect(() => {
    let cancelled = false
    hostRef.current?.close(); hostRef.current = null
    playerRef.current?.close(); playerRef.current = null
    charPeer.current.clear(); peerChar.current.clear(); refreshOnline()
    if (session.role === 'host') {
      setStatus('online')
      const upsertRemote = (peer: string, incoming: Character) => {
        const c = normalize(incoming)
        if (!c) return
        const old = peerChar.current.get(peer)
        if (old && old !== c.id) charPeer.current.delete(old)
        charPeer.current.set(c.id, peer); peerChar.current.set(peer, c.id)
        setData(d => {
          const prev = d.characters.find(x => x.id === c.id)
          const merged: Character = { ...c, hand: prev?.hand ?? [], history: prev?.history ?? [], remote: { owner: peer } }
          return { ...d, characters: prev ? d.characters.map(x => (x.id === c.id ? merged : x)) : [...d.characters, merged] }
        })
        refreshOnline()
      }
      // The network code (WebRTC, signaling) loads only when a table is actually used.
      void import('./table').then(({ TableHost }) => { if (cancelled) return
      hostRef.current = new TableHost(session.code, session.narrator || '', {
        onHello: upsertRemote,
        onChar: (peer, c) => { if (peerChar.current.get(peer) === c.id) upsertRemote(peer, c) },
        onOp: (peer, op) => {
          const mine = peerChar.current.get(peer)
          if (!mine || HOST_ONLY.includes(op.t)) return
          if ('char' in op && op.char !== mine) return
          if (op.t === 'jReveal' && dataRef.current.journey?.dealt[op.i]?.to !== mine) return
          if (op.t === 'rollPut' && op.rec.who && op.rec.who !== (dataRef.current.characters.find(c => c.id === mine)?.name ?? '')) return
          runLocal(op, peer)
        },
        onPeers: () => {},
        onLeave: peer => {
          const id = peerChar.current.get(peer)
          if (id) { charPeer.current.delete(id); peerChar.current.delete(peer); refreshOnline() }
        },
      })
      })
    } else if (session.role === 'player' && session.charId) {
      const me = session.charId
      setStatus('searching')
      void import('./table').then(({ TablePlayer }) => { if (cancelled) return
      playerRef.current = new TablePlayer(session.code, () => dataRef.current.characters.find(c => c.id === me) ?? null, {
        onStatus: setStatus,
        onView: v => {
          setView(v)
          setData(d => ({ ...d, characters: d.characters.map(c => (c.id === me && c.hand.join() !== v.hand.join() ? { ...c, hand: v.hand } : c)) }))
        },
        onEv: e => evRef.current(e),
        onSets: (char, sets) => { if (char === me) setData(d => ({ ...d, characters: d.characters.map(c => (c.id === me ? applySets(c, sets) : c)) })) },
      })
      })
    } else setStatus('off')
    return () => { cancelled = true; hostRef.current?.close(); hostRef.current = null; playerRef.current?.close(); playerRef.current = null }
  }, [session.role, session.code, session.charId])

  const shown = useMemo(() => (session.role === 'player' && view && session.charId ? overlay(data, view, session.charId) : data), [data, view, session])

  const dispatch = (op: Op) => {
    if (session.role === 'player') { playerRef.current?.op(op); if (!playerRef.current?.online) evRef.current({ to: 'actor', kind: 'toast', key: 'tblNotConnected' }) }
    else runLocal(op, null)
  }
  const canControl = (id: string) => {
    if (session.role === 'player') return id === session.charId
    const c = data.characters.find(x => x.id === id)
    return !!c && !c.remote
  }
  const seatIds = session.role === 'solo'
    ? data.characters.filter(c => !c.remote).map(c => c.id)
    : shown.characters.filter(c => c.remote || c.id === session.charId).map(c => c.id)

  return {
    role: session.role, code: session.code, status, me: session.charId ?? null, narrator: session.narrator || view?.narrator || '',
    onlineIds, view, shown, dispatch, canControl, seatIds,
    host: narrator => { const s: Session = { role: 'host', code: newCode(), narrator }; saveSession(s); setSession(s) },
    join: (code, charId) => { const s: Session = { role: 'player', code: normalizeCode(code), charId }; saveSession(s); setView(null); setSession(s) },
    leave: () => {
      if (session.role === 'host') {
        // Soldiers of the players leave the Narrator's device; their cards go to the discard pile.
        setData(d => {
          const remote = d.characters.filter(c => c.remote)
          const cards = remote.flatMap(c => c.hand)
          return repairDeck({ ...d, characters: d.characters.filter(c => !c.remote), deck: { ...d.deck, discard: [...d.deck.discard, ...cards] },
            initiative: d.initiative.filter(e => !remote.some(r => r.id === e.ref)), journeyPicks: {} })
        })
      } else if (session.role === 'player') {
        // Table cards belonged to the Narrator's deck.
        const me = session.charId
        setData(d => repairDeck({ ...d, characters: d.characters.map(c => (c.id === me ? { ...c, hand: [] } : c)) }))
      }
      const s: Session = { role: 'solo', code: '' }; saveSession(s); setView(null); setSession(s)
    },
    kick: charId => setData(d => {
      const c = d.characters.find(x => x.id === charId)
      if (!c?.remote) return d
      const peer = charPeer.current.get(charId)
      if (peer) { charPeer.current.delete(charId); peerChar.current.delete(peer) }
      return { ...d, characters: d.characters.filter(x => x.id !== charId), deck: { ...d.deck, discard: [...d.deck.discard, ...c.hand] }, initiative: d.initiative.filter(e => e.ref !== charId) }
    }),
  }
}

export const isAtTable = (c: Character) => !!c.remote
export { status as soldierStatus }
