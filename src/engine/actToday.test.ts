import { describe, expect, it } from 'vitest';
import { Engine, grownAmount, leverAvailable } from './analyse';
import { DEFAULT_INPUTS, PERSONAS } from './personas';
import { simulate, summarise } from './simulate';
import { NO_LEVERS, leverOnly, type Inputs } from './types';
import { leverCostLine } from '../lib/copy';

const SEED = 2026;
const withPlan: Inputs = { ...DEFAULT_INPUTS, plan: 'yes', employeePct: 2, matchPct: 4 };
const inControl = (i: Inputs, l = NO_LEVERS) => summarise(simulate(i, {}, l, SEED, { detail: false })).counts[0];

describe('+1% to your plan today', () => {
  it('is offered only to people who have a workplace plan', () => {
    expect(leverAvailable('plus1', withPlan)).toBe(true);
    expect(leverAvailable('plus1', { ...withPlan, plan: 'unsure' })).toBe(false);
    expect(leverAvailable('plus1', { ...withPlan, plan: 'no' })).toBe(false);
    for (const p of PERSONAS) if (p.inputs.plan !== 'yes') expect(new Engine().analyse(p.inputs, {}, {}, NO_LEVERS, SEED).ranking.some((r) => r.id === 'plus1')).toBe(false);
  });

  it('never lowers the count, and changes nothing without a plan', () => {
    expect(inControl(withPlan, leverOnly('plus1'))).toBeGreaterThanOrEqual(inControl(withPlan));
    const noPlan = { ...withPlan, plan: 'no' as const };
    expect(inControl(noPlan, leverOnly('plus1'))).toBe(inControl(noPlan));
  });

  it('puts more in the workplace plan, and the employer matches it below the match', () => {
    const opts = { calm: true, paths: 1, detail: false, trace: true } as const;
    const [plain] = simulate(withPlan, {}, NO_LEVERS, SEED, opts);
    const [plus] = simulate(withPlan, {}, leverOnly('plus1'), SEED, opts);
    const y = 5;
    const added = plus.trace!.plan[y] - plain.trace!.plan[y];
    // Five years of 1% of pay, plus at least as much again from the match.
    expect(added).toBeGreaterThan(2 * 5 * 0.01 * withPlan.income);
  });
});

describe('saving part of every raise, honestly', () => {
  it('can’t start today, and says what it grows to', () => {
    for (const p of PERSONAS) {
      const a = new Engine().analyse(p.inputs, {}, {}, NO_LEVERS, SEED);
      const r = a.ranking.find((x) => x.id === 'raises')!;
      expect(r.startsLater).toBe(true);
      expect(r.grownByAge).toBe(Math.max(35, p.inputs.age + 5));
      expect(r.grownPerMonth).toBeGreaterThan(r.costPerMonth);
      expect(leverCostLine(r)).toMatch(/^\$0 today\. Grows to about \$[\d,]+ a month by \d+$/);
      for (const other of a.ranking.filter((x) => x.id !== 'raises')) expect(other.startsLater).toBe(false);
    }
  });

  it('reports the amount the habit really sets aside on a calm path', () => {
    const maya = PERSONAS[0].inputs;
    const g = grownAmount(maya, SEED, 'middle');
    const [p] = simulate(maya, {}, leverOnly('raises'), SEED, { calm: true, paths: 1, detail: false, trace: true });
    expect(g.perMonth).toBeCloseTo(p.trace!.extra[g.age - maya.age] / 12, -1);
  });
});
