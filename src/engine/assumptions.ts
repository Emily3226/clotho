// Every constant and model parameter used by the engine.
// "official" entries are published figures; "illustrative" entries are
// modelling assumptions, not facts and not forecasts.

export type AssumptionKind = 'official' | 'illustrative';

export interface Assumption {
  key: string;
  label: string;
  display: string;
  kind: AssumptionKind;
  source: string;
  sourceLabel: string;
  asOf: string;
  note?: string;
}

const CRA_LIMITS =
  'https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html';
const TFSA_URL =
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/calculate-room.html';
const FHSA_URL =
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/contributing-your-fhsa.html';
const CPP_URL = 'https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-benefit/amount.html';
const OAS_URL =
  'https://www.canada.ca/en/services/benefits/publicpensions/cpp/old-age-security/benefit-amount.html';
const TAX_URL =
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html';
const FP_URL = 'https://www.fpcanada.ca/planners/projection-assumption-guidelines';
const STATCAN_URL = 'https://www150.statcan.gc.ca/n1/en/subjects/labour';
// Statistics Canada, The Daily, 29 Nov 2012: earnings losses of displaced workers.
const DISPLACED_URL = 'https://www150.statcan.gc.ca/n1/daily-quotidien/121129/dq121129c-eng.htm';
// ADP Canada Pay Insights, August 2026, as reported by Benefits and Pensions Monitor.
const JOB_CHANGE_URL =
  'https://www.benefitsandpensionsmonitor.com/news/industry-news/job-changers-pocket-56-pay-bump-while-stayers-settle-for-3/394104';
const EI_URL = 'https://www.canada.ca/en/services/benefits/ei/ei-regular-benefit/benefit-amount.html';

export const A = {
  paths: 1000,
  endAge: 70,
  retireAge: 65,
  paycheques: 26,

  tfsaAnnual: 7000,
  fhsaAnnual: 8000,
  fhsaLifetime: 40000,
  rrspRate: 0.18,
  rrspMax: 33810,
  cppMaxMonthly: 1507.65,
  ympe: 74600,
  oasMonthly: 742,
  cppFullYears: 39,
  careerStartAge: 22,

  stockMean: 0.05,
  stockVol: 0.17,
  crashChance: 0.05,
  crashMean: -0.25,
  crashVol: 0.08,
  bondMean: 0.01,
  bondVol: 0.06,
  stockShareEarly: 0.8,
  stockShareLate: 0.4,
  glideStartAge: 40,
  glideEndAge: 65,
  fees: 0.0075,
  cushionReturn: 0.005,
  taxableDrag: 0.005,

  wageNoise: 0.02,
  jobLossYoung: 0.05,
  jobLossLater: 0.035,
  // Good luck at work: a step up in pay that lasts.
  stepUpChance: 0.04,
  stepUpRaise: 0.06,
  stepUpUntilAge: 45,
  // Share of a lasting gap between plan and life that lifestyle closes each year.
  adaptSpeed: 0.25,
  jobLossAgeSplit: 30,
  spellMedianMonths: 4,
  spellSigma: 0.6,
  spellCapMonths: 18,
  joblessIncomeShare: 0.45,
  returnPayCut: 0.05,

  withdrawalRate: 0.04,
  workplaceRetirementTax: 0.15,
  raidTax: 0.3,
  workOptionalShare: 0.7,
  tightGap: 0.2,
  roomMonths35: 6,
  roomMonths45: 12,
  debtYears: 10,
  // Share of spending someone will trim to keep up debt payments.
  debtTrimShare: 0.15,
  // The earliest age the work-optional test is run.
  workOptionalFromAge: 30,
  inflationForDebt: 0.02,
  defaultMatchPct: 4,
  raisesStep: 0.03,
  raisesCapPoints: 5,
  cushionTopUp: 90,
  waitingYears: 5,
} as const;

// Real wage growth by age band: [upper age (exclusive), yearly growth].
export const WAGE_GROWTH: ReadonlyArray<readonly [number, number]> = [
  [30, 0.03],
  [40, 0.015],
  [50, 0.005],
  [200, 0],
];

// Approximate effective tax rate, single Ontario earner: [income, rate].
export const TAX_TABLE: ReadonlyArray<readonly [number, number]> = [
  [0, 0.0],
  [15000, 0.03],
  [30000, 0.12],
  [50000, 0.18],
  [75000, 0.23],
  [100000, 0.27],
  [150000, 0.32],
  [200000, 0.36],
];

export function taxRate(income: number): number {
  const t = TAX_TABLE;
  if (income <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (income <= t[i][0]) {
      const [x0, y0] = t[i - 1];
      const [x1, y1] = t[i];
      return y0 + ((y1 - y0) * (income - x0)) / (x1 - x0);
    }
  }
  return t[t.length - 1][1];
}

export function takeHome(income: number): number {
  return income * (1 - taxRate(income));
}

