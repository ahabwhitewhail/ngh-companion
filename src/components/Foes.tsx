import { useState } from 'preact/hooks'
import { valueLabel } from '../cards'
import { ANTAGONISTS } from '../reference/antagonists'
import { ATTRS } from '../rules'
import { uid, type AppData, type Foe } from '../store'
import { ConfirmButton, InfoBtn, Section, Stepper, useApp } from './ui'
import { useTools } from './tools'

/** The Narrator's Antagonists for the current fight: presets from the book or custom ones. */
export function Foes({ data, setData }: { data: AppData; setData: (f: (d: AppData) => AppData) => void }) {
  const { t, settings } = useApp()
  const { dispatch } = useTools()
  const lang = settings.lang
  const [preset, setPreset] = useState(ANTAGONISTS[2].key)
  const [count, setCount] = useState(1)
  const [custom, setCustom] = useState({ name: '', b: 3, s: 3, g: 3, armor: 0, init: 6, mob: false })
  const [showCustom, setShowCustom] = useState(false)
  const foes = data.foes
  const setFoes = (f: (x: Foe[]) => Foe[]) => setData(d => ({ ...d, foes: f(d.foes) }))

  const addPreset = () => {
    const a = ANTAGONISTS.find(x => x.key === preset)!
    const base = a.name[lang]
    const existing = foes.filter(f => f.preset === a.key).length
    const made: Foe[] = Array.from({ length: count }, (_, i) => ({
      id: uid(), preset: a.key, name: count + existing > 1 ? `${base} ${existing + i + 1}` : base, type: a.type, init: a.init, armor: a.armor,
      attrs: { brawn: { max: a.brawn, cur: a.brawn }, smarts: { max: a.smarts, cur: a.smarts }, guts: { max: a.guts, cur: a.guts } },
      stunned: false, reward: a.reward[lang],
    }))
    setFoes(x => [...x, ...made])
  }
  const addCustom = () => {
    if (!custom.name.trim()) return
    setFoes(x => [...x, { id: uid(), preset: 'custom', name: custom.name.trim(), type: custom.mob ? 'mob' : 'solo', init: custom.init, armor: custom.armor,
      attrs: { brawn: { max: custom.b, cur: custom.b }, smarts: { max: custom.s, cur: custom.s }, guts: { max: custom.g, cur: custom.g } }, stunned: false, reward: '' }])
    setCustom({ ...custom, name: '' })
  }
  const patch = (id: string, f: (x: Foe) => Foe) => setFoes(x => x.map(o => (o.id === id ? f(o) : o)))
  const groups = [...new Set(foes.map(f => f.preset + '|' + f.init))]

  return (
    <Section id="foes" titleKey="foesTitle" aside={<InfoBtn id="antagonist-entries" label={t('foesTitle')} />}>
      <p class="note">{t('foesHint')}</p>
      <div class="foe-add">
        <label class="fld" for="foe-preset"><span class="fld-l">{t('foesFromBook')}</span>
          <select id="foe-preset" value={preset} onChange={e => setPreset((e.target as HTMLSelectElement).value)}>
            <optgroup label={t('foesHuman')}>{ANTAGONISTS.filter(a => !a.supernatural).map(a => <option value={a.key}>{a.name[lang]} · {t('initShort')} {valueLabel(a.init)}</option>)}</optgroup>
            <optgroup label={t('foesSuper')}>{ANTAGONISTS.filter(a => a.supernatural).map(a => <option value={a.key}>{a.name[lang]} · {t('initShort')} {valueLabel(a.init)}</option>)}</optgroup>
          </select></label>
        <Stepper value={count} min={1} max={12} label={t('foesCount')} onChange={setCount} />
        <button type="button" class="btn btn-primary" onClick={addPreset}>+ {t('foesAdd')}</button>
        <InfoBtn id={`foe-${preset}`} label={ANTAGONISTS.find(a => a.key === preset)?.name[lang]} />
      </div>
      <button type="button" class={`btn btn-ghost btn-sm ${showCustom ? 'is-on' : ''}`} aria-expanded={showCustom} onClick={() => setShowCustom(!showCustom)}>{t('foesCustom')}</button>
      {showCustom && (
        <div class="sub-panel">
          <label class="fld" for="foe-name"><span class="fld-l">{t('initNpcName')}</span>
            <input id="foe-name" value={custom.name} onInput={e => setCustom({ ...custom, name: (e.target as HTMLInputElement).value })} /></label>
          <div class="manual">
            {([['b', 'brawn'], ['s', 'smarts'], ['g', 'guts']] as const).map(([k, a]) => (
              <div class="mini"><span class="mini-l">{t(a)}</span><Stepper value={custom[k]} min={1} max={15} label={t(a)} onChange={v => setCustom({ ...custom, [k]: v })} /></div>
            ))}
            <div class="mini"><span class="mini-l">{t('armor')}</span><Stepper value={custom.armor} min={0} max={15} label={t('armor')} onChange={v => setCustom({ ...custom, armor: v })} /></div>
            <label class="fld" for="foe-init"><span class="fld-l">{t('initValue')}</span>
              <select id="foe-init" value={custom.init} onChange={e => setCustom({ ...custom, init: Number((e.target as HTMLSelectElement).value) })}>
                {Array.from({ length: 13 }, (_, i) => i + 2).map(v => <option value={v}>{valueLabel(v)}</option>)}
              </select></label>
            <label class="set-check" for="foe-mob"><input id="foe-mob" type="checkbox" class="box" checked={custom.mob} onChange={e => setCustom({ ...custom, mob: (e.target as HTMLInputElement).checked })} /><span>{t('foesMob')}</span></label>
          </div>
          <button type="button" class="btn btn-primary" disabled={!custom.name.trim()} onClick={addCustom}>+ {t('foesAdd')}</button>
        </div>
      )}

      {foes.length === 0 ? <p class="note">{t('foesEmpty')}</p> : (
        <>
          <ul class="party foes">
            {foes.map(f => {
              const dead = ATTRS.some(a => f.attrs[a].cur <= 0)
              return (
                <li class={`seat foe ${dead ? 'is-dead' : ''}`} key={f.id}>
                  <div class="seat-h">
                    <strong>{f.name}</strong>
                    <span class="chip">{f.type === 'mob' ? t('foesMobShort') : t('foesSoloShort')}</span>
                    <span class="mini-l">{t('initShort')} {valueLabel(f.init)}</span>
                    {f.preset !== 'custom' && <InfoBtn id={`foe-${f.preset}`} label={f.name} />}
                    <button type="button" class="x" aria-label={`${t('remove')}: ${f.name}`} onClick={() => setFoes(x => x.filter(o => o.id !== f.id))}>×</button>
                  </div>
                  <div class="seat-attrs">
                    {ATTRS.map(a => (
                      <div class={`seat-a ${f.attrs[a].cur <= 1 ? 'is-low' : ''}`}>
                        <span class="mini-l">{t(a)}</span>
                        <div class="vital-ctl">
                          <button type="button" class="vbtn vbtn-ink" aria-label={`${f.name}: ${t(a)} −1`} disabled={f.attrs[a].cur <= 0}
                            onClick={() => patch(f.id, x => ({ ...x, attrs: { ...x.attrs, [a]: { ...x.attrs[a], cur: x.attrs[a].cur - 1 } } }))}>−</button>
                          <span class="vital-v"><b>{f.attrs[a].cur}</b><span class="vital-max">/{f.attrs[a].max}</span></span>
                          <button type="button" class="vbtn vbtn-ink" aria-label={`${f.name}: ${t(a)} +1`} disabled={f.attrs[a].cur >= f.attrs[a].max}
                            onClick={() => patch(f.id, x => ({ ...x, attrs: { ...x.attrs, [a]: { ...x.attrs[a], cur: x.attrs[a].cur + 1 } } }))}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div class="seat-row">
                    <span class="tn"><span class="tn-l">{t('attackTN')}</span><span class="tn-v">{Math.max(f.attrs.brawn.cur, f.armor)}</span></span>
                    <div class="mini"><span class="mini-l">{t('armor')}</span>
                      <Stepper value={f.armor} min={0} max={20} label={`${f.name}: ${t('armor')}`} onChange={v => patch(f.id, x => ({ ...x, armor: v }))} /></div>
                    <label class="set-check" for={`stun-${f.id}`}>
                      <input id={`stun-${f.id}`} type="checkbox" class="box" checked={f.stunned} onChange={() => patch(f.id, x => ({ ...x, stunned: !x.stunned }))} />
                      <span>{t('ab_stun')}</span>
                    </label>
                  </div>
                  {dead && <p class="note note-ok"><b>{t('foesDown')}</b>{f.reward && ` · ${t('reward')}: ${f.reward}`}</p>}
                </li>
              )
            })}
          </ul>
          <div class="after">
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => {
              for (const g of groups) {
                const [key, init] = g.split('|')
                const first = foes.find(f => f.preset === key && String(f.init) === init)!
                const n = foes.filter(f => f.preset === key && String(f.init) === init).length
                const label = n > 1 && key !== 'custom' ? (ANTAGONISTS.find(a => a.key === key)?.name[lang] ?? first.name) : first.name
                dispatch({ t: 'initNpc', name: label, value: Number(init) })
              }
            }}>{t('foesToInit')}</button>
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setFoes(x => x.filter(f => !ATTRS.some(a => f.attrs[a].cur <= 0)))}>{t('foesClearDown')}</button>
            <ConfirmButton class="btn-sm" label={t('foesClearAll')} confirmLabel={t('confirmDelete')} onConfirm={() => setFoes(() => [])} />
          </div>
        </>
      )}
    </Section>
  )
}
