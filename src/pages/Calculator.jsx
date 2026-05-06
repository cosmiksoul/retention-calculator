import { useEffect, useMemo, useState } from 'react'
import RetentionInput, {
  newPointId,
} from '../components/RetentionInput.jsx'
import HoverHint from '../components/HoverHint.jsx'
import PresetSelector from '../components/PresetSelector.jsx'
import PeriodSelector from '../components/PeriodSelector.jsx'
import FunnelSection from '../components/FunnelSection.jsx'
import FunnelWaterfall from '../components/FunnelWaterfall.jsx'
import CohortPaste from '../components/CohortPaste.jsx'
import DAUInput from '../components/DAUInput.jsx'
import DAUChart from '../components/DAUChart.jsx'
import AcquisitionKPI from '../components/AcquisitionKPI.jsx'
import PayingBaseKPI from '../components/PayingBaseKPI.jsx'
import RetentionChart from '../components/RetentionChart.jsx'
import LTVChart from '../components/LTVChart.jsx'
import RevenueChart from '../components/RevenueChart.jsx'
import ResultsTable from '../components/ResultsTable.jsx'
import CohortPL from '../components/CohortPL.jsx'
import BandSigmaToggle from '../components/BandSigmaToggle.jsx'
import ExtrapolationBanner from '../components/ExtrapolationBanner.jsx'
import ForecastModeToggle from '../components/ForecastModeToggle.jsx'
import { parseCohortTable } from '../lib/parseCohort.js'
import { parseDAUTable } from '../lib/parseDAU.js'
import {
  deconvolveDAU,
  reconstructDAU,
  validateDAUInput,
} from '../lib/deconvolution.js'
import { loadPresets, variantForPeriod } from '../lib/presetsLoader.js'
import {
  fitPowerLaw,
  retentionCurve,
  retentionBand,
  extrapolationLevel,
} from '../lib/powerLaw.js'
import {
  funnelCascade,
  cohortLtv,
  cohortLtvBand,
  payback as paybackFn,
  periodAbbr,
  periodUnit,
} from '../lib/calc.js'
import { adjustFitToBenchmark } from '../lib/industryAdjusted.js'
import {
  validateRetentionPoints,
  validateNumericInputs,
  validateFunnel,
} from '../lib/validate.js'
import { buildCsv, buildFilename } from '../lib/exportCsv.js'
import { encodeState, decodeState, buildShareUrl } from '../lib/share.js'

const inputCls =
  'rounded border border-line-strong bg-bg-subtle px-2 py-1 text-sm tabular-nums ' +
  'text-fg-strong focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40'

// Default retention curves seeded into the form when there's no preset and
// the user changes the period — so the tail visualisation always has
// something to render.
const DEFAULT_POINTS = {
  day: [
    { t: 1, percent: 40 },
    { t: 7, percent: 20 },
    { t: 14, percent: 15 },
    { t: 30, percent: 10 },
  ],
  week: [
    { t: 1, percent: 60 },
    { t: 4, percent: 35 },
    { t: 8, percent: 22 },
    { t: 12, percent: 15 },
  ],
  month: [
    { t: 1, percent: 50 },
    { t: 3, percent: 32 },
    { t: 6, percent: 22 },
    { t: 12, percent: 12 },
  ],
}

const DEFAULT_HORIZON = { day: 180, week: 26, month: 24 }
const DEFAULT_ARPU = { day: 2, week: 8, month: 12 }

function defaultPoints(period) {
  return (DEFAULT_POINTS[period] ?? DEFAULT_POINTS.day).map((p) => ({
    id: newPointId(),
    t: p.t,
    percent: p.percent,
  }))
}

function fmtMoney(v) {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1000) return `$${v.toFixed(0)}`
  if (Math.abs(v) >= 10) return `$${v.toFixed(1)}`
  return `$${v.toFixed(2)}`
}

function pctDelta(current, base, { higherIsBetter }) {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) return null
  const pct = ((current - base) / base) * 100
  if (Math.abs(pct) < 0.05) return { text: '= baseline', tone: 'text-fg-faint' }
  const sign = pct > 0 ? '+' : ''
  const better = higherIsBetter ? pct > 0 : pct < 0
  return {
    text: `${sign}${pct.toFixed(1)}% vs baseline`,
    tone: better ? 'text-emerald-300' : 'text-red-400',
  }
}

