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
      <p className="num text-xs uppercase tracking-[0.18em] text-ink-2">{kicker}</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">{lead}</p>
    </header>
  )
}
