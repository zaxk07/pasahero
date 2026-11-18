import { PageHead } from '../components/ui'
import { ROUTES } from '../data/routes'
import { useLive, useMetrics } from '../lib/api'

const STEPS = [
  ['Generate', 'Hourly passenger counts for 5 routes over 140 days: class-shift and work rush windows, weekday/weekend shape, rainfall spells in mm/hr, ferry and bus arrival waves.'],
  ['Clean', 'Drop duplicate timestamps, interpolate sensor dropouts, clip spikes against a per-route, per-hour median band.'],
  ['Engineer', 'Cyclical sin/cos hour and weekday, one-hot route, PAGASA-tier rain level and mm/hr, rush and surge flags, plus 1h, 24h, 168h lags and a 3h rolling mean.'],
  ['Train', 'Gradient-boosted regression with a chronological split: the last 28 days are held out, never shuffled.'],
  ['Serve', 'Scenarios are rolled forward recursively, then bundled as JSON and exposed through FastAPI.'],
]

const ENDPOINTS = [
  ['GET', '/api/routes', 'Route codes, names, colors, capacity and loop time.'],
  ['GET', '/api/forecast?route=BP-01&day=Mon&weather=Clear', 'Hourly demand, p10–p90 band, congestion index, headway.'],
  ['GET', '/api/dispatch-plan?route=BP-01&day=Mon&weather=Clear', 'Headway and active units per time block.'],
  ['GET', '/api/metrics', 'R², MAE, RMSE, feature importance, cleaning log.'],
]

// status: 'sourced' = taken from the named institution's published classification/convention;
//         'assumed' = modelled assumption informed by that source, not a published figure.
const SOURCES: { who: string; used: string; status: 'sourced' | 'assumed'; how: string }[] = [
  { who: 'LTFRB / Batangas City LPTRP', used: 'Route codes and names: BP-01, BP-05, BW-02, BP-02, BS-02', status: 'sourced', how: 'Route identity and corridor endpoints follow the Local Public Transport Route Plan.' },
  { who: 'LTFRB / PUV Modernization', used: 'Unit classes: 18-seat traditional PUJ, 26-seat modern PUJ', status: 'sourced', how: 'Average seats per route = 18 × (1 − m) + 26 × m, where m is the modern-unit share.' },
  { who: 'LTFRB franchise records', used: 'Fleet size and modern-unit share per route', status: 'assumed', how: 'Placeholders sized so peak demand lands near, not above, route capacity. Replace with franchise counts.' },
  { who: 'BatStateU Alangilan', used: 'Class-shift windows driving BP-01 demand', status: 'assumed', how: 'Peaks at morning arrival (~06:30), lunch change, afternoon shift, ~16:30 dismissal and ~20:00 evening dismissal. Replace with the registrar timetable.' },
  { who: 'PPA Batangas Port', used: 'Ferry / RoRo arrival waves driving BP-02 demand', status: 'assumed', how: 'Five arrival waves (≈04:40, 08:10, 12:20, 16:40, 20:40). Replace with PPA vessel schedules.' },
  { who: 'PAGASA', used: 'Rainfall intensity tiers (mm/hr)', status: 'sourced', how: 'Light ≤2.5, Moderate 2.5–7.5, Heavy 7.5–15, Intense 15–30, Torrential >30. Model classes: Clear = dry, Light Rain = light/moderate tiers, Heavy Rain = heavy tier and above.' },
  { who: 'OpenStreetMap via OSRM', used: 'Route geometry, length and free-flow time', status: 'sourced', how: 'Driving routes snapped to roads between each corridor’s stops; jeepney run time = car time × 1.6 for loading stops, plus 10 min dwell per round trip.' },
]

