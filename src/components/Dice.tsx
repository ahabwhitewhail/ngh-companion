import { useEffect, useState } from 'preact/hooks'
import { info } from '../cards'
import { countSuccesses, d6, rollN, type RollRecord } from '../dice'
import { PATHS, SKILLS, pathOf, type AttrKey } from '../rules'
import { setTracked, uid, type AppData } from '../store'
import { InfoBtn, Section, Stepper, Term, useApp } from './ui'
import { CardFace, Die, SoldierPicker, useTools } from './tools'


interface RollState {
  phase: 'setup' | 'rolled'
  tn: number
  buy: number
  temp: boolean
  modDice: number
  modSucc: number
  cards: number
  auto: number
  source: boolean
  faces: number[]
  added: number[]
  pipStack: number[]
  lostPips: number
  rerolled: boolean
  rerolledIdx: number[]
  rerollSel: number[] | null
  recId: string
  tumble: number
  manualDice: number
  manualManip: number
}

const fresh = (tn = 2): RollState => ({
  phase: 'setup', tn, buy: 0, temp: false, modDice: 0, modSucc: 0, cards: 0, auto: 0, source: false,
  faces: [], added: [], pipStack: [], lostPips: 0, rerolled: false, rerolledIdx: [], rerollSel: null, recId: uid(), tumble: 0,
  manualDice: 2, manualManip: 3,
})

export function DiceView() {
  const { t } = useApp()
  const [mode, setMode] = useState<'skill' | 'free'>('skill')
  return (
    <div class="tool">
      <div class="tool-head">
        <h1 class="tool-title">{t('tabDice')}</h1>
        <div class="seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'skill'} class={mode === 'skill' ? 'on' : ''} onClick={() => setMode('skill')}>{t('diceSkill')}</button>
          <button type="button" role="tab" aria-selected={mode === 'free'} class={mode === 'free' ? 'on' : ''} onClick={() => setMode('free')}>{t('diceFree')}</button>
        </div>
      </div>
      <div class="tool-cols">
        <div class="col">{mode === 'skill' ? <SkillRoll /> : <FreeRoll />}</div>
        <div class="col"><RollHistory /></div>
      </div>
    </div>
  )
}

