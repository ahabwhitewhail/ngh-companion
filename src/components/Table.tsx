import { useState } from 'preact/hooks'
import { ATTRS, CORRUPTION_MAX, HAND_MAX } from '../rules'
import { status, type Character } from '../store'
import { normalizeCode } from '../table'
import type { TableApi } from '../useTable'
import { ConfirmButton, Section, Stepper, useApp } from './ui'
import { useTools } from './tools'

export function TableView({ tbl, onOpenSheet, foes }: { tbl: TableApi; onOpenSheet: (id: string) => void; foes: preact.ComponentChildren }) {
  const { t } = useApp()
  return (
    <div class="tool">
      <div class="tool-head">
        <h1 class="tool-title">{t('tblTitle')}</h1>
        {tbl.role !== 'solo' && (
          <span class={`net net-${tbl.status}`} role="status">
            <i aria-hidden="true" />{tbl.role === 'host' ? t('tblYouNarrate') : tbl.status === 'online' ? t('tblConnected') : t('tblSearching')}
          </span>
        )}
      </div>
      {tbl.role === 'solo' && <Start tbl={tbl} />}
      {tbl.role === 'host' && <Host tbl={tbl} />}
      {tbl.role === 'player' && <Player tbl={tbl} onOpenSheet={onOpenSheet} />}
      {tbl.role !== 'player' && foes}
    </div>
  )
}

function Start({ tbl }: { tbl: TableApi }) {
  const { t } = useApp()
  const { d } = useTools()
  const mine = d.characters.filter(c => !c.remote)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [char, setChar] = useState(d.activeId && mine.some(c => c.id === d.activeId) ? d.activeId : mine[0]?.id ?? '')
  const ok = normalizeCode(code).length === 6 && !!char
  return (
    <>
      <p class="lead">{t('tblLead')}</p>
      <div class="tool-cols">
        <div class="col">
          <Section id="tbl-host" titleKey="tblNarratorTitle">
            <p class="note">{t('tblNarratorHint')}</p>
            <label class="fld" for="tbl-name"><span class="fld-l">{t('tblNarratorName')}</span>
              <input id="tbl-name" value={name} placeholder={t('jNarratorCard')} onInput={e => setName((e.target as HTMLInputElement).value)} /></label>
            <button type="button" class="btn btn-primary" onClick={() => tbl.host(name.trim())}>{t('tblCreate')}</button>
            <p class="note">{t('tblDeckMoves')}</p>
          </Section>
        </div>
        <div class="col">
          <Section id="tbl-join" titleKey="tblPlayerTitle">
            <p class="note">{t('tblPlayerHint')}</p>
            <label class="fld" for="tbl-code"><span class="fld-l">{t('tblCode')}</span>
              <input id="tbl-code" class="code-input" value={code} maxLength={8} autoComplete="off" autoCapitalize="characters" spellcheck={false}
                placeholder="K7QX3M" onInput={e => setCode(normalizeCode((e.target as HTMLInputElement).value))} /></label>
            <label class="fld" for="tbl-char"><span class="fld-l">{t('soldier')}</span>
              <select id="tbl-char" value={char} onChange={e => setChar((e.target as HTMLSelectElement).value)}>
                {mine.length === 0 && <option value="">—</option>}
                {mine.map(c => <option value={c.id}>{c.name || t('unnamed')}</option>)}
              </select></label>
            <button type="button" class="btn btn-primary" disabled={!ok} onClick={() => tbl.join(code, char)}>{t('tblJoin')}</button>
            <p class="note">{t('tblHandMoves')}</p>
          </Section>
        </div>
      </div>
      <p class="note">{t('tblNetNote')}</p>
    </>
  )
}

function CodeBox({ code, hint = true }: { code: string; hint?: boolean }) {
  const { t, toast } = useApp()
  const copy = () => { try { navigator.clipboard.writeText(code).then(() => toast(t('copied')), () => toast(code)) } catch { toast(code) } }
  return (
    <div class="codebox">
      <span class="fld-l">{t('tblCode')}</span>
      <button type="button" class="code" onClick={copy} aria-label={`${t('tblCode')} ${code}. ${t('exportJson')}`}>{code.slice(0, 3)}<span>{code.slice(3)}</span></button>
      {hint && <span class="note">{t('tblCodeHint')}</span>}
    </div>
  )
}

