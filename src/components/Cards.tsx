import { useEffect, useState } from 'preact/hooks'
import { info, RANKS, SUITS, SUIT_SYMBOL, SUIT_THEME, buildDeck, growthCheck, initiativeValue, shuffle, valueLabel, type GrowthTarget } from '../cards'
import { corruptionDraw, drawToHand, playFromHand, rebuildDeck, revealTop, shuffleDiscards, where } from '../deckOps'
import { ATTRS, CREATION, HAND_MAX, SKILLS, SKILL_MAX, pathOf, type AttrKey } from '../rules'
import { setTracked, status, uid, type AppData, type Character, type InitEntry } from '../store'
import { ConfirmButton, Section, Stepper, useApp } from './ui'
import { CardFace, SoldierPicker, useTools } from './tools'

type Sub = 'hand' | 'deck' | 'init' | 'journey'

export function CardsView() {
  const { t } = useApp()
  const [sub, setSub] = useState<Sub>('hand')
  const { d } = useTools()
  const tabs: [Sub, string][] = [['hand', 'cHand'], ['deck', 'cDeck'], ['init', 'cInit'], ['journey', 'cJourney']]
  return (
    <div class="tool">
      <div class="tool-head">
        <h1 class="tool-title">{t('tabCards')}</h1>
        <div class="deck-mini" aria-label={t('inDeck')}>
          <span class="deck-stack" aria-hidden="true"><i /><i /><i /></span>
          <span><b>{d.deck.draw.length}</b> {t('inDeck').toLowerCase()} · {d.deck.discard.length} {t('inDiscard').toLowerCase()}</span>
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
  const { d, apply, showCorruption } = useTools()
  const c = d.characters.find(x => x.id === d.activeId) ?? null
  const [sel, setSel] = useState<string[]>([])
  const [reward, setReward] = useState(2)
  const [mode, setMode] = useState<null | 'heal' | 'growth'>(null)
  useEffect(() => { setSel([]); setMode(null) }, [c?.id])
  useEffect(() => { if (c) setSel(s => s.filter(x => c.hand.includes(x))) }, [c?.hand.join()])

  if (!c) return <div class="tool-cols"><div class="col"><Section id="hand" titleKey="cHand"><SoldierPicker /><p class="note">{t('noSoldiers')}</p></Section></div></div>

  const draw = (n: number, reason = 'logDraw') => {
    let blocked = 0, got = 0
    apply(dd => { const r = drawToHand(dd, c.id, n, reason); blocked = r.blocked; got = r.drawn.length; return r.d })
    setTimeout(() => { if (blocked) toast(t('handFull', { n: blocked })); else if (!got) toast(t('deckEmpty')) }, 0)
  }
  const play = (cards: string[], reason: string, extra?: (dd: AppData) => AppData, vars: Record<string, string | number> = {}) => {
    apply(dd => {
      const r = playFromHand(dd, c.id, cards, reason, vars)
      let out = extra ? extra(r.d) : r.d
      if (r.blackJoker) {
        const cr = corruptionDraw(out, c.id); out = cr.d
        setTimeout(() => { toast(t('corrBlackJoker')); showCorruption({ ...cr, who: c.name || t('unnamed') }) }, 0)
      } else if (r.joker) setTimeout(() => toast(t('logJoker')), 0)
      return out
    })
    setSel([]); setMode(null)
  }
  const heal = (a: AttrKey) => play(sel.slice(0, 1), 'logHeal',
    dd => ({ ...dd, characters: dd.characters.map(x => (x.id === c.id ? setTracked(x, `attr.${a}.cur`, x.attrs[a].cur + 1) : x)) }), { a: t(a) })
  const corr = () => {
    apply(dd => { const r = corruptionDraw(dd, c.id); setTimeout(() => showCorruption({ ...r, who: c.name || t('unnamed') }), 0); return r.d })
  }

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
            {Array.from({ length: HAND_MAX - c.hand.length }, () => <span class="pcard pcard-slot" aria-hidden="true" />)}
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
          {mode === 'growth' && <Growth c={c} sel={sel} onBuy={(keep, f, labelText) => { play(sel.filter(x => x !== keep), 'logGrowth', dd => ({ ...dd, characters: dd.characters.map(x => (x.id === c.id ? f(x) : x)) })); toast(t('growthDone', { x: labelText })) }} />}
        </Section>
      </div>
      <div class="col">
        <Section id="hand-draw" titleKey="drawTitle">
          <div class="after">
            <button type="button" class="btn btn-primary" disabled={c.hand.length >= HAND_MAX} onClick={() => draw(1)}>{t('draw1')}</button>
            {c.hand.length === 0 && c.missions === 0 && <button type="button" class="btn btn-ghost" onClick={() => draw(CREATION.startCards)}>{t('deploy')}</button>}
          </div>
          <h3 class="sub">{t('reward')}</h3>
          <div class="manual">
            <Stepper value={reward} min={1} max={7} label={t('reward')} onChange={setReward} />
            <button type="button" class="btn btn-ghost" disabled={c.hand.length >= HAND_MAX} onClick={() => draw(reward, 'logReward')}>{t('drawN', { n: reward })}</button>
          </div>
          <p class="note">{t('rewardHint')}</p>
        </Section>
        <Section id="hand-corr" titleKey="corruption" class="sect-corr">
          <p class="note">{t('corruptionHint')}</p>
          <button type="button" class="btn btn-ghost" onClick={corr}>{t('corrDraw')}</button>
        </Section>
      </div>
    </div>
  )
}

