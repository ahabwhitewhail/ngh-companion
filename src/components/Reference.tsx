import { useMemo, useState } from 'preact/hooks'
import { makeT, type Lang } from '../i18n'
import { buildEntries, CATS, CAT_NAME, type Cat, type RefEntry } from '../reference/entries'
import { uid, type AppData, type CustomRef } from '../store'
import { AutoText, ConfirmButton, useApp } from './ui'

const tRu = makeT('ru'), tEn = makeT('en')
const BUILT = buildEntries((key, lang) => (lang === 'ru' ? tRu(key) : tEn(key)))
const fold = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”’']/g, '')

/** Built-in entries plus the user's own, in one list. */
export function allEntries(custom: CustomRef[]): RefEntry[] {
  return [...BUILT, ...custom.map(c => ({ id: c.id, cat: (CATS.includes(c.cat as Cat) ? c.cat : 'basics') as Cat, title: { ru: c.title, en: c.title }, body: { ru: c.body, en: c.body }, custom: true }))]
}
export const findEntry = (id: string, custom: CustomRef[]) => allEntries(custom).find(e => e.id === id)

/** Paragraphs and "- " bullets. */
export function RefBody({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: preact.JSX.Element[] = []
  let list: string[] = []
  const flush = () => { if (list.length) { out.push(<ul class="ref-ul">{list.map(l => <li>{l}</li>)}</ul>); list = [] } }
  for (const l of lines) {
    if (l.startsWith('- ')) list.push(l.slice(2))
    else { flush(); if (l.trim()) out.push(<p>{l}</p>) }
  }
  flush()
  return <div class="ref-body">{out}</div>
}

export function ReferenceView({ data, setData, openId, setOpenId }: {
  data: AppData; setData: (f: (d: AppData) => AppData) => void; openId: string | null; setOpenId: (id: string | null) => void
}) {
  const { t, settings } = useApp()
  const lang: Lang = settings.lang
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Cat | 'all' | 'mine'>('all')
  const [editing, setEditing] = useState<CustomRef | null>(null)
  const entries = useMemo(() => allEntries(data.refCustom), [data.refCustom])
  const open = openId ? entries.find(e => e.id === openId) : null

  const results = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean)
    let list = entries
    if (cat === 'mine') list = list.filter(e => e.custom || data.refNotes[e.id])
    else if (cat !== 'all') list = list.filter(e => e.cat === cat)
    if (!words.length) return list
    return list
      .map(e => {
        const title = fold(`${e.title[lang]} ${e.title.en}`)
        const hay = `${title} ${fold(e.body[lang])} ${fold(data.refNotes[e.id] ?? '')}`
        if (!words.every(w => hay.includes(w))) return null
        return { e, score: words.filter(w => title.includes(w)).length }
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .map(x => x!.e)
  }, [q, cat, entries, lang, data.refNotes])

  const saveCustom = (c: CustomRef) => setData(d => ({ ...d, refCustom: d.refCustom.some(x => x.id === c.id) ? d.refCustom.map(x => (x.id === c.id ? c : x)) : [...d.refCustom, c] }))

  if (editing) return <CustomEditor c={editing} onCancel={() => setEditing(null)} onSave={c => { saveCustom(c); setEditing(null); setOpenId(c.id) }} />

  if (open) {
    const note = data.refNotes[open.id] ?? ''
    return (
      <div class="tool ref">
        <button type="button" class="bar-back" onClick={() => setOpenId(null)}>← {t('refBack')}</button>
        <article class="ref-entry">
          <p class="eyebrow">{CAT_NAME[open.cat][lang]}{open.page && <span class="ref-page">{t('refPage', { n: open.page })}</span>}{open.custom && <span class="chip chip-table">{t('refMine')}</span>}</p>
          <h1 class="ref-title">{open.title[lang]}</h1>
          {lang !== 'en' && open.title.en !== open.title.ru && <p class="orig ref-orig">{open.title.en}</p>}
          <RefBody text={open.body[lang]} />
          {open.custom ? (
            <div class="after">
              <button type="button" class="btn btn-ghost btn-sm" onClick={() => setEditing(data.refCustom.find(c => c.id === open.id)!)}>{t('refEdit')}</button>
              <ConfirmButton class="btn-sm" label={t('remove')} confirmLabel={t('confirmDelete')} onConfirm={() => { setData(d => ({ ...d, refCustom: d.refCustom.filter(c => c.id !== open.id) })); setOpenId(null) }} />
            </div>
          ) : (
            <div class="ref-note">
              <label class="fld-l" for="ref-note">{t('refMyNote')}</label>
              <AutoText id="ref-note" value={note} placeholder={t('refNotePh')} rows={2}
                onInput={v => setData(d => ({ ...d, refNotes: v.trim() ? { ...d.refNotes, [open.id]: v } : Object.fromEntries(Object.entries(d.refNotes).filter(([k]) => k !== open.id)) }))} />
            </div>
          )}
        </article>
        {!open.custom && <p class="note">{t('refDisclaimer')}</p>}
      </div>
    )
  }

  const grouped = cat === 'all' && !q.trim()
  return (
    <div class="tool ref">
      <div class="tool-head">
        <h1 class="tool-title">{t('tabRef')}</h1>
        <button type="button" class="btn btn-ghost btn-sm" onClick={() => setEditing({ id: uid(), cat: cat !== 'all' && cat !== 'mine' ? cat : 'basics', title: '', body: '', updatedAt: Date.now() })}>+ {t('refAdd')}</button>
      </div>
      <div class="ref-search">
        <label class="sr-only" for="ref-q">{t('refSearch')}</label>
        <input id="ref-q" type="search" value={q} placeholder={t('refSearchPh')} autoComplete="off" onInput={e => setQ((e.target as HTMLInputElement).value)} />
      </div>
      <div class="ref-cats" role="tablist" aria-label={t('refCats')}>
        {(['all', ...CATS, 'mine'] as const).map(c => (
          <button type="button" role="tab" aria-selected={cat === c} class={`chip chip-btn ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
            {c === 'all' ? t('refAll') : c === 'mine' ? t('refMine') : CAT_NAME[c][lang]}
          </button>
        ))}
      </div>
      {results.length === 0 && <p class="empty">{t('refNothing')}</p>}
      {grouped ? CATS.map(c => {
        const list = results.filter(e => e.cat === c)
        if (!list.length) return null
        return (
          <section class="ref-group">
            <h2 class="sub">{CAT_NAME[c][lang]}</h2>
            <RefList list={list} lang={lang} notes={data.refNotes} onOpen={setOpenId} />
          </section>
        )
      }) : <RefList list={results} lang={lang} notes={data.refNotes} onOpen={setOpenId} showCat />}
      <p class="note">{t('refDisclaimer')}</p>
    </div>
  )
}

function RefList({ list, lang, notes, onOpen, showCat }: { list: RefEntry[]; lang: Lang; notes: Record<string, string>; onOpen: (id: string) => void; showCat?: boolean }) {
  const { t } = useApp()
  return (
    <ul class="ref-list">
      {list.map(e => (
        <li>
          <button type="button" class="ref-item" onClick={() => onOpen(e.id)}>
            <span class="ref-item-t">{e.title[lang]}{notes[e.id] && <i class="ref-dot" title={t('refMyNote')} />}</span>
            <span class="ref-item-m">{showCat && `${CAT_NAME[e.cat][lang]} · `}{e.page ? t('refPage', { n: e.page }) : e.custom ? t('refMine') : ''}</span>
            <span class="ref-item-s">{e.body[lang].split('\n')[0].replace(/^- /, '')}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function CustomEditor({ c, onSave, onCancel }: { c: CustomRef; onSave: (c: CustomRef) => void; onCancel: () => void }) {
  const { t, settings } = useApp()
  const [x, setX] = useState(c)
  return (
    <div class="tool ref">
      <button type="button" class="bar-back" onClick={onCancel}>← {t('cancel')}</button>
      <h1 class="tool-title">{c.title ? t('refEdit') : t('refAdd')}</h1>
      <div class="sect ref-form">
        <label class="fld" for="rc-title"><span class="fld-l">{t('refTitle')}</span>
          <input id="rc-title" value={x.title} onInput={e => setX({ ...x, title: (e.target as HTMLInputElement).value })} /></label>
        <label class="fld" for="rc-cat"><span class="fld-l">{t('refCat')}</span>
          <select id="rc-cat" value={x.cat} onChange={e => setX({ ...x, cat: (e.target as HTMLSelectElement).value })}>
            {CATS.map(k => <option value={k}>{CAT_NAME[k][settings.lang]}</option>)}
          </select></label>
        <div class="fld"><label class="fld-l" for="rc-body">{t('refText')}</label>
          <AutoText id="rc-body" value={x.body} placeholder={t('refTextPh')} rows={6} onInput={v => setX({ ...x, body: v })} /></div>
        <div class="after">
          <button type="button" class="btn btn-primary" disabled={!x.title.trim()} onClick={() => onSave({ ...x, title: x.title.trim(), updatedAt: Date.now() })}>{t('refSave')}</button>
          <button type="button" class="btn btn-ghost" onClick={onCancel}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  )
}

/** Quick look from the sheet, dice or cards: the entry in a sheet over the current screen. */
export function RefPeek({ id, custom, onClose, onOpenFull }: { id: string; custom: CustomRef[]; onClose: () => void; onOpenFull: () => void }) {
  const { t, settings } = useApp()
  const e = findEntry(id, custom)
  if (!e) return null
  return (
    <div class="modal-bg" onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
      <div class="modal peek" role="dialog" aria-modal="true" aria-label={e.title[settings.lang]}>
        <div class="modal-h">
          <h2>{e.title[settings.lang]}</h2>
          <button type="button" class="btn btn-ghost btn-sm" onClick={onClose}>{t('close')}</button>
        </div>
        <p class="eyebrow">{CAT_NAME[e.cat][settings.lang]}{e.page && <span class="ref-page">{t('refPage', { n: e.page })}</span>}</p>
        <RefBody text={e.body[settings.lang]} />
        <div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" onClick={onOpenFull}>{t('refOpenFull')}</button></div>
      </div>
    </div>
  )
}
