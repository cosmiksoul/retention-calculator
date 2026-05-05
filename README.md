# Retention & LTV Calculator

Веб-калькулятор для прогнозирования retention-кривой и расчёта LTV. Поддерживает две модели:

1. **Session retention** (v1) — дневная шкала, для игр, iGaming, sportsbook. Power-law fit на D1/D7/D30/D60/D90 точках.
2. **Subscription mode** (v2) — weekly/monthly cadence, для consumer subscription apps (VPN, fitness, photo editors, dating, AI companions). Funnel cascade + retention paying + cadence-зависимый payback.

**[Live demo →](https://cosmiksoul.github.io/retention-calculator/)**

## Зачем

Чтобы продуктовики, маркетологи и менеджеры могли быстро прикинуть юнит-экономику когорты без настройки Python/R и без чтения статей про power law decay. С разумными индустриальными бенчмарками из коробки и прозрачной методологией — не black box.

## Что внутри

**Session mode (v1):**
- Manual input / Cohort table paste / DAU+New users deconvolution — три способа ввести retention
- 35 пресетов: 7 вертикалей × quality × geo
- Power-law fit с R², confidence band ±1σ/±2σ, industry-adjusted forecast
- KPI cards: predicted LTV, breakeven, LTV/CAC, payback, R²
- Charts: retention curve, cumulative LTV, revenue per period, Cohort P&L
- CSV export, PNG export per chart, shareable URL, pinned baseline для сравнения сценариев

**Subscription mode (v2):**
- Funnel + retention paying + pricing inputs
- Weekly / Monthly cadence toggle
- 35 subscription пресетов (4 варианта с weekly retention данными)
- 5 KPI cards (LTV per install, LTV/CAC, payback, trial→paid, long-term retention)
- Funnel waterfall (visualised cascade)
- Retention curve + Cumulative LTV per install + расширенный Cohort P&L
- Все v1-фичи (band/adjusted/extrapolation/PNG export/share URL/baseline) применимы в subscription mode

**Methodology page** (`/methodology`) — обе методологии (session + subscription) с sticky TOC и anchor-навигацией с карточек пресетов.

## Стек

React 18 + Vite + Recharts + Tailwind + react-router-dom (HashRouter) + react-markdown + Vitest. Деплой статикой на GitHub Pages через GitHub Actions.

## Документация

- [`docs/spec.md`](docs/spec.md) — спецификация v1 (session retention)
- [`docs/spec-v2-subscription.md`](docs/spec-v2-subscription.md) — спецификация v2 (subscription mode)
- [`docs/methodology.md`](docs/methodology.md) — методология и источники session-пресетов
- [`docs/methodology-subscription.md`](docs/methodology-subscription.md) — методология и источники subscription-пресетов
- [`docs/presets.json`](docs/presets.json) — данные session-пресетов
- [`docs/presets-subscription.json`](docs/presets-subscription.json) — данные subscription-пресетов

## Запуск локально

```bash
npm install
npm run dev
# открывай http://localhost:5173/retention-calculator/
```

`npm run prepare-data` (вызывается автоматически из `dev`/`build`) копирует `docs/presets.json`, `docs/presets-subscription.json`, `docs/methodology.md`, `docs/methodology-subscription.md` в `public/` — единый источник правды живёт в `docs/`.

## Тесты

```bash
npm test          # один прогон
npm run test:watch
```

Покрытие — math-ядро (power law fit, LTV cumsum, breakeven), нормализация пресетов, валидация ввода.

## Деплой

CI/CD на GitHub Actions: push в `main` → `npm test` → `npm run build` → деплой `dist/` на GitHub Pages. Конфиг — `.github/workflows/deploy.yml`.

## Лицензия и атрибуция

Цифры session-пресетов — триангуляция публичных источников (AppsFlyer, Adjust, Liftoff, GameAnalytics, Sendbird, Shopify, AppMagic, regulator data). Полный список — в [`docs/methodology.md`](docs/methodology.md).

Цифры subscription-пресетов — RevenueCat State of Subscription Apps 2025/2026, Adapty SOIS 2026, публичные 10-Q (Duolingo, Match Group, Bumble), Appfigures, AppTweak, mktclarity. Полный список — в [`docs/methodology-subscription.md`](docs/methodology-subscription.md).

Если используешь — буду благодарен за упоминание.