function SkillRoll() {
  const { t, toast } = useApp()
  const { d, dispatch, editChar, canControl } = useTools()
  const c = d.characters.find(x => x.id === d.activeId && canControl(x.id)) ?? null
  const [src, setSrc] = useState('skill:athletics')
  const [s, setS] = useState<RollState>(fresh)
  const [cardPick, setCardPick] = useState<null | 'plusOne' | 'whisper'>(null)

  // Reset when the soldier or the skill changes.
  useEffect(() => { setS(st => fresh(st.tn)); setCardPick(null) }, [c?.id, src])
  useEffect(() => {
    if (!c) return
    if (src.startsWith('wh:') && !c.whispers.some(w => `wh:${w.id}` === src)) setSrc('skill:athletics')
  }, [c?.id, c?.whispers.length])

  // What is being rolled
  let label = '', kind: RollRecord['whatKind'] = 'skill', attr: AttrKey | null = null, training = 0, trained = true, pathKey = ''
  if (c) {
    if (src.startsWith('skill:')) {
      const key = src.slice(6) as (typeof SKILLS)[number]['key']
      const def = SKILLS.find(x => x.key === key)!
      label = key; attr = def.attr; training = c.skills[key].dice; trained = c.skills[key].trained
    } else {
      const w = c.whispers.find(x => `wh:${x.id}` === src)
      const p = w && pathOf(w.path)
      if (w && p) { label = p.key; kind = 'whisper'; attr = p.attr; training = w.dice; pathKey = p.key }
    }
  } else { label = ''; kind = 'free' }

  const attrCur = c && attr ? c.attrs[attr].cur : s.manualManip
  const limit = attrCur + s.cards
  const used = s.buy + (s.temp ? 1 : 0) + s.pipStack.length + s.lostPips + (s.rerolled ? 1 : 0)
  const left = limit - used
  const base = c ? (trained || s.temp ? training : 0) : s.manualDice
  const nDice = Math.max(0, base + s.buy + s.modDice)
  const needTemp = !!c && kind === 'skill' && !trained && !s.temp
  const healFull = pathKey === 'healingWords' && !!c && c.attrs.guts.cur === c.attrs.guts.max
  const auto = s.auto + (s.source ? 1 : 0) + (healFull ? 1 : 0)
  const total = countSuccesses(s.faces) + auto + s.modSucc
  const hand = c?.hand ?? []

  const upd = (p: Partial<RollState>) => setS(st => ({ ...st, ...p }))

  // Save / update this roll in history after every change once rolled.
  useEffect(() => {
    if (s.phase !== 'rolled') return
    const rec: RollRecord = {
      id: s.recId, t: Date.now(), who: c?.name ?? '', what: label, whatKind: kind, faces: s.faces, auto: auto + s.modSucc,
      successes: total, tn: s.tn > 0 ? s.tn : null, manips: used, cards: s.cards,
    }
    dispatch({ t: 'rollPut', rec })
  }, [s.phase, s.faces.join(), total, used, s.tn])

  const doRoll = () => {
    const faces = rollN(nDice)
    upd({ phase: 'rolled', faces, added: faces.map(() => 0), tumble: s.tumble + 1 })
  }
  const addPip = (i: number) => {
    if (s.rerollSel) { // selecting for reroll
      upd({ rerollSel: s.rerollSel.includes(i) ? s.rerollSel.filter(x => x !== i) : [...s.rerollSel, i] })
      return
    }
    if (left <= 0 || s.faces[i] >= 6) return
    const faces = s.faces.slice(), added = s.added.slice()
    faces[i]++; added[i]++
    upd({ faces, added, pipStack: [...s.pipStack, i] })
  }
  const undoPip = () => {
    const i = s.pipStack[s.pipStack.length - 1]
    if (i === undefined) return
    const faces = s.faces.slice(), added = s.added.slice()
    faces[i]--; added[i]--
    upd({ faces, added, pipStack: s.pipStack.slice(0, -1) })
  }
  const doReroll = () => {
    if (!s.rerollSel?.length || left <= 0) return
    const faces = s.faces.slice(), added = s.added.slice()
    for (const i of s.rerollSel) { faces[i] = d6(); added[i] = 0 }
    // Pips added to rerolled dice are lost but stay counted as spent.
    const lost = s.pipStack.filter(i => s.rerollSel!.includes(i)).length
    upd({ faces, added, pipStack: s.pipStack.filter(i => !s.rerollSel!.includes(i)), lostPips: s.lostPips + lost, rerolled: true, rerolledIdx: s.rerollSel, rerollSel: null, tumble: s.tumble + 1 })
  }

  /** Spend a card from the hand: +One, or a Whisper's automatic success. */
  const spendCard = (card: string, why: 'plusOne' | 'whisper') => {
    if (!c) return
    dispatch({ t: 'play', char: c.id, cards: [card], reason: why === 'plusOne' ? 'logPlusOne' : 'logWhisperCost' })
    if (why === 'plusOne') upd({ cards: s.cards + 1 }); else upd({ auto: s.auto + 1 })
    setCardPick(null)
  }
  const discardFromDeck = () => {
    if (!c) return
    dispatch({ t: 'whisperDeck', char: c.id })
    upd({ auto: s.auto + 1 })
  }
  const bleed = (a: AttrKey) => {
    if (!c || c.attrs[a].cur <= 0) return
    editChar(c.id, x => setTracked(x, `attr.${a}.cur`, x.attrs[a].cur - 1))
    upd({ auto: s.auto + 1 })
  }

  const pass = s.tn > 0 ? total >= s.tn : null

  return (
    <>
      <Section id="roll-setup" titleKey="diceSkill">
        <div class="roll-pick">
          <SoldierPicker allowNone id="dice-soldier" />
          {c && (
            <label class="fld" for="dice-src"><span class="fld-l">{t('rollWhat')}</span>
              <select id="dice-src" value={src} onChange={e => setSrc((e.target as HTMLSelectElement).value)}>
                <optgroup label={t('training')}>
                  {SKILLS.map(sk => <option value={`skill:${sk.key}`}>{t(sk.key)} · {c.skills[sk.key].trained ? `${c.skills[sk.key].dice}${t('d6')}` : t('untrainedMark')} [{t(sk.attr)} {c.attrs[sk.attr].cur}]</option>)}
                </optgroup>
                {c.whispers.some(w => w.path) && (
                  <optgroup label={t('whispers')}>
                    {c.whispers.filter(w => w.path).map(w => {
                      const p = PATHS.find(x => x.key === w.path)!
                      return <option value={`wh:${w.id}`}>{t(p.key)} · {w.dice} [{t(p.attr)} {c.attrs[p.attr].cur}]</option>
                    })}
                  </optgroup>
                )}
              </select>
            </label>
          )}
        </div>

        {!c && (
          <div class="manual">
            <div class="mini"><span class="mini-l">{t('baseDice')}</span><Stepper value={s.manualDice} min={0} max={20} label={t('baseDice')} onChange={v => upd({ manualDice: v })} /></div>
            <div class="mini"><span class="mini-l">{t('manipLimit')}</span><Stepper value={s.manualManip} min={0} max={20} label={t('manipLimit')} onChange={v => upd({ manualManip: v })} /></div>
          </div>
        )}

        <div class="roll-stats">
          <div class="rstat"><span class="rstat-l">{t('baseDice')}</span><span class="rstat-v">{base}</span></div>
          <div class="rstat"><span class="rstat-l">{c && attr ? <>+One · {t(attr)}</> : t('manipLimit')}</span><span class="rstat-v">{attrCur}{s.cards > 0 && <small>+{s.cards}</small>}</span></div>
          <div class={`rstat rstat-left ${left <= 0 ? 'is-empty' : ''}`}><span class="rstat-l">{t('manipLeft')}</span><span class="rstat-v">{left}</span></div>
          <div class="rstat"><span class="rstat-l">{t('tn')}</span><Stepper value={s.tn} min={0} max={20} label={t('tnLong')} onChange={v => upd({ tn: v })} /></div>
        </div>

        {kind === 'whisper' && <WhisperCost pathKey={pathKey} c={c} auto={s.auto} source={s.source} healFull={healFull}
          onBleed={bleed} onSource={() => upd({ source: !s.source })} onCard={() => setCardPick(cardPick === 'whisper' ? null : 'whisper')}
          onDeck={discardFromDeck} handEmpty={hand.length === 0} />}

        {s.phase === 'setup' && (
          <div class="phase">
            <h3 class="sub">{t('beforeRoll')} <InfoBtn id="plusone" label="+One" /></h3>
            {needTemp && (
              <div class="row-note">
                <p class="note">{t('tempSkillNeeded')}</p>
                <button type="button" class="btn btn-ghost btn-sm" disabled={left <= 0} onClick={() => upd({ temp: true })}>{t('tempSkill')}</button>
              </div>
            )}
            <div class="mini"><span class="mini-l">{t('buyDie')}</span>
              <Stepper value={s.buy} min={0} max={needTemp ? 0 : s.buy + Math.max(0, left)} label={t('buyDie')} onChange={v => upd({ buy: v })} />
              <span class="note">{t('buyDieHint')}</span></div>
          </div>
        )}

        <details class="mods">
          <summary>{t('modifiers')}{(s.modDice || s.modSucc) ? ` · ${s.modDice ? `${s.modDice > 0 ? '+' : ''}${s.modDice}d` : ''} ${s.modSucc ? `${s.modSucc > 0 ? '+' : ''}${s.modSucc}✓` : ''}` : ''}</summary>
          <div class="manual">
            {s.phase === 'setup' && <div class="mini"><span class="mini-l">{t('modDice')}</span><Stepper value={s.modDice} min={-10} max={10} label={t('modDice')} onChange={v => upd({ modDice: v })} /></div>}
            <div class="mini"><span class="mini-l">{t('modSucc')}</span><Stepper value={s.modSucc} min={-10} max={10} label={t('modSucc')} onChange={v => upd({ modSucc: v })} /></div>
          </div>
          <p class="note">{t('modHint')}</p>
        </details>

        {c && (
          <div class="phase">
            <button type="button" class={`btn btn-ghost btn-sm ${cardPick === 'plusOne' ? 'is-on' : ''}`} aria-expanded={cardPick === 'plusOne'}
              onClick={() => setCardPick(cardPick === 'plusOne' ? null : 'plusOne')}>{t('playCard')} · {hand.length}</button>
            {cardPick && (
              <div class="card-pick">
                <p class="note">{cardPick === 'plusOne' ? t('playCardHint') : t('discardForSucc')}</p>
                {hand.length === 0 ? <p class="note">{t('noCards')}</p> : (
                  <div class="hand-row">{hand.map(h => <CardFace small id={h} onClick={() => spendCard(h, cardPick)} />)}</div>
                )}
              </div>
            )}
          </div>
        )}

        {s.phase === 'setup' ? (
          <button type="button" class="btn btn-primary btn-roll" disabled={needTemp || (nDice === 0 && auto + s.modSucc === 0)} onClick={doRoll}>
            {t('roll', { n: nDice })}
          </button>
        ) : null}
      </Section>

      {s.phase === 'rolled' && (
        <Section id="roll-result" title={label ? undefined : t('diceSkill')} titleKey={label || undefined}
          aside={<button type="button" class="btn btn-ghost btn-sm" onClick={() => setS(fresh(s.tn))}>{t('rollAgain')}</button>}>
          <div class="dice-row" key={s.tumble}>
            {s.faces.map((f, i) => (
              <Die face={f} added={s.added[i]} rerolled={s.rerolledIdx.includes(i)} sel={s.rerollSel?.includes(i)} tumble
                label={`${i + 1}: ${f}`} onClick={s.rerollSel || (left > 0 && f < 6) ? () => addPip(i) : undefined} />
            ))}
            {s.faces.length === 0 && <p class="note">0d6</p>}
          </div>
          <div class={`verdict ${pass === null ? '' : pass ? 'is-pass' : 'is-fail'}`}>
            <div class="verdict-n"><b>{total}</b><span>{t('successes')}{auto + s.modSucc ? ` · ${auto + s.modSucc} ${t('autoSucc')}` : ''}</span></div>
            <div class="verdict-r">
              {pass === null ? <span>{t('resNoTn')}</span> : (
                <>
                  <strong>{pass ? t('resPass') : t('resFail')}</strong>
                  <span>{t('tn')} {s.tn} · {pass ? t('resExtra', { n: total - s.tn }) : t('resShort', { n: s.tn - total })}</span>
                </>
              )}
            </div>
          </div>
          <h3 class="sub">{t('afterRoll')}</h3>
          {!s.rerollSel && <p class="note">{t('tapToPip')}</p>}
          <div class="after">
            {s.pipStack.length > 0 && !s.rerollSel && <button type="button" class="btn btn-ghost btn-sm" onClick={undoPip}>↶ {t('undoPip')}</button>}
            {!s.rerolled && !s.rerollSel && <button type="button" class="btn btn-ghost btn-sm" disabled={left <= 0} onClick={() => upd({ rerollSel: [] })}>↻ {t('reroll')}</button>}
            {s.rerollSel && (
              <>
                <span class="note">{t('rerollPick')}</span>
                <button type="button" class="btn btn-primary btn-sm" disabled={!s.rerollSel.length} onClick={doReroll}>{t('rerollDo', { n: s.rerollSel.length })}</button>
                <button type="button" class="btn btn-ghost btn-sm" onClick={() => upd({ rerollSel: null })}>{t('cancel')}</button>
              </>
            )}
            {s.rerolled && <span class="note">{t('rerollUsed')}</span>}
          </div>
        </Section>
      )}
    </>
  )
}

