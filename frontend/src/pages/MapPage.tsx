import { Clock } from 'lucide-react'
import { useState } from 'react'
import CongestionMap from '../components/CongestionMap'
import { Field, LevelPill, PageHead, RouteBadge, Segmented, SelectBox } from '../components/ui'
import { DAYS, LEVEL_COLOR, WEATHER, hourLabel, type Day, type Row, type Weather } from '../data/inference'
import { ROUTES } from '../data/routes'
import { useForecast } from '../lib/api'

export default function MapPage() {
  const [hour, setHour] = useState(7)
  const [day, setDay] = useState<Day>('Mon')
  const [weather, setWeather] = useState<Weather>('Clear')
  const [active, setActive] = useState<string[]>(ROUTES.map((r) => r.code))

  // ROUTES is a fixed-length constant, so hook order is stable.
  const rowsByRoute: Record<string, Row[]> = {}
  for (const r of ROUTES) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    rowsByRoute[r.code] = useForecast(r.code, day, weather)
  }
  const toggle = (c: string) => setActive((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]))

  return (
    <>
      <PageHead kicker="Route map & traffic" title="Where the corridors choke, hour by hour." lead="Drag the clock. Each segment recolors from the model's congestion index; segments near the Poblacion interchange run hotter." />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative z-0">
          <CongestionMap hour={hour} rowsByRoute={rowsByRoute} active={active} />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {(['Free-Flow', 'Moderate', 'Heavy Bottleneck'] as const).map((l) => (
              <span key={l} className="inline-flex items-center gap-2"><span className="h-1.5 w-6 rounded-full" style={{ background: LEVEL_COLOR[l] }} />{l}</span>
            ))}
          </div>
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-xl border border-rule bg-paper-2/60 p-5">
            <label htmlFor="hour" className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-ink-2">
              <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden />Time of day</span>
              <span className="num text-2xl normal-case tracking-normal text-ink">{hourLabel(hour)}</span>
            </label>
            <input id="hour" type="range" min={0} max={23} value={hour} onChange={(e) => setHour(+e.target.value)} className="mt-3 w-full" />
            <div className="mt-4 grid gap-3">
              <Field label="Day"><SelectBox value={day} options={DAYS} onChange={setDay} /></Field>
              <Field label="Weather"><Segmented label="Weather" value={weather} options={WEATHER} onChange={setWeather} /></Field>
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold">Routes at {hourLabel(hour)}</h2>
            <ul className="divide-y divide-rule rounded-xl border border-rule">
              {ROUTES.map((r) => {
                const row = rowsByRoute[r.code][hour]
                const eta = Math.round(r.freeFlowMin * (1 + (row.congestion / 100) * 0.9))
                return (
                  <li key={r.code} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex flex-col gap-1.5">
                      <RouteBadge code={r.code} active={active.includes(r.code)} onClick={() => toggle(r.code)} />
                      <span className="text-xs text-ink-2">{r.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="num text-lg font-medium">{eta} min <span className="text-xs text-ink-2">({r.freeFlowMin} free)</span></p>
                      <LevelPill congestion={row.congestion} />
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-xs text-ink-2">Tap a badge to highlight or dim a route. Route geometry is approximate.</p>
          </div>
        </aside>
      </div>
    </>
  )
}
