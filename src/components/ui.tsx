import { createContext, type ComponentChildren } from 'preact'
import { useContext, useEffect, useRef, useState } from 'preact/hooks'
import { orig, type T } from '../i18n'
import type { Settings } from '../store'

export interface Ctx { t: T; settings: Settings; toast: (msg: string) => void }
export const AppCtx = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(AppCtx)

/** Translated term with the book's English term beside it (when the setting is on and they differ). */
export function Term({ k, class: cls }: { k: string; class?: string }) {
  const { t, settings } = useApp()
  const tr = t(k), en = orig(k)
  return (
    <span class={cls}>
      {tr}
      {settings.origTerms && settings.lang !== 'en' && en !== tr && <span class="orig"> {en}</span>}
    </span>
  )
}

/** Row of square boxes like the paper sheet. Tap box i to set value i; tap the top filled box to clear it. */
export function Pips({ value, max, onChange, label, size = 'md', tone = 'ink', disabledFrom }: {
  value: number; max: number; onChange: (v: number) => void; label: string
  size?: 'sm' | 'md'; tone?: 'ink' | 'stamp'; disabledFrom?: number
}) {
  const boxes = []
  for (let i = 1; i <= max; i++) {
    const on = i <= value
    const off = disabledFrom !== undefined && i > disabledFrom
    boxes.push(
      <button
        type="button"
        class={`pip ${on ? 'on' : ''} ${off ? 'off' : ''}`}
        aria-label={`${label}: ${i}`}
        aria-pressed={on}
        disabled={off}
        onClick={() => onChange(i === value ? i - 1 : i)}
      />,
    )
  }
  return <div class={`pips pips-${size} tone-${tone}`} role="group" aria-label={label}>{boxes}</div>
}

export function Stepper({ value, onChange, min = 0, max = 99, label, decLabel = '−', incLabel = '+', big }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; label: string
  decLabel?: string; incLabel?: string; big?: boolean
}) {
  return (
    <div class={`stepper ${big ? 'big' : ''}`} role="group" aria-label={label}>
      <button type="button" class="step" aria-label={`${label} −1`} disabled={value <= min} onClick={() => onChange(value - 1)}>{decLabel}</button>
      <output class="step-val" aria-live="polite">{value}</output>
      <button type="button" class="step" aria-label={`${label} +1`} disabled={value >= max} onClick={() => onChange(value + 1)}>{incLabel}</button>
    </div>
  )
}

export function Section({ title, titleKey, children, aside, id, class: cls }: {
  title?: string; titleKey?: string; children: ComponentChildren; aside?: ComponentChildren; id?: string; class?: string
}) {
  return (
    <section class={`sect ${cls ?? ''}`} id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <header class="sect-h">
        <h2 id={id ? `${id}-h` : undefined}>{titleKey ? <Term k={titleKey} /> : title}</h2>
        {aside && <div class="sect-aside">{aside}</div>}
      </header>
      {children}
    </section>
  )
}

/** Textarea that grows with its content. */
export function AutoText({ id, value, onInput, placeholder, rows = 3 }: {
  id: string; value: string; onInput: (v: string) => void; placeholder?: string; rows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return <textarea id={id} ref={ref} rows={rows} class="txt" value={value} placeholder={placeholder}
    onInput={e => onInput((e.target as HTMLTextAreaElement).value)} />
}

/** Two-tap destructive button (the frame cannot show confirm dialogs). */
export function ConfirmButton({ label, confirmLabel, onConfirm, class: cls }: {
  label: string; confirmLabel: string; onConfirm: () => void; class?: string
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const h = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(h)
  }, [armed])
  return (
    <button type="button" class={`btn ${armed ? 'btn-danger' : 'btn-ghost'} ${cls ?? ''}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? confirmLabel : label}
    </button>
  )
}
