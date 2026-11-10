import { useEffect, useState } from 'preact/hooks'
import { info, RANKS, SUITS, SUIT_SYMBOL, SUIT_THEME, buildDeck, growthCheck, valueLabel, type GrowthTarget } from '../cards'
import { where } from '../deckOps'
import { ATTRS, CREATION, HAND_MAX, SKILLS, SKILL_MAX, pathOf, type AttrKey } from '../rules'
import { diffTracked, setTracked, status, type AppData, type Character } from '../store'
import { ConfirmButton, Section, Stepper, useApp } from './ui'
import { CardFace, SoldierPicker, useTools } from './tools'

type Sub = 'hand' | 'deck' | 'init' | 'journey'

export function CardsView() {
  const { t } = useApp()
  const [sub, setSub] = useState<Sub>('hand')
  const { d, role } = useTools()
  const tabs: [Sub, string][] = [['hand', 'cHand'], ['deck', 'cDeck'], ['init', 'cInit'], ['journey', 'cJourney']]
  return (
    <div class="tool">
      <div class="tool-head">
        <h1 class="tool-title">{t('tabCards')}</h1>
        <div class="deck-mini" aria-label={t('inDeck')}>
          <span class="deck-stack" aria-hidden="true"><i /><i /><i /></span>
          <span><b>{d.deck.draw.length}</b> {t('inDeck').toLowerCase()} · {d.deck.discard.length} {t('inDiscard').toLowerCase()}</span>
          {role !== 'solo' && <span class="chip chip-table">{t('tblShared')}</span>}
        </div>
      </div>
      <div class="seg seg-wide" role="tablist">
        {tabs.map(([k, l]) => <button type="button" role="tab" aria-selected={sub === k} class={sub === k ? 'on' : ''} onClick={() => setSub(k)}>{t(l)}</button>)}
      </div>
      {sub === 'hand' && <HandView />}
      {sub === 'deck' && <DeckView />}
      {sub === 'init' && <InitiativeView />}
      {sub === 'journey' && <JourneyView />}
    </div>
  )
}