function Host({ tbl }: { tbl: TableApi }) {
  const { t } = useApp()
  const { d, dispatch, editChar } = useTools()
  const seats = d.characters.filter(c => c.remote)
  return (
    <>
      <div class="tool-cols">
        <div class="col">
          <Section id="tbl-code" titleKey="tblYourTable">
            <CodeBox code={tbl.code} />
            <p class="note">{t('tblOnline', { n: tbl.onlineIds.size, m: seats.length })}</p>
          </Section>
          <Section id="tbl-party" titleKey="tblParty">
            {seats.length === 0 && <p class="note">{t('tblNobody')}</p>}
            <ul class="party">
              {seats.map(c => <SeatCard key={c.id} c={c} online={tbl.onlineIds.has(c.id)}
                onSet={(k, v) => editChar(c.id, x => ({ ...x, ...setVal(x, k, v) }))}
                onReward={n => dispatch({ t: 'draw', char: c.id, n, reason: 'logReward' })}
                onCorr={() => dispatch({ t: 'corruption', char: c.id })}
                onKick={() => tbl.kick(c.id)} />)}
            </ul>
          </Section>
        </div>
        <div class="col">
          <Feed />
          <Section id="tbl-close" titleKey="tblCloseTitle">
            <p class="note">{t('tblCloseHint')}</p>
            <ConfirmButton label={t('tblClose')} confirmLabel={t('confirmDelete')} onConfirm={tbl.leave} />
          </Section>
        </div>
      </div>
      <p class="note">{t('tblNetNote')}</p>
    </>
  )
}

/** Narrator edits go through the tracked-value path so they reach the player and the change log. */
function setVal(c: Character, key: string, v: number): Partial<Character> {
  const [kind, a, b] = key.split('.')
  if (kind === 'attr') return { attrs: { ...c.attrs, [a]: { ...c.attrs[a as keyof Character['attrs']], [b]: v } } }
  if (kind === 'armor') return { armor: v }
  return {}
}

