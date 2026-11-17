import { Download } from 'lucide-react'
import { useState } from 'react'
import { Field, PageHead, RouteBadge, Segmented, SelectBox } from '../components/ui'
import { DAYS, WEATHER, dispatchBlocks, hourLabel, localForecast, type Block, type Day, type Weather } from '../data/inference'
import { ROUTES, routeByCode } from '../data/routes'
import { useForecast } from '../lib/api'

function download(name: string, lines: string[]) {
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

const HEADER = 'route,day,weather,block,from,to,avg_demand_pax_hr,headway_min,active_units'
const csvRow = (code: string, day: Day, weather: Weather, b: Block) =>
  [code, day, weather, b.label, hourLabel(b.from), hourLabel(b.to), b.avgDemand, b.headway, b.units].join(',')

export default function Dispatch() {
  const [code, setCode] = useState('BP-01')
  const [day, setDay] = useState<Day>('Mon')
  const [weather, setWeather] = useState<Weather>('Clear')
  const rows = useForecast(code, day, weather)
  const blocks = dispatchBlocks(code, rows)
  const route = routeByCode(code)

  const exportOne = () => download(`pasahero-${code}-${day}.csv`, [HEADER, ...blocks.map((b) => csvRow(code, day, weather, b))])
  const exportAll = () =>
    download(`pasahero-all-routes-${day}.csv`, [
      HEADER,
      ...ROUTES.flatMap((r) => dispatchBlocks(r.code, localForecast(r.code, day, weather)).map((b) => csvRow(r.code, day, weather, b))),
    ])
  const maxUnits = Math.max(...blocks.map((b) => b.units))

  return (
    <>
      <PageHead kicker="Dispatch optimizer" title="How many jeeps, how often." lead="Headway is set so seats on the road cover predicted demand at 85% load; active units are the fleet needed to hold that headway over a full round trip." />
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-4">
          <Field label="Route"><SelectBox value={code} options={ROUTES.map((r) => r.code)} onChange={setCode} render={(c) => `${c} · ${routeByCode(c).name}`} /></Field>
          <Field label="Day"><SelectBox value={day} options={DAYS} onChange={setDay} /></Field>
          <Field label="Weather"><Segmented label="Weather" value={weather} options={WEATHER} onChange={setWeather} /></Field>
        </div>
        <div className="overflow-x-auto rounded-xl border border-ink">
          <table className="w-full min-w-[620px] text-left">
            <caption className="sr-only">Recommended dispatch plan for {code}</caption>
            <thead className="bg-ink text-paper">
              <tr className="text-xs uppercase tracking-wider">
                <th className="p-3 font-medium">Time block</th><th className="p-3 font-medium">Window</th>
                <th className="p-3 text-right font-medium">Avg demand</th><th className="p-3 text-right font-medium">Headway</th><th className="p-3 font-medium">Active units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {blocks.map((b) => (
                <tr key={b.label} className="hover:bg-paper-2/60">
                  <th scope="row" className="p-3 font-display text-lg font-semibold">{b.label}</th>
                  <td className="num p-3 text-sm text-ink-2">{hourLabel(b.from)}–{hourLabel(b.to)}</td>
                  <td className="num p-3 text-right">{b.avgDemand} <span className="text-xs text-ink-2">pax/hr</span></td>
                  <td className="num p-3 text-right text-lg font-medium">{b.headway} <span className="text-xs text-ink-2">min</span></td>
                  <td className="p-3">
                    <span className="flex items-center gap-3">
                      <span className="num w-6 text-right text-lg font-medium">{b.units}</span>
                      <span aria-hidden className="h-2.5 rounded-full transition-[width] duration-500" style={{ width: `${(b.units / maxUnits) * 140}px`, background: route.color }} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={exportOne} className="press inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ink px-4 py-2.5 font-medium text-paper hover:bg-ink-2">
            <Download className="size-4" aria-hidden /> Export <RouteBadge code={code} /> CSV
          </button>
          <button type="button" onClick={exportAll} className="press inline-flex cursor-pointer items-center gap-2 rounded-lg border border-ink px-4 py-2.5 font-medium hover:bg-paper-2">
            <Download className="size-4" aria-hidden /> Export all routes
          </button>
          <p className="text-sm text-ink-2">Round trip {route.roundTripMin} min · fleet {route.fleet} units · {route.avgSeats} avg seats ({Math.round(route.modernShare * 100)}% modern 26-seat, rest 18-seat).</p>
        </div>
      </div>
    </>
  )
}
