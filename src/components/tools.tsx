import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import { info, SUIT_SYMBOL } from '../cards'
import { status, type AppData } from '../store'
import type { CorruptionResult } from '../deckOps'
import { useApp } from './ui'

export interface ToolsCtx {
  d: AppData
  apply: (f: (d: AppData) => AppData) => void
  showCorruption: (r: CorruptionResult & { who: string }) => void
  setActive: (id: string | null) => void
}
export const Tools = createContext<ToolsCtx>(null as unknown as ToolsCtx)
export const useTools = () => useContext(Tools)

export function SoldierPicker({ allowNone, id = 'pick-soldier' }: { allowNone?: boolean; id?: string }) {
  const { t } = useApp()
  const { d, setActive } = useTools()
  const value = d.activeId && d.characters.some(c => c.id === d.activeId) ? d.activeId : ''
  return (
    <label class="fld picker" for={id}>
      <span class="fld-l">{t('soldier')}</span>
      <select id={id} value={value} onChange={e => setActive((e.target as HTMLSelectElement).value || null)}>
        {(allowNone || !value) && <option value="">{allowNone ? t('noSoldier') : '—'}</option>}
        {d.characters.map(c => {
          const st = status(c)
          return <option value={c.id}>{c.name || t('unnamed')}{st !== 'active' ? ` · ${t(st === 'dead' ? 'statusDead' : 'statusLost')}` : ''} · {c.hand.length}/7</option>
        })}
      </select>
    </label>
  )
}

/** A playing card drawn in CSS. Red suits use the stamp colour, black suits use ink. */
export function CardFace({ id, faceDown, selected, small, onClick, disabled, label }: {
  id: string; faceDown?: boolean; selected?: boolean; small?: boolean; onClick?: () => void; disabled?: boolean; label?: string
}) {
  const c = info(id)
  const cls = `pcard ${small ? 'pcard-sm' : ''} ${c.red ? 'is-red' : 'is-black'} ${selected ? 'is-sel' : ''} ${faceDown ? 'is-down' : ''} ${c.joker ? 'is-joker' : ''}`
  const name = c.joker ? `Joker (${c.joker})` : `${c.rank}${SUIT_SYMBOL[c.suit!]}`
  const body = faceDown ? <span class="pcard-back" aria-hidden="true" /> : c.joker ? (
    <>
      <span class="pc-corner">★</span>
      <span class="pc-joker">JOKER</span>
      <span class="pc-mark">{c.red ? '●' : '○'}</span>
    </>
  ) : (
    <>
      <span class="pc-corner">{c.rank}<br />{SUIT_SYMBOL[c.suit!]}</span>
      <span class="pc-suit">{SUIT_SYMBOL[c.suit!]}</span>
      <span class="pc-corner pc-corner-b">{c.rank}<br />{SUIT_SYMBOL[c.suit!]}</span>
    </>
  )
  if (!onClick) return <span class={cls} role="img" aria-label={faceDown ? '?' : name}>{body}{c.deckNo > 1 && !faceDown && <i class="pc-deck">2</i>}</span>
  return (
    <button type="button" class={cls} aria-pressed={selected} aria-label={label ?? (faceDown ? '?' : name)} disabled={disabled} onClick={onClick}>
      {body}{c.deckNo > 1 && !faceDown && <i class="pc-deck">2</i>}
    </button>
  )
}

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }

export function Die({ face, added = 0, sel, rerolled, onClick, label, tumble }: {
  face: number; added?: number; sel?: boolean; rerolled?: boolean; onClick?: () => void; label: string; tumble?: boolean
}) {
  const ok = face >= 5
  const cells = Array.from({ length: 9 }, (_, i) => <i class={PIPS[face]?.includes(i) ? 'on' : ''} />)
  return (
    <button type="button" class={`die ${ok ? 'is-ok' : ''} ${sel ? 'is-sel' : ''} ${tumble ? 'tumble' : ''}`} onClick={onClick} disabled={!onClick} aria-label={label}>
      <span class="die-grid" aria-hidden="true">{cells}</span>
      {added > 0 && <span class="die-tag">+{added}</span>}
      {rerolled && <span class="die-tag die-tag-r">↻</span>}
    </button>
  )
}

export function CorruptionOverlay({ r, onClose }: { r: CorruptionResult & { who: string }; onClose: () => void }) {
  const { t } = useApp()
  return (
    <div class="modal-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('corrDraw')}>
      <div class="reveal" onClick={onClose}>
        <p class="eyebrow">{t('corrDraw')} · {r.who}</p>
        {r.jokers.length > 0 && <p class="note">{t('corrJokers')}</p>}
        {r.card ? <CardFace id={r.card} /> : <p>{t('deckEmpty')}</p>}
        {r.card && <p class={`reveal-res ${r.gained ? 'bad' : 'good'}`}>{r.gained ? t('corrYes') : t('corrNo')}</p>}
        <p class="note">{t('privateCard')}</p>
        <button type="button" class="btn btn-ghost">{t('tapToClose')}</button>
      </div>
    </div>
  )
}