// ---------------- Hand ----------------
function HandView() {
  const { t, toast } = useApp()
  const { d, dispatch, canControl, role } = useTools()
  const c = d.characters.find(x => x.id === d.activeId && canControl(x.id)) ?? null
  const [sel, setSel] = useState<string[]>([])
  const [reward, setReward] = useState(2)
  const [mode, setMode] = useState<null | 'heal' | 'growth'>(null)
  useEffect(() => { setSel([]); setMode(null) }, [c?.id])
  useEffect(() => { if (c) setSel(s => s.filter(x => c.hand.includes(x))) }, [c?.hand.join()])

  if (!c) return <div class="tool-cols"><div class="col"><Section id="hand" titleKey="cHand"><SoldierPicker /><p class="note">{t(role === 'host' ? 'tblHostNoHand' : 'noSoldiers')}</p></Section></div></div>

  const play = (cards: string[], reason: string, sets?: [string, number][], vars?: Record<string, string | number>) => {
    dispatch({ t: 'play', char: c.id, cards, reason, sets, vars }); setSel([]); setMode(null)
  }
  const heal = (a: AttrKey) => play(sel.slice(0, 1), 'logHeal', [[`attr.${a}.cur`, c.attrs[a].cur + 1]], { a: t(a) })

  return (
    <div class="tool-cols">
      <div class="col">
        <Section id="hand" titleKey="cHand" aside={<span class="count-pill">{t('handCount', { n: c.hand.length })}</span>}>
          <SoldierPicker id="hand-soldier" />
          {c.hand.length === 0 ? <p class="note">{t('noCards')}</p> : <p class="note">{t('selectHint')}</p>}
          <div class="hand">
            {c.hand.map(h => (
              <CardFace id={h} selected={sel.includes(h)} onClick={() => setSel(sel.includes(h) ? sel.filter(x => x !== h) : [...sel, h])} />
            ))}
            {Array.from({ length: Math.max(0, HAND_MAX - c.hand.length) }, () => <span class="pcard pcard-slot" aria-hidden="true" />)}
          </div>
          {sel.length > 0 && (
            <div class="sel-bar">
              <span class="note">{t('selected', { n: sel.length })}</span>
              <button type="button" class="btn btn-ghost btn-sm" onClick={() => play(sel, 'logDiscard')}>{t('discard')}</button>
              <button type="button" class={`btn btn-ghost btn-sm ${mode === 'heal' ? 'is-on' : ''}`} disabled={sel.length !== 1} onClick={() => setMode(mode === 'heal' ? null : 'heal')}>{t('burnHeal')}</button>
              <button type="button" class={`btn btn-ghost btn-sm ${mode === 'growth' ? 'is-on' : ''}`} onClick={() => setMode(mode === 'growth' ? null : 'growth')}>{t('growth')}</button>
            </div>
          )}
          {mode === 'heal' && sel.length === 1 && (
            <div class="sub-panel">
              <p class="note">{t('burnHealHint')}</p>
              <div class="after">
                {ATTRS.map(a => {
                  const full = c.attrs[a].cur >= c.attrs[a].max
                  return <button type="button" class="btn btn-ghost btn-sm" disabled={full} onClick={() => heal(a)}>{t('healAttr', { a: t(a) })} · {c.attrs[a].cur}/{c.attrs[a].max}{full ? ` (${t('atMax')})` : ''}</button>
                })}
              </div>
            </div>
          )}
          {mode === 'growth' && <Growth c={c} sel={sel} onBuy={(keep, next, labelText) => { play(sel.filter(x => x !== keep), 'logGrowth', diffTracked(c, next)); toast(t('growthDone', { x: labelText })) }} />}
        </Section>
      </div>
      <div class="col">
        <Section id="hand-draw" titleKey="drawTitle">
          <div class="after">
            <button type="button" class="btn btn-primary" disabled={c.hand.length >= HAND_MAX} onClick={() => dispatch({ t: 'draw', char: c.id, n: 1 })}>{t('draw1')}</button>
            {c.hand.length === 0 && c.missions === 0 && <button type="button" class="btn btn-ghost" onClick={() => dispatch({ t: 'draw', char: c.id, n: CREATION.startCards })}>{t('deploy')}</button>}
          </div>
          <h3 class="sub">{t('reward')}</h3>
          <div class="manual">
            <Stepper value={reward} min={1} max={7} label={t('reward')} onChange={setReward} />
            <button type="button" class="btn btn-ghost" disabled={c.hand.length >= HAND_MAX} onClick={() => dispatch({ t: 'draw', char: c.id, n: reward, reason: 'logReward' })}>{t('drawN', { n: reward })}</button>
          </div>
          <p class="note">{t('rewardHint')}</p>
        </Section>
        <Section id="hand-corr" titleKey="corruption" class="sect-corr">
          <p class="note">{t('corruptionHint')}</p>
          <button type="button" class="btn btn-ghost" onClick={() => dispatch({ t: 'corruption', char: c.id })}>{t('corrDraw')}</button>
        </Section>
      </div>
    </div>
  )
}

