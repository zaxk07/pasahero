import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import DemandChart from '../components/DemandChart'
import { Field, PageHead, RouteBadge, Segmented } from '../components/ui'
import { WEATHER, hourLabel, levelOf, type Day, type Row, type Weather } from '../data/inference'
import { ROUTES } from '../data/routes'
import { useForecast } from '../lib/api'

const DAY_MODES = { Weekday: 'Wed', Saturday: 'Sat', Sunday: 'Sun' } as const
type DayMode = keyof typeof DAY_MODES

export default function Forecast() {
  const [selected, setSelected] = useState<string[]>(['BP-01', 'BP-02'])
  const [mode, setMode] = useState<DayMode>('Weekday')
  const [weather, setWeather] = useState<Weather>('Clear')
  const day: Day = DAY_MODES[mode]

  const rowsByRoute: Record<string, Row[]> = {}
  for (const r of ROUTES) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    rowsByRoute[r.code] = useForecast(r.code, day, weather)
  }
  const toggle = (c: string) => setSelected((s) => (s.includes(c) ? (s.length > 1 ? s.filter((x) => x !== c) : s) : [...s, c]))
  const series = ROUTES.filter((r) => selected.includes(r.code)).map((r) => ({ code: r.code, color: r.color, rows: rowsByRoute[r.code] }))

  const alerts = series
    .flatMap((s) => s.rows.filter((r) => r.congestion >= 70).map((r) => ({ ...r, code: s.code })))
    .sort((a, b) => b.congestion - a.congestion)

  return (
    <>
      <PageHead kicker="Demand forecast" title="Passenger volume, with honest uncertainty." lead="Lines are the model's expected passengers per hour; shaded bands are the 10th–90th percentile range from held-out errors." />
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-4">
          <Field label="Compare routes">
            <span className="flex flex-wrap gap-2 normal-case tracking-normal">
              {ROUTES.map((r) => <RouteBadge key={r.code} code={r.code} active={selected.includes(r.code)} onClick={() => toggle(r.code)} />)}
            </span>
          </Field>
          <Field label="Day type"><Segmented label="Day type" value={mode} options={Object.keys(DAY_MODES) as DayMode[]} onChange={setMode} /></Field>
          <Field label="Weather"><Segmented label="Weather" value={weather} options={WEATHER} onChange={setWeather} /></Field>
        </div>
        <div className="rounded-2xl border border-rule bg-paper-2/40 p-3 sm:p-5">
          <DemandChart series={series} />
        </div>

        <h2 className="mb-3 mt-10 text-2xl font-semibold">Bottleneck alerts</h2>
        {alerts.length === 0 ? (
          <p className="rounded-xl border border-rule p-5 text-ink-2">No hour reaches the Heavy Bottleneck threshold (index 70) for this selection.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.slice(0, 9).map((a) => (
              <li key={`${a.code}${a.hour}`} className="flex items-start gap-3 rounded-xl border border-heavy/40 bg-heavy/5 p-4">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-heavy" aria-hidden />
                <div>
                  <p className="flex items-center gap-2 font-medium"><RouteBadge code={a.code} /> {hourLabel(a.hour)}–{hourLabel(a.hour + 1)}</p>
                  <p className="num mt-1 text-sm text-ink-2">{levelOf(a.congestion)} · index {a.congestion.toFixed(0)} · {a.demand} pax/hr</p>
                  <p className="mt-1 text-sm">Dispatch every {a.headway} min.</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
