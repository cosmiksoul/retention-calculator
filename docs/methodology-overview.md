# Как работает калькулятор

LTV-калькулятор моделирует юнит-экономику когорты привлечённых пользователей через power-law fit ретеншен-кривой. Одна и та же математика работает для DAU-стиля (игры, iGaming, sportsbook) и для subscription apps — period выбирается рантайм-тогглом (`day` / `week` / `month` / `year`), funnel опционален. Конкретные числа в пресетах — это бенчмарки из публичных отчётов; источники документированы в разделах ниже, цель раздела «Как работает» — объяснить саму модель прежде чем вы туда нырнёте.

---

## Что вы вводите

- **Cohort (Acquired)** — размер привлечённой когорты (installs / FTDs / signups), за которых уже заплачен CAC.
- **CAC** — стоимость одного входящего в когорту. Опционально; без CAC скрываются Payback и LTV/CAC.
- **Funnel** — n-шаговый каскад конверсий между cohort и платящей базой (например, `Install → Trial → Paid`). На любом шаге можно задать одноразовую плату (`$`) — типичный кейс paid-trial price. Funnel пустой ⇒ DAU-семантика, paying base = вся когорта.
- **Modeling period** — `day` / `week` / `month` / `year`. Период — это просто шкала t-оси; математика та же. Day для игр / iGaming, week для weekly subscription cadence, month для monthly subs, year для annual SKU.
- **ARPPU** — Average Revenue Per Paying User за один период. На paying base, не на полную когорту. В DAU-режиме (без funnel) вырождается в ARPDAU/ARPMAU.
- **Refund %** — доля gross revenue, возвращаемая через refund/chargeback. Применяется флэт-процентом ко всему revenue, опционально.
- **Horizon** — окно прогноза в выбранных периодах.
- **Retention points** — наблюдаемые точки `(t, %)`, минимум 2. Можно ввести вручную, paste-ом cohort-таблицы из BI, или дeконволюцией DAU-кривой по новым юзерам.

---

## Математика

Калькулятор фитит **power-law** на retention-точках:

```
R(t) = a · t^(−b)
```

Параметры `a` и `b` находятся через линейную регрессию на лог-преобразованных данных (`log R(t) = log a − b · log t`). Качество фита показывают `R²` (доля объяснённой дисперсии) и `SE(b)` (стандартная ошибка экспоненты).

Для каждого периода `t = 1…horizon` модель считает:

```
active(t)  = payerBase · R(t)
revenue(t) = active(t) · ARPPU · (1 − refundRate)
```

Одноразовые fees из funnel-шагов (paid-trial и т.п.) лампятся в period 1 поверх recurring, тоже умножаются на `(1 − refundRate)`. Cumulative revenue = Σ revenue от `t=1` до `horizon`.

`payerBase` — это последний шаг funnel-каскада (`cohort × Π(conversionPct/100)`). Без funnel `payerBase = cohort`.

---

## Что вы получаете

**Два LTV** одновременно — это центральный тезис калькулятора:

- **LTV per acquired** = `cumRevenue / cohort`. Включает всех, кто отвалился в funnel и не дошёл до paying — потому что CAC за них уже заплачен. Это LTV, парная к CAC.
- **LTV per paid** = `cumRevenue / payerBase`. «Чистая» юнит-экономика дошедшего до paying юзера — без размытия funnel-loss.

Расхождение между ними количественно показывает цену funnel-loss. В DAU-режиме (без funnel) обе LTV совпадают.

**Payback** — первый период, на котором `cumRevenue ≥ cohort × CAC`. Если payback позже horizon — «Not reached»: на текущих параметрах окупаемость не сходится в выбранном окне.

**LTV/CAC** — стандартная метрика юнит-экономики на горизонте. ≥ 3 — здоровый бизнес, 1–3 — на грани, < 1 — теряете деньги.

**Confidence band ±k·σ** — полоса неопределённости вокруг прогноза, считается из `SE(b)`. Шире при малом числе точек или слабом фите. ±1σ ≈ 68% доверительный интервал, ±2σ ≈ 95%.

---

## Industry-adjusted forecast

Если выбран пресет с benchmark-кривой, калькулятор может «прижать» ваш фит к индустриальной форме decay (b-параметру), сохранив ваш `a` (уровень). Полезно когда у вас 2–3 точки и собственный фит даёт нереалистичный долгосрочный хвост — benchmark-форма даёт более стабильную экстраполяцию. Toggle между «pure user fit» и «industry-adjusted» в правой панели.

---

## Ограничения модели

- **Экстраполяция** за пределы последней пользовательской точки рискованна. Если horizon > 3× от последней точки, калькулятор поднимает warning-баннер.
- **ARPPU константа** — модель не учитывает рост revenue per user во времени (price increases, upsells, promo→full price transition).
- **Refunds флэт** — одна цифра % на все периоды; в реальности refund-rate выше в первые недели после покупки и затухает.
- **Retention монотонна** — power-law не моделирует пики возврата пользователей (re-engagement campaigns, seasonality, win-back).
- **Один тарифный план на расчёт** — если у вас одновременно monthly и annual SKU в одной когорте, придётся моделировать как два отдельных расчёта и суммировать вручную.
- **Industry presets — ориентиры, не предсказания** для вашего конкретного продукта. Используйте их как стартовую точку, заменяйте своими данными при первой возможности.

---

## Источники пресетов

Ниже — два раздела с источниками для каждой группы пресетов:

- **DAU-стилевые пресеты** (games, iGaming casino & sportsbook, ecommerce, fintech) — собраны из AppsFlyer Performance Index, Adjust Mobile Games Insights, GameAnalytics, Liftoff, operator earnings (DraftKings, Match Group) и regulator data (UK GC, NJ DGE).
- **Subscription пресеты** (consumer subs: utilities, fitness, language learning, AI companions, dating, photo/video, lifestyle) — RevenueCat State of Subscription Apps 2025/2026, Adapty State of In-App Subscriptions 2026, Duolingo / Match / Bumble 10-Q.

Качество данных по каждому слайсу промаркировано: ✅ robust (есть прямые публичные отчёты), ⚠️ estimated (триангуляция из непрямых источников).