function Growth({ c, sel, onBuy }: { c: Character; sel: string[]; onBuy: (keep: string | null, next: Character, label: string) => void }) {
  const { t } = useApp()
  const trainedCount = SKILLS.filter(s => c.skills[s.key].trained).length + c.whispers.filter(w => w.path).length
  const extraNext = Math.max(0, trainedCount - CREATION.trainedSkills) + 1
  const options: { id: string; label: string; target: GrowthTarget; key: string }[] = []
  for (const a of ATTRS) options.push({ id: `a:${a}`, label: t('growthAttr', { a: t(a), n: c.attrs[a].max + 1 }), target: { kind: 'attr', key: a, newRank: c.attrs[a].max + 1 }, key: `attr.${a}.max` })
  for (const s of SKILLS) {
    const sk = c.skills[s.key]
    if (!sk.trained) options.push({ id: `n:${s.key}`, label: t('growthSkill', { s: t(s.key) }), target: { kind: 'skill', key: s.key, extraIndex: extraNext }, key: `skill.${s.key}.trained` })
    else if (sk.dice < SKILL_MAX) options.push({ id: `p:${s.key}`, label: t('growthPip', { s: t(s.key), n: sk.dice + 1 }), target: { kind: 'pip', key: s.key, newPip: sk.dice + 1 }, key: `skill.${s.key}.dice` })
  }
  for (const w of c.whispers) {
    const p = pathOf(w.path)
    if (p && w.dice < SKILL_MAX) options.push({ id: `w:${w.id}`, label: t('growthPip', { s: t(p.key), n: w.dice + 1 }), target: { kind: 'pip', key: w.id, newPip: w.dice + 1 }, key: `wh.${w.id}.dice` })
  }
  const [opt, setOpt] = useState(options[0]?.id ?? '')
  const [keep, setKeep] = useState<string | null>(null)
  const o = options.find(x => x.id === opt) ?? options[0]
  if (!o) return null
  const chk = growthCheck(sel, o.target)
  const keepCard = chk.keepOne ? (keep && sel.includes(keep) ? keep : sel[sel.length - 1]) : null

  const next = (x: Character): Character => {
    const steps = 1 + chk.bonus
    let n = x
    if (o.target.kind === 'attr') {
      const a = o.target.key as AttrKey
      n = setTracked(n, `attr.${a}.max`, n.attrs[a].max + steps)
      n = setTracked(n, `attr.${a}.cur`, n.attrs[a].cur + steps)
    } else if (o.target.kind === 'skill') {
      n = setTracked(n, o.key, 1)
      if (chk.bonus) n = setTracked(n, `skill.${o.target.key}.dice`, 1)
    } else {
      const cur = o.key.startsWith('wh.') ? n.whispers.find(w => w.id === o.target.key)!.dice : n.skills[o.target.key as keyof Character['skills']].dice
      n = setTracked(n, o.key, Math.min(SKILL_MAX, cur + steps))
    }
    return n
  }
  return (
    <div class="sub-panel">
      <p class="note">{t('growthOnlyEnd')}</p>
      <label class="fld" for="growth-opt"><span class="fld-l">{t('growthTarget')}</span>
        <select id="growth-opt" value={o.id} onChange={e => setOpt((e.target as HTMLSelectElement).value)}>
          {options.map(x => <option value={x.id}>{x.label}</option>)}
        </select>
      </label>
      <ul class="checks">
        <li class={chk.problems.includes('notEnough') ? 'todo' : 'ok'}>{t('growthNeed', { n: chk.base })} · {t('selected', { n: sel.length })}</li>
        {o.target.kind === 'attr' && <li class={chk.problems.includes('needRed') ? 'todo' : 'ok'}>{t('growthRed')}</li>}
        {chk.sameSuit && sel.length > 1 && <li class="ok">{t('growthSame')}</li>}
        {chk.allFace && <li class="ok">{t('growthFace')}</li>}
      </ul>
      {chk.keepOne && chk.ok && (
        <div class="fld"><span class="fld-l">{t('growthKeep')}</span>
          <div class="hand-row">{sel.map(h => <CardFace small id={h} selected={h === keepCard} onClick={() => setKeep(h)} />)}</div>
        </div>
      )}
      <button type="button" class="btn btn-primary" disabled={!chk.ok} onClick={() => onBuy(keepCard, next(c), o.label)}>{t('growthApply')}</button>
    </div>
  )
}

