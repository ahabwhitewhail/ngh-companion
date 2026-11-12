import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { makeT } from './i18n'
import { ATTRS, CORRUPTION_MAX, NATIONS } from './rules'
import { blankCharacter, diffTracked, fromBackup, load, normalize, save, status, uid, type AppData, type Character, type Settings } from './store'
import { Sheet } from './components/Sheet'
import { AppCtx, ConfirmButton, useApp } from './components/ui'
import { DiceView } from './components/Dice'
import { CardsView } from './components/Cards'
import { CorruptionOverlay, Tools } from './components/tools'
import { discardHand, type CorruptionResult } from './deckOps'
import { TableView } from './components/Table'
type RefModule = typeof import('./components/Reference')
import { Foes } from './components/Foes'
import { useTable } from './useTable'
import { soldierLink, soldierToken, tokenFrom, tokenToSoldier } from './share'
import type { Ev } from './ops'

type View = { screen: 'roster' | 'dice' | 'cards' | 'table' | 'ref' } | { screen: 'sheet'; id: string }

const VIEW_KEY = 'ngh-companion.view'

export function App() {
  const [data, setData] = useState<AppData>(load)
  const [view, setView] = useState<View>(() => {
    try { const v = JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null'); if (v?.screen) return v } catch { /* ignore */ }
    return { screen: 'roster' }
  })
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'failed'>('saved')
  const [panel, setPanel] = useState<null | 'settings' | 'import' | { exportOf: string }>(null)
  const [incoming, setIncoming] = useState<Character | null>(null)
  // A shared soldier link (#s=…) opens straight into the import dialog.
  useEffect(() => {
    const tok = tokenFrom(location.hash)
    if (!tok) return
    try { history.replaceState(null, '', location.pathname + location.search) } catch { /* ignore */ }
    void tokenToSoldier(tok).then(c => { if (c) { setIncoming(c); setPanel('import') } })
  }, [])
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [corr, setCorr] = useState<(CorruptionResult & { who: string }) | null>(null)
  const [lastCard, setLastCard] = useState<string | null>(null)
  const [peek, setPeek] = useState<string | null>(null)
  const [refEntry, setRefEntry] = useState<string | null>(null)
  // The rules text loads the first time the reference or an "i" button is used.
  const [refMod, setRefMod] = useState<RefModule | null>(null)
  useEffect(() => { if (!refMod && (peek || view.screen === 'ref')) void import('./components/Reference').then(setRefMod) }, [peek, view.screen])
  const toastTimer = useRef<number>()
  const t = useMemo(() => makeT(data.settings.lang), [data.settings.lang])

  const toast = (msg: string) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3200)
  }
  const onEvent = (e: Ev) => {
    if (e.kind === 'toast') toast(t(e.key, e.vars))
    else if (e.kind === 'corr') setCorr({ ...e.r, who: e.who })
    else if (e.kind === 'card') setLastCard(e.card)
  }
  const tbl = useTable(data, setData, onEvent)

  // Autosave: debounce writes so typing stays smooth.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; save(data); return }
    setSaveState('saving')
    const h = setTimeout(() => setSaveState(save(data) ? 'saved' : 'failed'), 350)
    return () => clearTimeout(h)
  }, [data])

  useEffect(() => { try { sessionStorage.setItem(VIEW_KEY, JSON.stringify(view)) } catch { /* ignore */ } }, [view])

  // Apply theme, language and text size to the document.
  useEffect(() => {
    const r = document.documentElement
    if (data.settings.theme === 'system') r.removeAttribute('data-theme')
    else r.setAttribute('data-theme', data.settings.theme)
    r.lang = data.settings.lang
    r.style.fontSize = `${data.settings.textSize}%`
  }, [data.settings])

  useEffect(() => { window.scrollTo(0, 0) }, [view.screen === 'sheet' ? view.id : view.screen])
  const setActive = (id: string | null) => { if (tbl.role !== 'player') setData(d => ({ ...d, activeId: id })) }
  const editChar = (id: string, f: (c: Character) => Character) => {
    const c = tbl.shown.characters.find(x => x.id === id)
    if (!c) return
    if (tbl.canControl(id)) upsert(f(c))
    else if (tbl.role === 'host' && c.remote) { const sets = diffTracked(c, f(c)); if (sets.length) tbl.dispatch({ t: 'adjust', char: id, sets }) }
  }
  const openSheet = (id: string) => { setActive(id); setView({ screen: 'sheet', id }) }

  const setSettings = (s: Partial<Settings>) => setData(d => ({ ...d, settings: { ...d.settings, ...s } }))
  const upsert = (c: Character) => setData(d => ({ ...d, characters: d.characters.map(x => (x.id === c.id ? c : x)) }))
  const create = () => {
    const c = blankCharacter(t('defaultGear'))
    setData(d => ({ ...d, characters: [c, ...d.characters], activeId: c.id }))
    setView({ screen: 'sheet', id: c.id })
  }
  const remove = (id: string) => {
    setData(d => { const o = discardHand(d, id); return { ...o, characters: o.characters.filter(x => x.id !== id), activeId: o.activeId === id ? null : o.activeId, initiative: o.initiative.filter(e => e.ref !== id) } })
    setView({ screen: 'roster' })
  }
  const duplicate = (c: Character) => {
    const n: Character = { ...structuredClone(c), id: uid(), example: false, name: `${c.name || t('unnamed')} ${t('copySuffix')}`, hand: [], createdAt: Date.now(), updatedAt: Date.now() }
    setData(d => ({ ...d, characters: [n, ...d.characters], activeId: n.id }))
    setView({ screen: 'sheet', id: n.id })
  }

  const current = view.screen === 'sheet' ? data.characters.find(c => c.id === view.id && !c.remote) : undefined
  useEffect(() => { if (view.screen === 'sheet' && !current) setView({ screen: 'roster' }) }, [current, view])

  return (
    <AppCtx.Provider value={{ t, settings: data.settings, toast, openRef: setPeek }}>
    <Tools.Provider value={{ d: tbl.shown, dispatch: tbl.dispatch, editChar, canControl: tbl.canControl, seatIds: tbl.seatIds, role: tbl.role, lastCard, setActive }}>
      <header class="bar">
        <div class="bar-in">
          {current ? (
            <button type="button" class="bar-back" onClick={() => setView({ screen: 'roster' })}>← {t('back')}</button>
          ) : (
            <div class="brand">
              <span class="brand-name">{t('appName')}</span>
              <span class="brand-sub">{t('appSub')}</span>
            </div>
          )}
          {current && <span class="bar-title">{current.name || t('unnamed')}</span>}
          <div class="bar-right">
            <span class={`save save-${saveState}`} aria-live="polite">
              {saveState === 'saving' ? t('saving') : saveState === 'saved' ? t('saved') : '!'}
            </span>
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setPanel('settings')}>{t('settings')}</button>
          </div>
        </div>
      </header>

      <main class="main">
        {current ? (
          <Sheet c={current} onChange={upsert} onDelete={() => remove(current.id)}
            onDuplicate={() => duplicate(current)} onExport={() => setPanel({ exportOf: current.id })}
            onCards={() => setView({ screen: 'cards' })} />
        ) : view.screen === 'dice' ? <DiceView /> : view.screen === 'cards' ? <CardsView /> : view.screen === 'table' ? <TableView tbl={tbl} onOpenSheet={openSheet} foes={<Foes data={data} setData={setData} />} /> : view.screen === 'ref' ? (refMod ? <refMod.ReferenceView data={data} setData={setData} openId={refEntry} setOpenId={setRefEntry} /> : <p class="note">…</p>) : (
          <Roster chars={data.characters.filter(c => !c.remote)} onOpen={openSheet} onCreate={create} onImport={() => setPanel('import')} atTable={tbl.role === 'player' ? tbl.me : null} />
        )}
      </main>

      <nav class="tabs" aria-label="Sections">
        <div class="tabs-in">
          {([['roster', 'tabRoster', '☰'], ['dice', 'tabDice', '⚃'], ['cards', 'tabCards', '♠'], ['table', 'tabTable', '◉'], ['ref', 'tabRef', '§']] as const).map(([k, l, ic]) => {
            const on = k === 'roster' ? view.screen === 'roster' || view.screen === 'sheet' : view.screen === k
            return (
              <button type="button" class={`tab ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined}
                onClick={() => (k === 'roster' && view.screen !== 'roster' && view.screen !== 'sheet' && data.activeId && data.characters.some(c => c.id === data.activeId) ? openSheet(data.activeId) : setView({ screen: k }))}>
                <span class="tab-ic" aria-hidden="true">{ic}</span>{t(l)}{k === 'table' && tbl.role !== 'solo' && <i class={`tab-dot net-${tbl.status}`} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </nav>

      {panel === 'settings' && <SettingsPanel s={data.settings} set={setSettings} onClose={() => setPanel(null)} data={data}
        onRestore={d => { setData(() => d); setPanel(null); setView({ screen: 'roster' }); toast(t('backupRestored')) }} />}
      {panel === 'import' && (
        <ImportPanel initial={incoming} onClose={() => { setPanel(null); setIncoming(null) }} onImport={c => {
          setIncoming(null)
          const n = { ...c, id: uid(), example: false, hand: [] }
          setData(d => ({ ...d, characters: [n, ...d.characters], activeId: n.id }))
          setPanel(null); toast(t('imported')); setView({ screen: 'sheet', id: n.id })
        }} />
      )}
      {panel && typeof panel === 'object' && (
        <ExportPanel c={data.characters.find(x => x.id === panel.exportOf)!} onClose={() => setPanel(null)} />
      )}

      {peek && refMod && <refMod.RefPeek id={peek} custom={data.refCustom} onClose={() => setPeek(null)} onOpenFull={() => { setRefEntry(peek); setPeek(null); setView({ screen: 'ref' }) }} />}
      {corr && <CorruptionOverlay r={corr} onClose={() => setCorr(null)} />}
      {toastMsg && <div class="toast" role="status">{toastMsg}</div>}
    </Tools.Provider>
    </AppCtx.Provider>
  )
}

function Roster({ chars, onOpen, onCreate, onImport, atTable }: { chars: Character[]; onOpen: (id: string) => void; onCreate: () => void; onImport: () => void; atTable: string | null }) {
  const { t } = useApp()
  return (
    <div class="roster">
      <div class="roster-head">
        <div>
          <h1 class="roster-title">{t('roster')}</h1>
          <p class="lead">{t('rosterLead')}</p>
        </div>
        <div class="roster-actions">
          <button type="button" class="btn btn-primary" onClick={onCreate}>+ {t('newSoldier')}</button>
          <button type="button" class="btn btn-ghost" onClick={onImport}>{t('importJson')}</button>
        </div>
      </div>
      {chars.length === 0 && <p class="empty">{t('noSoldiers')}</p>}
      <ul class="cards">
        {chars.map(c => {
          const st = status(c)
          return (
            <li key={c.id}>
              <button type="button" class={`card st-${st}`} onClick={() => onOpen(c.id)}>
                <div class="card-top">
                  <span class="card-rank">{c.rank}</span>
                  {c.example && <span class="chip chip-example">{t('example')}</span>}
                  {c.id === atTable && <span class="chip chip-table">{t('tblAtTableChip')}</span>}
                  <span class={`st st-${st}`}>{t(st === 'dead' ? 'statusDead' : st === 'lost' ? 'statusLost' : 'statusActive')}</span>
                </div>
                <span class="card-name">{c.name || t('unnamed')}</span>
                <span class="card-meta">
                  {[NATIONS.includes(c.nationality as any) ? t(c.nationality) : c.nationality.trim(), c.unit].filter(Boolean).join(' · ') || '—'}
                </span>
                <span class="card-attrs">
                  {ATTRS.map(a => {
                    const { cur, max } = c.attrs[a]
                    return (
                      <span class="ca" key={a}>
                        <span class="ca-l">{t(a)}</span>
                        <span class="ca-bar" aria-hidden="true"><i style={{ width: `${(cur / Math.max(max, 1)) * 100}%` }} /></span>
                        <span class="ca-v">{cur}/{max}</span>
                      </span>
                    )
                  })}
                </span>
                <span class="card-foot">
                  <span>{t('missions')}: {c.missions}</span>
                  {!c.corruptionHidden && (
                    <span class="corr-dots sm" aria-label={`${t('corruption')} ${c.corruption}/5`}>
                      {Array.from({ length: CORRUPTION_MAX }, (_, i) => <i class={i < c.corruption ? 'on' : ''} />)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: preact.ComponentChildren }) {
  const { t } = useApp()
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return (
    <div class="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div class="modal-h">
          <h2>{title}</h2>
          <button type="button" class="btn btn-ghost btn-sm" onClick={onClose}>{t('close')}</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SettingsPanel({ s, set, onClose, data, onRestore }: { s: Settings; set: (s: Partial<Settings>) => void; onClose: () => void; data: AppData; onRestore: (d: AppData) => void }) {
  const { t } = useApp()
  const seg = <V extends string | number>(id: string, val: V, opts: [V, string][], on: (v: V) => void) => (
    <div class="seg" role="radiogroup" aria-labelledby={id}>
      {opts.map(([v, l]) => <button type="button" role="radio" aria-checked={val === v} class={val === v ? 'on' : ''} onClick={() => on(v)}>{l}</button>)}
    </div>
  )
  return (
    <Modal title={t('settings')} onClose={onClose}>
      <div class="set-row"><span id="set-lang" class="fld-l">{t('language')}</span>
        {seg('set-lang', s.lang, [['ru', 'Русский'], ['en', 'English']], v => set({ lang: v }))}</div>
      <div class="set-row"><span id="set-theme" class="fld-l">{t('theme')}</span>
        {seg('set-theme', s.theme, [['system', t('themeSystem')], ['light', t('themeLight')], ['dark', t('themeDark')]], v => set({ theme: v }))}</div>
      <div class="set-row"><span id="set-size" class="fld-l">{t('textSize')}</span>
        {seg('set-size', s.textSize, [[90, 'A−'], [100, 'A'], [115, 'A+'], [130, 'A++']], v => set({ textSize: v }))}</div>
      <label class="set-row set-check" for="set-orig">
        <input id="set-orig" type="checkbox" class="box" checked={s.origTerms} onChange={e => set({ origTerms: (e.target as HTMLInputElement).checked })} />
        <span><span class="lbl">{t('origTerms')}</span><span class="desc">{t('origTermsHint')}</span></span>
      </label>
      <p class="note">{t('dataNote')}</p>
      <Backup data={data} onRestore={onRestore} />
    </Modal>
  )
}

function ExportPanel({ c, onClose }: { c: Character; onClose: () => void }) {
  const { t, toast } = useApp()
  const json = JSON.stringify(c, null, 2)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [failed, setFailed] = useState(false)
  const [link, setLink] = useState('')
  useEffect(() => { void soldierToken(c).then(tok => setLink(soldierLink(tok))) }, [c.id])
  const [qr, setQr] = useState('')
  useEffect(() => {
    if (!link) return
    void import('qrcode-generator').then(({ default: qrcode }) => {
      try { const q = qrcode(0, 'L'); q.addData(link); q.make(); setQr(q.createSvgTag({ cellSize: 3, margin: 3, scalable: true })) } catch { setQr('') }
    })
  }, [link])
  const copyText = (text: string, el?: HTMLTextAreaElement | null) => {
    try {
      navigator.clipboard.writeText(text).then(() => toast(t('copied')), () => { setFailed(true); el?.select() })
    } catch { setFailed(true); el?.select() }
  }
  return (
    <Modal title={t('shareTitle')} onClose={onClose}>
      <p class="note">{c.name || t('unnamed')}</p>
      <h3 class="sub">{t('shareLink')}</h3>
      <p class="note">{t('shareLinkHint')}</p>
      {qr ? <div class="qr" role="img" aria-label={t('shareQr')} dangerouslySetInnerHTML={{ __html: qr }} /> : <p class="note">{link ? t('shareTooBig') : '…'}</p>}
      <div class="modal-actions">
        <button type="button" class="btn btn-primary" disabled={!link} onClick={() => copyText(link)}>{t('shareCopyLink')}</button>
      </div>
      <h3 class="sub">JSON</h3>
      <textarea id="export-json" ref={ref} class="txt mono json" readOnly value={json} rows={6} onFocus={e => (e.target as HTMLTextAreaElement).select()} />
      {failed && <p class="note note-stamp">{t('copyFailed')}</p>}
      <div class="modal-actions"><button type="button" class="btn btn-ghost" onClick={() => copyText(json, ref.current)}>{t('exportJson')}</button></div>
    </Modal>
  )
}

function ImportPanel({ onClose, onImport, initial }: { onClose: () => void; onImport: (c: Character) => void; initial?: Character | null }) {
  const { t } = useApp()
  const [text, setText] = useState('')
  const [err, setErr] = useState(false)
  const tryImport = async (raw: string) => {
    const tok = tokenFrom(raw)
    if (tok) { const c = await tokenToSoldier(tok); if (c) { onImport(c); return } }
    try { const c = normalize(JSON.parse(raw)); if (c) { onImport(c); return } } catch { /* fallthrough */ }
    setErr(true)
  }
  if (initial) return (
    <Modal title={t('importJson')} onClose={onClose}>
      <p class="lead">{t('shareIncoming', { name: initial.name || t('unnamed') })}</p>
      <p class="note">{[initial.rank, initial.unit].filter(Boolean).join(' · ')}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
        <button type="button" class="btn btn-primary" onClick={() => onImport(initial)}>{t('importDo')}</button>
      </div>
    </Modal>
  )
  return (
    <Modal title={t('importJson')} onClose={onClose}>
      <p class="note">{t('importHint')}</p>
      <textarea id="import-json" class="txt mono json" rows={8} value={text} onInput={e => { setText((e.target as HTMLTextAreaElement).value); setErr(false) }} />
      {err && <p class="note note-stamp">{t('importBad')}</p>}
      <div class="modal-actions">
        <label class="btn btn-ghost" for="import-file">{t('chooseFile')}
          <input id="import-file" type="file" accept=".json,application/json" class="sr-only"
            onChange={async e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void tryImport(await f.text()) }} />
        </label>
        <button type="button" class="btn btn-primary" disabled={!text.trim()} onClick={() => void tryImport(text)}>{t('importDo')}</button>
      </div>
    </Modal>
  )
}


/** Everything in one file: soldiers, deck, notes, settings. */
function Backup({ data, onRestore }: { data: AppData; onRestore: (d: AppData) => void }) {
  const { t, toast } = useApp()
  const [pending, setPending] = useState<AppData | null>(null)
  const [err, setErr] = useState(false)
  const [text, setText] = useState('')
  const json = () => JSON.stringify({ ...data, backupAt: new Date().toISOString() })
  const stamp = new Date().toISOString().slice(0, 10)
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([json()], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url; a.download = `ngh-backup-${stamp}.json`
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch { toast(t('backupNoDownload')) }
  }
  const copy = () => { try { navigator.clipboard.writeText(json()).then(() => toast(t('copied')), () => toast(t('copyFailed'))) } catch { toast(t('copyFailed')) } }
  const check = (raw: string) => { const d = fromBackup(raw); setErr(!d); setPending(d) }
  return (
    <div class="backup">
      <h3 class="sub">{t('backupTitle')}</h3>
      <p class="note">{t('backupHint', { n: data.characters.filter(c => !c.remote).length })}</p>
      <div class="after">
        <button type="button" class="btn btn-ghost btn-sm" onClick={download}>{t('backupSave')}</button>
        <button type="button" class="btn btn-ghost btn-sm" onClick={copy}>{t('backupCopy')}</button>
      </div>
      <h3 class="sub">{t('backupRestore')}</h3>
      <div class="after">
        <label class="btn btn-ghost btn-sm" for="backup-file">{t('chooseFile')}
          <input id="backup-file" type="file" accept=".json,application/json" class="sr-only"
            onChange={async e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) check(await f.text()) }} />
        </label>
      </div>
      <textarea id="backup-paste" class="txt mono json" rows={3} placeholder={t('backupPastePh')} value={text}
        onInput={e => { const v = (e.target as HTMLTextAreaElement).value; setText(v); if (v.trim()) check(v); else { setPending(null); setErr(false) } }} />
      {err && <p class="note note-stamp">{t('backupBad')}</p>}
      {pending && (
        <div class="sub-panel">
          <p class="note">{t('backupFound', { n: pending.characters.length })}</p>
          <p class="note note-stamp">{t('backupWarn')}</p>
          <ConfirmButton label={t('backupReplace')} confirmLabel={t('confirmDelete')} onConfirm={() => onRestore(pending)} />
        </div>
      )}
    </div>
  )
}
