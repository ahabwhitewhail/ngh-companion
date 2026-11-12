import { useState } from 'preact/hooks'
import {
  ATTRS, ATTR_TRACK, CORRUPTION_MAX, CREATION, NATIONS, PATHS, SKILLS, SKILL_MAX, WEAPONS,
  WHISPER_CORRUPTION_PIPS, cost, fistDamage, pathOf, weaponOf, type AttrKey,
} from '../rules'
import {
  endMission, isUndoable, recruitTotals, setTracked, status, uid, undoLast,
  type Character, type HistoryEntry,
} from '../store'
import { AutoText, ConfirmButton, InfoBtn, Pips, Section, Stepper, Term, useApp } from './ui'

type Upd = (c: Character) => void

export function Sheet({ c, onChange, onDelete, onDuplicate, onExport, onCards }: {
  c: Character; onChange: Upd; onDelete: () => void; onDuplicate: () => void; onExport: () => void; onCards: () => void
}) {
  const { t } = useApp()
  const [showCosts, setShowCosts] = useState(false)
  const st = status(c)
  const set = (key: string, v: number) => onChange(setTracked(c, key, v))
  const field = <K extends keyof Character>(k: K, v: Character[K]) => onChange({ ...c, [k]: v, updatedAt: Date.now() })

  return (
    <div class="sheet">
      <Vitals c={c} set={set} onCards={onCards} />

      {st === 'dead' && (
        <div class="banner banner-stamp" role="status">
          <strong class="stamp-word">{t('statusDead')}</strong>
          <span>{t('dead')} {t('deadNew')}</span>
        </div>
      )}
      {st === 'lost' && (
        <div class="banner banner-stamp" role="status">
          <strong class="stamp-word">{t('corruption')} 5</strong>
          <span>{t('corruption5')}</span>
        </div>
      )}

      <div class="record-head">
        <p class="eyebrow">{t('soldierRecord')}{c.example && <span class="chip chip-example">{t('example')}</span>}</p>
        <label class="name-field" for="f-name">
          <span class="sr-only">{t('name')}</span>
          <input id="f-name" class="name-input" value={c.name} placeholder={t('unnamed')}
            onInput={e => field('name', (e.target as HTMLInputElement).value)} />
        </label>
        <div class="id-grid">
          <label class="fld" for="f-rank"><span class="fld-l">{t('rank')}</span>
            <input id="f-rank" value={c.rank} onInput={e => field('rank', (e.target as HTMLInputElement).value)} /></label>
          <label class="fld" for="f-nat"><span class="fld-l">{t('nationality')}</span>
            <select id="f-nat" value={NATIONS.includes(c.nationality as any) ? c.nationality : c.nationality ? '__other' : ''}
              onChange={e => field('nationality', (e.target as HTMLSelectElement).value === '__other' ? ' ' : (e.target as HTMLSelectElement).value)}>
              <option value="">—</option>
              <optgroup label={t('allied')}>{NATIONS.slice(0, 5).map(n => <option value={n}>{t(n)}</option>)}</optgroup>
              <optgroup label={t('central')}>{NATIONS.slice(5).map(n => <option value={n}>{t(n)}</option>)}</optgroup>
              <option value="__other">…</option>
            </select></label>
          {c.nationality && !NATIONS.includes(c.nationality as any) && (
            <label class="fld" for="f-nat2"><span class="fld-l">{t('nationality')}</span>
              <input id="f-nat2" value={c.nationality.trim()} onInput={e => field('nationality', (e.target as HTMLInputElement).value || ' ')} /></label>
          )}
          <label class="fld" for="f-unit"><span class="fld-l">{t('unit')}</span>
            <input id="f-unit" value={c.unit} onInput={e => field('unit', (e.target as HTMLInputElement).value)} /></label>
          <div class="fld"><span class="fld-l">{t('missions')}</span>
            <Stepper value={c.missions} label={t('missions')} onChange={v => set('missions', v)} /></div>
        </div>
      </div>

      {c.recruitCheck && <RecruitCheck c={c} onHide={() => field('recruitCheck', false)} />}

      <div class="cols">
        <div class="col">
          <Section id="recruitment" titleKey="recruitment"
            aside={<><button type="button" class={`btn btn-ghost btn-sm ${showCosts ? 'is-on' : ''}`} aria-pressed={showCosts} onClick={() => setShowCosts(!showCosts)}>{t('growthTitle')}</button><InfoBtn id="attributes" label={t('recruitment')} /></>}>
            {showCosts && <p class="note">{t('growthNote')}</p>}
            <div class="attrs">
              {ATTRS.map(a => <AttrBlock key={a} c={c} a={a} set={set} showCosts={showCosts} />)}
            </div>
            <div class="armor-row">
              <div>
                <Term k="armor" class="lbl" /> <InfoBtn id="armor" label={t('armor')} />
                <p class="note">{t('armorHint')}</p>
              </div>
              <Stepper value={c.armor} label={t('armor')} onChange={v => set('armor', v)} />
              <div class="tn" title={t('attackTN')}>
                <span class="tn-l">{t('attackTN')}</span>
                <span class="tn-v">{Math.max(c.attrs.brawn.cur, c.armor)}</span>
              </div>
            </div>
          </Section>

          <Corruption c={c} set={set} onToggleHidden={() => field('corruptionHidden', !c.corruptionHidden)} />

          <Equipment c={c} field={field} />

          <Section id="service" titleKey="serviceRecord">
            <AutoText id="f-service" value={c.serviceRecord} placeholder={t('servicePh')} onInput={v => field('serviceRecord', v)} />
          </Section>
          <Section id="history" titleKey="personalHistory">
            <AutoText id="f-history" value={c.personalHistory} placeholder={t('historyPh')} onInput={v => field('personalHistory', v)} />
          </Section>
          <Section id="notes" titleKey="notes">
            <AutoText id="f-notes" value={c.notes} placeholder={t('notesPh')} onInput={v => field('notes', v)} />
          </Section>
        </div>

        <div class="col">
          <Training c={c} set={set} showCosts={showCosts} onCosts={() => setShowCosts(!showCosts)} />
          <Whispers c={c} onChange={onChange} set={set} showCosts={showCosts} />
          <MissionEnd c={c} onChange={onChange} />
          <ChangeLog c={c} onChange={onChange} />
        </div>
      </div>

      <footer class="sheet-foot">
        <button type="button" class="btn btn-ghost" onClick={onExport}>{t('shareTitle')}</button>
        <button type="button" class="btn btn-ghost" onClick={onDuplicate}>{t('duplicate')}</button>
        <ConfirmButton label={t('deleteSoldier')} confirmLabel={t('confirmDelete')} onConfirm={onDelete} />
      </footer>
    </div>
  )
}

