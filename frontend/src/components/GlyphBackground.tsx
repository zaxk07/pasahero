import { useEffect, useRef } from 'react'

/**
 * Dark glyph field (rebuilt after 21st.dev @skyleen77/backgrounds-glyph, Canvas 2D instead of WebGL):
 * muted transit glyphs on obsidian, lit by drifting route-colored glows, a pointer trail and click ripples.
 */
const GLYPHS = Array.from('PASAHERO0123456789BPWSL→←↑↓·•+×=<>/\\|#%*:;')
const BASE: RGB = [154, 161, 173]
const GLOWS: { rgb: RGB; a: number; b: number; p: number; r: number }[] = [
  { rgb: [242, 183, 5], a: 0.00011, b: 0.00017, p: 0, r: 0.42 },
  { rgb: [232, 89, 12], a: 0.00008, b: 0.00013, p: 2.1, r: 0.34 },
  { rgb: [28, 126, 214], a: 0.00013, b: 0.00009, p: 4.2, r: 0.38 },
]
const TRAIL_MS = 650
const TRAIL_R = 110
const RIPPLE_MS = 1800
const RIPPLE_SPEED = 0.55 // px per ms
const RIPPLE_W = 34

type RGB = [number, number, number]
interface Cell { g: number; base: number; next: number }

export default function GlyphBackground({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const host = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !host || !ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0, h = 0, cols = 0, rows = 0, size = 18
    let cells: Cell[] = []
    const trail: { x: number; y: number; t: number }[] = []
    const ripples: { x: number; y: number; t: number }[] = []
    let raf = 0
    let visible = true

    const glyphIndex = () => (Math.random() * GLYPHS.length) | 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = host.clientWidth
      h = host.clientHeight
      size = w < 640 ? 15 : 19
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / size) + 1
      rows = Math.ceil(h / size) + 1
      const now = performance.now()
      cells = Array.from({ length: cols * rows }, () => ({ g: glyphIndex(), base: 0.05 + Math.random() * 0.1, next: now + Math.random() * 6000 }))
      if (reduce) draw(now)
    }

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h)
      ctx.font = `${size * 0.62}px "JetBrains Mono", ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const t = reduce ? 4000 : now
      const glows = GLOWS.map((g) => ({
        x: w * (0.5 + 0.42 * Math.sin(t * g.a + g.p)),
        y: h * (0.5 + 0.4 * Math.cos(t * g.b + g.p * 1.3)),
        r: Math.max(w, h) * g.r,
        rgb: g.rgb,
      }))
      while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift()
      while (ripples.length && now - ripples[0].t > RIPPLE_MS) ripples.shift()

      for (let row = 0; row < rows; row++) {
        const cy = row * size + size / 2
        for (let col = 0; col < cols; col++) {
          const cell = cells[row * cols + col]
          const cx = col * size + size / 2
          if (!reduce && now > cell.next) {
            cell.g = glyphIndex()
            cell.next = now + 2500 + Math.random() * 7000
          }
          let lift = 0, tr = 0, tg = 0, tb = 0, tw = 0
          for (const g of glows) {
            const dx = cx - g.x, dy = cy - g.y
            const d = Math.sqrt(dx * dx + dy * dy)
            if (d < g.r) {
              const k = (1 - d / g.r) ** 2 * 0.5
              lift += k
              tr += g.rgb[0] * k; tg += g.rgb[1] * k; tb += g.rgb[2] * k; tw += k
            }
          }
          for (const p of trail) {
            const dx = cx - p.x, dy = cy - p.y
            const d2 = dx * dx + dy * dy
            if (d2 < TRAIL_R * TRAIL_R) {
              const k = (1 - Math.sqrt(d2) / TRAIL_R) * (1 - (now - p.t) / TRAIL_MS) * 0.35
              lift += k
              tr += 236 * k; tg += 232 * k; tb += 223 * k; tw += k
            }
          }
          for (const rp of ripples) {
            const age = now - rp.t
            const dx = cx - rp.x, dy = cy - rp.y
            const off = Math.abs(Math.sqrt(dx * dx + dy * dy) - age * RIPPLE_SPEED)
            if (off < RIPPLE_W) {
              const k = (1 - off / RIPPLE_W) * (1 - age / RIPPLE_MS) * 0.9
              lift += k
              tr += 242 * k; tg += 183 * k; tb += 5 * k; tw += k
              if (k > 0.5) cell.g = glyphIndex()
            }
          }
          const a = Math.min(0.95, cell.base + lift)
          if (a < 0.03) continue
          const mix = tw ? Math.min(1, tw * 1.6) : 0
          const r = tw ? BASE[0] * (1 - mix) + (tr / tw) * mix : BASE[0]
          const gg = tw ? BASE[1] * (1 - mix) + (tg / tw) * mix : BASE[1]
          const b = tw ? BASE[2] * (1 - mix) + (tb / tw) * mix : BASE[2]
          ctx.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${a.toFixed(3)})`
          ctx.fillText(GLYPHS[cell.g], cx, cy)
        }
      }
    }

    const loop = (now: number) => {
      draw(now)
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0
    }
    const start = () => {
      if (!reduce && !raf && visible && !document.hidden) raf = requestAnimationFrame(loop)
    }

    const local = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect()
      return { x: e.clientX - b.left, y: e.clientY - b.top }
    }
    const onMove = (e: PointerEvent) => trail.push({ ...local(e), t: performance.now() })
    const onDown = (e: PointerEvent) => ripples.push({ ...local(e), t: performance.now() })

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      start()
    })
    io.observe(host)
    const onVis = () => start()
    document.addEventListener('visibilitychange', onVis)
    if (!reduce) {
      host.addEventListener('pointermove', onMove)
      host.addEventListener('pointerdown', onDown)
    }
    void document.fonts?.ready.then(() => reduce && draw(performance.now()))
    start()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} />
}
