# Retention & LTV Calculator

Веб-калькулятор для прогнозирования retention-кривой и расчёта LTV. Вводишь несколько точек ретеншена → получаешь прогноз методом power law + cumulative LTV + breakeven.

**[Live demo →](https://cosmiksoul.github.io/retention-calculator/)** _(появится после первого деплоя)_

## Зачем

Чтобы продуктовики, маркетологи и менеджеры могли быстро прикинуть юнит-экономику когорты без настройки Python/R и без чтения статей про power law decay. С разумными индустриальными бенчмарками из коробки и прозрачной методологией — не black box.

## Что внутри (MVP)

- **Manual input** — 3-10 точек retention, валидация (диапазон, монотонность, без дублей по периоду)
- **35 пресетов:** 7 вертикалей × quality × geo (top/median/bottom × T1/T2/T3) — для T2/T3 доступен только median, недоступные комбинации видны как `(n/a)`
- **Power-law fit** с R² и оценкой качества фита (excellent / good / weak)
- **KPI cards:** predicted LTV, breakeven, LTV/CAC ratio, payback, R²
- **Charts:** retention curve (точки + fit + benchmark), cumulative LTV с CAC-линией и зонами до/после breakeven
- **Cohort P&L** — абсолютные деньги по когорте: acquisition cost, revenue at breakeven/horizon, profit, ROI%
- **Methodology page** (`/methodology`) — рендер `docs/methodology.md` с anchor-навигацией и deep-link с карточки пресета

## Что отложено на следующие итерации

- Cohort table paste mode (TSV/CSV)
- DAU + New Users deconvolution
- Confidence interval (коридор) и industry-adjusted mode
- Export CSV/PNG, shareable URL
- Scenario comparison, theme toggle, revenue per period chart

## Стек

React 18 + Vite + Recharts + Tailwind + react-router-dom (HashRouter) + react-markdown + Vitest. Деплой статикой на GitHub Pages через GitHub Actions.

## Документация

- [`docs/spec.md`](docs/spec.md) — спецификация продукта
- [`docs/methodology.md`](docs/methodology.md) — методология и источники (рендерится в приложении)
- [`docs/presets.json`](docs/presets.json) — данные пресетов

## Запуск локально

```bash
npm install
npm run dev
# открывай http://localhost:5173/retention-calculator/
```

`npm run prepare-data` (вызывается автоматически из `dev`/`build`) копирует `docs/presets.json` и `docs/methodology.md` в `public/` — единый источник правды живёт в `docs/`.

## Тесты

```bash
npm test          # один прогон
npm run test:watch
```

Покрытие — math-ядро (power law fit, LTV cumsum, breakeven), нормализация пресетов, валидация ввода.

## Деплой

CI/CD на GitHub Actions: push в `main` → `npm test` → `npm run build` → деплой `dist/` на GitHub Pages. Конфиг — `.github/workflows/deploy.yml`.

## Лицензия и атрибуция

Цифры пресетов — триангуляция публичных источников (AppsFlyer, Adjust, Liftoff, GameAnalytics, Sendbird, Shopify, AppMagic, regulator data). Полный список — в [`docs/methodology.md`](docs/methodology.md).

Если используешь — буду благодарен за упоминание.