function Growth({ c, sel, onBuy }: { c: Character; sel: string[]; onBuy: (keep: string | null, f: (c: Character) => Character, label: string) => void }) {
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

  const apply = (x: Character): Character => {
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
      <button type="button" class="btn btn-primary" disabled={!chk.ok} onClick={() => onBuy(keepCard, apply, o.label)}>{t('growthApply')}</button>
    </div>
  )
}

// ---------------- Deck ----------------
function DeckView() {
  const { t, settings } = useApp()
  const { d, apply } = useTools()
  const [last, setLast] = useState<string | null>(null)
  const [decks, setDecks] = useState<1 | 2>(d.deck.decks)
  const [jokers, setJokers] = useState(d.deck.jokers)
  const inHands = d.characters.reduce((s, c) => s + c.hand.length, 0)
  const all = buildDeck({ decks: d.deck.decks, jokers: d.deck.jokers })
  const reveal = () => apply(dd => { const r = revealTop(dd); setLast(r.card); return r.d })
  const fmtLog = (e: AppData['deck']['log'][number]) => t(e.text, e.vars)

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
          <div class="after">
            <button type="button" class="btn btn-primary" onClick={reveal}>{t('revealTop')}</button>
            <ConfirmButton label={t('shuffleDiscards')} confirmLabel={t('confirmDelete')} onConfirm={() => apply(shuffleDiscards)} />
          </div>
          <p class="note">{t('shuffleHint')}</p>
          {last && <div class="last-card"><CardFace id={last} /><p class="note">{info(last).suit ? t(SUIT_THEME[info(last).suit!]) : t('themeJ')}</p></div>}
        </Section>
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
          <ConfirmButton label={t('rebuild')} confirmLabel={t('confirmDelete')} onConfirm={() => apply(dd => rebuildDeck(dd, decks, jokers))} />
        </Section>
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
                    const w = where(d, id)
                    return <span class={`dm dm-${w.kind}`} title={w.who ? `${r}${SUIT_SYMBOL[s]} · ${w.who}` : `${r}${SUIT_SYMBOL[s]}`}>{r}</span>
                  })}
                </div>
              ))}
              {d.deck.jokers && (
                <div class="dmap-row">
                  <span class="dmap-suit">★</span>
                  {['XR', 'XB'].map(j => { const id = `${j}${di ? '~2' : ''}`; const w = where(d, id); return <span class={`dm dm-wide dm-${w.kind} ${j === 'XR' ? 'red' : ''}`}>{j === 'XR' ? 'Joker ●' : 'Joker ○'}</span> })}
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
  const { d, apply } = useTools()
  const [npcName, setNpcName] = useState('')
  const [npcVal, setNpcVal] = useState(6)
  const entries = d.initiative
  const setEntries = (f: (e: InitEntry[]) => InitEntry[]) => apply(dd => ({ ...dd, initiative: f(dd.initiative) }))
  const active = d.characters.filter(c => status(c) === 'active')

  const showCard = (c: Character, card: string | null) => setEntries(es => {
    const rest = es.filter(e => !(e.kind === 'pc' && e.ref === c.id))
    return card ? [...rest, { id: uid(), kind: 'pc', ref: c.id, name: c.name || t('unnamed'), card, value: initiativeValue(card) }] : rest
  })
  const fromDeck = (c: Character) => apply(dd => {
    const r = revealTop(dd, 'logInit', { who: c.name || '—' })
    if (!r.card) return r.d
    const e: InitEntry = { id: uid(), kind: 'pc', ref: c.id, name: c.name || t('unnamed'), card: r.card, value: initiativeValue(r.card) }
    return { ...r.d, initiative: [...r.d.initiative.filter(x => !(x.kind === 'pc' && x.ref === c.id)), e] }
  })
  const addNpc = () => {
    if (!npcName.trim()) return
    setEntries(es => [...es, { id: uid(), kind: 'npc', ref: '', name: npcName.trim(), card: null, value: npcVal }])
    setNpcName('')
  }
  const order = [...entries].sort((a, b) => b.value - a.value)
  const top = order[0]?.value
  const tied = order.filter(e => e.value === top).length > 1

  return (
    <div class="tool-cols">
      <div class="col">
        <Section id="init-pcs" titleKey="cInit">
          <p class="note">{t('initNotDiscarded')}</p>
          <ul class="init-pcs">
            {active.map(c => {
              const shown = entries.find(e => e.kind === 'pc' && e.ref === c.id)
              return (
                <li class="init-pc">
                  <div class="init-pc-h"><strong>{c.name || t('unnamed')}</strong><span class="note">{t('handCount', { n: c.hand.length })}</span></div>
                  <div class="hand-row">
                    {c.hand.map(h => <CardFace small id={h} selected={shown?.card === h} onClick={() => showCard(c, shown?.card === h ? null : h)} />)}
                    {c.hand.length === 0 && <button type="button" class="btn btn-ghost btn-sm" onClick={() => fromDeck(c)}>{t('initFromDeck')}</button>}
                  </div>
                  {c.hand.length === 0 && <p class="note">{t('initFromDeckHint')}</p>}
                </li>
              )
            })}
          </ul>
        </Section>
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
      </div>
      <div class="col">
        <Section id="init-order" titleKey="initTitle" aside={entries.length > 0 && <button type="button" class="btn btn-ghost btn-sm" onClick={() => setEntries(() => [])}>{t('initClear')}</button>}>
          <p class="note">{t('initHint')}</p>
          {order.length === 0 && <p class="note">{t('initEmpty')}</p>}
          <ol class="init-order">
            {order.map((e, i) => (
              <li class={`io ${e.value === top ? 'is-top' : ''}`}>
                <span class="io-n">{i + 1}</span>
                <span class="io-card">{e.card ? <CardFace small id={e.card} /> : <span class="npc-val">{valueLabel(e.value)}</span>}</span>
                <span class="io-name">{e.name}{e.kind === 'npc' && <span class="desc">{t('initValue')}</span>}
                  {e.value === top && <span class="io-win">{tied ? t('initTie') : t('initWinner')}</span>}</span>
                <button type="button" class="x" aria-label={`${t('remove')}: ${e.name}`} onClick={() => setEntries(es => es.filter(x => x.id !== e.id))}>×</button>
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
  const { t, toast } = useApp()
  const { d, apply, showCorruption } = useTools()
  const j = d.journey
  const active = d.characters.filter(c => status(c) === 'active')
  const [picks, setPicks] = useState<Record<string, string[]>>({})
  const [extra, setExtra] = useState(0)
  const [narr, setNarr] = useState(0)
  const [req, setReq] = useState('')
  const [avoid, setAvoid] = useState('')
  const [blackFrom, setBlackFrom] = useState<string | null>(null)

  const missing = active.filter(c => c.hand.length > 0 && !(picks[c.id]?.length))
  const deal = () => {
    if (missing.length) { toast(t('jNeedOne', { who: missing[0].name || t('unnamed') })); return }
    apply(dd => {
      let out = dd
      const pool: { card: string; from: string }[] = []
      for (const c of active) {
        const mine = (picks[c.id] ?? []).filter(x => c.hand.includes(x))
        if (mine.length) {
          out = { ...out, characters: out.characters.map(x => (x.id === c.id ? { ...x, hand: x.hand.filter(h => !mine.includes(h)) } : x)) }
          mine.forEach(card => pool.push({ card, from: c.id }))
        } else {
          const r = out.deck.draw[0]; if (r) { out = { ...out, deck: { ...out.deck, draw: out.deck.draw.slice(1) } }; pool.push({ card: r, from: '' }) }
        }
      }
      for (let i = 0; i < extra + narr; i++) {
        const r = out.deck.draw[0]; if (r) { out = { ...out, deck: { ...out.deck, draw: out.deck.draw.slice(1) } }; pool.push({ card: r, from: '' }) }
      }
      const shuffled = shuffle(pool)
      const black = pool.find(p => p.card.startsWith('XB'))
      setBlackFrom(black ? black.from || 'deck' : null)
      const dealt = shuffled.map((p, i) => ({ to: i < active.length ? active[i].id : 'narrator', card: p.card, revealed: false }))
      return { ...out, deck: { ...out.deck, table: [...out.deck.table, ...dealt.map(x => x.card)] }, journey: { req, avoid, dealt } }
    })
    setPicks({})
  }
  const finish = () => {
    apply(dd => {
      if (!dd.journey) return dd
      const cards = dd.journey.dealt.map(x => x.card)
      let deck = { ...dd.deck, table: dd.deck.table.filter(x => !cards.includes(x)) }
      const jokers = cards.filter(x => info(x).joker)
      deck = { ...deck, discard: [...deck.discard, ...cards.filter(x => !info(x).joker)] }
      if (jokers.length) deck = { ...deck, draw: shuffle([...deck.draw, ...jokers]) }
      deck = { ...deck, log: [...deck.log, { t: Date.now(), text: 'logJourney', cards }, ...(jokers.length ? [{ t: Date.now(), text: 'logJoker' }] : [])].slice(-80) }
      return { ...dd, deck, journey: null }
    })
  }
  const reveal = (i: number) => apply(dd => dd.journey ? { ...dd, journey: { ...dd.journey, dealt: dd.journey.dealt.map((x, k) => (k === i ? { ...x, revealed: !x.revealed } : x)) } } : dd)

  if (j) {
    const nameOf = (id: string) => (id === 'narrator' ? t('jNarratorCard') : d.characters.find(c => c.id === id)?.name || t('unnamed'))
    const shown = j.dealt.filter(x => x.revealed).map(x => info(x.card))
    const counts = SUITS.map(s => [s, shown.filter(c => c.suit === s).length] as const)
    return (
      <div class="tool-cols">
        <div class="col">
          <Section id="journey" titleKey="jTitle">
            {(j.req || j.avoid) && <p class="j-req">{j.req && <><b>{t('jReq')}:</b> {j.req}</>}{j.avoid && <><br /><b>{t('jAvoid')}:</b> {j.avoid}</>}</p>}
            <p class="note">{t('jTheme')}</p>
            <ul class="j-dealt">
              {j.dealt.map((x, i) => {
                const ci = info(x.card)
                return (
                  <li class="jd">
                    <CardFace id={x.card} faceDown={!x.revealed} onClick={() => reveal(i)} label={x.revealed ? undefined : t('jReveal')} />
                    <div class="jd-txt">
                      <strong>{nameOf(x.to)}</strong>
                      <span class="note">{x.revealed ? (ci.suit ? t(SUIT_THEME[ci.suit]) : t('themeJ')) : t('jReveal')}</span>
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
            {blackFrom && (
              <div class="sub-panel">
                <p class="note note-stamp">{t('jBlack')}</p>
                <div class="after">{active.map(c => (
                  <button type="button" class="btn btn-ghost btn-sm" onClick={() => { apply(dd => { const r = corruptionDraw(dd, c.id); setTimeout(() => showCorruption({ ...r, who: c.name || t('unnamed') }), 0); return r.d }); setBlackFrom(null) }}>{c.name || t('unnamed')}</button>
                ))}</div>
              </div>
            )}
            <button type="button" class="btn btn-primary" onClick={finish}>{t('jFinish')}</button>
          </Section>
        </div>
      </div>
    )
  }

  return (
    <div class="tool-cols">
      <div class="col">
        <Section id="journey" titleKey="jTitle">
          <div class="id-grid">
            <label class="fld" for="j-req"><span class="fld-l">{t('jReq')}</span><input id="j-req" value={req} placeholder={t('jReqPh')} onInput={e => setReq((e.target as HTMLInputElement).value)} /></label>
            <label class="fld" for="j-avoid"><span class="fld-l">{t('jAvoid')}</span><input id="j-avoid" value={avoid} placeholder={t('jAvoidPh')} onInput={e => setAvoid((e.target as HTMLInputElement).value)} /></label>
          </div>
          <p class="note">{t('jContribute')}</p>
          <ul class="init-pcs">
            {active.map(c => (
              <li class="init-pc">
                <div class="init-pc-h"><strong>{c.name || t('unnamed')}</strong><span class="note">{t('handCount', { n: c.hand.length })}</span></div>
                {c.hand.length === 0 ? <p class="note">{t('jFromDeck')}</p> : (
                  <div class="hand-row">{c.hand.map(h => {
                    const on = picks[c.id]?.includes(h)
                    return <CardFace small id={h} selected={on} onClick={() => setPicks(p => ({ ...p, [c.id]: on ? (p[c.id] ?? []).filter(x => x !== h) : [...(p[c.id] ?? []), h] }))} />
                  })}</div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <div class="col">
        <Section id="journey-deal" titleKey="jDealTitle">
          <div class="mini"><span class="mini-l">{t('jExtra')}</span><Stepper value={extra} min={0} max={active.length} label={t('jExtra')} onChange={setExtra} /></div>
          <p class="note">{t('jExtraHint')}</p>
          <div class="mini"><span class="mini-l">{t('jNarrator')}</span><Stepper value={narr} min={0} max={10} label={t('jNarrator')} onChange={setNarr} /></div>
          <button type="button" class="btn btn-primary" disabled={active.length === 0} onClick={deal}>{t('jDeal')}</button>
        </Section>
      </div>
    </div>
  )
}
