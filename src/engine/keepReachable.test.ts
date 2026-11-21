import { describe, expect, it } from 'vitest';
import { canKeepReachable, keepReachable } from './keepReachable';
import { persona, PERSONAS } from './personas';
import { inputsForStage } from './profile';
import { simulate } from './simulate';
import { NO_LEVERS, leverOnly, type Inputs } from './types';
import { keepReachableAnswer } from '../lib/copy';

const SEED = 2026;
const planned: Inputs = { ...inputsForStage('first', 26), plan: 'yes', employeePct: 4, matchPct: 4, monthly: 50, debt: null, home: null, goals: [] };

describe('keep yours reachable', () => {
  it('is only offered with a plan that has or may have a match', () => {
    expect(canKeepReachable(persona('jordan').inputs)).toBe(true);
    expect(canKeepReachable(persona('maya').inputs)).toBe(false);
    expect(canKeepReachable({ ...planned, matchPct: 0 })).toBe(false);
  });

  it('changes nothing unless it is asked for', () => {
    for (const p of PERSONAS) {
      const a = simulate(p.inputs, {}, leverOnly('match'), SEED, { detail: false });
      const b = simulate(p.inputs, {}, leverOnly('match'), SEED, { detail: false, keepReachable: false });
      expect(b.map((x) => [x.status, x.final])).toEqual(a.map((x) => [x.status, x.final]));
    }
  });

  it('keeps the match in the plan and moves your share within reach', () => {
    const opts = { calm: true, paths: 1, detail: true, trace: true } as const;
    const [plan] = simulate(planned, {}, NO_LEVERS, SEED, opts);
    const [split] = simulate(planned, {}, NO_LEVERS, SEED, { ...opts, keepReachable: true });
    // With a 4% contribution and a 4% match, the plan holds half as much.
    expect(split.trace!.plan[1] / plan.trace!.plan[1]).toBeCloseTo(0.5, 2);
    expect(split.trace!.flex[1]).toBeGreaterThan(plan.trace!.flex[1]);
  });

  it('means no more early withdrawals from the retirement plan', () => {
    for (const inputs of [planned, persona('jordan').inputs]) {
      const r = keepReachable(inputs, NO_LEVERS, SEED, 'middle', { ai: 'moderate' });
      expect(r.dipped.split).toBeLessThanOrEqual(r.dipped.plan);
    }
  });

  it('is honest about the trade: less at 65 after tax', () => {
    const r = keepReachable(persona('jordan').inputs, NO_LEVERS, SEED);
    expect(r.at65.split).toBeLessThan(r.at65.plan);
  });

  it('says so when the plan alone comes out ahead', () => {
    const r = keepReachable(persona('jordan').inputs, NO_LEVERS, SEED);
    expect(keepReachableAnswer({ ...r, inControl: { plan: 900, split: 850 } }).plain).toMatch(/comes out ahead/);
    const b = keepReachableAnswer({ ...r, inControl: { plan: 850, split: 900 } });
    expect(b.plain).not.toMatch(/comes out ahead/);
    expect(b.plain).not.toMatch(/behind|should have|too late|at risk|danger|doom/i);
  });
});
