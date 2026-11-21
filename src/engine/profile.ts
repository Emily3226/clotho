// Life stage and "Make it more you" tables. Every value here is an
// illustrative default unless its basis says otherwise, and every one is
// shown in the Assumptions panel.
import type { AssumptionSetId, City, FieldId, HomeType, Inputs, Living, Stage } from './types';

export const STATCAN_GRAD_URL = 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3710028401';

export interface StageInfo {
  id: Stage;
  label: string;
  income: number;
  saved: number;
  monthly: number;
  plan: Inputs['plan'];
  employeePct: number;
  matchPct: number;
}

export const STAGES: StageInfo[] = [
  { id: 'student', label: 'Student', income: 18000, saved: 1500, monthly: 50, plan: 'no', employeePct: 0, matchPct: 0 },
  { id: 'first', label: 'First job', income: 52000, saved: 2000, monthly: 150, plan: 'unsure', employeePct: 0, matchPct: 4 },
  { id: 'gig', label: 'Gig or contract', income: 38000, saved: 3000, monthly: 100, plan: 'no', employeePct: 0, matchPct: 0 },
  { id: 'full', label: 'Full-time', income: 68000, saved: 8000, monthly: 300, plan: 'yes', employeePct: 3, matchPct: 4 },
];

export const stageInfo = (id: Stage): StageInfo => STAGES.find((s) => s.id === id)!;

// Students start full-time work at the later of 23 or two years from now,
// unless they say when they finish.
export const defaultFinishAge = (age: number): number => Math.max(23, age + 2);

export interface FieldInfo {
  id: FieldId;
  label: string;
  salary: number;
  basis: string;
  growthTo30: number;
  aiStrength: number;
}

// Starting salaries: Statistics Canada Table 37-10-0284-01, bachelor's
// graduates, class of 2022, median employment income two years after
// graduation, 2024 constant dollars, rounded. To be confirmed against the
// table before quoting. Growth and AI strength are illustrative.
export const FIELDS: FieldInfo[] = [
  { id: 'health', label: 'Health', salary: 82000, basis: 'Health care, bachelor’s ($82,100)', growthTo30: 0.03, aiStrength: 0.6 },
  { id: 'trades', label: 'Trades', salary: 49000, basis: 'Estimate: college diploma median, all fields (about $48,900)', growthTo30: 0.035, aiStrength: 0.5 },
  { id: 'engcs', label: 'Engineering & computer science', salary: 77000, basis: 'Midpoint of engineering ($80,200) and math & computer science ($73,600)', growthTo30: 0.035, aiStrength: 1.2 },
  { id: 'business', label: 'Business & finance', salary: 64000, basis: 'Business & administration ($63,800)', growthTo30: 0.03, aiStrength: 1.3 },
  { id: 'science', label: 'Science & math', salary: 47000, basis: 'Science ($47,300)', growthTo30: 0.03, aiStrength: 1.0 },
  { id: 'social', label: 'Social sciences, education & law', salary: 50000, basis: 'Social & behavioural sciences ($50,100); education is higher ($65,400)', growthTo30: 0.025, aiStrength: 1.0 },
  { id: 'arts', label: 'Arts, media & humanities', salary: 40000, basis: 'Arts & humanities ($40,000)', growthTo30: 0.025, aiStrength: 1.3 },
  { id: 'unsure', label: 'Not sure yet', salary: 50000, basis: 'Assumption, below the all-fields bachelor’s median ($61,600)', growthTo30: 0.03, aiStrength: 1.0 },
];

export const fieldInfo = (id: FieldId | null): FieldInfo => FIELDS.find((f) => f.id === (id ?? 'unsure'))!;

export interface CityInfo {
  id: City;
  label: string;
  raiseSpent: number;
  homePrice: number;
  moveOutCost: number;
}

// raiseSpent: share of each raise that goes to higher spending.
// moveOutCost: the yearly rent someone living with family does not pay (and
// saves) until they move out.
export const CITIES: CityInfo[] = [
  { id: 'major', label: 'Toronto or Vancouver', raiseSpent: 0.85, homePrice: 850000, moveOutCost: 9000 },
  { id: 'big', label: 'Another big city', raiseSpent: 0.8, homePrice: 550000, moveOutCost: 7000 },
  { id: 'small', label: 'Smaller city or town', raiseSpent: 0.75, homePrice: 400000, moveOutCost: 5000 },
];

export const cityInfo = (id: City | null): CityInfo => CITIES.find((c) => c.id === (id ?? 'big'))!;