/** Sticky strip: the three attributes and Corruption, editable with one tap during play. */
function Vitals({ c, set, onCards }: { c: Character; set: (k: string, v: number) => void; onCards: () => void }) {
  const { t } = useApp()
  return (
    <div class="vitals" role="region" aria-label={t('recruitment')}>
      {ATTRS.map(a => {
        const { cur, max } = c.attrs[a]
        const low = cur <= 1
        return (
          <div class={`vital ${low ? 'is-low' : ''} ${cur < max ? 'is-hurt' : ''}`} key={a}>
            <span class="vital-l">{t(a)}</span>
            <div class="vital-ctl">
              <button type="button" class="vbtn" aria-label={`${t(a)}: ${t('damage')}`} disabled={cur <= 0} onClick={() => set(`attr.${a}.cur`, cur - 1)}>−</button>
              <span class="vital-v"><b>{cur}</b><span class="vital-max">/{max}</span></span>
              <button type="button" class="vbtn" aria-label={`${t(a)}: ${t('heal')}`} disabled={cur >= max} onClick={() => set(`attr.${a}.cur`, cur + 1)}>+</button>
            </div>
          </div>
        )
      })}
      <button type="button" class="vital vital-hand" onClick={onCards} aria-label={t('handCount', { n: c.hand.length })}>
        <span class="vital-l">{t('cardsInHand')}</span>
        <span class="vital-v"><b>{c.hand.length}</b><span class="vital-max">/7</span></span>
      </button>
      <div class="vital vital-corr">
        <span class="vital-l">{t('corruption')}</span>
        {c.corruptionHidden
          ? <span class="vital-hidden">{t('hidden')}</span>
          : <span class="corr-dots" aria-label={`${t('corruption')} ${c.corruption}/5`}>
              {Array.from({ length: CORRUPTION_MAX }, (_, i) => <i class={i < c.corruption ? 'on' : ''} />)}
            </span>}
      </div>
    </div>
  )
}

