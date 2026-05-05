import { lazy, Suspense, useState } from 'react'
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
} from 'react-router-dom'
import Calculator from './pages/Calculator.jsx'

// Markdown stack (~50 KB gzip) only loads when the user opens /methodology.
const Methodology = lazy(() => import('./pages/Methodology.jsx'))

const REPO_URL = 'https://github.com/cosmiksoul/retention-calculator'
const BANNER_KEY = 'rcl_methodology_banner_dismissed'

function navClass({ isActive }) {
  const base = 'text-sm transition-colors'
  return isActive
    ? `${base} text-cyan-300`
    : `${base} text-slate-400 hover:text-slate-200`
}

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-bg-elev/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <NavLink to="/" className="font-semibold tracking-tight text-slate-100">
          Retention &amp; LTV Calculator
        </NavLink>
        <nav className="flex items-center gap-6">
          <NavLink to="/" end className={navClass}>
            Calculator
          </NavLink>
          <NavLink to="/methodology" className={navClass}>
            Methodology
          </NavLink>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-800 px-6 py-4 text-xs text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>
          Power-law model. See the{' '}
          <Link to="/methodology" className="text-slate-400 hover:text-slate-200">
            methodology page
          </Link>{' '}
          for the formula and what the calculator deliberately does not do.
        </span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-300"
        >
          Source on GitHub ↗
        </a>
      </div>
    </footer>
  )
}

function MethodologyBanner() {
  const location = useLocation()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return Boolean(localStorage.getItem(BANNER_KEY))
    } catch {
      return false
    }
  })
  if (dismissed || location.pathname === '/methodology') return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(BANNER_KEY, '1')
    } catch {
      // ignore — private mode etc.
    }
  }

  return (
    <div className="border-b border-cyan-900/40 bg-cyan-950/30 px-6 py-2 text-xs">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <span className="text-slate-300">
          New here? Read the{' '}
          <Link to="/methodology" className="text-cyan-300 underline-offset-2 hover:underline">
            methodology page
          </Link>{' '}
          — formula, ranges, what the model can and cannot do.
        </span>
        <button
          type="button"
          onClick={dismiss}
          className="ml-auto text-slate-500 hover:text-slate-200"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col font-sans">
        <Header />
        <MethodologyBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <Suspense fallback={<div className="text-slate-500">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Calculator />} />
              <Route path="/methodology" element={<Methodology />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </HashRouter>
  )
}
