import { useMemo, useState } from 'react'
import RetentionInput, { DEFAULT_POINTS } from '../components/RetentionInput.jsx'
import {
  validateRetentionPoints,
  validateNumericInputs,
} from '../lib/validate.js'

const inputCls =
  'rounded border border-slate-700 bg-bg-subtle px-2 py-1 text-sm tabular-nums ' +
  'text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40'

function NumberField({ label, value, onChange, hint, error, min, step, suffix }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} w-32`}
        />
        {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
      </span>
      {hint && !error && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  )
}

export default function Calculator() {
  const [points, setPoints] = useState(DEFAULT_POINTS)
  const [cohortSize, setCohortSize] = useState(1000)
  const [arpu, setArpu] = useState(2)
  // CAC is optional: empty string means "not provided".
  const [cacInput, setCacInput] = useState('10')
  const [horizon, setHorizon] = useState(180)

  const cac = cacInput === '' || cacInput == null ? null : Number(cacInput)

  const pointErrors = useMemo(() => validateRetentionPoints(points), [points])
  const numericErrors = useMemo(
    () => validateNumericInputs({ cohortSize, arpu, cac, horizon }),
    [cohortSize, arpu, cac, horizon],
  )
  const allValid = pointErrors.valid && numericErrors.valid

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Calculator</h1>
        <p className="mt-1 text-sm text-slate-400">
          Power law fit of retention curve, then ARPU × Σ R(t) for LTV.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[360px,1fr]">
        <aside className="space-y-5 rounded-lg border border-slate-800 bg-bg-elev/40 p-4">
          <RetentionInput
            points={points}
            onChange={setPoints}
            errors={pointErrors.byId}
          />
          {pointErrors.formError && (
            <div className="text-xs text-red-400">{pointErrors.formError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Cohort size"
              value={cohortSize}
              min={1}
              step={1}
              onChange={(v) => setCohortSize(Number(v))}
              error={numericErrors.errors.cohortSize}
            />
            <NumberField
              label="ARPU"
              value={arpu}
              min={0}
              step={0.01}
              suffix="$ / day"
              onChange={(v) => setArpu(Number(v))}
              error={numericErrors.errors.arpu}
            />
            <NumberField
              label="CAC"
              value={cacInput}
              min={0}
              step={0.01}
              suffix="$ (optional)"
              onChange={setCacInput}
              error={numericErrors.errors.cac}
              hint="Leave empty to skip breakeven"
            />
            <NumberField
              label="Horizon"
              value={horizon}
              min={30}
              step={1}
              suffix="days"
              onChange={(v) => setHorizon(Number(v))}
              error={numericErrors.errors.horizon}
            />
          </div>
        </aside>

        <section
          aria-label="Outputs"
          className="rounded-lg border border-dashed border-slate-800 p-6 text-sm text-slate-500"
        >
          <p className="font-medium text-slate-400">Outputs</p>
          <p className="mt-2">
            KPI cards, retention curve, LTV chart, results table and Cohort
            P&amp;L land in Stages 4–6.
          </p>
          <pre className="mt-4 overflow-auto rounded bg-bg-subtle/60 p-3 text-xs leading-relaxed text-slate-400">
{JSON.stringify(
  {
    valid: allValid,
    pointsCount: points.length,
    cohortSize,
    arpu,
    cac,
    horizon,
  },
  null,
  2,
)}
          </pre>
        </section>
      </div>
    </section>
  )
}