function AttrBlock({ c, a, set, showCosts }: { c: Character; a: AttrKey; set: (k: string, v: number) => void; showCosts: boolean }) {
  const { t } = useApp()
  const { cur, max } = c.attrs[a]
  const trackLen = Math.max(ATTR_TRACK, max)
  return (
    <div class={`attr attr-${a}`}>
      <div class="attr-top">
        <div class="attr-name">
          <Term k={a} class="lbl lbl-lg" />
          <span class="desc">{t(`${a}Desc`)}</span>
        </div>
        <div class="attr-stats">
          <span class="stat"><span class="stat-l">{t('defense')}</span><span class="stat-v">{cur}</span></span>
          <span class="stat"><span class="stat-l">{t('plusOne')}</span><span class="stat-v">{cur}</span></span>
        </div>
      </div>
      <div class="attr-track">
        <Pips value={cur} max={trackLen} disabledFrom={max} label={`${t(a)} · ${t('current')}`} onChange={v => set(`attr.${a}.cur`, v)} />
      </div>
      <div class="attr-ctl">
        <div class="mini">
          <span class="mini-l">{t('current')}</span>
          <Stepper value={cur} min={0} max={max} label={`${t(a)} ${t('current')}`} onChange={v => set(`attr.${a}.cur`, v)} />
        </div>
        <div class="mini">
          <span class="mini-l">{t('rankMax')}</span>
          <Stepper value={max} min={1} max={20} label={`${t(a)} ${t('rankMax')}`} onChange={v => set(`attr.${a}.max`, v)} />
        </div>
      </div>
      {showCosts && <p class="cost">{t('costAttr', { n: cost.attrRank(max + 1) })}</p>}
    </div>
  )
}

function RecruitCheck({ c, onHide }: { c: Character; onHide: () => void }) {
  const { t } = useApp()
  const r = recruitTotals(c)
  const items = [
    { ok: r.attr === CREATION.attrPoints, text: t('recruitAttr', { n: r.attr }) },
    { ok: r.skillsTrained === CREATION.trainedSkills, text: t('recruitSkills', { n: r.skillsTrained }) },
    { ok: r.dice === CREATION.skillDice, text: t('recruitDice', { n: r.dice }) },
  ]
  const allOk = items.every(i => i.ok)
  return (
    <aside class={`recruit ${allOk ? 'is-ok' : ''}`} aria-label={t('recruitCheck')}>
      <div class="recruit-h">
        <strong>{t('recruitCheck')}</strong>
        <button type="button" class="btn btn-ghost btn-sm" onClick={onHide}>{t('recruitDone')}</button>
      </div>
      <p class="note">{t('recruitHint')}</p>
      <ul class="recruit-list">
        {items.map(i => <li class={i.ok ? 'ok' : 'todo'}><span class="tick" aria-hidden="true">{i.ok ? '✓' : '·'}</span>{i.text}</li>)}
      </ul>
      {allOk && <p class="recruit-ok">{t('recruitOk')}</p>}
    </aside>
  )
}

function Corruption({ c, set, onToggleHidden }: { c: Character; set: (k: string, v: number) => void; onToggleHidden: () => void }) {
  const { t } = useApp()
  const msg = c.corruption >= 5 ? t('corruption5') : c.corruption === 4 ? t('corruption4') : c.corruption === 3 ? t('corruption3') : ''
  return (
    <Section id="corruption" titleKey="corruption" class="sect-corr"
      aside={<><button type="button" class="btn btn-ghost btn-sm" aria-pressed={c.corruptionHidden} onClick={onToggleHidden}>{c.corruptionHidden ? t('show') : t('hide')}</button><InfoBtn id="corruption-levels" label={t('corruption')} /></>}>
      {c.corruptionHidden ? (
        <p class="corr-veil">{t('hidden')}</p>
      ) : (
        <>
          <div class="corr-track" role="group" aria-label={t('corruption')}>
            {Array.from({ length: CORRUPTION_MAX }, (_, i) => (
              <button type="button" class={`corr ${i < c.corruption ? 'on' : ''}`} aria-label={`${t('corruption')} ${i + 1}`} aria-pressed={i < c.corruption}
                onClick={() => set('corruption', i + 1 === c.corruption ? i : i + 1)} />
            ))}
            <span class="corr-n">{c.corruption} / 5</span>
          </div>
          {msg && <p class={`note ${c.corruption >= 5 ? 'note-stamp' : ''}`}>{msg}</p>}
        </>
      )}
      <p class="note">{t('corruptionHint')}</p>
    </Section>
  )
}

