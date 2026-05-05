import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, NavLink, Link } from 'react-router-dom'
import Calculator from './pages/Calculator.jsx'

// Markdown stack (~50 KB gzip) only loads when the user opens /methodology.
const Methodology = lazy(() => import('./pages/Methodology.jsx'))

const REPO_URL = 'https://github.com/cosmiksoul/retention-calculator'
const THEME_KEY = 'rcl_theme'

// Reads the theme attribute index.html's bootstrap script wrote so the React
// state matches what the page is already rendering — avoids a flicker on
// hydration. Falls back to dark for SSR / non-DOM environments.
function readInitialTheme() {
  if (typeof document === 'undefined') return 'dark'
  const t = document.documentElement.getAttribute('data-theme')
  return t === 'light' ? 'light' : 'dark'
}

function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // private mode etc. — ignore
    }
  }, [theme])
  return [theme, setTheme]
}

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-line text-sm text-fg-dim transition-colors hover:border-accent/60 hover:text-accent-fg focus:border-accent/60 focus:text-accent-fg focus:outline-none"
    >
      {isDark ? '☀' : '🌙'}
    </button>
  )
}

function navClass({ isActive }) {
  const base = 'text-sm transition-colors'
  return isActive
    ? `${base} text-accent-fg`
    : `${base} text-fg-dim hover:text-fg`
}

function Header({ theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg-elev/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <NavLink to="/" className="font-semibold tracking-tight text-fg-strong">
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
            className="text-sm text-fg-dim transition-colors hover:text-fg"
          >
            GitHub ↗
          </a>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line px-6 py-4 text-xs text-fg-faint">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>
          Power-law model. See the{' '}
          <Link to="/methodology" className="text-fg-dim hover:text-fg">
            methodology page
          </Link>{' '}
          for the formula and what the calculator deliberately does not do.
        </span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-fg-muted"
        >
          Source on GitHub ↗
        </a>
      </div>
    </footer>
  )
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const toggleTheme = () =>
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col font-sans">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <Suspense fallback={<div className="text-fg-faint">Loading…</div>}>
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
