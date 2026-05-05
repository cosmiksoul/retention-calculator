import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import Calculator from './pages/Calculator.jsx'
import Methodology from './pages/Methodology.jsx'

const REPO_URL = 'https://github.com/cosmiksoul/retention-calculator'

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

export default function App() {
  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <Routes>
            <Route path="/" element={<Calculator />} />
            <Route path="/methodology" element={<Methodology />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
