# Subscription Apps Presets — Consumer Mobile Subscriptions

**35 пресетов** = 7 вертикалей × 5 quality/geo комбинаций.
Это второй файл пресетов, дополняет `presets.json` (mobile games, iGaming, e-commerce, fintech).

## Чем эти пресеты отличаются от первой пачки

**Метрика retention считается ОТ ПЛАТЯЩИХ ПОДПИСЧИКОВ**, не от installs.
Это нативный формат для сегмента — RevenueCat, Adapty, Appfigures и публичные 10-Q (Duolingo, Match, Bumble) репортят именно так. Пытаться втиснуть это в "% installs возвращаются на день N" даёт цифры, которые нельзя сравнивать с mobile games.

**Дополнительные поля для расчёта LTV-per-install:**
- `install_to_trial` — % installs, кто стартует free trial
- `trial_to_paid` — % trials, кто конвертится в paid
- `M1/M3/M6/M12 retention` — % paid subscribers, кто остался активен
- `rpi_d14`, `rpi_d60` — revenue per install в USD (стандарт RevenueCat)
- `arpu_paid_monthly` — ARPU per paying user
- `ltv_12m_per_paying_user` — посчитанный LTV за 12 месяцев per paying user

**Формула LTV per install:**
```
LTV_per_install = install_to_trial × trial_to_paid × ltv_12m_per_paying_user
                 (в долях,         в долях,         в USD)
```

---

## 1. Utilities (VPN, cleaners, scanners)

✅ **Robust** (RevenueCat + Adapty 2026). Доминирует weekly plan (73.6% revenue, Adapty 2026). Самый высокий first-renewal retention (58.1%), но самый низкий annual.
**Dominant plan:** weekly | **Examples:** NordVPN, Surfshark, CCleaner, CamScanner, TurboVPN

| Variant | Install→Trial | Trial→Paid | M1 | M3 | M6 | M12 | RPI D14 | RPI D60 | ARPU/mo | LTV 12m | CPI iOS | CPI Android |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Top quartile, T1 | 12% | 60% | 70% | 55% | 45% | 35% | $0.65 | $0.95 | $30 | $69 | $6.50 | $2.50 |
| Median, T1 | 8.6% | 35% | 50% | 32% | 22% | 12% | $0.20 | $0.32 | $12 | $28 | $2.90 | $1.30 |
| Bottom quartile, T1 | 3% | 18% | 30% | 15% | 8% | 3% | $0.06 | $0.10 | $6 | $12 | — | — |
| Median, T2 | 7% | 30% | 48% | 30% | 20% | 11% | $0.14 | $0.22 | $10 | $22 | — | — |
| Median, T3 | 4% | 25% | 42% | 25% | 16% | 8% | $0.08 | $0.12 | $5 | $10 | — | — |

**Источники:** Adapty State of In-App Subscriptions 2026 (Utilities first-renewal 58.1%, LTV $68.90 top); RevenueCat 2025 (Utilities trial start 86%); AppTweak 2025 (Utilities CPI $2.90 US).

---

## 2. Lifestyle / Wellness (habit trackers, meditation)

✅ **Robust**, но RevenueCat группирует Lifestyle с Social — числа изолированы по operator commentary (Calm, Headspace).
**Dominant plan:** annual then monthly | **Examples:** Calm, Headspace, Reflectly, Fabulous, Stoic, Insight Timer

| Variant | Install→Trial | Trial→Paid | M1 | M3 | M6 | M12 | RPI D14 | RPI D60 | ARPU/mo | LTV 12m | CPI iOS | CPI Android |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Top quartile, T1 | 8% | 55% | 75% | 58% | 45% | 35% | $0.40 | $0.65 | $12 | $82 | $7.50 | $3.20 |
| Median, T1 | 4.2% | 28% | 55% | 35% | 22% | 14% | $0.12 | $0.20 | $7 | $35 | $4.50 | $1.80 |
| Bottom quartile, T1 | 1.5% | 12% | 30% | 14% | 6% | 2% | $0.04 | $0.07 | $4 | $12 | — | — |
| Median, T2 | 3.5% | 24% | 52% | 32% | 20% | 12% | $0.08 | $0.14 | $6 | $28 | — | — |
| Median, T3 | 2% | 20% | 48% | 28% | 16% | 9% | $0.04 | $0.07 | $3 | $15 | — | — |