// Typical prices by city and home type, in today's dollars. Illustrative,
// rounded, in the range of CREA average prices; check before quoting.
export const CREA_URL = 'https://stats.crea.ca/en-CA/';
export const HOME_TYPES: { id: HomeType; label: string }[] = [
  { id: 'condo', label: 'Condo' },
  { id: 'townhouse', label: 'Townhouse' },
  { id: 'house', label: 'House' },
];
export const HOME_PRICES: Record<City, Record<HomeType, number>> = {
  major: { condo: 650000, townhouse: 950000, house: 1400000 },
  big: { condo: 400000, townhouse: 550000, house: 750000 },
  small: { condo: 300000, townhouse: 400000, house: 500000 },
};
export const homePriceFor = (city: City | null, type: HomeType): number => HOME_PRICES[city ?? 'big'][type];

export const HOME_WHEN = [
  { label: 'By 30', age: 30 },
  { label: 'By 35', age: 35 },
  { label: 'By 40', age: 40 },
  { label: 'Someday', age: 45 },
] as const;

// Canada's minimum down payment: 5% of the first $500,000, 10% of the part
// above it, and 20% of the whole price at $1.5 million or more.
export const DOWN_PAYMENT_URL = 'https://www.canada.ca/en/financial-consumer-agency/services/mortgages/down-payment.html';
export function minDownPayment(price: number): number {
  if (price >= 1500000) return 0.2 * price;
  if (price <= 500000) return 0.05 * price;
  return 25000 + 0.1 * (price - 500000);
}

export const LIVING: { id: Living; label: string }[] = [
  { id: 'family', label: 'With family' },
  { id: 'renting', label: 'Renting' },
  { id: 'own', label: 'Own place' },
];

export const DEBT_CHIPS = [
  { id: 'none', label: 'None', balance: 0 },
  { id: 'some', label: 'Some (about $15k)', balance: 15000 },
  { id: 'lots', label: 'A lot (about $35k)', balance: 35000 },
] as const;

// Real rate on student debt, illustrative. The federal part of Canada Student
// Loans is interest-free; provincial parts vary.
export const DEBT_REAL_RATE = 3;

export const FINISH_CHIPS = [
  { label: 'This year', years: 0 },
  { label: 'Next year', years: 1 },
  { label: 'In 2–3 years', years: 3 },
  { label: '4+ years', years: 4 },
] as const;

export const DEFAULT_MOVE_OUT_AGE = 25;
// Living with family saves the city's rent figure each year until moving
// out, but never more than this share of take-home pay.
export const FAMILY_RENT_SHARE = 0.25;

// Full-time pay when a student finishes, or the field salary for someone
// in a first job. Full-time workers earn a little more than starting pay.
export function fieldSalaryFor(stage: Stage, field: FieldId | null): number {
  const s = fieldInfo(field).salary;
  return stage === 'full' ? Math.round((s * 1.15) / 1000) * 1000 : s;
}

// Default inputs for a life stage (the fast start).
export function inputsForStage(stage: Stage, age: number, prev?: Inputs): Inputs {
  const s = stageInfo(stage);
  return {
    age,
    stage,
    income: s.income,
    saved: s.saved,
    monthly: s.monthly,
    plan: s.plan,
    employeePct: s.employeePct,
    matchPct: s.matchPct,
    cushionMonths: 3,
    home: prev?.home ?? null,
    debt: prev?.debt ?? null,
    field: prev?.field ?? null,
    city: prev?.city ?? null,
    living: prev?.living ?? null,
    moveOutAge: Math.max(prev?.moveOutAge ?? DEFAULT_MOVE_OUT_AGE, age + 1),
    finishAge: defaultFinishAge(age),
  };
}

// Three illustrative return settings. Middle is the default.
export interface MarketSet {
  id: AssumptionSetId;
  label: string;
  stockMean: number;
  stockVol: number;
  crashChance: number;
  bondMean: number;
}

export const MARKET_SETS: Record<AssumptionSetId, MarketSet> = {
  cautious: { id: 'cautious', label: 'Cautious', stockMean: 0.04, stockVol: 0.18, crashChance: 0.06, bondMean: 0.005 },
  middle: { id: 'middle', label: 'Middle', stockMean: 0.05, stockVol: 0.17, crashChance: 0.05, bondMean: 0.01 },
  hopeful: { id: 'hopeful', label: 'Hopeful', stockMean: 0.06, stockVol: 0.16, crashChance: 0.04, bondMean: 0.015 },
};

// Gig and contract work: no layoffs, but bumpier income and dips.
export const GIG = { wageNoise: 0.12, dipChance: 0.08, dipMonths: 3, dipIncomeShare: 0.5 };
