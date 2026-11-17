import { Menu, Radio, X } from 'lucide-react'
import { useState } from 'react'
import { useLive } from '../lib/api'
import { PAGES } from '../lib/router'

export default function Navbar({ path }: { path: string }) {
  const [open, setOpen] = useState(false)
  const live = useLive()
  return (
    <nav className="sticky top-0 z-[1000] border-b border-rule bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid size-7 place-items-center rounded-md bg-ink text-signal" aria-hidden>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18 9 9l4 5 8-9" /></svg>
          </span>
          PasaHero
        </a>
        <ul className="hidden items-center gap-1 lg:flex">
          {PAGES.map((p) => (
            <li key={p.path}>
              <a
                href={`#${p.path}`}
                aria-current={path === p.path ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${path === p.path ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'}`}
              >
                {p.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <span className="num hidden items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs text-ink-2 sm:inline-flex" title={live ? 'Connected to FastAPI on localhost:8000' : 'Using bundled forecast data'}>
            <Radio className={`size-3 ${live ? 'text-free' : 'text-ink-2'}`} aria-hidden />
            {live ? 'Live API' : 'Bundled data'}
          </span>
          <button type="button" className="grid size-9 cursor-pointer place-items-center rounded-md border border-rule lg:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <ul className="border-t border-rule bg-paper px-4 py-2 lg:hidden">
          {PAGES.map((p) => (
            <li key={p.path}>
              <a href={`#${p.path}`} onClick={() => setOpen(false)} className={`block rounded-md px-3 py-3 text-base ${path === p.path ? 'font-semibold' : 'text-ink-2'}`}>
                {p.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
