import type { ReactNode } from 'react'
import { LEVEL_COLOR, levelOf } from '../data/inference'
import { routeByCode } from '../data/routes'

export function RouteBadge({ code, active = true, onClick }: { code: string; active?: boolean; onClick?: () => void }) {
  const color = routeByCode(code).color
  const style = active ? { background: color, color: '#fff', borderColor: color } : { color, borderColor: color, background: 'transparent' }
  const cls = 'num press inline-flex items-center rounded-md border-2 px-2 py-0.5 text-xs font-medium tracking-wide'
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${cls} cursor-pointer`} style={style}>
      {code}
    </button>
  ) : (
    <span className={cls} style={style}>{code}</span>
  )
}

export function Segmented<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-rule bg-paper-2 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={`press cursor-pointer rounded-md px-3 py-1.5 text-sm ${o === value ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-2">
      {label}
      {children}
    </label>
  )
}

export function SelectBox<T extends string>({
  value, options, onChange, render,
}: { value: T; options: readonly T[]; onChange: (v: T) => void; render?: (v: T) => string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="cursor-pointer rounded-lg border border-rule bg-paper px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink"
    >
      {options.map((o) => (
        <option key={o} value={o}>{render ? render(o) : o}</option>
      ))}
    </select>
  )
}

export function LevelPill({ congestion }: { congestion: number }) {
  const level = levelOf(congestion)
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: LEVEL_COLOR[level] }}>
      <span aria-hidden className="size-2 rounded-full" style={{ background: LEVEL_COLOR[level] }} />
      {level}
    </span>
  )
}

export function PageHead({ kicker, title, lead }: { kicker: string; title: string; lead: string }) {
  return (
    <header className="rise mx-auto max-w-6xl px-4 pb-6 pt-20 sm:px-6 sm:pt-24">
      <p className="num text-xs uppercase tracking-[0.18em] text-ink-2"><span className="text-signal">●</span> {kicker}</p>
      <h1 className="mt-3 text-4xl font-semibold leading-[1.04] sm:text-6xl">{title}</h1>
      <p className="mt-4 max-w-2xl border-l border-rule pl-4 text-lg text-ink-2">{lead}</p>
    </header>
  )
}

/** Editorial section header: numbered kicker, display title, rule, lead set in the right column. */
export function SectionHead({ n, kicker, title, lead }: { n: string; kicker: string; title: ReactNode; lead?: string }) {
  return (
    <header className="grid gap-6 border-t border-rule pt-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end md:gap-12">
      <div>
        <p className="num text-xs uppercase tracking-[0.18em] text-ink-2">
          <span className="text-signal">{n}</span> — {kicker}
        </p>
        <h2 className="mt-4 text-4xl font-semibold leading-[1.04] sm:text-5xl">{title}</h2>
      </div>
      {lead && <p className="max-w-md text-lg text-ink-2 md:justify-self-end md:pb-1">{lead}</p>}
    </header>
  )
}
