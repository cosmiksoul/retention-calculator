# Источники и методология subscription presets

Дополнение к `methodology.md` — описание источников по 7 вертикалям consumer subscription apps в `presets-subs.json`.

**Главное отличие от первой пачки:** retention считается от paying subscribers (не installs), и есть дополнительные поля `install_to_trial`, `trial_to_paid`, `rpi_d14`, `rpi_d60`. Это нативный формат сегмента.

---

## Глобальные источники

| Источник | Что покрывает | Ссылка |
|---|---|---|
| **RevenueCat State of Subscription Apps 2025** | 75K+ apps, $10B+ revenue 2024, по категориям (Utilities, Health & Fitness, Education, Social & Lifestyle, Photo & Video, AI). Стандарт сегмента. | https://www.revenuecat.com/state-of-subscription-apps-2025/ |
| **RevenueCat State of Subscription Apps 2026** | Свежий отчёт, AI category breakdown, web billing | https://www.revenuecat.com/state-of-subscription-apps/ |
| **Adapty State of In-App Subscriptions 2026** | Альтернативный платформенный отчёт, лучше для weekly plans data, LTV per category | https://adapty.io/state-of-in-app-subscriptions/ |
| **Appfigures AI Companion Apps Report (TechCrunch, 2025)** | Категория AI companions: $221M lifetime spend, $1.18 RPD H1 2025 | https://techcrunch.com/2025/08/12/ai-companion-apps-on-track-to-pull-in-120m-in-2025/ |
| **Duolingo 10-Q (2024)** | золотой стандарт для Language Learning unit economics | https://www.sec.gov/Archives/edgar/data/0001562088/ |
| **Match Group 10-K / 10-Q (2024)** | Tinder, Hinge, Match unit economics | https://ir.mtch.com/ |
| **Bumble 10-Q (2024)** | Bumble + Badoo ARPPU и paid users | https://ir.bumble.com/ |
| **Business of Apps Dating Market** | Aggregated dating app stats, Tinder/Bumble | https://www.businessofapps.com/data/dating-app-market/ |
| **AppTweak Apple Ads Benchmarks 2025** | CPI by category US ($1B ad spend dataset) | https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks |
| **mktclarity AI Companion Market 2025** | Replika, Character.AI, Chai детальные числа | https://mktclarity.com/blogs/news/ai-companion-market |
| **Athletech News (RevenueCat 2025 H&F)** | Health & Fitness категория deep dive | https://athletechnews.com/fitness-apps-monetizable-winner-take-all-or-most/ |

---

## 1. Utilities (VPN, cleaners, scanners)

**Качество данных:** ✅ robust. RevenueCat + Adapty 2026 хорошо покрывают этот сегмент (Utilities — одна из крупнейших RevenueCat-категорий).

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | Adapty 2026 (Utilities first-renewal 58.1% — highest of all categories); RevenueCat 2025 (top quartile retention 1.7-3× median) | Adapty 2026 (Utilities trial users $68.90 LTV 12m) | AppTweak 2025 (Utilities US $2.90); Liftoff/Adjust top quartile estimates |
| median T1 | RevenueCat 2025 (Utilities trial start 86%); Adapty 2026 (median first-renewal) | RevenueCat 2025 (Utilities D60 RPI median); Adapty 2026 weekly-dominant | AppTweak 2025 ($2.90 US) |
| bottom_quartile T1 | RevenueCat 2025 bottom-quartile (3-14× worse than top) | Long-tail estimates | Estimates |
| median T2 | RevenueCat 2025 EU geo data | RevenueCat EU geo | AppTweak EU |
| median T3 | RevenueCat 2025 (LATAM median 25%, top 53.3%) | LATAM/SEA estimates | Mapendo, Liftoff LATAM |

**Главная переменная:** соотношение weekly и annual планов. Pure VPN (NordVPN, Surfshark) использует annual sub-economics ($60-100/yr); приложения в стиле «TurboVPN» — weekly trap ($4.99/неделя → ~$260/год если не отменить). Это создаёт огромный разброс в ARPU.