function WhisperCost({ pathKey, c, auto, source, healFull, onBleed, onSource, onCard, onDeck, handEmpty }: {
  pathKey: string; c: AppData['characters'][number] | null; auto: number; source: boolean; healFull: boolean
  onBleed: (a: AttrKey) => void; onSource: () => void; onCard: () => void; onDeck: () => void; handEmpty: boolean
}) {
  const { t } = useApp()
  if (!c) return null
  return (
    <div class="wcost">
      <h3 class="sub"><Term k={pathKey} /> <InfoBtn id={`path-${pathKey}`} label={t(pathKey)} /> · {t('pathCost')}{auto > 0 && <span class="wcost-n"> · +{auto}</span>}</h3>
      <p class="note">{t('whisperPlan')}</p>
      {pathKey === 'bloodRites' && <><p class="note">{t('bloodCost')}</p>
        <button type="button" class="btn btn-ghost btn-sm" disabled={c.attrs.brawn.cur <= 1} onClick={() => onBleed('brawn')}>{t('bleed', { a: t('brawn') })}</button></>}
      {pathKey === 'chaosSongs' && <><p class="note">{t('chaosCost')}</p>
        <button type="button" class="btn btn-ghost btn-sm" disabled={c.attrs.guts.cur <= 1} onClick={() => onBleed('guts')}>{t('bleed', { a: t('guts') })}</button></>}
      {(pathKey === 'elemental' || pathKey === 'healingWords') && (
        <>
          <p class="note">{pathKey === 'elemental' ? t('elemCost') : t('healCost')}</p>
          <div class="after">
            <button type="button" class="btn btn-ghost btn-sm" disabled={handEmpty} onClick={onCard}>{t('discardForSucc')}</button>
            {pathKey === 'elemental' && handEmpty && <button type="button" class="btn btn-ghost btn-sm" onClick={onDeck}>{t('discardFromDeck')}</button>}
          </div>
          {pathKey === 'elemental' && (
            <label class="set-check" for="elem-src">
              <input id="elem-src" type="checkbox" class="box" checked={source} onChange={onSource} />
              <span>{t('elemSource')}</span>
            </label>
          )}
          {healFull && <p class="note note-ok">{t('healFull')}</p>}
        </>
      )}
      {pathKey === 'rottenTricks' && <p class="note">{t('rottenHint')}</p>}
      {pathKey === 'oldWays' && <p class="note">{t('oldWaysHint')}</p>}
    </div>
  )
}

