# Clotho: assumptions

Generated from `src/engine/assumptions.ts` and `src/engine/worries.ts`. To change a number, change it there and run `npx tsx scripts/assumptions-doc.ts`.

All amounts are in today's dollars: inflation is already taken out, so every return and growth rate below is a real rate.

## Published figures

| What | Value | Notes | Source | As of |
|---|---|---|---|---|
| TFSA yearly limit | $7,000 | Room is $7,000 for each year since age 18, less what is used. | [Canada Revenue Agency](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/calculate-room.html) | 2026 |
| FHSA limits | $8,000 a year, $40,000 lifetime | Used only when a home goal is set. | [Canada Revenue Agency](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/contributing-your-fhsa.html) | 2026 |
| RRSP limit | 18% of last year’s earned income, up to $33,810 | Applied to the workplace plan, employee and employer amounts together. | [Canada Revenue Agency](https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html) | 2026 |
| CPP maximum at 65 | $1,507.65 a month | Simple estimate: maximum × (career average income ÷ YMPE, up to 1) × (years worked ÷ 39, up to 1). | [Government of Canada](https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-benefit/amount.html) | 2026 |
| Year’s maximum pensionable earnings (YMPE) | $74,600 |  | [Canada Revenue Agency](https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html) | 2026 |
| Old Age Security, ages 65 to 74 | about $742 a month | Simple estimate: paid in full from 65. | [Government of Canada](https://www.canada.ca/en/services/benefits/publicpensions/cpp/old-age-security/benefit-amount.html) | 2026 |
| Minimum down payment | 5% of the first $500,000, 10% of the rest; 20% at $1.5 million or more |  | [Financial Consumer Agency of Canada](https://www.canada.ca/en/financial-consumer-agency/services/mortgages/down-payment.html) | 2026 |

## Illustrative assumptions

These are modelling choices, not facts and not forecasts.

| What | Value | Notes | Source | As of |
|---|---|---|---|---|
| Stocks (Middle setting) | 5.0% average real return, 17% volatility | A 5% chance each year of a fall drawn around −25%; ordinary years are re-centred so the long-run average stays at the setting’s return. Cautious: 4.0%, 18%, 6% chance. Hopeful: 6.0%, 16%, 4% chance. | [In the range of FP Canada projection guidelines](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Bonds (Middle setting) | 1.0% average real return, 6% volatility | Cautious: 0.5%. Hopeful: 1.5%. | [In the range of FP Canada projection guidelines](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Investment mix | 80% stocks until 40, gliding to 40% at 65 |  | [A typical target-date glide path](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Investment fees | 0.75% a year |  | [Illustrative](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Cushion return | +0.5% a year after inflation |  | [Illustrative, short-term savings](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Tax drag outside registered accounts | 0.5% a year |  | [Illustrative](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Real wage growth | +2.5% to +3.5% a year to 30 (by field), +1.5% to 40, +0.5% to 50, then flat; ±2% yearly noise |  | [Illustrative, shaped like Statistics Canada age-earnings profiles](https://www150.statcan.gc.ca/n1/en/subjects/labour) | 2026 |
| Job loss | 5% a year under 30, 3.5% after | Time out of work has a median of 4 months, capped at 18. Pay on return is 5% lower. No layoffs while in school. | [Illustrative, in the range of Statistics Canada layoff rates](https://www150.statcan.gc.ca/n1/en/subjects/labour) | 2026 |
| Gig or contract work | Income noise ±12% a year; an 8% chance each year of a 3-month slow stretch at half pay | Replaces layoffs for gig and contract workers. | [Illustrative](https://www150.statcan.gc.ca/n1/en/subjects/labour) | 2026 |
| Students and co-op | Part-time or co-op pay until school ends, then full-time pay for the chosen field | Full-time work starts at the later of 23 or two years from now, unless you say when you finish. | [Illustrative](https://www150.statcan.gc.ca/n1/en/subjects/labour) | 2026 |
| Income while out of work | 45% of previous pay |  | [Illustrative; EI replaces up to 55% of insured earnings](https://www.canada.ca/en/services/benefits/ei/ei-regular-benefit/benefit-amount.html) | 2026 |
| Income tax | about 12% at $30k, 18% at $50k, 23% at $75k, 27% at $100k, 32% at $150k, 36% at $200k | Interpolated between points. Workplace-plan contributions lower taxable income at the approximate marginal rate. | [Approximate effective rates, single Ontario earner](https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html) | 2026 |
| Spending | Take-home pay minus saving; rises by 85% of each raise in Toronto or Vancouver, 80% in another big city, 75% in a smaller city or town | Lifestyle follows the expected career: a layoff or slower career squeezes saving, not spending. Living with family saves the rent not paid ($9,000, $7,000 or $5,000 a year by city, at most a quarter of take-home pay) until moving out (default age 25). The results are sensitive to this rule. | [Illustrative behaviour rule](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Sustainable income from savings | 4% a year of long-term savings | Workplace-plan income is taxed at 15%. | [A common rule of thumb](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Emergency withdrawal from the workplace plan | 30% lost to tax; the room is gone |  | [Based on RRSP withholding rates](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/making-withdrawals/tax-rates-on-withdrawals.html) | 2026 |
| Work-optional test | Income from savings and public pensions covers 70% of the spending you’re used to | Checked every year from 30. Before 65, savings must first stand in for public pensions until they start, so early freedom takes a lot more. | [A common replacement-rate rule of thumb](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Room to move | 6 months of spending by 35, 12 months by 45 | Counts the cushion plus long-term savings you can reach. | [Our definition of flexibility](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |
| Home prices | Toronto or Vancouver: condo $650k, townhouse $950k, house $1.4M. Another big city: $400k, $550k, $750k. Smaller city or town: $300k, $400k, $500k. | Counted on its own: a home goal does not change whether a future is in control. | [Illustrative, in the range of CREA average prices](https://stats.crea.ca/en-CA/) | 2026 |
| Student debt | Paid over 10 years, starting when school ends; the rate is reduced by 2% inflation | The chips use 5% before inflation. The saving you enter includes what goes to student loans, so payments come out of it first, then out of spending (up to 15% of it), and only then out of savings. They pause in a year with time out of work. The federal part of Canada Student Loans is interest-free; provincial parts vary. | [Illustrative](https://www.canada.ca/en/services/benefits/education/student-aid/grants-loans/repay.html) | 2026 |
| Habits | Save part of every raise: +1 point of pay at each raise of 3% or more, up to 5 points. Cushion first: $90 a month while the cushion is filling. Automate: $25, $50 or $100 a month. Cost of waiting: 5 years. |  | [Illustrative](https://www.fpcanada.ca/planners/projection-assumption-guidelines) | 2026 |

## What each worry changes

Worries are tested as what-ifs, never as predictions. Each one is run against the same 1,000 paths with the same luck.

| Worry | Mild | Moderate (default) | Severe |
|---|---|---|---|
| AI changes my job | Job-loss chance ×1.5 before 45, time out of work ×1.25, wage growth −0.5 point for 10 years | Job-loss chance ×2 before 45, time out of work ×1.5, wage growth −1 point for 10 years | Job-loss chance ×3 before 45, time out of work ×2, wage growth −1.5 points for 10 years |
| A recession hits soon | One market fall of at least 20% in the next 3 years; job-loss chance ×1.75 for 2 years | One market fall of at least 30% in the next 3 years; job-loss chance ×2.5 for 2 years | One market fall of at least 40% in the next 3 years; job-loss chance ×3.5 for 2 years |
| Everything keeps getting more expensive | Essentials (half of spending) rise an extra 0.75% a year for 10 years | Essentials (half of spending) rise an extra 1.5% a year for 10 years | Essentials (half of spending) rise an extra 2.5% a year for 10 years |
| I’ll never afford a home | Adds a home goal; prices and rents rise 0.5% a year faster than wages | Adds a home goal; prices and rents rise 1% a year faster than wages | Adds a home goal; prices and rents rise 2% a year faster than wages |
| The world gets rougher | A 2% chance each year of a one-off cost worth 2 months of spending; average returns −0.25 point | A 3% chance each year of a one-off cost worth 2 months of spending; average returns −0.5 point | A 5% chance each year of a one-off cost worth 2 months of spending; average returns −1 point |
| Government pensions won’t be there for me | CPP and OAS paid at 90% | CPP and OAS paid at 75% | CPP and OAS paid at 50% |

## How a future is judged

- **Shock-proof:** never had to dip into the workplace plan and never ended a year short.
- **Room to move:** the cushion plus reachable long-term savings cover 6 months of spending at 35 and 12 months at 45.
- **Home** (only if set): the down payment is reached by the target age.
- **Work-optional by 65:** income from savings and public pensions covers 70% of average spending over the last five working years. The earliest age this holds is recorded from 30 to 70. Before 65, savings must first stand in for public pensions until they start; pensions only count as far as that gap is funded.
- **In control:** all milestones met. **Mostly there:** work-optional by 65, one other missed. **Tight:** work-optional by 65 with two or more others missed, or work-optional missed by less than 20 points. **Off track:** the rest.
- A worry makes a future **harder** when its status drops against the no-worry run of the same path. It counts as **back on track later** when work still becomes optional by 70. A habit **lifts it back up** when the status improves under the same worry.
- Habits are ranked by futures gained per dollar of take-home pay given up per paycheque today.

## Model order within a year

1. Balances are recorded and milestones are checked.
2. Investment returns are applied to opening balances.
3. Pay is set (trend, lasting effects of past layoffs, yearly noise) and spending follows the half-of-each-raise rule.
4. Job loss is drawn. While out of work, income is 45% of pay and contributions stop for those months.
5. Money left after spending goes to the workplace plan first (with the employer match), then the cushion, then long-term savings (FHSA if a home goal is set, TFSA, then a taxable pot).
6. If spending is more than income, money comes from the cushion, then long-term savings, then the workplace plan (30% lost to tax).

## Limitations

1. The parameters are illustrative, not forecasts. A thousand runs of luck show a range of what could happen, not what will.
2. Taxes, CPP and OAS are simplified. The tool uses approximate tax rates and simple pension estimates.
3. One set of life events cannot cover everyone. There are no partners, children, inheritances or moves between provinces, and field-of-study effects are broad averages, not a prediction for any one person.

Other simplifications worth knowing: contribution room for the workplace plan does not carry forward; the plan's tax relief uses an approximate marginal rate; home prices are flat in today's dollars unless the home worry is on; a home purchase withdraws the down payment and does not model a mortgage; CPP assumes work from age 22 and does not index the earnings ceiling; people keep working to 65, and past 65 only until work becomes optional or 70.
