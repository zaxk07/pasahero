import { ArrowUpRight, BarChart3, CalendarClock, Cpu, Map as MapIcon, type LucideIcon } from 'lucide-react'
import { motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { BUNDLED_METRICS, dispatchBlocks, localForecast } from '../data/inference'
import { POBLACION, ROUTES } from '../data/routes'
import { bboxOf, projector } from '../lib/shape'

/**
 * Feature deck (rebuilt after 21st.dev @aakashmehra/scroll-stacking-cards):
 * sticky cards rise in tilted and out of focus, sharpen as they settle, then sink back under the next one.
 * Card "screens" are tiny inline SVG/CSS visuals drawn from the bundled model output.
 */

const SPRING = { stiffness: 200, damping: 32, mass: 0.5 }

function MiniMap() {
  const { path, pt } = projector(bboxOf(ROUTES.map((r) => r.points)), 400, 260, 20)
  const [px, py] = pt(POBLACION)
  return (
    <svg viewBox="0 0 400 260" className="h-full w-full" aria-hidden>
      {ROUTES.map((r) => (
        <path key={r.code} d={path(r.points)} fill="none" stroke={r.color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <circle cx={px} cy={py} r="14" fill="var(--color-signal)" opacity="0.18">
        <animate attributeName="r" values="8;20;8" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx={px} cy={py} r="6" fill="#0b0d11" stroke="#ece8df" strokeWidth="2.5" />
    </svg>
  )
}

function MiniForecast() {
  const rows = localForecast('BP-01', 'Mon', 'Clear')
  const max = Math.max(...rows.map((r) => r.hi))
  const x = (h: number) => 10 + (h / 23) * 380
  const y = (v: number) => 230 - (v / max) * 200
  const band = `M${rows.map((r) => `${x(r.hour)} ${y(r.hi)}`).join('L')}L${[...rows].reverse().map((r) => `${x(r.hour)} ${y(r.lo)}`).join('L')}Z`
  const line = `M${rows.map((r) => `${x(r.hour)} ${y(r.demand)}`).join('L')}`
  return (
    <svg viewBox="0 0 400 250" className="h-full w-full" aria-hidden>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <line key={k} x1="10" x2="390" y1={230 - k * 200} y2={230 - k * 200} stroke="var(--color-rule)" strokeDasharray="3 5" />
      ))}
      <path d={band} fill="#E8590C" opacity="0.18" />
      <path d={line} fill="none" stroke="#E8590C" strokeWidth="3" strokeLinejoin="round" />
      <line x1="10" x2="390" y1="230" y2="230" stroke="var(--color-rule)" />
    </svg>
  )
}

function MiniDispatch() {
  const blocks = dispatchBlocks('BP-05', localForecast('BP-05', 'Fri', 'Light Rain'))
  return (
    <table className="num w-full text-left text-xs sm:text-sm">
      <thead className="text-ink-2">
        <tr className="border-b border-rule">
          <th className="py-2 font-normal">Block</th>
          <th className="py-2 font-normal">Avg pax</th>
          <th className="py-2 font-normal">Headway</th>
          <th className="py-2 font-normal">Units</th>
        </tr>
      </thead>
      <tbody>
        {blocks.map((b) => (
          <tr key={b.label} className="border-b border-rule/60">
            <td className="py-2 font-sans">{b.label}</td>
            <td className="py-2">{b.avgDemand}</td>
            <td className="py-2">{b.headway} min</td>
            <td className="py-2">
              <span className="inline-block h-2 rounded-sm bg-signal/80 align-middle" style={{ width: `${b.units * 2}px` }} /> {b.units}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MiniModel() {
  const fi = BUNDLED_METRICS.feature_importance.slice(0, 5)
  const top = fi[0]?.importance ?? 1
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <p className="num text-4xl sm:text-5xl">R² {BUNDLED_METRICS.r2.toFixed(3)}</p>
      <ul className="flex flex-col gap-2.5">
        {fi.map((f) => (
          <li key={f.feature} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-xs">
            <span className="num truncate text-ink-2">{f.feature}</span>
            <span className="h-2.5 rounded-sm bg-paper"><span className="block h-full rounded-sm bg-ink" style={{ width: `${(f.importance / top) * 100}%` }} /></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface Feature { href: string; icon: LucideIcon; title: string; cta: string; body: string; points: string[]; visual: ReactNode; tint: string }

const FEATURES: Feature[] = [
  {
    href: '#/map', icon: MapIcon, title: 'Corridor map', cta: 'Open the map', tint: '#E8590C',
    body: 'Segment-by-segment congestion for all five routes, scrubbed by hour and weather.',
    points: ['Road-snapped OSM polylines', 'Hour + weather scrubber', 'Stop notes and popups'],
    visual: <MiniMap />,
  },
  {
    href: '#/forecast', icon: BarChart3, title: 'Demand forecast', cta: 'See the forecast', tint: '#1C7ED6',
    body: 'Hourly passenger volume with confidence bands and automatic bottleneck alerts.',
    points: ['24-hour curves per route', 'Confidence bands', 'Bottleneck alerts'],
    visual: <MiniForecast />,
  },
  {
    href: '#/dispatch', icon: CalendarClock, title: 'Dispatch planner', cta: 'Plan dispatch', tint: '#2F9E44',
    body: 'Headways and active units per time block, exportable as CSV for dispatchers.',
    points: ['Five daily time blocks', 'Headway → units on the road', 'One-click CSV export'],
    visual: <MiniDispatch />,
  },
  {
    href: '#/model', icon: Cpu, title: 'Model transparency', cta: 'Inspect the model', tint: '#AE3EC9',
    body: 'Cleaning steps, feature importance and held-out R², MAE and RMSE, in the open.',
    points: ['Data cleaning ledger', 'Feature importance', 'Held-out error metrics'],
    visual: <MiniModel />,
  },
]

function Card({ f, i, n, deck, still }: { f: Feature; i: number; n: number; deck: MotionValue<number>; still: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  // entry: from the moment the card's slot enters the viewport until it pins
  const { scrollYProgress: enter } = useScroll({ target: wrap, offset: ['start end', 'start start'] })
  const e = useSpring(enter, SPRING)
  const rotateX = useTransform(e, [0, 1], [16, 0])
  const blurIn = useTransform(e, [0, 0.85, 1], [10, 1, 0])
  // stack: once later cards arrive this one sinks back and dims
  const start = i / n
  const scale = useTransform(deck, [start, 1], [1, 1 - (n - 1 - i) * 0.05])
  const dim = useTransform(deck, [start, Math.min(1, start + 1 / n), 1], [1, 1, 1 - (n - 1 - i) * 0.14])
  const filter = useMotionTemplate`blur(${blurIn}px) brightness(${dim})`
  const Icon = f.icon

  const body = (
    <div className="relative grid h-full overflow-hidden rounded-3xl border border-rule bg-paper-2 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col gap-5 p-6 sm:p-9">
        <div className="flex items-center justify-between">
          <span className="grid size-11 place-items-center rounded-xl border border-rule" style={{ color: f.tint }}>
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="num text-xs text-ink-2">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
        </div>
        <h3 className="text-3xl font-semibold leading-tight sm:text-4xl">{f.title}</h3>
        <p className="text-ink-2">{f.body}</p>
        <ul className="mt-auto hidden flex-col gap-2 text-sm sm:flex">
          {f.points.map((p) => (
            <li key={p} className="flex items-center gap-2.5">
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: f.tint }} />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative m-3 mt-0 overflow-hidden rounded-2xl border border-rule bg-paper p-5 pb-16 md:m-3 md:ml-0 md:p-7 md:pb-16">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full opacity-25 blur-3xl" style={{ background: f.tint }} />
        <div className="relative h-48 sm:h-60 md:h-full">{f.visual}</div>
      </div>
      {/* cut-out corner link */}
      <a
        href={f.href}
        className="group absolute bottom-0 right-0 inline-flex items-center gap-2 rounded-tl-2xl border-l border-t border-rule bg-paper-2 py-3 pl-5 pr-6 text-sm font-medium"
      >
        {f.cta}
        <span className="grid size-7 place-items-center rounded-full bg-ink text-paper transition-transform group-hover:rotate-45">
          <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </a>
    </div>
  )

  if (still) return <div className="h-auto md:h-[min(72vh,560px)]">{body}</div>

  return (
    <div ref={wrap} className="h-[92vh]">
      <div className="sticky [perspective:1600px]" style={{ top: `calc(5.5rem + ${i * 18}px)` }}>
        <motion.div style={{ scale, rotateX, filter, transformOrigin: 'center top' }} className="h-[min(72vh,580px)] will-change-transform">
          {body}
        </motion.div>
      </div>
    </div>
  )
}

export default function StackingCards() {
  const deckRef = useRef<HTMLDivElement>(null)
  const still = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: deckRef, offset: ['start start', 'end end'] })
  const deck = useSpring(scrollYProgress, SPRING)
  return (
    <div ref={deckRef} className={still ? 'flex flex-col gap-6' : 'relative overflow-x-clip'}>
      {FEATURES.map((f, i) => (
        <Card key={f.title} f={f} i={i} n={FEATURES.length} deck={deck} still={still} />
      ))}
    </div>
  )
}