---

## 2. Lifestyle / Wellness

**Качество данных:** ✅ robust, но с оговоркой — RevenueCat группирует Lifestyle с Social Networking и Dating в «Social & Lifestyle». Чистые цифры для wellness требуют изоляции.

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | RevenueCat 2025 Social & Lifestyle top quartile; Calm/Headspace operator commentary | RevenueCat 2025 (top apps 5-7× median); Headspace S-1 era data | AppTweak Lifestyle category |
| median T1 | RevenueCat 2025 Social & Lifestyle median (lower retention overall vs. H&F) | RevenueCat 2025 median | AppTweak 2025 |
| bottom_quartile T1 | RevenueCat 2025 bottom-quartile | Long-tail estimates | Estimates |
| median T2 | RevenueCat 2025 EU | EU benchmarks | AppTweak EU |
| median T3 | RevenueCat 2025 LATAM/SEA | LATAM benchmarks | Mapendo |

**Оговорка:** «Lifestyle» — широкая категория. Habit trackers (Streaks, Fabulous) монетизируются хуже meditation apps (Calm, Headspace). Top quartile в основном meditation apps; bottom — generic habit trackers. Это размывает медиану.

---

## 3. Health & Fitness

**Качество данных:** ✅ **robust — лучший сегмент в RevenueCat data.** Это категория, в которой RevenueCat публикует больше всего деталей.

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | RevenueCat 2025 (top 10% trial-to-paid 68.3%, P90 RPI $2.97 — highest of all categories) | RevenueCat 2025 (P90 D60 RPI $2.97); Strava/Whoop operator data | AppTweak 2025 H&F US |
| median T1 | RevenueCat 2025 (median trial-to-paid 39.9%, RPI D14 $0.44, D60 $0.63) | RevenueCat 2025 (median D14 $0.44, D60 $0.63 — both highest of categories) | AppTweak 2025 |
| bottom_quartile T1 | RevenueCat 2025 bottom-quartile (Adapty: H&F first-renewal 30.3% — lowest, compensated by ARPU) | Long-tail estimates | Estimates |
| median T2 | RevenueCat 2025 EU geo | RevenueCat EU | AppTweak EU |
| median T3 | RevenueCat 2025 LATAM (median 25%, top 53.3%) | RevenueCat LATAM | Mapendo |

**Важно для СНГ:** **BetterMe** — крупнейшее H&F-приложение из СНГ (украинская команда), хороший пример retention верхнего квартиля. В публичных данных конкретные цифры BetterMe не раскрываются, но их модель (quiz onboarding + жёсткий paywall) даёт характерный для верхнего квартиля паттерн.

---

## 4. Photo / Video Editors

**Качество данных:** ✅ robust. RevenueCat детально покрывает Photo & Video.

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | RevenueCat 2025 (Photo/Video top quartile 5-7× median); Reface viral data | RevenueCat 2025 top quartile | AppTweak 2025 Photo |
| median T1 | RevenueCat 2024 (Photo/Video trial-to-paid **26.2% — lowest of categories**); RevenueCat 2025 | RevenueCat 2024/2025 median | AppTweak 2025 |
| bottom_quartile T1 | RevenueCat 2025 bottom (Photo/Video имеет largest spread top vs. bottom) | Long-tail | Estimates |
| median T2 | RevenueCat EU | RevenueCat EU | AppTweak EU |
| median T3 | RevenueCat LATAM/SEA | RevenueCat LATAM | Mapendo |