**Источники:** RevenueCat 2025 Social & Lifestyle category; Headspace/Calm operator commentary.

---

## 3. Health & Fitness

✅ **Robust** (RevenueCat — лучший датасет). **Самый монетизирующий сегмент в RevenueCat:** median D60 RPI $0.63 (2× категорийный median). Annual plans 60.6% revenue. Top 10% trial-to-paid 68.3% — exceptional.
**Dominant plan:** annual | **CIS:** **BetterMe** (large H&F player) | **Examples:** MyFitnessPal, Strava, Nike Training, Fitbit, Noom, Yazio, Lose It!

| Variant | Install→Trial | Trial→Paid | M1 | M3 | M6 | M12 | RPI D14 | RPI D60 | ARPU/mo | LTV 12m | CPI iOS | CPI Android |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Top quartile, T1 | 10% | 68.3% | 80% | 65% | 52% | 40% | $1.31 | $2.97 | $15 | $110 | $9.00 | $3.80 |
| Median, T1 | 6.5% | 39.9% | 65% | 45% | 32% | 22% | $0.44 | $0.63 | $9 | $55 | $6.50 | $2.20 |
| Bottom quartile, T1 | 2.5% | 22% | 40% | 22% | 12% | 5% | $0.10 | $0.15 | $5 | $18 | — | — |
| Median, T2 | 5.5% | 35% | 62% | 42% | 30% | 20% | $0.32 | $0.45 | $7 | $42 | — | — |
| Median, T3 | 3.5% | 25% | 55% | 35% | 22% | 14% | $0.12 | $0.18 | $4 | $22 | — | — |

**Источники:** RevenueCat 2025 (median trial-to-paid 39.9%, top 10% 68.3%, RPI $0.44 D14, $0.63 D60, P90 $4.19); Adapty 2026 (H&F first-renewal 30.3% — самая низкая среди категорий, что компенсируется высоким ARPU).

---

## 4. Photo / Video Editors

✅ **Robust**. **Самая низкая median trial-to-paid среди consumer subs (26.2%, RevenueCat 2024)**, но самый большой spread top vs. bottom (3×). Heavy weekly plans, viral spike + churn.
**Dominant plan:** weekly | **CIS:** **Reface, FaceApp, Prequel** | **Examples:** VSCO, Lightroom Mobile, CapCut, Snapseed

| Variant | Install→Trial | Trial→Paid | M1 | M3 | M6 | M12 | RPI D14 | RPI D60 | ARPU/mo | LTV 12m | CPI iOS | CPI Android |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Top quartile, T1 | 15% | 70% | 60% | 38% | 25% | 15% | $0.80 | $1.20 | $18 | $65 | $7.20 | $2.50 |
| Median, T1 | 7% | 26.2% | 38% | 20% | 11% | 5% | $0.15 | $0.22 | $9 | $22 | $4.20 | $1.70 |
| Bottom quartile, T1 | 2.5% | 10% | 18% | 7% | 3% | 1% | $0.04 | $0.06 | $5 | $8 | — | — |
| Median, T2 | 6% | 23% | 36% | 19% | 10% | 4% | $0.10 | $0.15 | $7 | $16 | — | — |
| Median, T3 | 4% | 18% | 32% | 16% | 8% | 3% | $0.05 | $0.08 | $4 | $9 | — | — |

**Источники:** RevenueCat 2024 (Photo/Video trial-to-paid 26.2%); RevenueCat 2025 (top quartile 5–7× median); AppTweak 2025.

---

## 5. Language Learning

