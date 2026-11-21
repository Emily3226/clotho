// What someone wants out of life: kids, family, travel, time off, school,
// shorter weeks. These are choices, so nobody gets them at random, and an
// empty plan changes nothing.
import type { Stage } from './types';

export type Raising = 'partner' | 'solo';

export interface LifePlan {
  kids: number;
  firstKidAge: number;
  raising: Raising;
  // Months you take off for each child.
  leaveMonths: number;
  familyMonthly: number;
  familyFromAge: number;
  care: boolean;
  careAge: number;
  travelYearly: number;
  breakMonths: number;
  breakAge: number;
  schoolYears: number;
  schoolAge: number;
  fourDay: boolean;
  fourDayAge: number;
}

export const EMPTY_LIFE: LifePlan = {
  kids: 0,
  firstKidAge: 30,
  raising: 'partner',
  leaveMonths: 6,
  familyMonthly: 0,
  familyFromAge: 30,
  care: false,
  careAge: 50,
  travelYearly: 0,
  breakMonths: 0,
  breakAge: 30,
  schoolYears: 0,
  schoolAge: 30,
  fourDay: false,
  fourDayAge: 35,
};

export const LIFE = {
  // Statistics Canada: $17,235 a year per child to 17, two-parent middle-income
  // family with two children. That includes a share of housing and transport
  // already in someone's budget, so half is counted as the added cost.
  childCostYearly: 17235,
  childAddedShare: 0.5,
  childYears: 18,
  kidGapYears: 2,
  // With a partner: costs split in half, and the partner is assumed to earn
  // the same, which is what the Canada Child Benefit is income-tested on.
  partnerShare: 0.5,
  // Canada Child Benefit, July 2026 to June 2027 (CRA T4114).
  ccbUnder6: 8157,
  ccb6to17: 6883,
  ccbLow: 38237,
  ccbHigh: 82847,
  ccbRates: [
    { low: 0.07, base: 3123, high: 0.032 },
    { low: 0.135, base: 6022, high: 0.057 },
    { low: 0.19, base: 8476, high: 0.08 },
    { low: 0.23, base: 10260, high: 0.095 },
  ],
  // EI maternity and standard parental benefits, 2026.
  eiRate: 0.55,
  eiMaxWeekly: 729,
  eiMaxInsurable: 68900,
  // Caring for a parent: about 4.6 years on average (CCCE 2024). The hours
  // and cost below are illustrative.
  careYears: 5,
  careWorkShare: 0.8,
  careYearlyCost: 2400,
  schoolYearlyCost: 8000,
  fourDayShare: 0.8,
  // Half of the lost pay comes out of lifestyle, half out of saving.
  fourDayLifestyle: 0.9,
  // A chosen cost is planned for: half comes out of other spending, up to
  // a quarter of it, and the rest out of what would have been saved.
  budgetShare: 0.5,
  trimShare: 0.25,
  costsUntilAge: 65,
} as const;

// Every start age moved to next year at the earliest, so a plan stays valid
// when the person changes their age.
export function normaliseLife(p: LifePlan, age: number): LifePlan {
  const next = (a: number) => Math.max(a, age + 1);
  return {
    ...p,
    firstKidAge: next(p.firstKidAge),
    familyFromAge: next(p.familyFromAge),
    careAge: next(p.careAge),
    breakAge: next(p.breakAge),
    schoolAge: next(p.schoolAge),
    fourDayAge: next(p.fourDayAge),
  };
}

export const hasLife = (p: LifePlan | null | undefined): p is LifePlan =>
  !!p && (p.kids > 0 || p.familyMonthly > 0 || p.care || p.travelYearly > 0 || p.breakMonths > 0 || p.schoolYears > 0 || p.fourDay);

const kidBirths = (p: LifePlan): number[] => Array.from({ length: p.kids }, (_, k) => p.firstKidAge + k * LIFE.kidGapYears);

// Canada Child Benefit for the whole family, in a year.
export function childBenefit(under6: number, older: number, familyIncome: number): number {
  const n = under6 + older;
  if (n === 0) return 0;
  const max = under6 * LIFE.ccbUnder6 + older * LIFE.ccb6to17;
  const r = LIFE.ccbRates[Math.min(n, 4) - 1];
  let cut = 0;
  if (familyIncome > LIFE.ccbHigh) cut = r.base + r.high * (familyIncome - LIFE.ccbHigh);
  else if (familyIncome > LIFE.ccbLow) cut = r.low * (familyIncome - LIFE.ccbLow);
  return Math.max(0, max - cut);
}

