import { describe, expect, it } from 'vitest';
import { PERSONAS } from './personas';
import { compareWithdrawal, grossUp, PAY_FROM, withholdingRate } from './plannedWithdrawal';
import { inputsForStage } from './profile';
import { simulate } from './simulate';
import { NO_LEVERS, leverOnly, type PathResult } from './types';

const SEED = 2026;
// Full-time with a workplace plan: 3% in, 4% matched.
const worker = inputsForStage('full', 26);
const shape = (paths: PathResult[]) => paths.map((p) => [p.status, Math.round(p.final), Math.round(p.at65Net)].join(':'));

describe('planned withdrawal: off by default', () => {
  it('changes nothing unless asked for', () => {
    for (const p of [...PERSONAS.map((x) => x.inputs), worker]) {
      const base = shape(simulate(p, {}, NO_LEVERS, SEED, { detail: false }));
      for (const from of PAY_FROM) {
        const none = simulate(p, {}, NO_LEVERS, SEED, { detail: false, withdrawal: { amount: 0, age: p.age + 3, from } });
        expect(shape(none)).toEqual(base);
      }
    }
  });
});

describe('planned withdrawal: tax', () => {
  it('grosses up by the marginal rate, checked by hand', () => {
    // At $50,000 the table gives 18% (tax $9,000); at $49,500 it gives
    // 12% + 6% x 19,500/20,000 = 17.85% (tax $8,835.75). Marginal rate:
    // (9,000 - 8,835.75) / 500 = 32.85%. So $3,000 in hand needs
    // 3,000 / (1 - 0.3285) = $4,467.61 out of the plan, $1,467.61 of it tax.
    const { gross, tax } = grossUp(3000, 50000);
    expect(gross).toBeCloseTo(4467.61, 1);
    expect(tax).toBeCloseTo(1467.61, 1);
  });

  it('uses CRA withholding bands, which are only a prepayment', () => {
    expect(withholdingRate(3000)).toBe(0.1);
    expect(withholdingRate(5000)).toBe(0.1);
    expect(withholdingRate(5001)).toBe(0.2);
    expect(withholdingRate(15000)).toBe(0.2);
    expect(withholdingRate(15001)).toBe(0.3);
  });
});

describe('planned withdrawal: three ways to pay', () => {
  it('keeps the same luck in every option', () => {
    const luck = (from: 'plan' | 'reachable' | 'saveFirst') =>
      simulate(worker, {}, leverOnly('match'), SEED, { withdrawal: { amount: 3000, age: 29, from } }).map((p) =>
        // Before 65: after that, a life that stopped working shows no layoffs.
        p.events.filter((e) => (e.type === 'job' || e.type === 'crash') && e.age < 65).map((e) => `${e.age}${e.type}${e.value}`).join(','),
      );
    const plan = luck('plan');
    expect(luck('reachable')).toEqual(plan);
    expect(luck('saveFirst')).toEqual(plan);
  });

  it('takes more than the amount out of the plan, and costs more at 65 than reachable savings', () => {
    const c = compareWithdrawal(worker, leverOnly('match'), 3000, 29, SEED);
    expect(c.plan.lives).toBeGreaterThan(0);
    expect(c.plan.gross).toBeGreaterThan(3000);
    expect(c.plan.tax).toBeGreaterThan(0);
    expect(c.plan.withheld).toBeCloseTo(c.plan.gross * 0.1, 6);
    const at = (from: string) => c.options.find((o) => o.from === from)!.at65;
    expect(at('plan')).toBeLessThan(at('reachable'));
  });

  it('copes when the plan holds less than asked, and never goes negative', () => {
    const small = { ...worker, employeePct: 1, matchPct: 1 };
    for (const from of PAY_FROM) {
      for (const p of simulate(small, {}, NO_LEVERS, SEED, { withdrawal: { amount: 40000, age: 28, from } })) {
        expect(p.minBalance).toBeGreaterThanOrEqual(-0.01);
        expect(Math.min(...p.balances!)).toBeGreaterThanOrEqual(0);
      }
    }
    const c = compareWithdrawal(small, NO_LEVERS, 40000, 28, SEED);
    expect(c.planShort).toBeGreaterThan(0);
  });
});
