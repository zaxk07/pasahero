import { ArrowRight, BarChart3, CalendarClock, Cpu, Map as MapIcon } from 'lucide-react'
import { useState } from 'react'
import { LevelPill, Field, RouteBadge, Segmented, SelectBox } from '../components/ui'
import { DAYS, WEATHER, hourLabel, peakOf, unitsFor, type Day, type Weather } from '../data/inference'
import { ROUTES, routeByCode } from '../data/routes'
import { useForecast } from '../lib/api'

function QuickForecast() {
  const [code, setCode] = useState('BP-01')
  const [day, setDay] = useState<Day>('Mon')
  const [weather, setWeather] = useState<Weather>('Clear')
  const rows = useForecast(code, day, weather)
  const peak = peakOf(rows)
  const route = routeByCode(code)
  const max = Math.max(...rows.map((r) => r.hi))
  return (
    <div className="grid gap-0 overflow-hidden rounded-2xl border border-ink bg-paper shadow-[6px_6px_0_0_var(--color-ink)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col gap-5 border-b border-rule p-6 md:border-b-0 md:border-r">
        <h2 className="text-2xl font-semibold">Quick forecast</h2>
        <Field label="Route">
          <SelectBox value={code} options={ROUTES.map((r) => r.code)} onChange={setCode} render={(c) => `${c} · ${routeByCode(c).name}`} />
        </Field>
        <Field label="Day">
          <SelectBox value={day} options={DAYS} onChange={setDay} />
        </Field>
        <Field label="Weather">
          <Segmented label="Weather" value={weather} options={WEATHER} onChange={setWeather} />
        </Field>
      </div>
      <div className="flex flex-col justify-between gap-6 p-6">
        <div className="flex items-center justify-between">
          <RouteBadge code={code} />
          <span className="num text-xs text-ink-2">peak at {hourLabel(peak.hour)}</span>
        </div>
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink-2">Peak demand</dt>
            <dd className="num mt-1 text-3xl font-medium">{peak.demand}<span className="text-sm text-ink-2"> pax/hr</span></dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink-2">Congestion</dt>
            <dd className="num mt-1 text-3xl font-medium">{peak.congestion.toFixed(0)}<span className="text-sm text-ink-2"> /100</span></dd>
            <LevelPill congestion={peak.congestion} />
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink-2">Headway</dt>
            <dd className="num mt-1 text-3xl font-medium">{peak.headway}<span className="text-sm text-ink-2"> min</span></dd>
            <span className="num text-xs text-ink-2">{unitsFor(code, peak.headway)} of {route.fleet} franchised units</span>
          </div>
        </dl>
        <div aria-hidden className="flex h-16 items-end gap-[3px]">
          {rows.map((r) => (
            <div key={r.hour} className="flex-1 rounded-t-sm transition-[height] duration-500" style={{ height: `${Math.max(3, (r.demand / max) * 100)}%`, background: r.hour === peak.hour ? route.color : '#d8d0bb' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  { href: '#/map', icon: MapIcon, title: 'Corridor map', body: 'Segment-by-segment congestion for all five routes, scrubbed by hour and weather.' },
  { href: '#/forecast', icon: BarChart3, title: 'Demand forecast', body: 'Hourly passenger volume with confidence bands and automatic bottleneck alerts.' },
  { href: '#/dispatch', icon: CalendarClock, title: 'Dispatch planner', body: 'Headways and active units per time block, exportable as CSV for dispatchers.' },
  { href: '#/model', icon: Cpu, title: 'Model transparency', body: 'Cleaning steps, feature importance and held-out R², MAE and RMSE, in the open.' },
]

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-rule">
        <svg aria-hidden className="pointer-events-none absolute -right-24 top-0 hidden h-full w-[560px] opacity-90 lg:block" viewBox="0 0 560 520" fill="none">
          {[['#E8590C', 'M40 40 C200 60 220 200 330 230 S520 300 540 470'], ['#1C7ED6', 'M0 190 C160 180 260 250 330 230'], ['#2F9E44', 'M120 500 C200 380 280 300 330 230'], ['#AE3EC9', 'M330 230 C380 330 420 400 470 520']].map(([c, d]) => (
            <path key={c} d={d} stroke={c} strokeWidth="9" strokeLinecap="round" />
          ))}
          <circle cx="330" cy="230" r="17" fill="#f6f2e9" stroke="#161a22" strokeWidth="6" />
        </svg>
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-24">
          <p className="rise num text-xs uppercase tracking-[0.18em] text-ink-2" style={{ '--i': 0 } as React.CSSProperties}>Batangas City · Jeepney corridors · Predictive analytics</p>
          <h1 className="rise mt-4 max-w-3xl text-5xl font-semibold leading-[1.02] sm:text-7xl" style={{ '--i': 1 } as React.CSSProperties}>
            Forecast jeepney demand and corridor congestion before rush-hour bottlenecks hit.
          </h1>
          <p className="rise mt-6 max-w-xl text-lg text-ink-2" style={{ '--i': 2 } as React.CSSProperties}>
            PasaHero turns hourly commuter patterns, weather and terminal surges into dispatch decisions for five official routes.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ '--i': 3 } as React.CSSProperties}>
            <a href="#/map" className="press inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 font-medium text-paper hover:bg-ink-2">Open the map <ArrowRight className="size-4" /></a>
            <a href="#/forecast" className="press inline-flex items-center gap-2 rounded-lg border border-ink px-5 py-3 font-medium hover:bg-paper-2">See the forecast</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <QuickForecast />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="rise" style={{ '--i': i } as React.CSSProperties}>
              <a href={f.href} className="group flex h-full flex-col gap-3 rounded-xl border border-rule bg-paper-2/60 p-5 transition-all hover:-translate-y-1 hover:border-ink hover:bg-paper">
                <f.icon className="size-6" aria-hidden />
                <h3 className="text-xl font-semibold">{f.title}</h3>
                <p className="text-sm text-ink-2">{f.body}</p>
                <ArrowRight className="mt-auto size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