**Оговорка:** Photo/Video — категория с самыми высокими refund rates (RevenueCat 2024: «sneaky 7d trial in onboarding to annual» даёт в 4× больше refund'ов по сравнению с monthly). Чистая выручка после возвратов может быть на 15–25% ниже указанных gross-цифр. Лидеры из СНГ (Reface, FaceApp, Prequel) исторически использовали эту схему.

---

## 5. Language Learning

**Качество данных:** ✅ robust. **Duolingo S-1 + 10-Q — золотой стандарт.**

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | Duolingo 10-Q Q1-Q4 2024 (paid penetration 8.5-8.9% of 113M MAU); RevenueCat 2025 Education top quartile | Duolingo 10-Q (subscription ARPU ~$19/quarter / paying user ≈ $75/yr); Q1 2025 $191M sub revenue / 9.9M paid subs | Duolingo CAC fell $158 (2021) → $28 (2024) — outlier organic-driven; AppTweak Education $3-5 US |
| median T1 | RevenueCat 2025 Education (D14 RPI $0.40, D60 $0.45) | RevenueCat 2025 Education category | AppTweak 2025 |
| bottom_quartile T1 | RevenueCat 2025 Education bottom | Long-tail | Estimates |
| median T2 | RevenueCat 2025 EU Education | RevenueCat EU | AppTweak EU |
| median T3 | RevenueCat 2025 LATAM Education | RevenueCat LATAM | Mapendo |

**Оговорка:** CAC Duolingo ($28) и доля organic — исключения, а не норма. Babbel, Memrise, Mondly с упором на paid acquisition ближе к CAC $30–80. Для «median T1» использовано смешанное значение.

---

## 6. Dating Apps

**Качество данных:** ✅ robust благодаря публичным 10-Q (Match Group, Bumble Inc).

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | Match Group commentary (Tinder churn structurally high); Bumble Q1 2024 retention | Bumble Q1 2024 ARPPU $27.75/mo (Bumble app); Tinder $200/yr ARPU | Match Group marketing spend / new payer disclosures |
| median T1 | RevenueCat 2025 Social & Lifestyle median; Match Group Tinder ARPMUP $16.50/mo | Bumble Inc combined ARPPU $21.84/mo Q1 2024; Tinder ARPU calculation from $1.94B / 9.6M subs / 12 | AppTweak Dating $5-7 US |
| bottom_quartile T1 | RevenueCat Social & Lifestyle bottom | Long-tail | Estimates |
| median T2 | Match Group EU/Asia revenue split (~$12-14 ARPMUP) | Bumble international expansion data | AppTweak EU |
| median T3 | Statista Tinder LATAM IAP revenue 2019-2023; Badoo emerging markets | Tinder LATAM disclosures | Mapendo LATAM |

**Оговорка:** retention в Dating имеет структурную особенность — «success churn». Пользователь находит match → отписывается. Это означает, что низкий retention ≠ плохой продукт. ARPU per paying user в этой категории важнее retention.

---

## 7. AI Companions / Chatbots

**Качество данных:** ⚠️ moderate — самый быстро меняющийся сегмент (категория свежая).

| Slice | Откуда retention | Откуда RPI/ARPU | Откуда CPI |
|---|---|---|---|
| top_quartile T1 | mktclarity 2025 (Replika 25% free→paid, 7+ months avg paying user); Sacra Character.AI analysis | Appfigures 2025 (revenue per download $1.18 H1 2025, up from $0.52 2024); Character.AI $9.99/mo c.ai+; Replika Pro $19.99/mo | AppTweak AI category (нестабильно, новая категория) |
| median T1 | RevenueCat 2025 AI category breakout (D60 RPI $0.63 — matches Health & Fitness highest) | RevenueCat 2025 AI category; Character.AI $32.2M / 20M MAU | AppTweak 2025 |
| bottom_quartile T1 | Appfigures 2025: 300+ struggling AI companion apps in long tail; RevenueCat bottom | Long-tail estimates | Estimates |
| median T2 | RevenueCat 2025 EU AI | RevenueCat EU AI | AppTweak EU |
| median T3 | Appfigures geo data (Philippines 11%, Brazil 10%, Indonesia 8% of AI companion downloads — high volume, low ARPU) | LATAM/SEA AI data | Mapendo |

**Оговорка:** категория растёт +64% YoY (revenue) и +88% YoY (downloads). Цифры выше — H1 2025 baseline; к H2 2026 могут выглядеть совсем иначе. Обновлять раз в квартал.

**Важно для СНГ:** **Replika (Eugenia Kuyda / Luka)** — один из основоположников категории AI companion. ~$24–30M ARR на 2024 с subscription-only моделью, что даёт высокий ARPU per paying user (в отличие от Character.AI с упором на freemium). Хороший прокси-показатель для top quartile T1.

---

## Что значит "robust" vs "moderate" для subs presets

| Уровень | Критерий | В пресетах |
|---|---|---|
| **robust** | RevenueCat category breakout + ≥1 крупный публичный 10-Q или 10-K в категории, с large sample size (≥1000 apps в RevenueCat выборке для категории) | Utilities, Health & Fitness, Photo/Video, Language Learning, Dating |
| **moderate** | RevenueCat category breakout есть, но категория слишком молодая для stable benchmarks (<2 года данных) | AI Companions |
| **estimated** | (не используется в этом файле) | — |

**Важно:** Для всех 7 вертикалей RevenueCat 2025 — **первичный источник**. Adapty 2026 используется как валидация. Публичные 10-Q (Duolingo, Match, Bumble) — только для тех вертикалей, где есть крупный public-traded leader.

---

## Limitations

1. **RevenueCat sample bias.** Платформа охватывает 75K+ приложений, но с уклоном в малые и средние (любительские проекты до $1M ARR). Самые крупные приложения (Tinder, Duolingo, Calm) обычно используют свою инфраструктуру атрибуции и биллинга и не отправляют данные в RevenueCat. Для top quartile это значит, что цифры отражают «верх small-to-mid сегмента», а не «гигантов индустрии».

2. **Geo data в RevenueCat ограничена.** Категорийные бенчмарки по гео (T1/T2/T3) делятся только на North America / Europe / LatAm / IN+SEA, не по странам. Tier-3 в пресетах — смешанный LATAM+SEA, не чистый СНГ.

3. **Приложения из СНГ часто вне RevenueCat.** BetterMe, Reface, FaceApp используют собственные стэки биллинга и атрибуции. Их цифры в пресетах — экстраполяция из средних по категории + комментарии операторов, а не прямые измерения.

4. **Refund rate не учтён.** RevenueCat отдаёт gross revenue. Реальная чистая выручка после возвратов может быть на 5–25% ниже (зависит от категории — Photo/Video и приложения в стиле weekly trap хуже всего).

5. **App Store fee не учтён.** Все ARPU/RPI цифры — gross. Для net считай 70% (или 85% после года).

---

## Weekly retention sourcing (для cadence=weekly)

В калькуляторе v2 Subscription mode есть переключатель Weekly cadence. Публичных данных по weekly retention значительно меньше, чем по monthly — они есть только для двух вертикалей, где недельная подписка доминирует. Здесь — честная картина источников и расчётов.

### Прямые якоря (direct из Adapty SOIS 2026)

**Global weekly conversion funnel** (trial-пользователи, все категории, Adapty SOIS 2026):
- W1 (1st renewal): 59.2% trial users / **37.0% direct buyers**
- W2 (2nd renewal): 45.1%
- W3 (3rd renewal): 37.1%
- W4 (4th renewal): 31.6%
- W5 (5th renewal): 27.6%
- Day 380 (≈ W54): **5.5%**

**Utilities-specific** (Adapty 2026 Utilities article):
- First-renewal: **58.1%** — единственный category-specific weekly якорь, который Adapty публикует напрямую
- Weekly plan revenue share: 73.6%
- Median weekly price: $7.48 globally

**Photo & Video** (Adapty 2026 P&V article):
- First-renewal **не публикуется** в category article
- Refund rate 6.4% global / 14.1% APAC — самая высокая из всех категорий
- Trial adoption падает быстрее всех (70.7% → 62.3% YoY)
- Weekly plans drive ~50% revenue

### Логика расчётов финальных кривых

**subs_utilities — median|tier_1:**
- W1 = 58 (Adapty Utilities first-renewal **direct**)
- W2 = 58 × (45.1/59.2) = 44 (применяем глобальное соотношение W2/W1)
- W4 = 58 × (31.6/59.2) = 31 (глобальное соотношение W4/W1)
- W8/W12/W26 — экстраполяция по power-law между якорем W5 и якорем D380

**subs_utilities — top_quartile|tier_1:**
- W1 = 70 (медиана × 1.2 — премия верхнего квартиля за высокую цену из Adapty «high-priced weekly retain 12% better» + премия лидера категории)
- остальные точки — те же соотношения

**subs_photo_video — median|tier_1:**
- W1 = 40 (расчётное: глобальный weekly trial baseline 59.2% + direct 37%, скорректировано на P&V trial adoption 62%, минус P&V refund drag 6.4% → ~40%)
- W2–W26 — те же глобальные соотношения, что и для Utilities

**subs_photo_video — top_quartile|tier_1:**
- W1 = 55 (медиана × 1.4 — премиум-приложения в Photo/Video типа Lightroom удерживают пользователей лучше)
- остальные точки — те же соотношения

### Что осознанно оставлено null

1. **bottom_quartile|tier_1** для Utilities и Photo/Video — Adapty публикует только разброс между лидером категории и медианой
2. **median|tier_2** и **median|tier_3** — гео-разрезы weekly retention не публикуются (Adapty даёт только LTV-множители по гео, а не кривые)
3. **5 других вертикалей** (Lifestyle, Health/Fitness, Language Learning, Dating, AI Companions) — недельная подписка не является основной моделью, и публичных данных по weekly нет

В JSON для этих случаев:
- У варианта просто нет поля `retention_weekly`
- У пресета стоит `weekly_data_status: "not_applicable"` (5 вертикалей) или `"available_t1_only"` (utilities, photo_video)
- Калькулятор отключает переключатель cadence для пресетов с `not_applicable` и для вариантов без `retention_weekly`

### Confidence levels

| Тип | Где использовался | Уверенность |
|---|---|---|
| **direct** | Utilities median|T1 W1 = 58.1% (Adapty) | высокая |
| **proxy** | Photo/Video W1 (global weekly baseline + category drag) | средняя |
| **derived** | W2-W4 через global Adapty ratios | средняя |
| **extrapolated** | W8-W26 через power-law между W5 и D380 anchors | низкая для дальних точек (W26) |

В UI калькулятора в карточке пресета все эти оговорки должны быть видны — это часть позиционирования «не black box».

### Sources

- Adapty Utilities benchmark (April 2026): https://adapty.io/blog/utilities-app-subscription-benchmarks/
- Adapty Photo & Video benchmark (April 2026): https://adapty.io/blog/photo-video-app-subscription-benchmarks/
- Adapty SOIS 2026 (full report): https://adapty.io/state-of-in-app-subscriptions-report/
- Adapty — Free trial vs direct purchase: https://adapty.io/blog/free-trial-vs-direct-purchase-subscription-apps/
- RevenueCat — Weekly subscriptions: https://www.revenuecat.com/blog/growth/weekly-subscriptions/
- Statista — App subscribers retained by renewal model: https://www.statista.com/statistics/1384562/app-users-retained-after-one-year-by-subscription-renew/

Полный audit-trail с пошаговыми расчётами по каждой строке — в `temp/weekly-research-findings.md` (в gitignore, локальный документ для верификации).

---

## Когда обновлять subs presets

| Триггер | Что обновлять |
|---|---|
| RevenueCat State of Subscription Apps 2027 (Q1 2027) | Все 7 вертикалей |
| Adapty State of In-App Subscriptions 2027 | Cross-validation Utilities, Lifestyle |
| Duolingo Q1 2026 10-Q | Language Learning |
| Match Group / Bumble Q1 2026 10-Q | Dating |
| Appfigures AI Companion quarterly updates | AI Companions (быстро меняется) |
| Apple court decision on web billing (April 2025+) | All — может изменить app-store-only числа |
| Adapty SOIS 2027 release | Weekly retention curves (Utilities, Photo/Video); попытаться расширить на bottom_quartile если новые данные появятся |

**Минимальная частота полного обновления:** раз в 6 месяцев для AI Companions, раз в 12 месяцев для остальных.
