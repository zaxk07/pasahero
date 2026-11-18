import { ArrowRight, ChevronLeft, ChevronRight, Map as MapIcon } from 'lucide-react'
import { AnimatePresence, motion, useInView, useReducedMotion, type PanInfo } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { DAYS, hourLabel, peakOf, type Day } from '../data/inference'
import { POBLACION, ROUTES, STOPS, type RouteDef } from '../data/routes'
import { useForecast } from '../lib/api'
import { bboxOf, projector } from '../lib/shape'
import { LevelPill } from './ui'

/**
 * Route journal (rebuilt after 21st.dev @kedhareswer/journal-spread-carousel):
 * an open scrapbook spread per corridor, with receding page stacks on either side.
 * Drag / flick, click a stacked page, use ←/→, or the buttons. Auto-advances until touched.
 */
const NOTES: Record<string, string> = {
  'BP-01': 'Class shifts at BatStateU set the rhythm here — expect sharp surges at the top of the hour.',
  'BP-05': 'The classic office commute: Diversion Road soaks up the through-traffic both ways.',
  'BW-02': 'Bus arrival waves at the Grand Terminal spill straight onto the Bauan corridor.',
  'BP-02': 'Ferry schedules drive everything — the pier empties into jeepneys in minutes.',
  'BS-02': 'Market and mall hours: steady all day, heavier into the evening.',
}

const ALL_LINES = ROUTES.map((r) => r.points)
const W = 300, H = 210

const today = (): Day => DAYS[(new Date().getDay() + 6) % 7]