function NumberField({ label, value, onChange, hint, error, min, step, suffix, tooltip, tooltipAlign = 'left' }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center text-sm font-medium text-fg-muted">
        <span>{label}</span>
        {tooltip && <HoverHint align={tooltipAlign}>{tooltip}</HoverHint>}
      </span>
      <input
        type="number"
        min={min}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} w-full`}
      />
      {suffix && <span className="mt-1 block text-xs text-fg-faint">{suffix}</span>}
      {hint && !error && <span className="mt-1 block text-xs text-fg-faint">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  )
}

function InputModeToggle({ mode, onChange }) {
  const radio = (key, label) => (
    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
      <input
        type="radio"
        name="input-mode"
        value={key}
        checked={mode === key}
        onChange={() => onChange(key)}
        className="accent-accent"
      />
      {label}
    </label>
  )
  return (
    <div>
      <div className="mb-1 flex items-center text-xs font-medium text-fg-muted">
        <span>Input mode</span>
        <HoverHint align="left">
          <p>Три способа задать кривую ретеншена:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li><strong className="text-fg">Manual</strong> — точки t/% вручную, минимум 2.</li>
            <li><strong className="text-fg">Paste cohort table</strong> — таблица из BI / экспорта.</li>
            <li><strong className="text-fg">Paste DAU + new users</strong> — деконволюция кривой из DAU.</li>
          </ul>
        </HoverHint>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {radio('manual', 'Manual input')}
        {radio('paste', 'Paste cohort table')}
        {radio('dau', 'Paste DAU + new users')}
      </div>
    </div>
  )
}

const QUALITY_LABEL = {
  top_quartile: 'top quartile',
  median: 'median',
  bottom_quartile: 'bottom quartile',
}
const GEO_LABEL = { tier_1: 'Tier 1', tier_2: 'Tier 2', tier_3: 'Tier 3' }

function presetLabelFor(preset, presetState) {
  if (!preset) return null
  return `${preset.label} · ${QUALITY_LABEL[presetState.quality] ?? presetState.quality} · ${GEO_LABEL[presetState.geo] ?? presetState.geo}`
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function readInitialFromUrl() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  const q = hash.indexOf('?')
  if (q < 0) return null
  const params = new URLSearchParams(hash.slice(q + 1))
  const s = params.get('s')
  return s ? decodeState(s) : null
}

function withIds(arr) {
  return arr.map((p) => ({ id: newPointId(), ...p }))
}

// Initial funnel per period. Day = generic Registration step (DAU-style
// products). Week/month = classic subscription cascade (Install→Trial→Paid),
// seeded from RevenueCat utilities median benchmark so a fresh weekly /
// monthly setup looks like a real subscription right out of the box.
//
// Loading a preset replaces the funnel with the preset's own; switching
// period without preset data resets the funnel back to the new period's
// default. User can edit/remove steps freely.
const DEFAULT_FUNNEL_BY_PERIOD = {
  day: [{ label: 'Registration', conversionPct: 50 }],
  week: [
    { label: 'Install → Trial', conversionPct: 8.6 },
    { label: 'Trial → Paid', conversionPct: 35 },
  ],
  month: [
    { label: 'Install → Trial', conversionPct: 8.6 },
    { label: 'Trial → Paid', conversionPct: 35 },
  ],
}

function defaultFunnel(period) {
  return withIds(DEFAULT_FUNNEL_BY_PERIOD[period] ?? [])
}

export default function Calculator() {
  const [shareInitial] = useState(readInitialFromUrl)

  const [period, setPeriod] = useState(() => shareInitial?.period ?? 'day')
  const [points, setPoints] = useState(() =>
    shareInitial?.points?.length
      ? withIds(shareInitial.points)
      : defaultPoints(shareInitial?.period ?? 'day'),
  )
  const [funnel, setFunnel] = useState(() =>
    shareInitial
      ? withIds(shareInitial.funnel ?? [])
      : defaultFunnel(shareInitial?.period ?? 'day'),
  )
  const [cohortSize, setCohortSize] = useState(
    () => shareInitial?.cohortSize ?? 1000,
  )
  const [arpuPerPeriod, setArpuPerPeriod] = useState(
    () => shareInitial?.arpuPerPeriod ?? DEFAULT_ARPU[shareInitial?.period ?? 'day'],
  )
  const [cacInput, setCacInput] = useState(() =>
    shareInitial?.cacInput != null ? shareInitial.cacInput : '10',
  )
  const [horizon, setHorizon] = useState(
    () => shareInitial?.horizon ?? DEFAULT_HORIZON[shareInitial?.period ?? 'day'],
  )
  const [presetState, setPresetState] = useState(
    () =>
      shareInitial?.presetState ?? {
        presetId: null,
        quality: 'median',
        geo: 'tier_1',
      },
  )
  const [adjustMode, setAdjustMode] = useState(
    () => shareInitial?.adjustMode ?? 'pure',
  )
  const [bandSigma, setBandSigma] = useState(
    () => shareInitial?.bandSigma ?? 1,
  )
  const [refundInput, setRefundInput] = useState(() =>
    shareInitial?.refundRate != null ? String(shareInitial.refundRate) : '',
  )

  const [bundle, setBundle] = useState(null)
  const [bundleError, setBundleError] = useState(null)
  const [inputMode, setInputMode] = useState('manual')
  const [pasteText, setPasteText] = useState('')
  const [dauText, setDauText] = useState('')
  const [dauSmoothWindow, setDauSmoothWindow] = useState(0)

  const [periodToast, setPeriodToast] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [baseline, setBaseline] = useState(null)

  useEffect(() => {
    if (!periodToast) return
    const t = setTimeout(() => setPeriodToast(null), 4000)
    return () => clearTimeout(t)
  }, [periodToast])

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

  // Strip ?s=... from the URL bar after we've consumed it. Keeps subsequent
  // share links from carrying a stale snapshot.
  useEffect(() => {
    if (!shareInitial) return
    const hash = window.location.hash
    const q = hash.indexOf('?')
    if (q < 0) return
    const cleaned = hash.slice(0, q) || '#/'
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}${cleaned}`,
    )
  }, [shareInitial])

  const selectedPreset = useMemo(() => {
    if (!bundle || !presetState.presetId) return null
    return bundle.presets.find((p) => p.id === presetState.presetId) ?? null
  }, [bundle, presetState.presetId])
  const selectedVariant = useMemo(() => {
    if (!selectedPreset) return null
    return (
      selectedPreset.variants[`${presetState.quality}|${presetState.geo}`] ??
      null
    )
  }, [selectedPreset, presetState.quality, presetState.geo])
  const presetLabel = selectedPreset
    ? presetLabelFor(selectedPreset, presetState)
    : null

  // The variant's slice for the active period (or null when the preset has
  // no data for that period). Drives industry-adjusted benchmark.
  const benchmarkSlice = useMemo(
    () => variantForPeriod(selectedVariant, period),
    [selectedVariant, period],
  )

  const benchmarkFit = useMemo(() => {
    if (!benchmarkSlice) return null
    try {
      return fitPowerLaw(benchmarkSlice.retentionPoints)
    } catch {
      return null
    }
  }, [benchmarkSlice])

  // Apply a variant to the form for the given period: replace funnel,
  // retention points, ARPU, CAC. Used both on preset selection and on
  // period change. Returns true when data was applied.
  const applyVariantForPeriod = (variant, p) => {
    const slice = variantForPeriod(variant, p)
    if (!slice) return false
    setFunnel(
      slice.funnel.map((s) => {
        const step = {
          id: newPointId(),
          label: s.label,
          conversionPct: s.conversionPct,
        }
        if (Number.isFinite(s.oneTimeFeeUsd) && s.oneTimeFeeUsd > 0) {
          step.oneTimeFeeUsd = s.oneTimeFeeUsd
        }
        return step
      }),
    )
    setPoints(
      slice.retentionPoints.map((pt) => ({
        id: newPointId(),
        t: pt.t,
        percent: Math.round(pt.r * 1000) / 10,
      })),
    )
    if (slice.arpuPerPeriod != null) setArpuPerPeriod(slice.arpuPerPeriod)
    if (slice.cacPerAcquired != null) setCacInput(String(slice.cacPerAcquired))
    return true
  }

  const handlePresetChange = (next, variant, meta = {}) => {
    setPresetState(next)
    setBaseline(null)
    if (!variant || !meta.preset) return
    const targetPeriod = meta.preset.cadenceDefault ?? period
    setPeriod(targetPeriod)
    setHorizon(DEFAULT_HORIZON[targetPeriod] ?? horizon)
    applyVariantForPeriod(variant, targetPeriod)
  }

  // Wipe everything back to "Custom (no preset), day defaults". Used by the
  // Reset button — we don't gate it behind a confirmation since the rest of
  // the UI doesn't either (preset / period switches also clobber state).
  const handleReset = () => {
    setPeriod('day')
    setPoints(defaultPoints('day'))
    setFunnel(defaultFunnel('day'))
    setCohortSize(1000)
    setArpuPerPeriod(DEFAULT_ARPU.day)
    setCacInput('10')
    setHorizon(DEFAULT_HORIZON.day)
    setPresetState({ presetId: null, quality: 'median', geo: 'tier_1' })
    setAdjustMode('pure')
    setBandSigma(1)
    setRefundInput('')
    setBaseline(null)
    setInputMode('manual')
    setPasteText('')
    setDauText('')
    setDauSmoothWindow(0)
    setPeriodToast(null)
  }

  const handlePeriodChange = (next) => {
    if (next === period) return
    setBaseline(null) // baseline t-scale would mismatch
    // Reset adjust mode — benchmark fit may not have data in the new period.
    setAdjustMode('pure')
    setHorizon(DEFAULT_HORIZON[next] ?? horizon)

    // Try to repopulate from preset; fall back to defaults with a toast.
    if (selectedVariant && applyVariantForPeriod(selectedVariant, next)) {
      setPeriodToast(`Switched to ${next} — repopulated from "${selectedPreset?.label}".`)
    } else {
      setPoints(defaultPoints(next))
      setFunnel(defaultFunnel(next))
      setArpuPerPeriod(DEFAULT_ARPU[next] ?? arpuPerPeriod)
      setPeriodToast(
        selectedPreset
          ? `Switched to ${next} — preset has no data for this period; points reset.`
          : `Switched to ${next} — retention points reset to defaults.`,
      )
    }
    setPeriod(next)
  }

  // Paste-mode parsing
  const pasteParsed = useMemo(
    () => (inputMode === 'paste' && pasteText ? parseCohortTable(pasteText) : null),
    [inputMode, pasteText],
  )
  useEffect(() => {
    if (inputMode !== 'paste' || !pasteParsed?.avgPoints) return
    setPoints(
      pasteParsed.avgPoints.map((p) => ({
        id: newPointId(),
        t: p.t,
        percent: Math.round(p.percent * 10) / 10,
      })),
    )
  }, [inputMode, pasteParsed])

  // DAU mode
  const dauParsed = useMemo(
    () => (inputMode === 'dau' && dauText ? parseDAUTable(dauText) : null),
    [inputMode, dauText],
  )
  const dauValidation = useMemo(
    () =>
      dauParsed && dauParsed.rows.length > 0
        ? validateDAUInput({ newUsers: dauParsed.newUsers, dau: dauParsed.dau })
        : null,
    [dauParsed],
  )
  const dauR = useMemo(() => {
    if (!dauParsed || !dauValidation?.valid) return null
    try {
      return deconvolveDAU(dauParsed.newUsers, dauParsed.dau, {
        smoothWindow: dauSmoothWindow,
      })
    } catch {
      return null
    }
  }, [dauParsed, dauValidation, dauSmoothWindow])
  const dauReconstructed = useMemo(
    () => (dauR ? reconstructDAU(dauParsed.newUsers, dauR) : null),
    [dauR, dauParsed],
  )
  const dauRmsePct = useMemo(() => {
    if (!dauReconstructed || !dauParsed) return null
    let sumSq = 0
    let count = 0
    for (let i = 0; i < dauReconstructed.length; i++) {
      const obs = dauParsed.dau[i]
      if (obs > 0) {
        const rel = (dauReconstructed[i] - obs) / obs
        sumSq += rel * rel
        count++
      }
    }
    return count > 0 ? Math.sqrt(sumSq / count) * 100 : null
  }, [dauReconstructed, dauParsed])

  useEffect(() => {
    if (inputMode !== 'dau' || !dauR) return
    const candidates = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180]
    const sampled = candidates
      .filter((t) => t < dauR.length && dauR[t] > 0)
      .map((t) => ({
        id: newPointId(),
        t,
        percent: Math.round(dauR[t] * 1000) / 10,
      }))
    if (sampled.length >= 3) setPoints(sampled)
  }, [inputMode, dauR])

  const cac = cacInput === '' || cacInput == null ? null : Number(cacInput)
  const refundRatePct =
    refundInput === '' || refundInput == null ? 0 : Number(refundInput)
  const refundFraction = Number.isFinite(refundRatePct)
    ? Math.max(0, Math.min(1, refundRatePct / 100))
    : 0
  const pointErrors = useMemo(() => validateRetentionPoints(points), [points])
  const numericErrors = useMemo(
    () =>
      validateNumericInputs({
        cohortSize,
        arpuPerPeriod,
        cac,
        horizon,
        refundRate:
          refundInput === '' || refundInput == null ? null : refundRatePct,
      }),
    [cohortSize, arpuPerPeriod, cac, horizon, refundInput, refundRatePct],
  )
  const funnelErrors = useMemo(() => validateFunnel(funnel), [funnel])
  const allValid =
    pointErrors.valid && numericErrors.valid && funnelErrors.valid

  // Power-law fit on user points
  const userFit = useMemo(() => {
    if (!allValid) return null
    try {
      return fitPowerLaw(points.map((p) => ({ t: p.t, r: p.percent / 100 })))
    } catch {
      return null
    }
  }, [allValid, points])

  // Industry-adjusted fit (only when a benchmark is available and user picked it)
  const adjustedFit = useMemo(() => {
    if (adjustMode !== 'adjusted' || !benchmarkFit || !allValid) return null
    return adjustFitToBenchmark(points, benchmarkFit)
  }, [adjustMode, benchmarkFit, points, allValid])

  const fit = adjustedFit ?? userFit

  // Funnel cascade — generic n-step. `oneTimeFeeUsd` is forwarded so the
  // cascade can compute paid-trial / activation revenue on top of recurring.
  const cascade = useMemo(() => {
    if (!allValid) return null
    return funnelCascade({
      cohortSize,
      funnel: funnel.map((s) => ({
        label: s.label,
        conversionPct: s.conversionPct,
        oneTimeFeeUsd: s.oneTimeFeeUsd,
      })),
      retention: points.map((p) => ({ t: p.t, r: p.percent / 100 })),
      period,
    })
  }, [allValid, cohortSize, funnel, points, period])

  // LTV series — one-time funnel revenue lumps into period 1; refundRate
  // scales every period's gross revenue (recurring + one-time) to net.
  const ltvData = useMemo(() => {
    if (!fit || !cascade) return null
    return cohortLtv({
      fit,
      acquiredAtZero: cascade.acquiredAtZero,
      arpuPerPeriod,
      cohortSize,
      horizon,
      oneTimeRevenue: cascade.oneTimeRevenue,
      refundRate: refundFraction,
    })
  }, [fit, cascade, arpuPerPeriod, cohortSize, horizon, refundFraction])

  const fitSeries = useMemo(
    () => (fit ? retentionCurve(fit, horizon) : null),
    [fit, horizon],
  )
  const alternateFitSeries = useMemo(
    () => (adjustedFit && userFit ? retentionCurve(userFit, horizon) : null),
    [adjustedFit, userFit, horizon],
  )
  const retBand = useMemo(
    () => (fit && fit.se > 0 ? retentionBand(fit, horizon, bandSigma) : null),
    [fit, horizon, bandSigma],
  )
  // LTV band for the chart consumer (per-cohort-entrant). Caller passes the
  // total per-period rate `arpu × acquired / cohort` so cumLtvBand returns
  // values in per-entrant units, matching the line.
  const ltvBandSeries = useMemo(() => {
    if (!fit || fit.se === 0 || !cascade) return null
    const perEntrantRate = (arpuPerPeriod * cascade.acquiredAtZero) / cohortSize
    const oneTimeOffsetPerEntrant = cascade.oneTimeRevenue / cohortSize
    return cohortLtvBand(
      fit,
      perEntrantRate,
      horizon,
      bandSigma,
      oneTimeOffsetPerEntrant,
      refundFraction,
    )
  }, [fit, cascade, arpuPerPeriod, cohortSize, horizon, bandSigma, refundFraction])

  const benchmarkSeries = useMemo(
    () => (benchmarkFit ? retentionCurve(benchmarkFit, horizon) : null),
    [benchmarkFit, horizon],
  )

  const lastUserT = useMemo(
    () => (points.length ? Math.max(...points.map((p) => p.t)) : 0),
    [points],
  )
  const extrap = useMemo(
    () => extrapolationLevel(lastUserT, horizon),
    [lastUserT, horizon],
  )

  // Two parallel LTV reads: per-acquired = cumRevenue/cohort (pairs with CAC,
  // includes funnel loss), per-paid = cumRevenue/payerBase (excludes funnel
  // loss). DAU mode collapses both to the same number.
  const ltvAtHorizon = ltvData ? ltvData[ltvData.length - 1].cumLtvPerCohort : null
  const ltvPerPaidAtHorizon = ltvData
    ? ltvData[ltvData.length - 1].cumLtvPerAcquired
    : null
  const cumRevenueAtHorizon = ltvData
    ? ltvData[ltvData.length - 1].cumRevenue
    : null
  const horizonRetention = fitSeries ? fitSeries[fitSeries.length - 1].r : NaN
  const payback = useMemo(
    () => (ltvData ? paybackFn(ltvData, cac) : null),
    [ltvData, cac],
  )

  // Adapter — chart components expect v1 shape with cumLtv/revenue per
  // cohort entrant. Our calc.js series carries total-cohort revenue, so we
  // normalize here once.
  const v1Series = useMemo(() => {
    if (!ltvData) return null
    return ltvData.map((p) => ({
      t: p.t,
      retention: p.retention,
      revenue: p.revenue / cohortSize,
      cumLtv: p.cumLtvPerCohort,
    }))
  }, [ltvData, cohortSize])

  const handleCopyShare = async () => {
    const encoded = encodeState({
      period,
      points,
      funnel,
      cohortSize,
      arpuPerPeriod,
      cacInput,
      horizon,
      presetState,
      adjustMode,
      bandSigma,
      refundRate: refundRatePct,
    })
    const url = buildShareUrl(
      encoded,
      window.location.origin + window.location.pathname,
    )
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      window.prompt('Copy share link:', url)
    }
  }

  const handleDownloadCsv = () => {
    if (!ltvData || !fit || !cascade) return
    const ts = new Date().toISOString()
    const csv = buildCsv({
      timestamp: ts,
      period,
      forecastMode: adjustMode,
      presetLabel,
      bandSigma,
      inputs: {
        arpuPerPeriod,
        cac,
        cohortSize,
        horizon,
        refundRate: refundRatePct,
        funnel: funnel.map((s) => ({
          label: s.label,
          conversionPct: s.conversionPct,
          oneTimeFeeUsd: s.oneTimeFeeUsd,
        })),
      },
      fit: {
        a: fit.a,
        b: fit.b,
        se: fit.se,
        rSquared: fit.rSquared,
        n: fit.n ?? points.length,
      },
      kpi: {
        ltvAtHorizon,
        payback,
        ltvCacRatio: cac != null && cac > 0 ? ltvAtHorizon / cac : null,
        horizonRetention,
        acquiredAtZero: cascade.acquiredAtZero,
      },
      userPoints: points.map((p) => ({ t: p.t, percent: p.percent })),
      series: ltvData,
    })
    downloadFile(
      csv,
      buildFilename({ timestamp: ts, presetLabel }),
      'text/csv;charset=utf-8',
    )
  }

  const handlePinBaseline = () => {
    if (baseline) {
      setBaseline(null)
      return
    }
    if (!ltvData || !fit) return
    setBaseline({
      period,
      label: presetLabel ?? 'Custom',
      fitSeries: fitSeries.map((p) => ({ t: p.t, r: p.r })),
      ltv: v1Series.map((p) => ({ t: p.t, cumLtv: p.cumLtv, revenue: p.revenue })),
      ltvAtHorizon,
      payback,
      ratio: cac != null && cac > 0 ? ltvAtHorizon / cac : null,
      rSquared: fit.rSquared,
      horizonRetention,
      horizon,
      cohortSize,
      cac,
      arpu: arpuPerPeriod,
    })
  }

  const acqBaseline = baseline
    ? {
        ltvPerAcquired: baseline.ltvAtHorizon,
        ratio: baseline.ratio,
        payback: baseline.payback,
      }
    : null
  const payerBaseline = baseline
    ? { horizonRetention: baseline.horizonRetention }
    : null

  const periodAbbrCur = periodAbbr(period)
  const periodUnitCur = periodUnit(period)

  return (
    <section>
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Calculator</h1>
        </div>
        <p className="mt-1 text-sm text-fg-dim">
          Power-law fit of retention curve, then ARPU × Σ R(t) for LTV. Funnel
          conversions cascade the cohort to the active pool; one model for
          DAU and subscription presets.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[360px,minmax(0,1fr)]">
        <aside className="space-y-5 rounded-lg border border-line bg-bg-elev/40 p-4">
          {bundleError && (
            <div className="rounded border border-red-900/50 bg-red-950/40 p-2 text-xs text-red-300">
              Failed to load presets: {bundleError}
            </div>
          )}

          <PresetSelector
            bundle={bundle}
            value={presetState}
            period={period}
            onChange={handlePresetChange}
          />

          <div className="-mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-fg-faint transition-colors hover:text-accent-fg"
              title="Reset to Custom (no preset) with day-model defaults"
            >
              ↺ Reset to defaults
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
            <NumberField
              label="Cohort (Acquired)"
              value={cohortSize}
              min={1}
              step={1}
              suffix="acquired"
              onChange={(v) => setCohortSize(Number(v))}
              error={numericErrors.errors.cohortSize}
              tooltip={
                <>
                  <p>
                    Размер привлекаемой когорты — кол-во новых acquired users
                    (installs / FTDs / signups), за которых уже заплачен CAC.
                    Окупаемость и LTV считаются от этой точки.
                  </p>
                  <p className="mt-1.5">
                    Влияет только на абсолютные значения в Cohort P&amp;L. Per-
                    user метрики (LTV per entrant, R², LTV/CAC) от размера
                    когорты не зависят.
                  </p>
                </>
              }
            />
            <NumberField
              label="CAC"
              value={cacInput}
              min={0}
              step={0.01}
              suffix="$ / cohort entrant (optional)"
              onChange={setCacInput}
              error={numericErrors.errors.cac}
              hint="Empty hides payback / LTV-CAC"
              tooltipAlign="right"
              tooltip={
                <>
                  <p>
                    Customer Acquisition Cost — на одного входящего в когорту
                    (per install / per FTD, в зависимости от пресета).
                  </p>
                  <p className="mt-1.5">
                    Если оставить пусто, KPI Payback и LTV/CAC скрываются.
                  </p>
                </>
              }
            />
          </div>

          <FunnelSection funnel={funnel} onChange={setFunnel} />

          <PeriodSelector
            value={period}
            onChange={handlePeriodChange}
            supported={selectedPreset?.cadenceSupported ?? null}
          />

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="ARPPU"
              value={arpuPerPeriod}
              min={0}
              step={0.01}
              suffix={`$ / ${periodUnitCur}`}
              onChange={(v) => setArpuPerPeriod(Number(v))}
              error={numericErrors.errors.arpu}
              tooltip={
                <>
                  <p>
                    Average Revenue Per Paying User — на одного юзера активной
                    платящей базы в одном {periodUnitCur}. Это та сумма,
                    которую модель умножает на retention curve, чтобы получить
                    cumulative revenue.
                  </p>
                  <p className="mt-1.5">
                    Subscription (с funnel): paying base = acquired pool после
                    funnel, ARPPU = выручка per paying user per cycle.
                    DAU-режим (funnel пустой): paying base = вся когорта,
                    ARPPU вырождается в ARPDAU/ARPMAU.
                  </p>
                  <p className="mt-1.5">
                    Если у тебя есть paid-trial — задавай его как $ на
                    соответствующем funnel-шаге, не размазывай по ARPPU.
                  </p>
                </>
              }
            />
            <NumberField
              label="Refund %"
              value={refundInput}
              min={0}
              step={0.1}
              suffix="of gross revenue (optional)"
              onChange={setRefundInput}
              error={numericErrors.errors.refundRate}
              hint="Empty = 0% (no refunds)"
              tooltipAlign="right"
              tooltip={
                <>
                  <p>
                    Доля gross revenue, которая возвращается как refund /
                    chargeback. Применяется флэт-процентом в каждом периоде —
                    и к recurring (ARPPU × active), и к one-time fees из
                    funnel-шагов. Net revenue = gross × (1 − refund/100).
                  </p>
                  <p className="mt-1.5">
                    Retention curve не трогает: refunded user всё равно был
                    активен в своём периоде, просто деньги вернулись. Влияет
                    на cumRevenue → обе LTV и payback.
                  </p>
                  <p className="mt-1.5">
                    Стандартное определение (App Store / SaaS): % refunded
                    revenue ÷ gross revenue. Если ты считаешь по «доле
                    юзеров, попросивших refund» — численно совпадёт, когда
                    средний refunded ticket ≈ средний ticket; иначе нет.
                  </p>
                  <p className="mt-1.5">
                    Типичные значения: 1–3% для зрелых subscription apps,
                    5–10% для агрессивных paid-trial воронок, 10–20%+ для
                    iGaming chargeback-prone сегментов.
                  </p>
                </>
              }
            />
            <div className="col-span-2">
              <NumberField
                label="Horizon"
                value={horizon}
                min={1}
                step={1}
                suffix={`${periodUnitCur}s`}
                onChange={(v) => setHorizon(Number(v))}
                error={numericErrors.errors.horizon}
                tooltip={
                  <>
                    <p>
                      Окно прогноза LTV в выбранном period. Predicted LTV =
                      Σ ARPU·R(t) от t=1 до t=horizon.
                    </p>
                    <p className="mt-1.5">
                      Чем больше горизонт, тем больше неопределённость прогноза.
                    </p>
                  </>
                }
              />
            </div>
          </div>

          {benchmarkFit && (
            <ForecastModeToggle
              mode={adjustMode}
              onChange={setAdjustMode}
              avgRatio={adjustedFit?.avgRatio}
            />
          )}

          <BandSigmaToggle
            sigma={bandSigma}
            onChange={setBandSigma}
            disabled={!retBand}
          />

          <div className="space-y-3 border-t border-line pt-4">
            <InputModeToggle mode={inputMode} onChange={setInputMode} />
            {inputMode === 'manual' && (
              <>
                <RetentionInput
                  points={points}
                  onChange={setPoints}
                  errors={pointErrors.byId}
                  cadence={
                    period === 'day'
                      ? 'daily'
                      : period === 'week'
                      ? 'weekly'
                      : 'monthly'
                  }
                />
                {pointErrors.formError && (
                  <div className="text-xs text-red-400">
                    {pointErrors.formError}
                  </div>
                )}
              </>
            )}
            {inputMode === 'paste' && (
              <CohortPaste
                text={pasteText}
                onTextChange={setPasteText}
                parsed={pasteParsed}
              />
            )}
            {inputMode === 'dau' && (
              <DAUInput
                text={dauText}
                onTextChange={setDauText}
                parsed={dauParsed}
                validation={dauValidation}
                smoothWindow={dauSmoothWindow}
                onSmoothChange={setDauSmoothWindow}
              />
            )}
          </div>
        </aside>

        <section aria-label="Outputs" className="space-y-5">
          {periodToast && (
            <div className="rounded-lg border border-accent/40 bg-accent-surface/40 p-3 text-sm text-accent-fg">
              {periodToast}
            </div>
          )}

          {inputMode === 'dau' && dauReconstructed && dauParsed && (
            <DAUChart
              observed={dauParsed.dau}
              reconstructed={dauReconstructed}
              rmsePct={dauRmsePct}
            />
          )}

          {!allValid && (
            <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
              Fix the input panel to see the model output.
            </div>
          )}

          {allValid && fit && ltvData && fitSeries && cascade && (
            <>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handlePinBaseline}
                  className={`rounded border px-3 py-1.5 text-xs transition-colors ${
                    baseline
                      ? 'border-accent/60 bg-accent-surface/30 text-accent-fg hover:border-accent'
                      : 'border-line-strong bg-bg-subtle text-fg-muted hover:border-accent/50 hover:text-accent-fg'
                  }`}
                >
                  {baseline ? '× Clear baseline' : '📌 Pin as baseline'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyShare}
                  className={`rounded border px-3 py-1.5 text-xs transition-colors ${
                    shareCopied
                      ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300'
                      : 'border-line-strong bg-bg-subtle text-fg-muted hover:border-accent/50 hover:text-accent-fg'
                  }`}
                >
                  {shareCopied ? 'Copied ✓' : 'Copy share link'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="rounded border border-line-strong bg-bg-subtle px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-accent-fg"
                >
                  Download CSV
                </button>
              </div>

              {baseline && (
                <div className="relative rounded border border-accent/40 bg-accent-surface/20 py-2 pl-3 pr-8 text-xs">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
                    <span className="text-fg-faint">📌 Baseline</span>
                    <span className="flex items-baseline gap-1 whitespace-nowrap">
                      <span className="text-fg-faint">·</span>
                      <span className="text-fg">{baseline.label}</span>
                    </span>
                    {[
                      ['Period', baseline.period],
                      ['ARPPU', `$${baseline.arpu}`],
                      ['CAC', baseline.cac != null ? `$${baseline.cac}` : '—'],
                      ['LTV', fmtMoney(baseline.ltvAtHorizon)],
                      ['R²', Number.isFinite(baseline.rSquared) ? baseline.rSquared.toFixed(3) : '—'],
                      ...(baseline.cac != null && baseline.cac > 0
                        ? [['Payback', baseline.payback != null ? `${periodAbbr(baseline.period)}${baseline.payback}` : 'not reached']]
                        : []),
                      ...(baseline.ratio != null
                        ? [['LTV/CAC', baseline.ratio.toFixed(2)]]
                        : []),
                      [
                        'Long-term ret',
                        Number.isFinite(baseline.horizonRetention)
                          ? `${(baseline.horizonRetention * 100).toFixed(2)}%`
                          : '—',
                      ],
                    ].map(([label, value]) => (
                      <span key={label} className="flex items-baseline gap-1 whitespace-nowrap">
                        <span className="text-fg-faint">·</span>
                        <span className="text-fg-faint">{label}</span>
                        <span className="text-fg">{value}</span>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBaseline(null)}
                    aria-label="Clear baseline"
                    className="absolute right-2 top-1.5 text-fg-faint transition-colors hover:text-fg"
                  >
                    ×
                  </button>
                </div>
              )}

              <AcquisitionKPI
                cohortSize={cohortSize}
                cac={cac}
                ltvPerAcquired={ltvAtHorizon}
                payback={payback}
                horizon={horizon}
                period={period}
                baseline={acqBaseline}
              />

              <PayingBaseKPI
                cohortSize={cohortSize}
                payerBase={cascade.acquiredAtZero}
                rSquared={fit.rSquared}
                cumRevenueAtHorizon={cumRevenueAtHorizon}
                totalSpent={cac != null && cac > 0 ? cohortSize * cac : null}
                ltvPerPaid={ltvPerPaidAtHorizon}
                horizonRetention={horizonRetention}
                horizon={horizon}
                period={period}
                funnelLength={funnel.length}
                baseline={payerBaseline}
              />

              {extrap !== 'none' && (
                <ExtrapolationBanner
                  level={extrap}
                  lastUserT={lastUserT}
                  horizon={horizon}
                  period={period}
                />
              )}

              {funnel.length > 0 && (
                <FunnelWaterfall
                  steps={cascade.steps}
                  presetLabel={presetLabel}
                />
              )}

              <RetentionChart
                userPoints={points}
                fitSeries={fitSeries}
                alternateFitSeries={alternateFitSeries}
                alternateLabel="Pure user fit"
                bandSeries={retBand}
                bandSigma={bandSigma}
                benchmarkSeries={benchmarkSeries}
                baselineSeries={baseline?.fitSeries}
                horizon={horizon}
                lastUserT={lastUserT}
                presetLabel={presetLabel}
                period={period}
              />
              <LTVChart
                series={v1Series}
                bandSeries={ltvBandSeries}
                bandSigma={bandSigma}
                cac={cac}
                beDay={payback}
                horizon={horizon}
                lastUserT={lastUserT}
                baselineSeries={baseline?.ltv}
                presetLabel={presetLabel}
                period={period}
              />
              <RevenueChart
                series={v1Series}
                cohortSize={cohortSize}
                horizon={horizon}
                baselineSeries={baseline?.ltv}
                baselineCohortSize={baseline?.cohortSize}
                presetLabel={presetLabel}
                period={period}
              />
              <ResultsTable
                series={v1Series}
                points={points}
                horizon={horizon}
                cohortSize={cohortSize}
                cac={cac}
                presetLabel={presetLabel}
                period={period}
              />
              {cac != null && cac > 0 ? (
                <CohortPL
                  series={v1Series}
                  cohortSize={cohortSize}
                  cac={cac}
                  beDay={payback}
                  horizon={horizon}
                  baselineSeries={baseline?.ltv}
                  baselineCohortSize={baseline?.cohortSize}
                  presetLabel={presetLabel}
                  period={period}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-line p-4 text-xs text-fg-faint">
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
