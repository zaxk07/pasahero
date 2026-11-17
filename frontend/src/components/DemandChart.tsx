import { useState } from 'react'
import { hourLabel, type Row } from '../data/inference'

export interface Series {
  code: string
  color: string
  rows: Row[]
}

const W = 840, H = 340, M = { l: 52, r: 16, t: 26, b: 34 }

export default function DemandChart({ series }: { series: Series[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const maxY = Math.max(100, ...series.flatMap((s) => s.rows.map((r) => r.hi)))
  const top = Math.ceil(maxY / 100) * 100
  const x = (h: number) => M.l + (h / 23) * (W - M.l - M.r)
  const y = (v: number) => H - M.b - (v / top) * (H - M.t - M.b)
  const line = (rows: Row[]) => rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.hour).toFixed(1)},${y(r.demand).toFixed(1)}`).join('')
  const band = (rows: Row[]) =>
    rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.hour).toFixed(1)},${y(r.hi).toFixed(1)}`).join('') +
    [...rows].reverse().map((r) => `L${x(r.hour).toFixed(1)},${y(r.lo).toFixed(1)}`).join('') + 'Z'
  const ticks = Array.from({ length: top / 100 + 1 }, (_, i) => i * 100)

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    setHover(Math.max(0, Math.min(23, Math.round(((px - M.l) / (W - M.l - M.r)) * 23))))
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" role="img" aria-label="Hourly passenger demand forecast with confidence bands" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="#d8d0bb" strokeDasharray={t ? '3 4' : undefined} />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="num" fontSize="11" fill="#4a5160">{t}</text>
          </g>
        ))}
        {[0, 4, 8, 12, 16, 20, 23].map((h) => (
          <text key={h} x={x(h)} y={H - 10} textAnchor="middle" className="num" fontSize="11" fill="#4a5160">{hourLabel(h)}</text>
        ))}
        {series.map((s) => (
          <path key={`b${s.code}`} d={band(s.rows)} fill={s.color} opacity="0.13" />
        ))}
        {series.map((s) => (
          <path key={s.code} d={line(s.rows)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke="#161a22" strokeWidth="1" />
            {series.map((s) => (
              <circle key={s.code} cx={x(hover)} cy={y(s.rows[hover].demand)} r="4.5" fill={s.color} stroke="#f6f2e9" strokeWidth="2" />
            ))}
          </g>
        )}
        <text x={M.l - 40} y="12" fontSize="10" className="num" fill="#4a5160">pax / hr</text>
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-rule bg-paper px-3 py-2 text-xs shadow-sm"
          style={{ left: `clamp(8px, calc(${(x(hover) / W) * 100}% + 10px), calc(100% - 170px))` }}
        >
          <p className="num mb-1 font-medium">{hourLabel(hover)}</p>
          {series.map((s) => (
            <p key={s.code} className="num flex items-center justify-between gap-4">
              <span style={{ color: s.color }}>{s.code}</span>
              <span>{s.rows[hover].demand} <span className="text-ink-2">({s.rows[hover].lo}–{s.rows[hover].hi})</span></span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