export default function Model() {
  const m = useMetrics()
  const live = useLive()
  const top = Math.max(...m.feature_importance.map((f) => f.importance))
  const stats = [['R²', m.r2.toFixed(3), 'variance explained'], ['MAE', m.mae.toFixed(1), 'pax/hr avg error'], ['RMSE', m.rmse.toFixed(1), 'pax/hr, penalizes big misses']]
  return (
    <>
      <PageHead kicker="Model & data" title="Nothing hidden behind the forecast." lead="The training data is synthetic, calibrated to Philippine transit conventions. Metrics show the pipeline works on that data, not real-world accuracy." />
      <div className="mx-auto max-w-6xl space-y-14 px-4 pb-20 sm:px-6">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Held-out evaluation <span className="num text-sm font-normal text-ink-2">· {m.test_rows} test rows · {live ? 'from live API' : 'bundled'}</span></h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            {stats.map(([k, v, d]) => (
              <div key={k} className="rounded-xl border border-ink bg-paper p-5 shadow-[4px_4px_0_0_var(--color-rule)]">
                <dt className="num text-sm text-ink-2">{k}</dt>
                <dd className="num mt-1 text-5xl font-medium">{v}</dd>
                <p className="mt-1 text-sm text-ink-2">{d}</p>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="mb-1 text-2xl font-semibold">Data sources & calibration</h2>
          <p className="mb-4 max-w-3xl text-ink-2">
            Inputs are grounded in the institutions below. Where no public figure was available, the parameter is marked <em>assumed</em>: a modelling choice, not an official number.
          </p>
          <div className="overflow-x-auto rounded-xl border border-rule">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-paper-2 text-xs uppercase tracking-wider text-ink-2">
                <tr><th className="p-3 font-medium">Source</th><th className="p-3 font-medium">What it sets</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Calibration</th></tr>
              </thead>
              <tbody className="divide-y divide-rule align-top">
                {SOURCES.map((s) => (
                  <tr key={s.who}>
                    <th scope="row" className="p-3 font-semibold">{s.who}</th>
                    <td className="p-3">{s.used}</td>
                    <td className="p-3"><span className={`num rounded px-2 py-0.5 text-xs ${s.status === 'sourced' ? 'bg-free/15 text-free' : 'bg-mod/15 text-mod'}`}>{s.status}</span></td>
                    <td className="p-3 text-ink-2">{s.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mb-3 mt-8 text-lg font-semibold">Route parameters in use</h3>
          <div className="overflow-x-auto rounded-xl border border-rule">
            <table className="num w-full min-w-[640px] text-left text-sm">
              <thead className="bg-paper-2 text-xs uppercase tracking-wider text-ink-2">
                <tr><th className="p-3 font-medium">Route</th><th className="p-3 font-medium">km</th><th className="p-3 font-medium">Round trip</th><th className="p-3 font-medium">Fleet</th><th className="p-3 font-medium">Modern 26-seat</th><th className="p-3 font-medium">Avg seats</th><th className="p-3 font-medium">Capacity</th></tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {ROUTES.map((r) => (
                  <tr key={r.code}>
                    <th scope="row" className="p-3" style={{ color: r.color }}>{r.code}</th>
                    <td className="p-3">{r.km}</td><td className="p-3">{r.roundTripMin} min</td><td className="p-3">{r.fleet}</td>
                    <td className="p-3">{Math.round(r.modernShare * 100)}%</td><td className="p-3">{r.avgSeats}</td><td className="p-3">{r.capacityPph} pax/hr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-ink-2">
            Capacity = fleet × (60 ÷ round trip) × average seats × 0.85 load factor. Headway is the interval at which seats on the road cover predicted demand, clamped to 2–30 minutes; active units = round trip ÷ headway, capped at the fleet.
          </p>
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Pipeline</h2>
            <ol className="space-y-4">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="num grid size-8 shrink-0 place-items-center rounded-full bg-signal font-medium">{i + 1}</span>
                  <div><h3 className="text-lg font-semibold">{t}</h3><p className="text-ink-2">{d}</p></div>
                </li>
              ))}
            </ol>
            <p className="num mt-5 rounded-lg bg-paper-2 p-3 text-xs text-ink-2">
              {m.cleaning.raw_rows} raw rows → {m.cleaning.after_dedupe} after dedupe · {m.cleaning.missing_values} gaps filled · {m.cleaning.outliers_clipped} outliers clipped
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-2xl font-semibold">Feature importance</h2>
            <p className="mb-4 text-sm text-ink-2">Permutation importance on the held-out set, normalized to 100%. The 168h lag dominates because it carries the whole weekly demand profile; correlated lags share credit unevenly.</p>
            <ul className="space-y-2.5">
              {m.feature_importance.map((f) => (
                <li key={f.feature} className="grid grid-cols-[150px_1fr_48px] items-center gap-3 text-sm">
                  <span className="truncate" title={f.feature}>{f.feature}</span>
                  <span className="h-3 rounded-sm bg-paper-2"><span className="block h-full rounded-sm bg-ink transition-[width] duration-700" style={{ width: `${(f.importance / top) * 100}%` }} /></span>
                  <span className="num text-right text-ink-2">{(f.importance * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">FastAPI endpoints</h2>
          <ul className="divide-y divide-rule rounded-xl border border-rule">
            {ENDPOINTS.map(([verb, path, d]) => (
              <li key={path} className="grid gap-1 p-4 md:grid-cols-[auto_1fr_1fr] md:items-center md:gap-4">
                <span className="num rounded bg-ink px-2 py-0.5 text-xs text-paper md:justify-self-start">{verb}</span>
                <code className="num break-all text-sm">{path}</code>
                <span className="text-sm text-ink-2">{d}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-2">Run <code className="num">uvicorn main:app --port 8000</code> inside <code className="num">backend/</code>; this site switches to live responses automatically.</p>
        </section>
      </div>
    </>
  )
}