✅ **Robust** благодаря Duolingo 10-Q. Долгие триалы (5–9 дней) → выше conversion. Сильный organic — Duolingo S&M только 10–12% revenue.
**Dominant plan:** annual | **Examples:** Duolingo, Babbel, Memrise, Drops, Mondly, Lingvist, Busuu

| Variant | Install→Trial | Trial→Paid | M1 | M3 | M6 | M12 | RPI D14 | RPI D60 | ARPU/mo | LTV 12m | CPI iOS | CPI Android |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Top quartile, T1 | 14% | 58% | 78% | 60% | 48% | 38% | $0.70 | $1.10 | $9.50 | $75 | $6.20 | $2.50 |
| Median, T1 | 7.5% | 38% | 60% | 40% | 28% | 18% | $0.30 | $0.45 | $7 | $42 | $3.80 | $1.60 |
| Bottom quartile, T1 | 2.5% | 18% | 35% | 18% | 9% | 3% | $0.07 | $0.12 | $4 | $14 | — | — |
| Median, T2 | 6.5% | 33% | 58% | 38% | 26% | 16% | $0.22 | $0.32 | $5.50 | $32 | — | — |
| Median, T3 | 4.5% | 25% | 52% | 32% | 20% | 11% | $0.10 | $0.15 | $3 | $18 | — | — |

**Источники:** Duolingo 10-Q Q1–Q4 2024 (paid penetration 8.5–8.9% of 113M MAU, ARPU ~$75/yr, CAC fell $158→$28); RevenueCat 2025 Education category (D14 RPI $0.40, D60 $0.45).

---

## 6. Dating Apps

✅ **Robust** благодаря публичным 10-Q (Match, Bumble) — лучше RevenueCat для этого сегмента. Hybrid model: subs + boosts/super-likes (consumables). Высокий churn структурный — "success churn" когда юзер находит match.
**Dominant plan:** monthly | **CIS:** **Mamba, Badoo (Bumble Inc)** | **Examples:** Tinder, Bumble, Hinge, Match, Grindr

| Variant | Install→Trial | Trial→Paid | M1 | M3 | M6 | M12 | RPI D14 | RPI D60 | ARPU/mo | LTV 12m | CPI iOS | CPI Android |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Top quartile, T1 | 6% | 50% | 70% | 50% | 35% | 22% | $0.55 | $0.95 | $27 | $130 | $7.50 | $3.20 |
| Median, T1 | 3.5% | 30% | 50% | 28% | 16% | 8% | $0.18 | $0.28 | $16 | $60 | $4.80 | $1.90 |
| Bottom quartile, T1 | 1% | 12% | 25% | 10% | 4% | 1% | $0.05 | $0.08 | $8 | $16 | — | — |
| Median, T2 | 3% | 27% | 48% | 26% | 14% | 7% | $0.14 | $0.22 | $12 | $45 | — | — |
| Median, T3 | 1.8% | 20% | 42% | 22% | 11% | 5% | $0.06 | $0.10 | $5 | $18 | — | — |

**Источники:** Bumble Q1 2024 ARPPU $27.75/mo (Bumble app), $12.35/mo Badoo+other; Tinder 2024: 9.6M subscribers / $1.94B revenue → ~$200/yr ARPU (~$16.50/mo); Match Group 17% increase in revenue per payer 2024.

---

## 7. AI Companions / Chatbots

⚠️ **Moderate** — самый быстро меняющийся сегмент. **+64% YoY revenue, +88% downloads в H1 2025.** Top 10% забирают 89% revenue. Replika имеет аномально высокую free→paid conversion (25%).
**Dominant plan:** monthly with some weekly | **CIS:** **Replika (Eugenia Kuyda / Luka)** | **Examples:** Character.AI, PolyBuzz, Chai, Anima, Talkie, Candy.ai, Nomi AI

