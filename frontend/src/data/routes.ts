import generated from './generated.json'
import roads from './roads.json'

export type LatLng = [number, number]

export interface RouteDef {
  code: string
  name: string
  color: string
  capacityPph: number
  roundTripMin: number
  freeFlowMin: number
  km: number
  fleet: number
  modernShare: number
  avgSeats: number
  /** Dense OSRM road-snapped polyline (hundreds of vertices, baked offline by scripts/fetch_osm_routes.py). */
  points: LatLng[]
}

export interface Stop {
  name: string
  pos: LatLng
  routes: string[]
  note: string
}

export const CENTER: LatLng = [13.7685, 121.0555]
export const POBLACION: LatLng = [13.7568, 121.0585]

const meta = generated.routes as {
  code: string; name: string; color: string; capacity_pph: number; round_trip_min: number
  free_flow_min: number; km: number; fleet: number; modern_share: number; avg_seats: number
}[]

export const ROUTES: RouteDef[] = meta.map((m) => ({
  code: m.code, name: m.name, color: m.color,
  capacityPph: m.capacity_pph, roundTripMin: m.round_trip_min, freeFlowMin: m.free_flow_min, km: m.km,
  fleet: m.fleet, modernShare: m.modern_share, avgSeats: m.avg_seats,
  points: (roads as unknown as Record<string, { line: LatLng[] }>)[m.code].line,
}))

export const routeByCode = (code: string) => ROUTES.find((r) => r.code === code)!

/** Stop approximations; each is snapped to the nearest road vertex of its route so markers sit on the ribbon. */
const RAW_STOPS: { name: string; pos: LatLng; routes: string[]; note: string }[] = [
  { name: 'Batangas Grand Terminal', pos: [13.7747, 121.0470], routes: ['BW-02'], note: 'Inter-city bus and jeepney hub; bus arrival waves feed the Bauan corridor.' },
  { name: 'BatStateU Alangilan', pos: [13.7844, 121.0743], routes: ['BP-01'], note: 'Campus terminal; class-shift arrivals and dismissals.' },
  { name: 'Kumintang Ilaya', pos: [13.7735, 121.0665], routes: ['BP-01'], note: 'Mid-corridor stop on the Alangilan route.' },
  { name: 'Balagtas Rotonda', pos: [13.7975, 121.0622], routes: ['BP-05'], note: 'Northern commuter terminus feeding the city center.' },
  { name: 'Diversion Road', pos: [13.782, 121.0575], routes: ['BP-05'], note: 'Main bypass corridor; heaviest through-traffic.' },
  { name: 'Capitolio / Hilltop', pos: [13.7695, 121.0608], routes: ['BP-05'], note: 'Provincial Capitol area.' },
  { name: 'Nuciti / Poblacion (Bayan)', pos: POBLACION, routes: ['BP-01', 'BP-05', 'BW-02', 'BP-02', 'BS-02'], note: 'Central interchange where every corridor converges.' },
  { name: 'Calicanto', pos: [13.7638, 121.0535], routes: ['BW-02'], note: 'Approach to the Poblacion from the west.' },
  { name: 'Bolbok', pos: [13.773, 121.0455], routes: ['BW-02'], note: 'Highway 436 side, toward Bauan.' },
  { name: 'Bauan Poblacion', pos: [13.7917, 121.0085], routes: ['BW-02'], note: 'Western terminus of the Bauan – Batangas corridor.' },
  { name: 'Sta. Clara / PPA Road', pos: [13.7605, 121.0485], routes: ['BP-02'], note: 'Port access road.' },
  { name: 'Batangas Pier', pos: [13.7547, 121.0448], routes: ['BP-02'], note: 'PPA Batangas Port; ferry arrival waves create sharp surges.' },
  { name: 'Pallocan Bridge', pos: [13.7552, 121.0675], routes: ['BS-02'], note: 'Crossing toward Pallocan.' },
  { name: 'SM City Batangas', pos: [13.7556, 121.0766], routes: ['BS-02'], note: 'Mall and Pallocan market catchment.' },
  { name: 'Libjo', pos: [13.7495, 121.0845], routes: ['BS-02'], note: 'Eastern terminus of the Libjo / Pallocan route.' },
]

const d2 = (a: LatLng, b: LatLng) => (a[0] - b[0]) ** 2 + ((a[1] - b[1]) * 0.97) ** 2

export const STOPS: Stop[] = RAW_STOPS.map((s) => {
  const line = routeByCode(s.routes[0]).points
  const pos = line.reduce((best, p) => (d2(p, s.pos) < d2(best, s.pos) ? p : best), line[0])
  return { ...s, pos }
})

export const SEGMENTS_PER_ROUTE = 14

export interface Segment { path: LatLng[]; factor: number }

/** Splits the dense line into equal-vertex chunks; chunks nearer Poblacion carry a higher congestion factor. */
export function segmentsOf(route: RouteDef): Segment[] {
  const pts = route.points
  const step = Math.ceil((pts.length - 1) / SEGMENTS_PER_ROUTE)
  const out: Segment[] = []
  for (let i = 0; i < pts.length - 1; i += step) {
    const path = pts.slice(i, Math.min(i + step, pts.length - 1) + 1)
    const mid = path[Math.floor(path.length / 2)]
    const km = Math.hypot((mid[0] - POBLACION[0]) * 111, (mid[1] - POBLACION[1]) * 108)
    out.push({ path, factor: 1.25 - 0.5 * Math.min(km / 6, 1) })
  }
  return out
}
