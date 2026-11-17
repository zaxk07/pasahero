import generated from './generated.json'
import { routeByCode } from './routes'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const WEATHER = ['Clear', 'Light Rain', 'Heavy Rain'] as const
export type Day = (typeof DAYS)[number]
export type Weather = (typeof WEATHER)[number]

export interface Row {
  hour: number
  demand: number
  lo: number
  hi: number
  congestion: number
  headway: number
}

export interface MetricsData {
  r2: number
  mae: number
  rmse: number
  train_rows: number
  test_rows: number
  model: string
  split: string
  feature_importance: { feature: string; importance: number }[]
  cleaning: { raw_rows: number; after_dedupe: number; missing_values: number; outliers_clipped: number; clean_rows: number }
}

export const BUNDLED_METRICS = generated.metrics as MetricsData

const index = new Map<string, Row[]>()
for (const r of generated.forecast) {
  const k = `${r.route}|${r.day}|${r.weather}`
  const list = index.get(k) ?? []
  list.push({ hour: r.hour, demand: r.demand, lo: r.lo, hi: r.hi, congestion: r.congestion, headway: r.headway })
  index.set(k, list)
}

/** Precomputed model output bundled with the app (same values /api/forecast returns). */
export function localForecast(route: string, day: Day, weather: Weather): Row[] {
  return index.get(`${route}|${day}|${weather}`) ?? []
}

export const unitsFor = (route: string, headway: number) => Math.min(routeByCode(route).fleet, Math.ceil(routeByCode(route).roundTripMin / headway))

export type Level = 'Free-Flow' | 'Moderate' | 'Heavy Bottleneck'
export const levelOf = (idx: number): Level => (idx < 45 ? 'Free-Flow' : idx < 70 ? 'Moderate' : 'Heavy Bottleneck')
export const LEVEL_COLOR: Record<Level, string> = { 'Free-Flow': '#2b8a3e', Moderate: '#e8920b', 'Heavy Bottleneck': '#d9363e' }

export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

export function peakOf(rows: Row[]): Row {
  return rows.reduce((a, b) => (b.demand > a.demand ? b : a), rows[0])
}

export interface Block { label: string; from: number; to: number; avgDemand: number; headway: number; units: number }
const BLOCKS: [string, number, number][] = [
  ['Early', 4, 6], ['AM Rush', 6, 9], ['Midday', 9, 15], ['PM Rush', 15, 19], ['Evening', 19, 23],
]

export function dispatchBlocks(route: string, rows: Row[]): Block[] {
  return BLOCKS.map(([label, from, to]) => {
    const sel = rows.filter((r) => r.hour >= from && r.hour < to)
    return {
      label, from, to,
      avgDemand: Math.round(sel.reduce((s, r) => s + r.demand, 0) / sel.length),
      headway: Math.min(...sel.map((r) => r.headway)),
      units: Math.max(...sel.map((r) => unitsFor(route, r.headway))),
    }
  })
}
