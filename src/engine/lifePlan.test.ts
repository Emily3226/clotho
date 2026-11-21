import { describe, expect, it } from 'vitest';
import { EMPTY_LIFE, LIFE, childBenefit, hasLife, lifeCost, lifeWork, normaliseLife, parentalBenefit, type LifePlan } from './lifePlan';
import { DEFAULT_INPUTS, PERSONAS } from './personas';
import { simulate, summarise } from './simulate';
import { LEVER_IDS, NO_LEVERS, leverOnly, type Inputs } from './types';

const SEED = 2026;
const people: Inputs[] = [DEFAULT_INPUTS, ...PERSONAS.map((p) => p.inputs)];
const inControl = (i: Inputs, life: Partial<LifePlan> | null, levers = NO_LEVERS) =>
  summarise(simulate({ ...i, life: life ? { ...EMPTY_LIFE, ...life } : null }, {}, levers, SEED, { detail: false })).counts[0];

const CHOICES: Partial<LifePlan>[] = [
  { kids: 1 },
  { kids: 2 },
  { kids: 2, raising: 'solo' },
  { familyMonthly: 250 },
  { care: true },
  { travelYearly: 3000 },
  { breakMonths: 6 },
  { schoolYears: 1 },
  { fourDay: true },
];

describe('what you want in life', () => {
  it('changes nothing when every choice is left at zero', () => {
    for (const i of people) {
      const a = simulate({ ...i, life: null }, {}, NO_LEVERS, SEED);
      const b = simulate({ ...i, life: EMPTY_LIFE }, {}, NO_LEVERS, SEED);
      expect(hasLife(EMPTY_LIFE)).toBe(false);
      expect(b.map((p) => [p.status, p.final])).toEqual(a.map((p) => [p.status, p.final]));
    }
  });

  it('uses the published Canada Child Benefit formula', () => {
    expect(childBenefit(1, 0, 30000)).toBe(8157);
    expect(childBenefit(0, 1, 38237)).toBe(6883);
    expect(childBenefit(1, 0, 60000)).toBeCloseTo(8157 - 0.07 * (60000 - 38237), 2);
    expect(childBenefit(1, 1, 100000)).toBeCloseTo(8157 + 6883 - (6022 + 0.057 * (100000 - 82847)), 2);
    expect(childBenefit(0, 0, 30000)).toBe(0);
    expect(childBenefit(1, 0, 500000)).toBe(0);
  });

  it('caps EI parental benefits at the 2026 maximum', () => {
    expect(parentalBenefit(40000, 12)).toBeCloseTo(22000, 2);
    expect(parentalBenefit(150000, 12)).toBeCloseTo(0.55 * 68900, 2);
    expect(parentalBenefit(150000, 12)).toBeLessThanOrEqual(729 * 52);
    expect(parentalBenefit(40000, 6)).toBeCloseTo(11000, 2);
    expect(lifeWork({ ...EMPTY_LIFE, kids: 1, firstKidAge: 30 }, 30, 40000, 'gig').benefit).toBe(0);
  });

  it('splits child costs with a partner and stops them at 18', () => {
    const p = { ...EMPTY_LIFE, kids: 1, firstKidAge: 30 };
    const income = 200000;
    expect(lifeCost({ ...p, raising: 'solo' }, 30, income)).toBeCloseTo(LIFE.childCostYearly * LIFE.childAddedShare - childBenefit(1, 0, income), 2);
    expect(lifeCost(p, 30, income)).toBeCloseTo(LIFE.childCostYearly * LIFE.childAddedShare * LIFE.partnerShare, 2);
    expect(lifeCost(p, 29, income)).toBe(0);
    expect(lifeCost(p, 47, income)).toBeGreaterThan(0);
    expect(lifeCost(p, 48, income)).toBe(0);
  });

  it('keeps every start age in the future when age changes', () => {
    const n = normaliseLife({ ...EMPTY_LIFE, firstKidAge: 25, breakAge: 20 }, 30);
    expect(n.firstKidAge).toBe(31);
    expect(n.breakAge).toBe(31);
  });

  it('never makes a future look better by choosing something that costs money or time', () => {
    for (const i of people) {
      const base = inControl(i, null);
      for (const c of CHOICES) expect(inControl(i, c)).toBeLessThanOrEqual(base);
    }
  }, 30000);

  it('costs more with more kids', () => {
    for (const i of people) {
      let last = inControl(i, null);
      for (const kids of [1, 2, 3]) {
        const n = inControl(i, { kids });
        expect(n).toBeLessThanOrEqual(last);
        last = n;
      }
    }
  }, 30000);

  it('still lets more saving and every habit help, whatever is chosen', () => {
    for (const i of people.slice(0, 3)) {
      for (const c of CHOICES) {
        const base = inControl(i, c);
        expect(inControl({ ...i, monthly: i.monthly + 200 }, c)).toBeGreaterThanOrEqual(base);
        for (const id of LEVER_IDS) expect(inControl(i, c, leverOnly(id))).toBeGreaterThanOrEqual(base);
      }
    }
  }, 60000);

  it('keeps balances valid and puts the choices in the timeline', () => {
    const i = { ...people[1], life: { ...EMPTY_LIFE, kids: 2, firstKidAge: 30, breakMonths: 6, breakAge: 35, schoolYears: 1, schoolAge: 40, care: true, careAge: 50, fourDay: true, fourDayAge: 55 } };
    const res = simulate(i, {}, NO_LEVERS, SEED);
    for (const p of res) expect(p.minBalance).toBeGreaterThanOrEqual(-0.01);
    const types = res[0].events.map((e) => e.type);
    for (const t of ['kid', 'lifeBreak', 'lifeSchool', 'lifeCare', 'lifeFourDay'] as const) expect(types).toContain(t);
    expect(res[0].events.filter((e) => e.type === 'kid').map((e) => e.age)).toEqual([30, 32]);
  });

  it('does not treat planned time away as a shock', () => {
    const i: Inputs = { ...people[1], saved: 0, monthly: 0, life: { ...EMPTY_LIFE, breakMonths: 3, breakAge: people[1].age + 1 } };
    const calm = simulate(i, {}, NO_LEVERS, SEED, { calm: true, paths: 1, detail: true })[0];
    expect(calm.milestones.shockProof).toBe(true);
    expect(calm.events.some((e) => e.type === 'raid')).toBe(false);
  });
});