// Approximate tax saved on one more dollar put into the workplace plan.
export function marginalRate(income: number): number {
  const step = 500;
  const m = (income * taxRate(income) - (income - step) * taxRate(income - step)) / step;
  return Math.min(0.5, Math.max(0, m));
}

export function wageGrowthAt(age: number): number {
  for (const [upper, g] of WAGE_GROWTH) if (age < upper) return g;
  return 0;
}

export function stockShareAt(age: number): number {
  if (age <= A.glideStartAge) return A.stockShareEarly;
  if (age >= A.glideEndAge) return A.stockShareLate;
  const f = (age - A.glideStartAge) / (A.glideEndAge - A.glideStartAge);
  return A.stockShareEarly + f * (A.stockShareLate - A.stockShareEarly);
}

const official = (
  key: string,
  label: string,
  display: string,
  source: string,
  sourceLabel: string,
  note?: string,
): Assumption => ({ key, label, display, kind: 'official', source, sourceLabel, asOf: '2026', note });

const illustrative = (
  key: string,
  label: string,
  display: string,
  source: string,
  sourceLabel: string,
  note?: string,
): Assumption => ({ key, label, display, kind: 'illustrative', source, sourceLabel, asOf: '2026', note });

export const ASSUMPTIONS: Assumption[] = [
  official('tfsaAnnual', 'TFSA yearly limit', '$7,000', TFSA_URL, 'Canada Revenue Agency', 'Room is $7,000 for each year since age 18, less what is used.'),
  official('fhsa', 'FHSA limits', '$8,000 a year, $40,000 lifetime', FHSA_URL, 'Canada Revenue Agency', 'Used only when a home goal is set.'),
  official('rrsp', 'RRSP limit', '18% of last year’s earned income, up to $33,810', CRA_LIMITS, 'Canada Revenue Agency', 'Applied to the workplace plan, employee and employer amounts together.'),
  official('cpp', 'CPP maximum at 65', '$1,507.65 a month', CPP_URL, 'Government of Canada', 'Simple estimate: maximum × (career average income ÷ YMPE, up to 1) × (years worked ÷ 39, up to 1).'),
  official('ympe', 'Year’s maximum pensionable earnings (YMPE)', '$74,600', CRA_LIMITS, 'Canada Revenue Agency'),
  official('oas', 'Old Age Security, ages 65 to 74', 'about $742 a month', OAS_URL, 'Government of Canada', 'Simple estimate: paid in full from 65.'),

  illustrative('stocks', 'Stocks (Middle setting)', '5.0% average real return, 17% volatility', FP_URL, 'In the range of FP Canada projection guidelines', 'A 5% chance each year of a fall drawn around −25%; ordinary years are re-centred so the long-run average stays at the setting’s return. Cautious: 4.0%, 18%, 6% chance. Hopeful: 6.0%, 16%, 4% chance.'),
  illustrative('bonds', 'Bonds (Middle setting)', '1.0% average real return, 6% volatility', FP_URL, 'In the range of FP Canada projection guidelines', 'Cautious: 0.5%. Hopeful: 1.5%.'),
  illustrative('mix', 'Investment mix', '80% stocks until 40, gliding to 40% at 65', FP_URL, 'A typical target-date glide path'),
  illustrative('fees', 'Investment fees', '0.75% a year', FP_URL, 'Illustrative'),
  illustrative('cushionReturn', 'Cushion return', '+0.5% a year after inflation', FP_URL, 'Illustrative, short-term savings'),
  illustrative('taxableDrag', 'Tax drag outside registered accounts', '0.5% a year', FP_URL, 'Illustrative'),
  illustrative('wages', 'Real wage growth', '+2.5% to +3.5% a year to 30 (by field), +1.5% to 40, +0.5% to 50, then flat; ±2% yearly noise', STATCAN_URL, 'Illustrative, shaped like Statistics Canada age-earnings profiles'),
  illustrative('jobLoss', 'Job loss', '5% a year under 30, 3.5% after', STATCAN_URL, 'Illustrative, in the range of Statistics Canada layoff rates', 'Time out of work has a median of 4 months, capped at 18. No layoffs while in school.'),
  illustrative('scar', 'Pay after a layoff', '5% lower on return, and it stays lower', DISPLACED_URL, 'Illustrative, at the mild end of Statistics Canada findings', 'Statistics Canada found that workers laid off in the early 2000s earned 2% to 15% less five years later, and those laid off in the early 1990s 15% to 30% less. The tool uses 5% for everyone, so it leans mild.'),
  illustrative('stepUp', 'A step up at work', 'A 4% chance each year before 45 of a lasting 6% rise in pay', JOB_CHANGE_URL, 'Illustrative: size in line with ADP Canada pay data, chance set to balance layoffs', 'A bigger promotion or a better job, on top of ordinary raises, which are already in wage growth. The size follows what is measured: in ADP Canada payroll data for August 2026, people who changed jobs saw total pay grow 9.6% in a year, against 4.4% for those who stayed, a gap of about 5 points (2.6 points on base pay alone). The chance is then set so good and bad luck cancel out on average: a 4% chance of +6% adds about 0.24% a year, and a 5% chance of a layoff with a 5% lasting cut takes away about 0.25%. Spending follows a step up like any raise.'),
  illustrative('gig', 'Gig or contract work', 'Income noise ±12% a year; an 8% chance each year of a 3-month slow stretch at half pay', STATCAN_URL, 'Illustrative', 'Replaces layoffs for gig and contract workers.'),
  illustrative('student', 'Students and co-op', 'Part-time or co-op pay until school ends, then full-time pay for the chosen field', STATCAN_URL, 'Illustrative', 'Full-time work starts at the later of 23 or two years from now, unless you say when you finish.'),
  illustrative('jobless', 'Income while out of work', '45% of previous pay', EI_URL, 'Illustrative; EI replaces up to 55% of insured earnings'),
  illustrative('tax', 'Income tax', 'about 12% at $30k, 18% at $50k, 23% at $75k, 27% at $100k, 32% at $150k, 36% at $200k', TAX_URL, 'Approximate effective rates, single Ontario earner', 'Interpolated between points. Workplace-plan contributions lower taxable income at the approximate marginal rate.'),
  illustrative('spending', 'Spending', 'Take-home pay minus saving; rises by 85% of each raise in Toronto or Vancouver, 80% in another big city, 75% in a smaller city or town', FP_URL, 'Illustrative behaviour rule', 'Lifestyle follows the expected career: a layoff or slower career squeezes saving, not spending. Living with family saves the rent not paid ($9,000, $7,000 or $5,000 a year by city, at most a quarter of take-home pay) until moving out (default age 25). The results are sensitive to this rule.'),
  illustrative('adapt', 'Lifestyle adjusts', 'A quarter of a lasting gap is closed each year', FP_URL, 'Our assumption; no published figure', 'When pay stays below the career you planned, or costs run higher, people cut back, but not overnight: rent and bills are slow to change. At a quarter a year, about half the adjustment is made within 3 years and three quarters within 5. In the end spending moves by the same share of the gap that a raise adds to it (75% to 85%, by city), so a lasting pay cut squeezes saving but does not end it. After a step up, spending rises the same way. Trimming never lowers the work-optional and room-to-move targets, which stay set by the lifestyle you planned; spending more after a step up raises them.'),
  illustrative('withdrawal', 'Sustainable income from savings', '4% a year of long-term savings', FP_URL, 'A common rule of thumb', 'Workplace-plan income is taxed at 15%.'),
  illustrative('raid', 'Emergency withdrawal from the workplace plan', '30% lost to tax; the room is gone', 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/making-withdrawals/tax-rates-on-withdrawals.html', 'Based on RRSP withholding rates'),
  illustrative('workOptional', 'Work-optional test', 'Income from savings and public pensions covers 70% of the spending you’re used to', FP_URL, 'A common replacement-rate rule of thumb', 'Checked every year from 30. Before 65, savings must first stand in for public pensions until they start, so early freedom takes a lot more.'),
  illustrative('room', 'Room to move', '6 months of spending by 35, 12 months by 45', FP_URL, 'Our definition of flexibility', 'Counts the cushion plus long-term savings you can reach.'),
  official('downPayment', 'Minimum down payment', '5% of the first $500,000, 10% of the rest; 20% at $1.5 million or more', 'https://www.canada.ca/en/financial-consumer-agency/services/mortgages/down-payment.html', 'Financial Consumer Agency of Canada'),
  illustrative('homePrices', 'Home prices', 'Toronto or Vancouver: condo $650k, townhouse $950k, house $1.4M. Another big city: $400k, $550k, $750k. Smaller city or town: $300k, $400k, $500k.', 'https://stats.crea.ca/en-CA/', 'Illustrative, in the range of CREA average prices', 'Counted on its own: a home goal does not change whether a future is in control.'),
  illustrative('debt', 'Student debt', 'Paid over 10 years, starting when school ends; the rate is reduced by 2% inflation', 'https://www.canada.ca/en/services/benefits/education/student-aid/grants-loans/repay.html', 'Illustrative', 'The chips use 5% before inflation. Payments come out of saving first, then out of spending (up to 15% of it), and only then out of savings. They pause in a year with time out of work. The federal part of Canada Student Loans is interest-free; provincial parts vary.'),
  illustrative('levers', 'Habits', 'Save part of every raise: +1 point of pay at each raise of 3% or more, up to 5 points. Cushion first: $90 a month while the cushion is filling. Automate: $25, $50 or $100 a month. Cost of waiting: 5 years.', FP_URL, 'Illustrative'),
];

export const LIMITATIONS: string[] = [
  'The parameters are illustrative, not forecasts. A thousand runs of luck show a range of what could happen, not what will.',
  'Taxes, CPP and OAS are simplified. The tool uses approximate tax rates and simple pension estimates.',
  'One set of life events cannot cover everyone. There are no partners, children, inheritances or moves between provinces, and field-of-study effects are broad averages, not a prediction for any one person.',
];