// ---------------- Deck ----------------
function DeckView() {
  const { t, settings } = useApp()
  const { d, dispatch, role, lastCard, canControl } = useTools()
  const [decks, setDecks] = useState<1 | 2>(d.deck.decks)
  const [jokers, setJokers] = useState(d.deck.jokers)
  const narrator = role !== 'player'
  const inHands = d.characters.reduce((s, c) => s + c.hand.length, 0)
  const all = buildDeck({ decks: d.deck.decks, jokers: d.deck.jokers })
  const fmtLog = (e: AppData['deck']['log'][number]) => t(e.text, e.vars)
  // A player only knows their own hand; other hands look like the deck.
  const locate = (id: string) => {
    const w = where(d, id)
    if (w.kind === 'hand') { const owner = d.characters.find(c => c.hand.includes(id)); if (owner && !canControl(owner.id) && role === 'player') return { kind: 'draw' as const } }
    return w
  }

  return (
    <div class="tool-cols">
      <div class="col">
        <Section id="deck" titleKey="cDeck">
          <div class="deck-state">
            <div class="ds"><span class="deck-stack big" aria-hidden="true"><i /><i /><i /></span><b>{d.deck.draw.length}</b><span>{t('inDeck')}</span></div>
            <div class="ds"><b>{d.deck.discard.length}</b><span>{t('inDiscard')}</span></div>
            <div class="ds"><b>{inHands}</b><span>{t('inHands')}</span></div>
          </div>
          <div class="deck-bar" aria-hidden="true">
            <i class="seg-draw" style={{ flex: d.deck.draw.length }} /><i class="seg-hand" style={{ flex: inHands }} /><i class="seg-disc" style={{ flex: d.deck.discard.length }} />
          </div>
          {narrator ? (
            <>
              <div class="after">
                <button type="button" class="btn btn-primary" onClick={() => dispatch({ t: 'reveal' })}>{t('revealTop')}</button>
                <ConfirmButton label={t('shuffleDiscards')} confirmLabel={t('confirmDelete')} onConfirm={() => dispatch({ t: 'shuffle' })} />
              </div>
              <p class="note">{t('shuffleHint')}</p>
              {lastCard && <div class="last-card"><CardFace id={lastCard} /><p class="note">{info(lastCard).suit ? t(SUIT_THEME[info(lastCard).suit!]) : t('themeJ')}</p></div>}
            </>
          ) : <p class="note">{t('tblDeckIsNarrators')}</p>}
        </Section>
        {narrator && (
          <Section id="deck-setup" titleKey="deckSetup">
            <div class="seg" role="radiogroup">
              <button type="button" role="radio" aria-checked={decks === 1} class={decks === 1 ? 'on' : ''} onClick={() => setDecks(1)}>{t('oneDeck')}</button>
              <button type="button" role="radio" aria-checked={decks === 2} class={decks === 2 ? 'on' : ''} onClick={() => setDecks(2)}>{t('twoDecks')}</button>
            </div>
            <label class="set-check" for="deck-jokers">
              <input id="deck-jokers" type="checkbox" class="box" checked={jokers} onChange={e => setJokers((e.target as HTMLInputElement).checked)} />
              <span>{t('withJokers')}</span>
            </label>
            <p class="note">{t('rebuildHint')}</p>
            <ConfirmButton label={t('rebuild')} confirmLabel={t('confirmDelete')} onConfirm={() => dispatch({ t: 'rebuild', decks, jokers })} />
          </Section>
        )}
      </div>
      <div class="col">
        <Section id="deck-map" titleKey="deckMap">
          <div class="legend"><span><i class="lg lg-deck" />{t('legendDeck')}</span><span><i class="lg lg-hand" />{t('legendHand')}</span><span><i class="lg lg-disc" />{t('legendDiscard')}</span></div>
          {Array.from({ length: d.deck.decks }, (_, di) => (
            <div class="dmap" key={di}>
              {SUITS.map(s => (
                <div class="dmap-row">
                  <span class={`dmap-suit ${s === 'H' || s === 'D' ? 'red' : ''}`}>{SUIT_SYMBOL[s]}</span>
                  {RANKS.map(r => {
                    const id = `${r}${s}${di ? '~2' : ''}`
                    const w = locate(id)
                    return <span class={`dm dm-${w.kind}`} title={'who' in w && w.who ? `${r}${SUIT_SYMBOL[s]} · ${w.who}` : `${r}${SUIT_SYMBOL[s]}`}>{r}</span>
                  })}
                </div>
              ))}
              {d.deck.jokers && (
                <div class="dmap-row">
                  <span class="dmap-suit">★</span>
                  {['XR', 'XB'].map(j => { const id = `${j}${di ? '~2' : ''}`; const w = locate(id); return <span class={`dm dm-wide dm-${w.kind} ${j === 'XR' ? 'red' : ''}`}>{j === 'XR' ? 'Joker ●' : 'Joker ○'}</span> })}
                </div>
              )}
            </div>
          ))}
          <p class="note">{all.length} · {t('inDeck')} {d.deck.draw.length}</p>
        </Section>
        <Section id="deck-log" titleKey="deckLog">
          <ol class="log">
            {[...d.deck.log].reverse().slice(0, 40).map(e => (
              <li class="log-e log-e-cards">
                <time class="log-t">{new Date(e.t).toLocaleTimeString(settings.lang, { hour: '2-digit', minute: '2-digit' })}</time>
                <span class="log-l">{fmtLog(e)}</span>
                <span class="log-cards">{e.cards?.map(id => <span class={`mini-card ${info(id).red ? 'red' : ''}`}>{id.startsWith('X') ? '★' : `${info(id).rank}${SUIT_SYMBOL[info(id).suit!]}`}</span>)}</span>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  )
}

// ---------------- Initiative ----------------
function InitiativeView() {
  const { t } = useApp()
  const { d, dispatch, canControl, seatIds, role } = useTools()
  const [npcName, setNpcName] = useState('')
  const [npcVal, setNpcVal] = useState(6)
  const narrator = role !== 'player'
  const entries = d.initiative
  const seats = d.characters.filter(c => seatIds.includes(c.id) && status(c) === 'active')
  const addNpc = () => { if (!npcName.trim()) return; dispatch({ t: 'initNpc', name: npcName.trim(), value: npcVal }); setNpcName('') }
  const order = [...entries].sort((a, b) => b.value - a.value)
  const top = order[0]?.value
  const tied = order.filter(e => e.value === top).length > 1

  return (
    <div class="tool-cols">
      <div class="col">
        <Section id="init-pcs" titleKey="cInit">
          <p class="note">{t('initNotDiscarded')}</p>
          <ul class="init-pcs">
            {seats.map(c => {
              const shown = entries.find(e => e.kind === 'pc' && e.ref === c.id)
              const mine = canControl(c.id)
              return (
                <li class="init-pc">
                  <div class="init-pc-h"><strong>{c.name || t('unnamed')}</strong><span class="note">{t('handCount', { n: c.hand.length })}</span></div>
                  {mine ? (
                    <>
                      <div class="hand-row">
                        {c.hand.map(h => <CardFace small id={h} selected={shown?.card === h} onClick={() => dispatch({ t: 'initShow', char: c.id, card: shown?.card === h ? null : h })} />)}
                        {c.hand.length === 0 && <button type="button" class="btn btn-ghost btn-sm" onClick={() => dispatch({ t: 'initDeck', char: c.id })}>{t('initFromDeck')}</button>}
                      </div>
                      {c.hand.length === 0 && <p class="note">{t('initFromDeckHint')}</p>}
                    </>
                  ) : <p class="note">{shown ? t('tblShown') : t('tblWaiting')}</p>}
                </li>
              )
            })}
            {seats.length === 0 && <p class="note">{t(role === 'host' ? 'tblNobody' : 'noSoldiers')}</p>}
          </ul>
        </Section>
        {narrator && (
          <Section id="init-npc" titleKey="initAddNpc">
            <div class="id-grid">
              <label class="fld" for="npc-name"><span class="fld-l">{t('initNpcName')}</span>
                <input id="npc-name" value={npcName} onInput={e => setNpcName((e.target as HTMLInputElement).value)} onKeyDown={e => e.key === 'Enter' && addNpc()} /></label>
              <label class="fld" for="npc-val"><span class="fld-l">{t('initValue')}</span>
                <select id="npc-val" value={npcVal} onChange={e => setNpcVal(Number((e.target as HTMLSelectElement).value))}>
                  {Array.from({ length: 13 }, (_, i) => i + 2).map(v => <option value={v}>{valueLabel(v)}</option>)}
                </select></label>
              <button type="button" class="btn btn-ghost" disabled={!npcName.trim()} onClick={addNpc}>+ {t('initAddNpc')}</button>
            </div>
          </Section>
        )}
      </div>
      <div class="col">
        <Section id="init-order" titleKey="initTitle" aside={narrator && entries.length > 0 && <button type="button" class="btn btn-ghost btn-sm" onClick={() => dispatch({ t: 'initClear' })}>{t('initClear')}</button>}>
          <p class="note">{t('initHint')}</p>
          {order.length === 0 && <p class="note">{t('initEmpty')}</p>}
          <ol class="init-order">
            {order.map((e, i) => (
              <li class={`io ${e.value === top ? 'is-top' : ''}`}>
                <span class="io-n">{i + 1}</span>
                <span class="io-card">{e.card ? <CardFace small id={e.card} /> : <span class="npc-val">{valueLabel(e.value)}</span>}</span>
                <span class="io-name">{e.name}{e.kind === 'npc' && <span class="desc">{t('initValue')}</span>}
                  {e.value === top && <span class="io-win">{tied ? t('initTie') : t('initWinner')}</span>}</span>
                {(narrator || (e.kind === 'pc' && canControl(e.ref))) && (
                  <button type="button" class="x" aria-label={`${t('remove')}: ${e.name}`}
                    onClick={() => dispatch(e.kind === 'pc' ? { t: 'initShow', char: e.ref, card: null } : { t: 'initRemove', id: e.id })}>×</button>
                )}
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  )
}

// ---------------- Journey ----------------
function JourneyView() {
  const { t } = useApp()
  const { d, dispatch, canControl, seatIds, role } = useTools()
  const narrator = role !== 'player'
  const j = d.journey
  const seats = d.characters.filter(c => seatIds.includes(c.id) && status(c) === 'active')
  const [extra, setExtra] = useState(0)
  const [narr, setNarr] = useState(0)
  const [req, setReq] = useState('')
  const [avoid, setAvoid] = useState('')
  const [blackDone, setBlackDone] = useState(false)
  useEffect(() => setBlackDone(false), [j?.dealt.map(x => x.card).join()])

  if (j) {
    const nameOf = (id: string) => (id === 'narrator' ? t('jNarratorCard') : d.characters.find(c => c.id === id)?.name || t('unnamed'))
    const shown = j.dealt.filter(x => x.revealed && x.card !== '?').map(x => info(x.card))
    const counts = SUITS.map(s => [s, shown.filter(c => c.suit === s).length] as const)
    const black = narrator && j.dealt.some(x => x.card.startsWith('XB'))
    return (
      <div class="tool-cols">
        <div class="col">
          <Section id="journey" titleKey="jTitle">
            {(j.req || j.avoid) && <p class="j-req">{j.req && <><b>{t('jReq')}:</b> {j.req}</>}{j.avoid && <><br /><b>{t('jAvoid')}:</b> {j.avoid}</>}</p>}
            <p class="note">{t('jTheme')}</p>
            <ul class="j-dealt">
              {j.dealt.map((x, i) => {
                const known = x.card !== '?'
                const canFlip = narrator || canControl(x.to)
                const ci = known ? info(x.card) : null
                return (
                  <li class="jd">
                    {canFlip
                      ? <CardFace id={known ? x.card : 'XR'} faceDown={!x.revealed} onClick={() => dispatch({ t: 'jReveal', i })} label={x.revealed ? undefined : t('jReveal')} />
                      : <CardFace id={known ? x.card : 'XR'} faceDown={!x.revealed || !known} />}
                    <div class="jd-txt">
                      <strong>{nameOf(x.to)}</strong>
                      <span class="note">{x.revealed && ci ? (ci.suit ? t(SUIT_THEME[ci.suit]) : t('themeJ')) : canFlip ? t('jReveal') : t('tblWaiting')}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Section>
        </div>
        <div class="col">
          <Section id="journey-check" titleKey="jCheck">
            <div class="suit-count">{counts.map(([s, n]) => <span class={s === 'H' || s === 'D' ? 'red' : ''}>{SUIT_SYMBOL[s]} <b>{n}</b></span>)}</div>
            {black && !blackDone && (
              <div class="sub-panel">
                <p class="note note-stamp">{t('jBlack')}</p>
                <div class="after">{seats.map(c => (
                  <button type="button" class="btn btn-ghost btn-sm" onClick={() => { dispatch({ t: 'corruption', char: c.id }); setBlackDone(true) }}>{c.name || t('unnamed')}</button>
                ))}</div>
              </div>
            )}
            {narrator ? <button type="button" class="btn btn-primary" onClick={() => dispatch({ t: 'jFinish' })}>{t('jFinish')}</button> : <p class="note">{t('tblJourneyNarrator')}</p>}
          </Section>
        </div>
      </div>
    )
  }

  return (
    <div class="tool-cols">
      <div class="col">
        <Section id="journey" titleKey="jTitle">
          {narrator && (
            <div class="id-grid">
              <label class="fld" for="j-req"><span class="fld-l">{t('jReq')}</span><input id="j-req" value={req} placeholder={t('jReqPh')} onInput={e => setReq((e.target as HTMLInputElement).value)} /></label>
              <label class="fld" for="j-avoid"><span class="fld-l">{t('jAvoid')}</span><input id="j-avoid" value={avoid} placeholder={t('jAvoidPh')} onInput={e => setAvoid((e.target as HTMLInputElement).value)} /></label>
            </div>
          )}
          <p class="note">{t('jContribute')}</p>
          <ul class="init-pcs">
            {seats.map(c => {
              const picked = d.journeyPicks[c.id] ?? []
              return (
                <li class="init-pc">
                  <div class="init-pc-h"><strong>{c.name || t('unnamed')}</strong><span class="note">{t('handCount', { n: c.hand.length })}</span></div>
                  {c.hand.length === 0 ? <p class="note">{t('jFromDeck')}</p> : canControl(c.id) ? (
                    <div class="hand-row">{c.hand.map(h => {
                      const on = picked.includes(h)
                      return <CardFace small id={h} selected={on} onClick={() => dispatch({ t: 'jPick', char: c.id, cards: on ? picked.filter(x => x !== h) : [...picked, h] })} />
                    })}</div>
                  ) : <p class="note">{picked.length ? t('tblPicked', { n: picked.length }) : t('tblWaiting')}</p>}
                </li>
              )
            })}
            {seats.length === 0 && <p class="note">{t(role === 'host' ? 'tblNobody' : 'noSoldiers')}</p>}
          </ul>
        </Section>
      </div>
      {narrator && (
        <div class="col">
          <Section id="journey-deal" titleKey="jDealTitle">
            <div class="mini"><span class="mini-l">{t('jExtra')}</span><Stepper value={extra} min={0} max={Math.max(1, seats.length)} label={t('jExtra')} onChange={setExtra} /></div>
            <p class="note">{t('jExtraHint')}</p>
            <div class="mini"><span class="mini-l">{t('jNarrator')}</span><Stepper value={narr} min={0} max={10} label={t('jNarrator')} onChange={setNarr} /></div>
            <button type="button" class="btn btn-primary" disabled={seats.length === 0} onClick={() => dispatch({ t: 'jDeal', req, avoid, extra, narr, seats: seats.map(c => c.id) })}>{t('jDeal')}</button>
          </Section>
        </div>
      )}
    </div>
  )
}