export function parentalBenefit(gross: number, months: number): number {
  const yearly = Math.min(LIFE.eiRate * Math.min(gross, LIFE.eiMaxInsurable), LIFE.eiMaxWeekly * 52);
  return (yearly * months) / 12;
}

export interface LifeWork {
  // Share of a normal year's pay still earned.
  workShare: number;
  // Taxable income support while away (EI parental benefits).
  benefit: number;
  // Planned time away this year (leave, a break, school).
  away: boolean;
}

// A four-day week is partly a choice to live on less, so lifestyle follows it.
export const lifestyleShare = (p: LifePlan | null, age: number): number => (p?.fourDay && age >= p.fourDayAge ? LIFE.fourDayLifestyle : 1);

export function lifeWork(p: LifePlan, age: number, gross: number, stage: Stage): LifeWork {
  let awayMonths = 0;
  let benefitMonths = 0;
  for (const b of kidBirths(p)) {
    if (age === b) {
      awayMonths += p.leaveMonths;
      benefitMonths += p.leaveMonths;
    }
  }
  if (p.breakMonths > 0 && age === p.breakAge) awayMonths += p.breakMonths;
  if (p.schoolYears > 0 && age >= p.schoolAge && age < p.schoolAge + p.schoolYears) awayMonths = 12;
  awayMonths = Math.min(12, awayMonths);
  let workShare = (12 - awayMonths) / 12;
  if (p.care && age >= p.careAge && age < p.careAge + LIFE.careYears) workShare *= LIFE.careWorkShare;
  if (p.fourDay && age >= p.fourDayAge) workShare *= LIFE.fourDayShare;
  // Gig and contract workers usually have no EI unless they opted in.
  const benefit = stage === 'gig' ? 0 : parentalBenefit(gross, Math.min(benefitMonths, awayMonths));
  return { workShare, benefit, away: awayMonths > 0 };
}

// What this year's choices cost after the Canada Child Benefit.
export function lifeCost(p: LifePlan, age: number, yearIncome: number, inSchool = false): number {
  let under6 = 0;
  let older = 0;
  for (const b of kidBirths(p)) {
    const k = age - b;
    if (k < 0 || k >= LIFE.childYears) continue;
    if (k < 6) under6++;
    else older++;
  }
  const kids = under6 + older;
  const share = p.raising === 'partner' ? LIFE.partnerShare : 1;
  const familyIncome = p.raising === 'partner' ? yearIncome * 2 : yearIncome;
  const kidCost = kids * LIFE.childCostYearly * LIFE.childAddedShare;
  const kidNet = Math.max(0, kidCost - childBenefit(under6, older, familyIncome)) * share;
  let cost = kidNet;
  // Travel and helping family start once full-time pay does.
  if (age < LIFE.costsUntilAge && !inSchool) {
    if (p.familyMonthly > 0 && age >= p.familyFromAge) cost += p.familyMonthly * 12;
    cost += p.travelYearly;
  }
  if (p.care && age >= p.careAge && age < p.careAge + LIFE.careYears) cost += LIFE.careYearlyCost;
  if (p.schoolYears > 0 && age >= p.schoolAge && age < p.schoolAge + p.schoolYears) cost += LIFE.schoolYearlyCost;
  return cost;
}

export type LifeEventType = 'kid' | 'lifeBreak' | 'lifeSchool' | 'lifeCare' | 'lifeFourDay';

// The chosen moments that show up in a life's timeline.
export function lifeEvents(p: LifePlan, age: number): { type: LifeEventType; value?: number }[] {
  const out: { type: LifeEventType; value?: number }[] = [];
  kidBirths(p).forEach((b, k) => {
    if (age === b) out.push({ type: 'kid', value: k + 1 });
  });
  if (p.breakMonths > 0 && age === p.breakAge) out.push({ type: 'lifeBreak', value: p.breakMonths });
  if (p.schoolYears > 0 && age === p.schoolAge) out.push({ type: 'lifeSchool', value: p.schoolYears });
  if (p.care && age === p.careAge) out.push({ type: 'lifeCare' });
  if (p.fourDay && age === p.fourDayAge) out.push({ type: 'lifeFourDay' });
  return out;
}
