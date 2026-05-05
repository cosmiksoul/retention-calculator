import { useEffect, useMemo, useState } from 'react'
import RetentionInput, {
  DEFAULT_POINTS,
  newPointId,
} from '../components/RetentionInput.jsx'
import PresetSelector from '../components/PresetSelector.jsx'
import KPICards from '../components/KPICards.jsx'
import RetentionChart from '../components/RetentionChart.jsx'
import LTVChart from '../components/LTVChart.jsx'
import ResultsTable from '../components/ResultsTable.jsx'
import CohortPL from '../components/CohortPL.jsx'
import { loadPresets } from '../lib/presetsLoader.js'
import {
  fitPowerLaw,
  retentionCurve,
  retentionBand,
  extrapolationLevel,
} from '../lib/powerLaw.js'
import { ltvSeries, ltvBand, breakevenDay } from '../lib/ltv.js'
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

function ExtrapolationBanner({ level, lastUserT, horizon }) {
  const cls =
    level === 'severe'
      ? 'border-red-700/50 bg-red-950/30 text-red-200'
      : 'border-amber-700/50 bg-amber-950/30 text-amber-200'
  const text =
    level === 'severe'
      ? `Forecast horizon (D${horizon}) is more than 10× past your last input point (D${lastUserT}). Results are indicative — add intermediate retention points or shorten the horizon.`
      : `Forecast horizon (D${horizon}) is more than 3× past your last input point (D${lastUserT}). Treat the extrapolation with caution.`
  return (
    <div className={`rounded-lg border p-3 text-xs ${cls}`}>{text}</div>
  )
}

function safeFit(points) {
  try {
    return fitPowerLaw(points.map((p) => ({ t: p.t, r: p.percent / 100 })))
  } catch {
    return null
  }
}

function safeBenchmarkFit(variant) {
  if (!variant) return null
  try {
    return fitPowerLaw(variant.retentionPoints)
  } catch {
    return null
  }
}

