# Retention & LTV Calculator

Веб-калькулятор для прогнозирования retention-кривой и расчёта LTV. Вводишь несколько точек ретеншена → получаешь прогноз методом power law + cumulative LTV + breakeven.

**[Live demo →](https://cosmiksoul.github.io/retention-calculator/)** _(появится после деплоя)_

## Зачем

Чтобы продуктовики, маркетологи и менеджеры могли быстро прикинуть юнит-экономику когорты без настройки Python/R и без чтения статей про power law decay. С разумными индустриальными бенчмарками из коробки и прозрачной методологией — не black box.

## Что внутри

- **3 режима ввода:** ручной (3-5 точек), вставка когортной таблицы из Sheets/Excel, восстановление retention из DAU + New Users
- **35 пресетов:** 7 вертикалей × quality × geo (top/median/bottom × T1/T2/T3)
- **Power law fit** с доверительным интервалом и оценкой качества (R²)
- **Cohort P&L** — сколько денег приносит когорта в абсолютных цифрах, с breakeven point
- **Industry-adjusted mode** — корректирует прогноз по форме индустриального бенчмарка
- **Методология как страница** — формула, ограничения модели, источники каждого пресета

## Стек

React 18 + Vite + Recharts + Tailwind + react-router-dom (HashRouter) + react-markdown. Деплой статикой на GitHub Pages.

## Документация

- [`docs/spec.md`](docs/spec.md) — спецификация продукта
- [`docs/methodology.md`](docs/methodology.md) — методология и источники
- [`docs/presets.json`](docs/presets.json) — данные пресетов

## Запуск локально

```bash
npm install
npm run dev
```

## Деплой

```bash
npm run build
# CI/CD автоматически выкатывает dist/ в branch gh-pages при push в main
```

## Лицензия и атрибуция

Цифры пресетов — триангуляция публичных источников (AppsFlyer, Adjust, Liftoff, GameAnalytics, Sendbird, Shopify, AppMagic, regulator data). Полный список — в [`docs/methodology.md`](docs/methodology.md).

Если используешь — буду благодарен за упоминание.
