import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { LEVEL_COLOR, levelOf, type Row } from '../data/inference'
import { CENTER, ROUTES, STOPS, segmentsOf } from '../data/routes'

/** Ribbon weight by zoom: bold when zoomed out, slim (with white casing) once street lanes are visible. */
export function weightFor(zoom: number) {
  if (zoom <= 12) return 7
  if (zoom <= 14) return 5
  if (zoom === 15) return 4
  return 3
}

interface Props {
  hour: number
  rowsByRoute: Record<string, Row[]>
  active: string[]
}

interface Ribbon { code: string; factor: number; line: L.Polyline; casing: L.Polyline }

// Segment geometry never changes, so compute once.
const SEGS = ROUTES.map((r) => ({ route: r, segs: segmentsOf(r) }))

export default function CongestionMap({ hour, rowsByRoute, active }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const ribbons = useRef<Ribbon[]>([])
  const latest = useRef({ hour, rowsByRoute, active })
  latest.current = { hour, rowsByRoute, active }

  const paint = () => {
    const m = map.current
    if (!m) return
    const zoom = m.getZoom()
    const w = weightFor(zoom)
    const casing = zoom >= 16
    const { hour: h, rowsByRoute: rows, active: act } = latest.current
    for (const r of ribbons.current) {
      const on = act.includes(r.code)
      const idx = Math.min(100, (rows[r.code]?.[h]?.congestion ?? 0) * r.factor)
      const level = levelOf(idx)
      r.line.setStyle({ color: LEVEL_COLOR[level], weight: on ? w : Math.max(2, w - 3), opacity: on ? 0.95 : 0.25 })
      r.line.setTooltipContent(`${r.code} · ${level} · index ${idx.toFixed(0)}`)
      r.casing.setStyle({ weight: casing && on ? w + 3 : 0, opacity: casing && on ? 0.9 : 0 })
    }
  }

  // Create the map once.
  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { center: CENTER, zoom: 12, scrollWheelZoom: false })
    map.current = m
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m)

    const group = L.featureGroup().addTo(m)
    const list: Ribbon[] = []
    // all casings first so no casing ever paints over a neighbouring segment's colored line
    const pending: { code: string; factor: number; path: L.LatLngTuple[]; casing: L.Polyline }[] = []
    for (const { route, segs } of SEGS) {
      for (const s of segs) {
        const casing = L.polyline(s.path, { color: '#fff', weight: 0, opacity: 0, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(m)
        pending.push({ code: route.code, factor: s.factor, path: s.path, casing })
      }
    }
    for (const p of pending) {
      const line = L.polyline(p.path, { color: '#2b8a3e', weight: 5, lineCap: 'round', lineJoin: 'round' }).bindTooltip('', { sticky: true }).addTo(m)
      list.push({ code: p.code, factor: p.factor, line, casing: p.casing })
    }
    ribbons.current = list

    for (const s of STOPS) {
      L.circleMarker(s.pos, { radius: 7, color: '#161a22', weight: 3, fillColor: '#f6f2e9', fillOpacity: 1 })
        .bindPopup(`<strong>${s.name}</strong><br/>${s.note}<br/><small>Routes: ${s.routes.join(', ')}</small>`)
        .addTo(group)
    }
    group.bringToFront()

    m.on('zoomend', paint)
    paint()
    m.fitBounds(L.latLngBounds(ROUTES.flatMap((r) => r.points)), { padding: [24, 24] })
    // container size can settle after first paint (lazy chunk + layout)
    const t = setTimeout(() => m.invalidateSize(), 50)
    return () => {
      clearTimeout(t)
      m.off()
      m.remove()
      map.current = null
      ribbons.current = []
    }
  }, [])

  // Recolor on data change.
  useEffect(paint, [hour, rowsByRoute, active])

  return <div ref={el} className="h-[460px] w-full rounded-xl border border-rule lg:h-[600px]" role="region" aria-label="Batangas City jeepney route map" />
}
