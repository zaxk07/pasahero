import { useEffect, useState } from 'react'
import { BUNDLED_METRICS, localForecast, type Day, type MetricsData, type Row, type Weather } from '../data/inference'

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

async function get<T>(path: string, ms = 1500): Promise<T> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(`${API}${path}`, { signal: ctl.signal })
    if (!res.ok) throw new Error(String(res.status))
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

let probe: Promise<MetricsData | null> | null = null
const listeners = new Set<(live: boolean) => void>()
let live = false

function ensureProbe() {
  probe ??= get<MetricsData>('/api/metrics', 1200).then(
    (m) => {
      live = true
      listeners.forEach((l) => l(true))
      return m
    },
    () => null,
  )
  return probe
}

/** true once the FastAPI server answers; bundled data is used until then (and forever if it never does). */
export function useLive() {
  const [on, setOn] = useState(live)
  useEffect(() => {
    listeners.add(setOn)
    void ensureProbe()
    return () => {
      listeners.delete(setOn)
    }
  }, [])
  return on
}

export function useMetrics(): MetricsData {
  const [m, setM] = useState<MetricsData>(BUNDLED_METRICS)
  useEffect(() => {
    void ensureProbe().then((r) => r && setM(r))
  }, [])
  return m
}

/** Bundled rows instantly; upgrades to live API rows when the backend is up. */
export function useForecast(route: string, day: Day, weather: Weather): Row[] {
  const local = localForecast(route, day, weather)
  const [remote, setRemote] = useState<{ key: string; rows: Row[] } | null>(null)
  const key = `${route}|${day}|${weather}`
  const on = useLive()
  useEffect(() => {
    if (!on) return
    let dead = false
    get<{ hourly: Row[] }>(`/api/forecast?route=${route}&day=${day}&weather=${encodeURIComponent(weather)}`)
      .then((r) => {
        if (!dead) setRemote({ key, rows: r.hourly })
      })
      .catch(() => {})
    return () => {
      dead = true
    }
  }, [on, key, route, day, weather])
  return remote && remote.key === key ? remote.rows : local
}