function Polaroid({ route }: { route: RouteDef }) {
  const { path, pt } = projector(bboxOf([route.points]), W, H, 18)
  const [px, py] = pt(POBLACION)
  return (
    <figure className="relative mx-auto w-full max-w-[300px] -rotate-2 rounded-[3px] bg-[#ece8df] p-2.5 pb-10 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]">
      <span aria-hidden className="absolute -top-3 left-6 h-6 w-20 -rotate-6 bg-signal/35 backdrop-blur-[1px]" />
      <span aria-hidden className="absolute -right-4 top-8 h-6 w-16 rotate-[38deg] bg-signal/30" />
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-[2px] bg-[#0f1218]" role="img" aria-label={`Sketch of the ${route.name} corridor`}>
        {ALL_LINES.map((l, i) => (
          <path key={i} d={path(l)} fill="none" stroke="#2a2f3a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <path d={path(route.points)} fill="none" stroke={route.color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={px} cy={py} r="6" fill="#0b0d11" stroke="#ece8df" strokeWidth="2.5" />
      </svg>
      <figcaption className="absolute inset-x-0 bottom-2 text-center font-display text-lg italic text-[#161a22]">
        {route.name}
      </figcaption>
    </figure>
  )
}

function Spread({ route }: { route: RouteDef }) {
  const day = today()
  const rows = useForecast(route.code, day, 'Clear')
  const peak = peakOf(rows)
  const stops = STOPS.filter((s) => s.routes.includes(route.code))
  return (
    <div className="grid h-full md:grid-cols-2">
      {/* left page */}
      <div className="journal-page relative flex flex-col justify-center gap-6 border-b border-rule p-6 sm:p-8 md:border-b-0 md:border-r">
        <p className="num text-[11px] uppercase tracking-[0.2em] text-ink-2">Field notes · {route.code}</p>
        <Polaroid route={route} />
        <p className="font-display text-lg italic leading-snug text-ink/85">“{NOTES[route.code]}”</p>
      </div>
      {/* right page */}
      <div className="journal-page relative flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full" style={{ background: route.color }} aria-hidden />
          <h3 className="text-2xl font-semibold sm:text-3xl">{route.name}</h3>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-rule py-4 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ['Length', `${route.km} km`],
            ['Fleet', `${route.fleet} units`],
            ['Round trip', `${route.roundTripMin} min`],
            ['Capacity', `${route.capacityPph} pax/hr`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wider text-ink-2">{k}</dt>
              <dd className="num mt-0.5 text-sm">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-2">Today ({day}, clear skies)</p>
          <p className="mt-1 text-sm">
            Peak at <span className="num">{hourLabel(peak.hour)}</span> · <span className="num">{peak.demand}</span> pax/hr ·{' '}
            <span className="inline-block align-middle"><LevelPill congestion={peak.congestion} /></span>
          </p>
        </div>
        <ol className="relative flex flex-col gap-2 border-l border-dashed border-rule pl-4 text-sm">
          {stops.slice(0, 4).map((s) => (
            <li key={s.name} className="relative">
              <span aria-hidden className="absolute -left-[21px] top-1.5 size-2 rounded-full border-2 bg-paper" style={{ borderColor: route.color }} />
              <span className="font-medium">{s.name}</span>
              <span className="text-ink-2"> — {s.note}</span>
            </li>
          ))}
        </ol>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <a href="#/map" className="press inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/85">
            <MapIcon className="size-4" aria-hidden /> Open on the map
          </a>
          <a href="#/forecast" className="press inline-flex items-center gap-2 rounded-lg border border-rule px-4 py-2 text-sm font-medium hover:border-ink">
            Full forecast <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function JournalCarousel() {
  const n = ROUTES.length
  const [[index, dir], setState] = useState<[number, number]>([0, 1])
  const [touched, setTouched] = useState(false)
  const reduce = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { amount: 0.4 })

  const go = useCallback((to: number, user = true) => {
    if (user) setTouched(true)
    setState(([i]) => {
      const next = ((to % n) + n) % n
      return next === i ? [i, 1] : [next, to > i ? 1 : -1]
    })
  }, [n])

  useEffect(() => {
    if (touched || reduce || !inView) return
    const id = setInterval(() => setState(([i]) => [(i + 1) % n, 1]), 6000)
    return () => clearInterval(id)
  }, [touched, reduce, inView, n])

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1) }
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70 || info.velocity.x < -450) go(index + 1)
    else if (info.offset.x > 70 || info.velocity.x > 450) go(index - 1)
  }

  const route = ROUTES[index]
  const left = ROUTES.slice(0, index)
  const right = ROUTES.slice(index + 1)

  return (
    <div
      ref={root}
      role="region"
      aria-roledescription="carousel"
      aria-label="Route journal"
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={() => setTouched(true)}
      className="relative overflow-x-clip rounded-3xl outline-offset-4"
    >
      <div className="relative flex items-stretch justify-center [perspective:2200px]">
        {/* receding stacks */}
        <div className="hidden w-16 shrink-0 items-center justify-end lg:flex" aria-hidden={!left.length}>
          {left.map((r, i) => (
            <button
              key={r.code}
              type="button"
              onClick={() => go(ROUTES.indexOf(r))}
              aria-label={`Turn back to ${r.name}`}
              className="h-[86%] w-3 shrink-0 cursor-pointer rounded-l-sm border border-rule bg-paper-2 transition-transform hover:-translate-x-1 [transform:rotateY(62deg)]"
              style={{ marginRight: -2, boxShadow: `inset 3px 0 0 ${r.color}`, opacity: 0.45 + (i + 1) / (left.length + 1) / 2 }}
            />
          ))}
        </div>

        <div className="relative min-w-0 flex-1 [transform-style:preserve-3d]">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={route.code}
              custom={dir}
              variants={{
                enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, rotateY: d * -28, x: d * 90, scale: 0.94 }),
                center: { opacity: 1, rotateY: 0, x: 0, scale: 1 },
                exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, rotateY: d * 32, x: d * -90, scale: 0.92 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 170, damping: 24, mass: 0.9 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={onDragEnd}
              className="journal relative cursor-grab overflow-hidden rounded-2xl border border-rule bg-paper-2 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] active:cursor-grabbing"
              style={{ transformOrigin: dir > 0 ? 'left center' : 'right center' }}
              aria-live={touched ? 'polite' : 'off'}
            >
              <Spread route={route} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden w-16 shrink-0 items-center justify-start lg:flex" aria-hidden={!right.length}>
          {right.map((r, i) => (
            <button
              key={r.code}
              type="button"
              onClick={() => go(ROUTES.indexOf(r))}
              aria-label={`Turn to ${r.name}`}
              className="h-[86%] w-3 shrink-0 cursor-pointer rounded-r-sm border border-rule bg-paper-2 transition-transform hover:translate-x-1 [transform:rotateY(-62deg)]"
              style={{ marginLeft: -2, boxShadow: `inset -3px 0 0 ${r.color}`, opacity: 0.95 - i / (right.length + 1) / 2 }}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a route">
          {ROUTES.map((r, i) => (
            <button
              key={r.code}
              type="button"
              aria-pressed={i === index}
              aria-label={r.name}
              onClick={() => go(i)}
              className="num press cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors"
              style={i === index ? { background: r.color, borderColor: r.color, color: '#fff' } : { borderColor: 'var(--color-rule)', color: 'var(--color-ink-2)' }}
            >
              {r.code}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="num hidden text-xs text-ink-2 sm:inline">{String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous route" className="press grid size-10 cursor-pointer place-items-center rounded-full border border-rule hover:border-ink">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Next route" className="press grid size-10 cursor-pointer place-items-center rounded-full border border-rule hover:border-ink">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