export default function Calculator() {
  const [points, setPoints] = useState(DEFAULT_POINTS)
  const [cohortSize, setCohortSize] = useState(1000)
  const [arpu, setArpu] = useState(2)
  const [cacInput, setCacInput] = useState('10')
  const [horizon, setHorizon] = useState(180)

  const [bundle, setBundle] = useState(null)
  const [bundleError, setBundleError] = useState(null)
  const [presetState, setPresetState] = useState({
    presetId: null,
    quality: 'median',
    geo: 'tier_1',
  })

  useEffect(() => {
    let cancelled = false
    loadPresets(`${import.meta.env.BASE_URL}presets.json`)
      .then((b) => {
        if (!cancelled) setBundle(b)
      })
      .catch((e) => {
        if (!cancelled) setBundleError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handlePresetChange = (next, variant) => {
    setPresetState(next)
    if (!variant) return
    setPoints(
      variant.retentionPoints.map((p) => ({
        id: newPointId(),
        t: p.t,
        percent: Math.round(p.r * 1000) / 10,
      })),
    )
    if (variant.arpuPerDay != null) setArpu(variant.arpuPerDay)
    if (variant.cac != null) setCacInput(String(variant.cac))
  }

  const cac = cacInput === '' || cacInput == null ? null : Number(cacInput)
  const pointErrors = useMemo(() => validateRetentionPoints(points), [points])
  const numericErrors = useMemo(
    () => validateNumericInputs({ cohortSize, arpu, cac, horizon }),
    [cohortSize, arpu, cac, horizon],
  )
  const allValid = pointErrors.valid && numericErrors.valid

  const selectedPreset = useMemo(
    () =>
      bundle && presetState.presetId
        ? bundle.presets.find((p) => p.id === presetState.presetId)
        : null,
    [bundle, presetState.presetId],
  )
  const selectedVariant = useMemo(
    () =>
      selectedPreset
        ? selectedPreset.variants[
            `${presetState.quality}|${presetState.geo}`
          ] ?? null
        : null,
    [selectedPreset, presetState.quality, presetState.geo],
  )

  const fit = useMemo(
    () => (allValid ? safeFit(points) : null),
    [allValid, points],
  )
  const fitSeries = useMemo(
    () => (fit ? retentionCurve(fit, horizon) : null),
    [fit, horizon],
  )
  // ±1σ band only meaningful when we have residual degrees of freedom (n > 2),
  // i.e. fit.se > 0. With exactly 2 points the line passes perfectly through
  // them and the band collapses — no point shading.
  const retBand = useMemo(
    () => (fit && fit.se > 0 ? retentionBand(fit, horizon) : null),
    [fit, horizon],
  )
  const ltv = useMemo(
    () => (fit ? ltvSeries(fit, arpu, horizon) : null),
    [fit, arpu, horizon],
  )
  const ltvBandSeries = useMemo(
    () => (fit && fit.se > 0 ? ltvBand(fit, arpu, horizon) : null),
    [fit, arpu, horizon],
  )
  const beDay = useMemo(
    () => (ltv ? breakevenDay(ltv, cac) : null),
    [ltv, cac],
  )
  const lastUserT = useMemo(
    () => (points.length ? Math.max(...points.map((p) => p.t)) : 0),
    [points],
  )
  const extrap = useMemo(
    () => extrapolationLevel(lastUserT, horizon),
    [lastUserT, horizon],
  )
  const benchmarkFit = useMemo(
    () => safeBenchmarkFit(selectedVariant),
    [selectedVariant],
  )
  const benchmarkSeries = useMemo(
    () => (benchmarkFit ? retentionCurve(benchmarkFit, horizon) : null),
    [benchmarkFit, horizon],
  )

  const ltvAtHorizon = ltv ? ltv[ltv.length - 1].cumLtv : null

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
          {bundleError && (
            <div className="rounded border border-red-900/50 bg-red-950/40 p-2 text-xs text-red-300">
              Failed to load presets: {bundleError}
            </div>
          )}

          <PresetSelector
            bundle={bundle}
            value={presetState}
            onChange={handlePresetChange}
          />

          <div className="border-t border-slate-800 pt-4">
            <RetentionInput
              points={points}
              onChange={setPoints}
              errors={pointErrors.byId}
            />
            {pointErrors.formError && (
              <div className="mt-2 text-xs text-red-400">
                {pointErrors.formError}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
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
              hint="Empty hides breakeven"
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

        <section aria-label="Outputs" className="space-y-5">
          {!allValid && (
            <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
              Fix the input panel to see the model output.
            </div>
          )}

          {allValid && fit && ltv && fitSeries && (
            <>
              <KPICards
                ltvAtHorizon={ltvAtHorizon}
                horizon={horizon}
                rSquared={fit.rSquared}
                beDay={beDay}
                cac={cac}
              />
              {extrap !== 'none' && (
                <ExtrapolationBanner level={extrap} lastUserT={lastUserT} horizon={horizon} />
              )}
              <RetentionChart
                userPoints={points}
                fitSeries={fitSeries}
                bandSeries={retBand}
                benchmarkSeries={benchmarkSeries}
                horizon={horizon}
                lastUserT={lastUserT}
              />
              <LTVChart
                series={ltv}
                bandSeries={ltvBandSeries}
                cac={cac}
                beDay={beDay}
                horizon={horizon}
                lastUserT={lastUserT}
              />
              <ResultsTable
                series={ltv}
                points={points}
                horizon={horizon}
                cohortSize={cohortSize}
                cac={cac}
              />
              {cac != null && cac > 0 ? (
                <CohortPL
                  series={ltv}
                  cohortSize={cohortSize}
                  cac={cac}
                  beDay={beDay}
                  horizon={horizon}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-800 p-4 text-xs text-slate-500">
                  Enter a CAC to see the per-cohort P&amp;L block.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  )
}
