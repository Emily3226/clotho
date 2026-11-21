import { describe, expect, it } from 'vitest';
import { A } from './assumptions';
import { EMPTY_LIFE } from './lifePlan';
import { CUT_AGES, cutAgesFor, defaultCutAge, ifCutShort } from './noSixtyFive';
import { PERSONAS } from './personas';
import { simulate } from './simulate';
import { LEVER_IDS, NO_LEVERS, leverOnly, type Inputs } from './types';
import { noSixtyFiveAnswer } from '../lib/copy';

const SEED = 2026;
const simple: Inputs = { ...PERSONAS[1].inputs, age: 25, plan: 'no', employeePct: 0, matchPct: 0, debt: null, home: null, goals: [], saved: 0, monthly: 300, cushionMonths: 0 };

describe('what if there is no 65', () => {
  it('only offers ages still ahead, and always has a default', () => {
    expect(cutAgesFor(22)).toEqual([...CUT_AGES]);
    expect(cutAgesFor(35)).toEqual([40, 50]);
    for (let age = 18; age <= 35; age++) expect(cutAgesFor(age)).toContain(defaultCutAge(age));
  });

  it('does not change any result by measuring it', () => {
    for (const p of PERSONAS) {
      const a = simulate(p.inputs, {}, leverOnly('auto50'), SEED, { detail: false });
      const b = simulate(p.inputs, {}, leverOnly('auto50'), SEED, { detail: false, cutAge: 40 });
      expect(b.map((x) => [x.status, x.final])).toEqual(a.map((x) => [x.status, x.final]));
    }
  });

  it('matches a hand check with no luck: $25 a month is $300 a year given up, and it grows', () => {
    const opts = { calm: true, paths: 1, detail: false, cutAge: 35 } as const;
    const [plain] = simulate(simple, {}, NO_LEVERS, SEED, opts);
    const [habit] = simulate(simple, {}, leverOnly('auto25'), SEED, opts);
    expect(plain.atCut!.lived - habit.atCut!.lived).toBeCloseTo(300 * 10, 0);
    const gained = habit.atCut!.yours - plain.atCut!.yours;
    expect(gained).toBeGreaterThan(3000);
    expect(gained).toBeLessThan(3000 * 1.3);
  });

  it('counts the workplace plan after the tax on taking it out', () => {
    const inputs: Inputs = { ...simple, monthly: 0, plan: 'yes', employeePct: 5, matchPct: 0 };
    const [p] = simulate(inputs, {}, NO_LEVERS, SEED, { calm: true, paths: 1, detail: true, cutAge: 35, trace: true });
    const t = p.trace!;
    expect(p.atCut!.yours).toBeCloseTo(t.cushion[10] + t.flex[10] + (1 - A.raidTax) * t.plan[10], 0);
  });

  it('keeps a home or goal as yours rather than treating it as lost', () => {
    const goal = { id: 'g', label: 'x', kind: 'other' as const, cost: 5000, byAge: 32 };
    const opts = { calm: true, paths: 1, detail: false, cutAge: 35 } as const;
    const [plain] = simulate(simple, {}, NO_LEVERS, SEED, opts);
    const [paid] = simulate({ ...simple, monthly: 900, goals: [goal] }, {}, NO_LEVERS, SEED, opts);
    const [unpaid] = simulate({ ...simple, monthly: 900 }, {}, NO_LEVERS, SEED, opts);
    expect(paid.milestones.goals[0]).toBe(true);
    expect(paid.atCut!.yours).toBeGreaterThan(unpaid.atCut!.yours - 2500);
    expect(unpaid.atCut!.yours).toBeGreaterThan(plain.atCut!.yours);
  });

  it('shows the employer match paying back more than it costs in nearly every future', () => {
    const inputs: Inputs = { ...simple, plan: 'yes', employeePct: 0, matchPct: 4 };
    const r = ifCutShort(inputs, leverOnly('match'), 40, SEED);
    expect(r.ahead).toBeGreaterThan(900);
    expect(r.withHabit).toBeGreaterThan(r.without);
  });

  it('is honest for every habit and person: some futures can come back short', () => {
    for (const p of PERSONAS) {
      for (const id of LEVER_IDS) {
        const r = ifCutShort(p.inputs, leverOnly(id), defaultCutAge(p.inputs.age), SEED);
        expect(r.total).toBe(1000);
        expect(r.ahead).toBeGreaterThanOrEqual(0);
        expect(r.ahead).toBeLessThanOrEqual(1000);
        expect(r.gaveUp).toBeGreaterThanOrEqual(0);
      }
    }
  }, 30000);

  it('counts what a habit gives up correctly alongside kids and planned time off', () => {
    const life = { ...EMPTY_LIFE, kids: 1, firstKidAge: 27, breakMonths: 6, breakAge: 30 };
    const inputs: Inputs = { ...simple, monthly: 200, life };
    const opts = { calm: true, paths: 1, detail: false, cutAge: 35 } as const;
    const [plain] = simulate(inputs, {}, NO_LEVERS, SEED, opts);
    const [habit] = simulate(inputs, {}, leverOnly('auto100'), SEED, opts);
    const gaveUp = plain.atCut!.lived - habit.atCut!.lived;
    expect(gaveUp).toBeGreaterThan(0);
    expect(gaveUp).toBeLessThanOrEqual(1200 * 10 + 0.01);
    // No plan and no match here: what you gain is what you gave up, plus growth.
    expect(habit.atCut!.yours - plain.atCut!.yours).toBeGreaterThanOrEqual(gaveUp - 0.01);
  });

  it('counts a chosen cost as lived, not as money that vanished', () => {
    const opts = { calm: true, paths: 1, detail: false, cutAge: 35 } as const;
    const [none] = simulate({ ...simple, monthly: 500 }, {}, NO_LEVERS, SEED, opts);
    const [travel] = simulate({ ...simple, monthly: 500, life: { ...EMPTY_LIFE, travelYearly: 2000 } }, {}, NO_LEVERS, SEED, opts);
    expect(travel.atCut!.lived).toBeGreaterThan(none.atCut!.lived - 1);
    expect(travel.atCut!.yours).toBeLessThan(none.atCut!.yours);
  });

  it('never uses wording that scares or shames, and states only computed numbers', () => {
    const r = ifCutShort(PERSONAS[0].inputs, leverOnly('raises'), 40, SEED);
    const text = noSixtyFiveAnswer(r, 'Saving part of every raise').plain;
    expect(text).not.toMatch(/behind|should have|too late|at risk|danger|doom|extinct/i);
    expect(text).toContain(r.ahead.toLocaleString('en-CA'));
    expect(text).toContain('at 40');
  });
});
