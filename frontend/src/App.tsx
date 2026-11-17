import { Suspense, lazy } from 'react'
import Navbar from './components/Navbar'
import Dispatch from './pages/Dispatch'
import Forecast from './pages/Forecast'
import Home from './pages/Home'
const MapPage = lazy(() => import('./pages/MapPage'))
import Model from './pages/Model'
import { useHashRoute } from './lib/router'

export default function App() {
  const path = useHashRoute()
  return (
    <>
      <Navbar path={path} />
      <main>
        {path === '/' && <Home />}
        {path === '/map' && (
          <Suspense fallback={<p className="p-10 text-ink-2">Loading map…</p>}>
            <MapPage />
          </Suspense>
        )}
        {path === '/forecast' && <Forecast />}
        {path === '/dispatch' && <Dispatch />}
        {path === '/model' && <Model />}
      </main>
      <footer className="border-t border-rule py-8 text-center text-sm text-ink-2">
        PasaHero · portfolio project · synthetic data · map © OpenStreetMap contributors
      </footer>
    </>
  )
}
