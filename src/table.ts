// Shared table over a room code. Devices find each other through public Nostr relays
// (Trystero), then talk directly over WebRTC. The room code is also the encryption password
// for that handshake. The Narrator's device holds the deck and is the single source of truth.
import { joinRoom, type Room } from 'trystero'
import type { Ev, Op } from './ops'
import type { RollRecord } from './dice'
import type { Character, DeckEvent, InitEntry, Journey } from './store'

const APP_ID = 'ngh-companion-table-v1'
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newCode(): string {
  const buf = new Uint32Array(6)
  crypto.getRandomValues(buf)
  return Array.from(buf, x => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('')
}
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

/** What one seat at the table looks like to the other players. */
export interface Seat {
  id: string; name: string; rank: string; missions: number
  attrs: Character['attrs']; armor: number; handCount: number
  corruption: number | null   // null when it is not yours to see
  online: boolean; host: boolean
}
/** The table as a player's device sees it (already filtered for secrets). */
export interface TableView {
  code: string
  narrator: string
  deck: { decks: 1 | 2; jokers: boolean; drawCount: number; discard: string[]; table: string[]; log: DeckEvent[] }
  seats: Seat[]
  hand: string[]
  rolls: RollRecord[]
  initiative: InitEntry[]
  journey: Journey | null
  picks: Record<string, string[]>
}

type Msg =
  | { k: 'host'; narrator: string }
  | { k: 'hello'; char: Character }
  | { k: 'char'; char: Character }
  | { k: 'op'; op: Op }
  | { k: 'view'; view: TableView }
  | { k: 'ev'; ev: Ev }
  | { k: 'sets'; char: string; sets: [string, number][] }
  | { k: 'bye' }

/** Strip what the receiving device does not need: the change log stays local. */
export const forWire = (c: Character): Character => ({ ...c, history: [] })

function open(code: string): { room: Room; send: (m: Msg, target?: string) => void; onMsg: (f: (m: Msg, peer: string) => void) => void } {
  const room = joinRoom({ appId: APP_ID, password: `ngh-${code}` }, `table-${code}`)
  // Messages are plain JSON; the cast only satisfies Trystero's payload type.
  const action = room.makeAction<any>('m')
  return {
    room,
    send: (m, target) => { void action.send(m as any, target ? { target } : undefined) },
    onMsg: f => { action.onMessage = (data: unknown, meta: { peerId: string }) => f(data as Msg, meta.peerId) },
  }
}

export interface HostHandlers {
  onHello: (peer: string, char: Character) => void
  onChar: (peer: string, char: Character) => void
  onOp: (peer: string, op: Op) => void
  onPeers: (online: string[]) => void
  onLeave: (peer: string) => void
}

export class TableHost {
  private conn: ReturnType<typeof open>
  private peers = new Set<string>()
  constructor(public code: string, private narrator: string, h: HostHandlers) {
    this.conn = open(code)
    this.conn.room.onPeerJoin = peer => { this.peers.add(peer); this.conn.send({ k: 'host', narrator: this.narrator }, peer); h.onPeers([...this.peers]) }
    this.conn.room.onPeerLeave = peer => { this.peers.delete(peer); h.onLeave(peer); h.onPeers([...this.peers]) }
    this.conn.onMsg((m, peer) => {
      if (m.k === 'hello') h.onHello(peer, m.char)
      else if (m.k === 'char') h.onChar(peer, m.char)
      else if (m.k === 'op') h.onOp(peer, m.op)
      else if (m.k === 'bye') h.onLeave(peer)
    })
  }
  setNarrator(n: string) { this.narrator = n }
  view(peer: string, view: TableView) { this.conn.send({ k: 'view', view }, peer) }
  ev(peer: string, ev: Ev) { this.conn.send({ k: 'ev', ev }, peer) }
  sets(peer: string, char: string, sets: [string, number][]) { this.conn.send({ k: 'sets', char, sets }, peer) }
  close() { try { this.conn.room.leave() } catch { /* already closed */ } }
}

export interface PlayerHandlers {
  onStatus: (s: 'searching' | 'online') => void
  onView: (v: TableView) => void
  onEv: (e: Ev) => void
  onSets: (char: string, sets: [string, number][]) => void
}

export class TablePlayer {
  private conn: ReturnType<typeof open>
  private host: string | null = null
  constructor(public code: string, private getChar: () => Character | null, h: PlayerHandlers) {
    this.conn = open(code)
    h.onStatus('searching')
    this.conn.room.onPeerLeave = peer => { if (peer === this.host) { this.host = null; h.onStatus('searching') } }
    this.conn.onMsg((m, peer) => {
      if (m.k === 'host') {
        this.host = peer
        h.onStatus('online')
        const c = this.getChar()
        if (c) this.conn.send({ k: 'hello', char: forWire(c) }, peer)
        return
      }
      if (peer !== this.host) return // only the Narrator's device is listened to
      if (m.k === 'view') h.onView(m.view)
      else if (m.k === 'ev') h.onEv(m.ev)
      else if (m.k === 'sets') h.onSets(m.char, m.sets)
    })
  }
  get online() { return this.host !== null }
  op(op: Op) { if (this.host) this.conn.send({ k: 'op', op }, this.host) }
  char(c: Character) { if (this.host) this.conn.send({ k: 'char', char: forWire(c) }, this.host) }
  close() {
    if (this.host) this.conn.send({ k: 'bye' }, this.host)
    setTimeout(() => { try { this.conn.room.leave() } catch { /* already closed */ } }, 150)
  }
}
