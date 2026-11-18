import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import GlyphBackground from '../components/GlyphBackground'
import JournalCarousel from '../components/JournalCarousel'
import StackingCards from '../components/StackingCards'
import { LevelPill, Field, RouteBadge, SectionHead, Segmented, SelectBox } from '../components/ui'
import { BUNDLED_METRICS, DAYS, WEATHER, hourLabel, peakOf, unitsFor, type Day, type Weather } from '../data/inference'
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
    <div className="grid gap-0 overflow-hidden rounded-2xl border border-rule bg-paper-2/70 shadow-[6px_6px_0_0_var(--color-rule)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
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
            <div key={r.hour} className="flex-1 rounded-t-sm transition-[height] duration-500" style={{ height: `${Math.max(3, (r.demand / max) * 100)}%`, background: r.hour === peak.hour ? route.color : '#323844' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const i = (n: number) => ({ '--i': n }) as CSSProperties

const STATS = [
  [String(ROUTES.length), 'official corridors'],
  [String(ROUTES.reduce((s, r) => s + r.fleet, 0)), 'franchised units'],
  ['24 h', 'hourly forecast'],
  [`R² ${BUNDLED_METRICS.r2.toFixed(2)}`, 'held-out fit'],
]

export default function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-rule">
        <GlyphBackground />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(ellipse_70%_80%_at_18%_45%,var(--color-paper)_20%,transparent_75%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper to-transparent" />
        <div className="relative mx-auto flex min-h-[calc(100svh-3.6rem)] max-w-6xl flex-col justify-center px-4 pb-14 pt-16 sm:px-6 sm:pt-24">
          <p className="rise num text-xs uppercase tracking-[0.18em] text-ink-2" style={i(0)}>
            <span className="text-signal">01</span> — Batangas City · Jeepney corridors · Predictive analytics
          </p>
          <h1 className="rise mt-5 max-w-4xl text-5xl font-semibold leading-[1.0] sm:text-7xl lg:text-[5.4rem]" style={i(1)}>
            Forecast jeepney demand and corridor congestion <em className="font-normal italic text-signal">before</em> rush-hour bottlenecks hit.
          </h1>
          <p className="rise mt-7 max-w-xl border-l border-rule pl-4 text-lg text-ink-2" style={i(2)}>
            PasaHero turns hourly commuter patterns, weather and terminal surges into dispatch decisions for five official routes.
          </p>
          <div className="rise mt-9 flex flex-wrap gap-3" style={i(3)}>
            <a href="#/map" className="press inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 font-medium text-paper hover:bg-ink/85">Open the map <ArrowRight className="size-4" /></a>
            <a href="#/forecast" className="press inline-flex items-center gap-2 rounded-lg border border-rule bg-paper/60 px-5 py-3 font-medium backdrop-blur hover:border-ink">See the forecast</a>
          </div>
          <dl className="rise mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-5 border-t border-rule pt-6 sm:grid-cols-4" style={i(4)}>
            {STATS.map(([v, k]) => (
              <div key={k}>
                <dt className="sr-only">{k}</dt>
                <dd className="num text-2xl">{v}</dd>
                <dd className="mt-1 text-xs uppercase tracking-wider text-ink-2">{k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHead n="02" kicker="Quick forecast" title="Pick a route. See the rush before it forms." lead="Model output for any route, day and weather — live from the API when it is up, bundled otherwise." />
        <div className="mt-10">
          <QuickForecast />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <SectionHead n="03" kicker="Route journal" title="Five corridors, one field notebook." lead="Flip through each route's sketch, stops and today's peak. Drag, use the arrow keys, or tap a page." />
        <div className="mt-10">
          <JournalCarousel />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead n="04" kicker="What PasaHero does" title={<>From raw counts to <em className="font-normal italic">dispatch-ready</em> decisions.</>} lead="Four views share one forecasting model. Scroll through the deck, then open any of them." />
        <div className="mt-10 pb-10">
          <StackingCards />
        </div>
      </section>

      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-6 sm:py-28 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end">
          <div>
            <p className="num text-xs uppercase tracking-[0.18em] text-ink-2"><span className="text-signal">05</span> — Next rush hour</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.04] sm:text-6xl">Plan the next rush hour, not the last one.</h2>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <a href="#/map" className="press inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 font-medium text-paper hover:bg-ink/85">Explore the corridors <ArrowRight className="size-4" /></a>
            <a href="#/dispatch" className="press inline-flex items-center gap-2 rounded-lg border border-rule px-5 py-3 font-medium hover:border-ink">Open dispatch</a>
          </div>
        </div>
      </section>
    </>
  )
}