function FreeRoll() {
  const { t } = useApp()
  const { d, dispatch } = useTools()
  const [n, setN] = useState(1)
  const [faces, setFaces] = useState<number[]>([])
  const [k, setK] = useState(0)
  const go = (count: number) => {
    const f = rollN(count)
    setFaces(f); setK(k + 1)
    const who = d.characters.find(c => c.id === d.activeId)?.name ?? ''
    const rec: RollRecord = { id: uid(), t: Date.now(), who, what: `${count}d6`, whatKind: 'plain', faces: f, auto: 0, successes: countSuccesses(f), tn: null, manips: 0, cards: 0 }
    dispatch({ t: 'rollPut', rec })
  }
  return (
    <Section id="free" titleKey="diceFree">
      <div class="manual">
        <div class="mini"><span class="mini-l">{t('freeDice')}</span><Stepper value={n} min={1} max={30} label={t('freeDice')} onChange={setN} /></div>
        <button type="button" class="btn btn-primary" onClick={() => go(n)}>{t('roll', { n })}</button>
        <button type="button" class="btn btn-ghost" onClick={() => go(1)}>{t('quickD6')}</button>
      </div>
      {faces.length > 0 && (
        <>
          <div class="dice-row" key={k}>{faces.map((f, i) => <Die face={f} label={`${i + 1}: ${f}`} tumble />)}</div>
          <div class="verdict">
            <div class="verdict-n"><b>{faces.reduce((a, b) => a + b, 0)}</b><span>{t('sum')}</span></div>
            <div class="verdict-n"><b>{countSuccesses(faces)}</b><span>{t('successes')} (5–6)</span></div>
          </div>
        </>
      )}
    </Section>
  )
}