| Variant | Install→Trial | Trial→Paid | M1 | M3 | M6 | M12 | RPI D14 | RPI D60 | ARPU/mo | LTV 12m | CPI iOS | CPI Android |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Top quartile, T1 | 12% | 65% | 75% | 60% | 50% | 38% | $0.85 | $1.30 | $15 | $95 | $6.20 | $2.50 |
| Median, T1 | 6% | 38% | 55% | 35% | 22% | 12% | $0.44 | $0.63 | $10 | $45 | $4.50 | $1.80 |
| Bottom quartile, T1 | 1.5% | 12% | 25% | 10% | 4% | 1% | $0.06 | $0.10 | $5 | $12 | — | — |
| Median, T2 | 5% | 32% | 52% | 32% | 20% | 10% | $0.32 | $0.45 | $7 | $32 | — | — |
| Median, T3 | 3.5% | 24% | 48% | 28% | 16% | 7% | $0.14 | $0.20 | $3.50 | $18 | — | — |

**Источники:** Replika 25% free→paid + 7+ months avg paying user (mktclarity 2025); Appfigures revenue per download $1.18 H1 2025 (up from $0.52 2024); RevenueCat 2025 AI category D60 RPI $0.63 (matches Health & Fitness highest); Character.AI $32.2M revenue / 20M MAU 2024.

---

## Сводная default-таблица (Median, Tier-1)

Для дефолтного автозаполнения когда юзер выбирает вертикаль без указания тира:

| # | Вертикаль | Install→Trial | Trial→Paid | M1 | M12 | RPI D60 | LTV 12m/paying |
|---|---|---|---|---|---|---|---|
| 1 | Utilities (VPN, cleaners) | 8.6% | 35% | 50% | 12% | $0.32 | $28 |
| 2 | Lifestyle / Wellness | 4.2% | 28% | 55% | 14% | $0.20 | $35 |
| 3 | Health & Fitness | 6.5% | 39.9% | 65% | 22% | $0.63 | $55 |
| 4 | Photo / Video | 7% | 26.2% | 38% | 5% | $0.22 | $22 |
| 5 | Language Learning | 7.5% | 38% | 60% | 18% | $0.45 | $42 |
| 6 | Dating | 3.5% | 30% | 50% | 8% | $0.28 | $60 |
| 7 | AI Companions | 6% | 38% | 55% | 12% | $0.63 | $45 |

---

## Что это значит для UI калькулятора

1. **Должен быть toggle режима**: `Mode: Daily session retention | Subscription metrics`. Mobile games / iGaming / e-commerce / fintech используют первый, эти 7 — второй.

2. **Формула LTV** для subscription mode:
   ```
   LTV per install = install_to_trial × trial_to_paid × LTV_per_paying_user
   ```
   Где `LTV_per_paying_user = ARPU_monthly × avg_subscription_lifetime_months`

3. **Avg subscription lifetime** можно вычислить из M12 retention через формулу:
   ```
   avg_lifetime_months ≈ 1 / monthly_churn_rate
   monthly_churn_rate ≈ 1 - (M12 retention)^(1/12)
   ```
   Например M12=0.22 → monthly_churn = 1 - 0.22^(1/12) = 11.9% → avg_lifetime = 8.4 месяцев.

4. **App Store fee** не учтён в RPI/ARPU цифрах — RevenueCat репортит **gross**. Помни про 30% (15% после года).

---

## CIS-relevance

Для аудитории СНГ-аналитиков особенно релевантны:
- **BetterMe** (Health & Fitness, top quartile T1)
- **Reface, FaceApp, Prequel** (Photo/Video, top quartile T1 — viral spike pattern)
- **Replika** (AI Companions, top quartile T1)
- **Mamba, Badoo** (Dating, median T1/T2)

VPN-сегмент — много CIS-разработчиков (Atlas VPN был CIS до закрытия, многие "TurboVPN"-style apps), но конкретные имена не публичны.

Это не отражено в JSON, но если хочешь — могу добавить флаг `cis_relevant_examples` в каждую вертикаль.
