import { useEffect, useState } from 'react'

export const PAGES = [
  { path: '/', label: 'Home' },
  { path: '/map', label: 'Route Map & Traffic' },
  { path: '/forecast', label: 'Demand Forecast' },
  { path: '/dispatch', label: 'Dispatch Optimizer' },
  { path: '/model', label: 'Model & Data' },
] as const

const read = () => {
  const p = window.location.hash.replace(/^#/, '') || '/'
  return PAGES.some((x) => x.path === p) ? p : '/'
}

export function useHashRoute() {
  const [path, setPath] = useState(read)
  useEffect(() => {
    const on = () => {
      setPath(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path
}