function Training({ c, set, showCosts, onCosts }: { c: Character; set: (k: string, v: number) => void; showCosts: boolean; onCosts: () => void }) {
  const { t } = useApp()
  const trainedCount = SKILLS.filter(s => c.skills[s.key].trained).length + c.whispers.filter(w => w.path).length
  const extra = Math.max(0, trainedCount - CREATION.trainedSkills)
  return (
    <Section id="training" titleKey="training"
      aside={<><button type="button" class={`btn btn-ghost btn-sm ${showCosts ? 'is-on' : ''}`} aria-pressed={showCosts} onClick={onCosts}>{t('growthTitle')}</button><InfoBtn id="plusone" label="+One" /></>}>
      <ul class="skills">
        {SKILLS.map(s => {
          const sk = c.skills[s.key]
          const attrCur = c.attrs[s.attr].cur
          return (
            <li class={`skill ${sk.trained ? 'is-trained' : ''}`} key={s.key}>
              <label class="skill-name" for={`sk-${s.key}`}>
                <input id={`sk-${s.key}`} type="checkbox" class="box" checked={sk.trained}
                  onChange={e => set(`skill.${s.key}.trained`, (e.target as HTMLInputElement).checked ? 1 : 0)} />
                <span>
                  <Term k={s.key} class="lbl" /> <InfoBtn id={`skill-${s.key}`} label={t(s.key)} />
                  <span class="desc"><span class={`attr-tag tag-${s.attr}`}>{t(s.attr)}</span> {t(`${s.key}Desc`)}</span>
                </span>
              </label>
              <div class="skill-dice">
                <Pips size="sm" value={sk.dice} max={SKILL_MAX} label={`${t(s.key)} · ${t('skillDice')}`} onChange={v => set(`skill.${s.key}.dice`, v)} />
                <span class="roll-info">{sk.trained ? t('rollInfo', { d: sk.dice, m: attrCur }) : t('untrained')}</span>
              </div>
              {showCosts && (
                <p class="cost">
                  {!sk.trained ? t('costSkill', { n: cost.newSkill(extra + 1) }) : sk.dice < SKILL_MAX ? t('costPip', { n: cost.skillPip(sk.dice + 1) }) : ''}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function Whispers({ c, onChange, set, showCosts }: { c: Character; onChange: Upd; set: (k: string, v: number) => void; showCosts: boolean }) {
  const { t, toast } = useApp()
  const usedPaths = c.whispers.map(w => w.path)
  const update = (id: string, patch: Partial<Character['whispers'][number]>) =>
    onChange({ ...c, whispers: c.whispers.map(w => (w.id === id ? { ...w, ...patch } : w)), updatedAt: Date.now() })
  const add = () => onChange({ ...c, whispers: [...c.whispers, { id: uid(), path: '', dice: 0, rituals: [] }], updatedAt: Date.now() })
  const remove = (id: string) => onChange({ ...c, whispers: c.whispers.filter(w => w.id !== id), updatedAt: Date.now() })

  return (
    <Section id="whispers" titleKey="whispers" aside={<InfoBtn id="casting" label={t('whispers')} />}>
      {c.whispers.length === 0 && <p class="note">{t('choosePath')}: {PATHS.map(p => t(p.key)).join(', ')}.</p>}
      <div class="whispers">
        {c.whispers.map(w => {
          const p = pathOf(w.path)
          const attrCur = p ? c.attrs[p.attr].cur : 0
          const ritualLimit = w.dice
          return (
            <div class="wh" key={w.id}>
              <div class="wh-top">
                <label class="fld wh-path" for={`wh-${w.id}`}>
                  <span class="fld-l">{t('whisper')} · {t('path')}</span>
                  <select id={`wh-${w.id}`} value={w.path} onChange={e => update(w.id, { path: (e.target as HTMLSelectElement).value, rituals: [] })}>
                    <option value="">{t('choosePath')}</option>
                    {PATHS.map(pp => (
                      <option value={pp.key} disabled={pp.key !== w.path && usedPaths.includes(pp.key)}>{t(pp.key)} [{t(pp.attr)}]</option>
                    ))}
                  </select>
                </label>
                {p && <span class={`attr-tag tag-${p.attr}`}>{t(p.attr)}</span>}
                {p && <InfoBtn id={`path-${p.key}`} label={t(p.key)} />}
              </div>
              <div class="skill-dice">
                <Pips size="sm" value={w.dice} max={SKILL_MAX} label={`${t('whisper')} · ${t('skillDice')}`}
                  onChange={v => {
                    set(`wh.${w.id}.dice`, v)
                    if (v > w.dice && WHISPER_CORRUPTION_PIPS.includes(v)) toast(t('corruptionDraw', { n: v }))
                  }} />
                <span class="roll-info">{p ? t('rollInfo', { d: w.dice, m: attrCur }) : '—'}</span>
              </div>
              {showCosts && w.dice < SKILL_MAX && <p class="cost">{t('costPip', { n: cost.skillPip(w.dice + 1) })}{WHISPER_CORRUPTION_PIPS.includes(w.dice + 1) ? ` · ${t('corruptionDraw', { n: w.dice + 1 })}` : ''}</p>}
              {p && (
                <fieldset class="rituals">
                  <legend>{t('rituals')} <span class="desc">{t('ritualsOf', { n: w.rituals.length, m: ritualLimit })}</span></legend>
                  <div class="chips">
                    {p.rituals.map(r => {
                      const on = w.rituals.includes(r)
                      const full = !on && w.rituals.length >= ritualLimit
                      return (
                        <button type="button" class={`chip chip-btn ${on ? 'on' : ''}`} aria-pressed={on} disabled={full}
                          onClick={() => update(w.id, { rituals: on ? w.rituals.filter(x => x !== r) : [...w.rituals, r] })}>
                          <Term k={r} />
                        </button>
                      )
                    })}
                  </div>
                  {w.rituals.length > 0 && (
                    <ul class="known">{w.rituals.map(r => <li><Term k={r} /> <InfoBtn id={`ritual-${r}`} label={t(r)} /></li>)}</ul>
                  )}
                </fieldset>
              )}
              <div class="wh-foot">
                <ConfirmButton class="btn-sm" label={t('removePath')} confirmLabel={t('confirmDelete')} onConfirm={() => remove(w.id)} />
              </div>
            </div>
          )
        })}
      </div>
      {c.whispers.length < PATHS.length && <button type="button" class="btn btn-line" onClick={add}>+ {t('addPath')}</button>}
    </Section>
  )
}

function Equipment({ c, field }: { c: Character; field: <K extends keyof Character>(k: K, v: Character[K]) => void }) {
  const { t } = useApp()
  const [open, setOpen] = useState<string | null>(null)
  const fist = fistDamage(c.attrs.brawn.max)
  const rows = [
    { id: '__fists', name: t('fists'), skill: 'melee', dmg: fist, ab: [['dmg', 2]] as [string, number][], removable: false, custom: false },
    ...c.weapons.map(w => {
      const d = weaponOf(w.type)
      return d
        ? { id: w.id, name: t(d.key), skill: d.skill, dmg: d.dmg, ab: d.ab as [string, number][], removable: true, custom: false }
        : { id: w.id, name: w.name, skill: '', dmg: -1, ab: [] as [string, number][], removable: true, custom: true }
    }),
  ]
  const addWeapon = (type: string) => {
    if (!type) return
    field('weapons', [...c.weapons, { id: uid(), type, name: '' }])
  }
  return (
    <Section id="equipment" titleKey="equipment" aside={<InfoBtn id="weapons" label={t('weapons')} />}>
      <h3 class="sub"><Term k="weapons" /></h3>
      <ul class="weapons">
        {rows.map(r => (
          <li class="weapon" key={r.id}>
            <div class="weapon-main">
              {r.custom ? (
                <input id={`wn-${r.id}`} class="weapon-name-in" aria-label={t('weaponName')} placeholder={t('weaponName')} value={r.name}
                  onInput={e => field('weapons', c.weapons.map(w => (w.id === r.id ? { ...w, name: (e.target as HTMLInputElement).value } : w)))} />
              ) : <span class="weapon-name">{r.name}</span>}
              {r.skill && <span class="weapon-skill">{t(r.skill)}</span>}
              {r.dmg >= 0 && <span class="weapon-dmg"><b>{r.dmg}</b> {t('dmg')}</span>}
              {r.removable && (
                <button type="button" class="x" aria-label={`${t('remove')}: ${r.name || t('weaponName')}`}
                  onClick={() => field('weapons', c.weapons.filter(w => w.id !== r.id))}>×</button>
              )}
            </div>
            {r.ab.length > 0 && (
              <div class="chips">
                {r.ab.map(([k, n]) => {
                  const key = `${r.id}:${k}`
                  return (
                    <button type="button" class={`chip chip-ab ${open === key ? 'on' : ''}`} aria-expanded={open === key}
                      onClick={() => setOpen(open === key ? null : key)}>
                      {t(`ab_${k}`)} <span class="ab-n">({n})</span>
                    </button>
                  )
                })}
              </div>
            )}
            {open?.startsWith(`${r.id}:`) && <p class="ab-desc">{t(`abd_${open.split(':')[1]}`)}</p>}
          </li>
        ))}
      </ul>
      <div class="add-row">
        <label class="fld" for="f-addw"><span class="fld-l">{t('addWeapon')}</span>
          <select id="f-addw" value="" onChange={e => { addWeapon((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value = '' }}>
            <option value="">—</option>
            {WEAPONS.map(w => <option value={w.key}>{t(w.key)} · {w.dmg} {t('dmg')}</option>)}
            <option value="custom">{t('customWeapon')}</option>
          </select>
        </label>
      </div>
      <p class="note">{t('successesNote')}</p>
      <h3 class="sub">{t('gear')}</h3>
      <AutoText id="f-gear" value={c.gear} onInput={v => field('gear', v)} rows={2} />
    </Section>
  )
}

function MissionEnd({ c, onChange }: { c: Character; onChange: Upd }) {
  const { t, toast } = useApp()
  return (
    <div class="mission">
      <div>
        <strong>{t('missionEnd')}</strong> <InfoBtn id="mission" label={t('missionEnd')} />
        <p class="note">{t('missionEndHint')}</p>
      </div>
      <ConfirmButton label={t('missionEnd')} confirmLabel={t('confirmDelete')}
        onConfirm={() => { onChange(endMission(c)); toast(t('missionDone', { n: c.missions + 1 })) }} />
    </div>
  )
}

function historyLabel(e: HistoryEntry, c: Character, t: ReturnType<typeof useApp>['t']) {
  const [kind, a, b] = e.key.split('.')
  if (e.key === 'created') return t('h_created')
  if (e.key === 'mission') return `${t('h_mission')} #${e.to}`
  if (kind === 'attr') return b === 'max' ? t('h_max', { a: t(a) }) : t('h_cur', { a: t(a) })
  if (kind === 'skill') return b === 'trained' ? t(e.to ? 'h_trained' : 'h_untrain', { s: t(a) }) : t('h_dice', { s: t(a) })
  if (kind === 'wh') { const w = c.whispers.find(x => x.id === a); return t('h_whisper', { p: w?.path ? t(w.path) : '—' }) }
  if (kind === 'corruption') return t('h_corruption')
  if (kind === 'armor') return t('h_armor')
  if (kind === 'missions') return t('missions')
  return e.key
}

function ChangeLog({ c, onChange }: { c: Character; onChange: Upd }) {
  const { t, settings } = useApp()
  const [all, setAll] = useState(false)
  const list = [...c.history].reverse()
  const shown = all ? list : list.slice(0, 12)
  const last = c.history[c.history.length - 1]
  const fmt = (ts: number) => {
    const d = new Date(ts), today = new Date()
    const time = d.toLocaleTimeString(settings.lang, { hour: '2-digit', minute: '2-digit' })
    return d.toDateString() === today.toDateString() ? time : `${d.toLocaleDateString(settings.lang, { day: 'numeric', month: 'short' })} ${time}`
  }
  return (
    <Section id="log" titleKey="changeLog"
      aside={isUndoable(last) && <button type="button" class="btn btn-ghost btn-sm" onClick={() => onChange(undoLast(c))}>↶ {t('undo')}</button>}>
      {list.length <= 1 && <p class="note">{t('noHistory')}</p>}
      <ol class="log">
        {shown.map(e => {
          const isNum = !['created', 'mission'].includes(e.key) && !e.key.endsWith('.trained')
          const isCorr = e.key === 'corruption'
          const worse = isCorr ? e.to > e.from : e.to < e.from
          const hidden = isCorr && c.corruptionHidden
          return (
            <li class="log-e">
              <time class="log-t" dateTime={new Date(e.t).toISOString()}>{fmt(e.t)}</time>
              <span class="log-l">{historyLabel(e, c, t)}</span>
              {isNum && !hidden && (
                <span class={`log-d ${worse ? 'worse' : 'better'}`}>{e.from} → {e.to}</span>
              )}
              {hidden && <span class="log-d">{t('hidden')}</span>}
            </li>
          )
        })}
      </ol>
      {list.length > 12 && <button type="button" class="btn btn-ghost btn-sm" onClick={() => setAll(!all)}>{all ? '−' : `+ ${list.length - 12}`}</button>}
    </Section>
  )
}