function RollHistory() {
  const { t, settings } = useApp()
  const { d, dispatch, role } = useTools()
  const list = [...d.rolls].reverse()
  return (
    <Section id="rolls" titleKey="rollHistory" aside={list.length > 0 && role !== 'player' && <button type="button" class="btn btn-ghost btn-sm" onClick={() => dispatch({ t: 'rollsClear' })}>{t('clear')}</button>}>
      {list.length === 0 && <p class="note">{t('noRolls')}</p>}
      <ol class="rolls">
        {list.map(r => {
          const pass = r.tn === null ? null : r.successes >= r.tn
          return (
            <li class="rl">
              <div class="rl-top">
                <time class="log-t">{new Date(r.t).toLocaleTimeString(settings.lang, { hour: '2-digit', minute: '2-digit' })}</time>
                <span class="rl-what">{r.whatKind === 'plain' ? r.what : r.what ? t(r.what) : '—'}{r.who && <span class="rl-who"> · {r.who}</span>}</span>
                {r.whatKind !== 'plain' && (
                  <span class={`rl-res ${pass === null ? '' : pass ? 'good' : 'bad'}`}>{r.successes}{r.tn !== null ? ` / ${r.tn}` : ''}</span>
                )}
              </div>
              <div class="rl-faces">
                {r.faces.map(f => <span class={`mf ${f >= 5 ? 'ok' : ''}`}>{f}</span>)}
                {r.auto ? <span class="mf mf-auto">+{r.auto}</span> : null}
                {r.manips > 0 && <span class="rl-meta">+One×{r.manips}</span>}
                {r.cards > 0 && <span class="rl-meta">🂠×{r.cards}</span>}
              </div>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}