function SeatCard({ c, online, onSet, onReward, onCorr, onKick }: {
  c: Character; online: boolean; onSet: (k: string, v: number) => void; onReward: (n: number) => void; onCorr: () => void; onKick: () => void
}) {
  const { t } = useApp()
  const [reward, setReward] = useState(1)
  const st = status(c)
  return (
    <li class={`seat st-${st}`}>
      <div class="seat-h">
        <span class={`dot ${online ? 'on' : ''}`} title={online ? t('tblOnlineOne') : t('tblOffline')} />
        <strong>{c.name || t('unnamed')}</strong>
        <span class="note">{c.rank}</span>
        {st !== 'active' && <span class="st st-dead">{t(st === 'dead' ? 'statusDead' : 'statusLost')}</span>}
      </div>
      <div class="seat-attrs">
        {ATTRS.map(a => (
          <div class={`seat-a ${c.attrs[a].cur <= 1 ? 'is-low' : ''}`}>
            <span class="mini-l">{t(a)}</span>
            <div class="vital-ctl">
              <button type="button" class="vbtn vbtn-ink" aria-label={`${c.name}: ${t(a)} −1`} disabled={c.attrs[a].cur <= 0} onClick={() => onSet(`attr.${a}.cur`, c.attrs[a].cur - 1)}>−</button>
              <span class="vital-v"><b>{c.attrs[a].cur}</b><span class="vital-max">/{c.attrs[a].max}</span></span>
              <button type="button" class="vbtn vbtn-ink" aria-label={`${c.name}: ${t(a)} +1`} disabled={c.attrs[a].cur >= c.attrs[a].max} onClick={() => onSet(`attr.${a}.cur`, c.attrs[a].cur + 1)}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div class="seat-row">
        <span class="mini-l">{t('armor')} {c.armor}</span>
        <span class="mini-l">{t('cardsInHand')} {c.hand.length}/{HAND_MAX}</span>
        <span class="corr-dots" aria-label={`${t('corruption')} ${c.corruption}/5`}>
          {Array.from({ length: CORRUPTION_MAX }, (_, i) => <i class={i < c.corruption ? 'on' : ''} />)}
        </span>
      </div>
      <div class="after">
        <Stepper value={reward} min={1} max={7} label={t('reward')} onChange={setReward} />
        <button type="button" class="btn btn-ghost btn-sm" disabled={c.hand.length >= HAND_MAX} onClick={() => onReward(reward)}>{t('tblGive', { n: reward })}</button>
        <button type="button" class="btn btn-ghost btn-sm" onClick={onCorr}>{t('corrDraw')}</button>
        <ConfirmButton class="btn-sm" label={t('tblKick')} confirmLabel={t('confirmDelete')} onConfirm={onKick} />
      </div>
    </li>
  )
}

function Player({ tbl, onOpenSheet }: { tbl: TableApi; onOpenSheet: (id: string) => void }) {
  const { t } = useApp()
  const { d } = useTools()
  const me = d.characters.find(c => c.id === tbl.me)
  const others = d.characters.filter(c => c.id !== tbl.me && c.remote)
  return (
    <>
      <div class="tool-cols">
        <div class="col">
          <Section id="tbl-me" titleKey="tblAtTable">
            <CodeBox code={tbl.code} hint={false} />
            {tbl.status !== 'online' && <p class="note note-stamp">{t('tblSearchingHint')}</p>}
            {tbl.narrator && <p class="note">{t('jNarratorCard')}: {tbl.narrator}</p>}
            {me && (
              <div class="after">
                <strong class="lbl">{me.name || t('unnamed')}</strong>
                <button type="button" class="btn btn-ghost btn-sm" onClick={() => onOpenSheet(me.id)}>{t('tblOpenSheet')}</button>
              </div>
            )}
            <p class="note">{t('tblPlayerNote')}</p>
          </Section>
          <Section id="tbl-others" titleKey="tblParty">
            {others.length === 0 && <p class="note">{t('tblAlone')}</p>}
            <ul class="party">
              {others.map(c => (
                <li class="seat">
                  <div class="seat-h"><strong>{c.name || t('unnamed')}</strong><span class="note">{c.rank}</span>
                    <span class="mini-l">{t('cardsInHand')} {c.hand.length}</span></div>
                  <div class="seat-attrs">
                    {ATTRS.map(a => <div class="seat-a"><span class="mini-l">{t(a)}</span><span class="vital-v"><b>{c.attrs[a].cur}</b><span class="vital-max">/{c.attrs[a].max}</span></span></div>)}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <div class="col">
          <Feed />
          <Section id="tbl-leave" titleKey="tblLeaveTitle">
            <p class="note">{t('tblLeaveHint')}</p>
            <ConfirmButton label={t('tblLeave')} confirmLabel={t('confirmDelete')} onConfirm={tbl.leave} />
          </Section>
        </div>
      </div>
    </>
  )
}

function Feed() {
  const { t, settings } = useApp()
  const { d } = useTools()
  const rolls = [...d.rolls].reverse().slice(0, 12)
  return (
    <Section id="tbl-feed" titleKey="tblFeed">
      {rolls.length === 0 && <p class="note">{t('noRolls')}</p>}
      <ol class="rolls">
        {rolls.map(r => {
          const pass = r.tn === null ? null : r.successes >= r.tn
          return (
            <li class="rl">
              <div class="rl-top">
                <time class="log-t">{new Date(r.t).toLocaleTimeString(settings.lang, { hour: '2-digit', minute: '2-digit' })}</time>
                <span class="rl-what">{r.whatKind === 'plain' ? r.what : r.what ? t(r.what) : '—'}{r.who && <span class="rl-who"> · {r.who}</span>}</span>
                {r.whatKind !== 'plain' && <span class={`rl-res ${pass === null ? '' : pass ? 'good' : 'bad'}`}>{r.successes}{r.tn !== null ? ` / ${r.tn}` : ''}</span>}
              </div>
              <div class="rl-faces">{r.faces.map(f => <span class={`mf ${f >= 5 ? 'ok' : ''}`}>{f}</span>)}{r.auto ? <span class="mf mf-auto">+{r.auto}</span> : null}</div>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}
