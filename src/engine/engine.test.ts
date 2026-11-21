import { describe, expect, it } from 'vitest';
import { Engine } from './analyse';
import { A, stockShareAt } from './assumptions';
import { PERSONAS } from './personas';
import { simulate, summarise } from './simulate';
import { LEVER_IDS, NO_LEVERS, WORRY_IDS, leverOnly, type Inputs, type Levers, type PathResult, type Scenario } from './types';

const SEED = 2026;
const maya = PERSONAS[0].inputs;
const inControl = (inputs: Inputs, s: Scenario = {}, l: Levers = NO_LEVERS) =>
  summarise(simulate(inputs, s, l, SEED, { detail: false })).counts[0];
const harshness = (paths: PathResult[]) => paths.reduce((sum, p) => sum + p.status, 0);
// Luck is compared while everyone is still working: after 65 a path only
// shows job events if that life has not yet reached work-optional.
const luck = (paths: PathResult[], types: string[]) =>
  paths.map((p) => p.events.filter((e) => types.includes(e.type) && (e.type !== 'job' || e.age < A.retireAge)).map((e) => `${e.age}:${e.type}:${e.value}`).join('|'));

describe('determinism', () => {
  it('gives identical output for the same inputs and seed', () => {
    const a = simulate(maya, { ai: 'moderate' }, leverOnly('match'), SEED);
    const b = simulate(maya, { ai: 'moderate' }, leverOnly('match'), SEED);
    expect(a.map((p) => p.status)).toEqual(b.map((p) => p.status));
    expect(a.map((p) => p.final)).toEqual(b.map((p) => p.final));
    expect(Array.from(a[17].balances!)).toEqual(Array.from(b[17].balances!));
    expect(a[17].events).toEqual(b[17].events);
  });

  it('gives different futures for a different seed', () => {
    const a = simulate(maya, {}, NO_LEVERS, SEED);
    const b = simulate(maya, {}, NO_LEVERS, SEED + 1);
    expect(a.map((p) => p.final)).not.toEqual(b.map((p) => p.final));
  });
});

describe('common random numbers', () => {
  const base = simulate(maya, {}, NO_LEVERS, SEED);

  it('keeps market and job-loss luck identical across levers', () => {
    const want = luck(base, ['job', 'crash']);
    for (const id of LEVER_IDS) {
      expect(luck(simulate(maya, {}, leverOnly(id), SEED), ['job', 'crash'])).toEqual(want);
    }
    expect(luck(simulate(maya, {}, { ...NO_LEVERS, delay: 5 }, SEED), ['job', 'crash'])).toEqual(want);
  });

  it('keeps luck identical across scenarios that do not change it', () => {
    const want = luck(base, ['job', 'crash']);
    for (const s of [{ pensions: 'severe' }, { costs: 'severe' }, { home: 'severe' }] as Scenario[]) {
      expect(luck(simulate(maya, s, NO_LEVERS, SEED), ['job', 'crash'])).toEqual(want);
    }
    // A worry that raises job-loss chance only ever adds layoffs to the same paths.
    const ai = simulate(maya, { ai: 'moderate' }, NO_LEVERS, SEED);
    base.forEach((p, i) => {
      const before = p.events.filter((e) => e.type === 'job').length;
      const after = ai[i].events.filter((e) => e.type === 'job').length;
      if (before > 0) expect(after).toBeGreaterThan(0);
    });
    expect(luck(ai, ['crash'])).toEqual(luck(base, ['crash']));
  });
});

describe('monotonicity', () => {
  it('more saving never lowers the count of futures in control', () => {
    for (const persona of PERSONAS) {
      let last = -1;
      for (const perPaycheque of [0, 25, 50, 100, 200, 400]) {
        const n = inControl({ ...persona.inputs, perPaycheque });
        expect(n).toBeGreaterThanOrEqual(last);
        last = n;
      }
      const base = inControl(persona.inputs);
      let prev = base;
      for (const auto of [25, 50, 100] as const) {
        const n = inControl(persona.inputs, {}, { ...NO_LEVERS, auto });
        expect(n).toBeGreaterThanOrEqual(prev);
        prev = n;
      }
      for (const id of LEVER_IDS) expect(inControl(persona.inputs, {}, leverOnly(id))).toBeGreaterThanOrEqual(base);
      expect(inControl(persona.inputs, {}, { ...NO_LEVERS, delay: 5 })).toBeLessThanOrEqual(base);
    }
  });
});

describe('limits', () => {
  const rich: Inputs = {
    age: 30,
    income: 220000,
    saved: 150000,
    perPaycheque: 2500,
    plan: 'yes',
    employeePct: 12,
    matchPct: 10,
    cushionMonths: 3,
    home: { price: 900000, byAge: 40 },
    debt: { balance: 30000, rate: 6 },
  };
  const cases: [Inputs, Scenario, Levers][] = [
    ...PERSONAS.map((p): [Inputs, Scenario, Levers] => [p.inputs, {}, NO_LEVERS]),
    [maya, { ai: 'severe', recession: 'severe', world: 'severe', home: 'severe' }, { match: true, auto: 100, raises: true, cushion: true, delay: 0 }],
    [rich, {}, { match: true, auto: 100, raises: true, cushion: true, delay: 0 }],
    [rich, { recession: 'severe', ai: 'severe' }, NO_LEVERS],
  ];

  it('never exceeds TFSA, FHSA or RRSP room, and balances never go negative', () => {
    for (const [inputs, s, l] of cases) {
      for (const p of simulate(inputs, s, l, SEED)) {
        expect(p.peakTfsaOver).toBeLessThanOrEqual(0.01);
        expect(p.peakFhsaYear).toBeLessThanOrEqual(A.fhsaAnnual + 0.01);
        expect(p.peakFhsaLifetime).toBeLessThanOrEqual(A.fhsaLifetime + 0.01);
        expect(p.peakRrspOver).toBeLessThanOrEqual(0.01);
        expect(p.minBalance).toBeGreaterThanOrEqual(-0.01);
        expect(Math.min(...p.balances!)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('sanity', () => {
  it('reproduces hand-calculated compound growth with no volatility and no shocks', () => {
    const inputs: Inputs = {
      age: 50,
      income: 60000,
      saved: 0,
      perPaycheque: 100,
      plan: 'no',
      employeePct: 0,
      matchPct: 0,
      cushionMonths: 0,
      home: null,
      debt: null,
    };
    const [p] = simulate(inputs, {}, NO_LEVERS, SEED, { calm: true, paths: 1 });
    // Returns are earned on the opening balance; $2,600 is added at year end.
    let expected = 0;
    for (let age = 50; age < 60; age++) {
      const w = stockShareAt(age);
      const r = w * 0.05 + (1 - w) * 0.01 - 0.0075;
      expected = expected * (1 + r) + 100 * 26;
    }
    expect(p.balances![10]).toBeCloseTo(expected, 0);
    expect(expected).toBeGreaterThan(26000);
    expect(p.events.filter((e) => e.type === 'job' || e.type === 'crash')).toHaveLength(0);
  });
});

describe('worries', () => {
  it('severe is at least as harsh as moderate, which is at least as harsh as mild', () => {
    for (const persona of PERSONAS) {
      const base = simulate(persona.inputs, {}, NO_LEVERS, SEED, { detail: false });
      for (const id of WORRY_IDS) {
        const mild = simulate(persona.inputs, { [id]: 'mild' }, NO_LEVERS, SEED, { detail: false });
        const moderate = simulate(persona.inputs, { [id]: 'moderate' }, NO_LEVERS, SEED, { detail: false });
        const severe = simulate(persona.inputs, { [id]: 'severe' }, NO_LEVERS, SEED, { detail: false });
        expect(harshness(mild)).toBeGreaterThanOrEqual(harshness(base));
        expect(harshness(moderate)).toBeGreaterThanOrEqual(harshness(mild));
        expect(harshness(severe)).toBeGreaterThanOrEqual(harshness(moderate));
        expect(summarise(moderate).counts[0]).toBeLessThanOrEqual(summarise(mild).counts[0]);
        expect(summarise(severe).counts[0]).toBeLessThanOrEqual(summarise(moderate).counts[0]);
      }
    }
  });

  it('sizes every worry and names a protection', () => {
    const all: Scenario = Object.fromEntries(WORRY_IDS.map((id) => [id, 'moderate']));
    for (const persona of PERSONAS) {
      const a = new Engine().analyse(persona.inputs, all, {}, NO_LEVERS, SEED);
      expect(a.cards).toHaveLength(WORRY_IDS.length + 1);
      for (const card of a.cards) {
        expect(card.affected).toBeGreaterThan(0);
        expect(card.recovered).toBeLessThanOrEqual(card.affected);
        expect(card.best).not.toBeNull();
        expect(card.best!.protects).toBeLessThanOrEqual(card.affected);
        expect(card.mask.reduce((s, v) => s + v, 0)).toBe(card.affected);
      }
    }
  }, 30000);
});

describe('levers', () => {
  it('ranks levers and puts the HR question first when the plan is unknown', () => {
    const a = new Engine().analyse({ ...maya, plan: 'unsure' }, {}, {}, NO_LEVERS, SEED);
    expect(a.ranking[0].id).toBe('match');
    expect(a.ranking[0].askHR).toBe(true);
    expect(a.yearlyMatch).toBeCloseTo(0.04 * maya.income, 6);
    const rest = a.ranking.slice(1);
    for (let i = 1; i < rest.length; i++) expect(rest[i - 1].perDollar).toBeGreaterThanOrEqual(rest[i].perDollar);
  });

  it('shows that waiting five years costs futures', () => {
    for (const persona of PERSONAS) {
      const a = new Engine().analyse(persona.inputs, {}, {}, NO_LEVERS, SEED);
      expect(a.waiting.inControl).toBeLessThan(a.summary.counts[0]);
    }
  });
});

describe('performance', () => {
  it('runs 1,000 paths for six lever variants quickly', () => {
    simulate(maya, {}, NO_LEVERS, SEED, { detail: false }); // warm up and draw the random numbers
    const t0 = performance.now();
    for (const id of LEVER_IDS) simulate(maya, {}, leverOnly(id), SEED, { detail: false });
    const ms = performance.now() - t0;
    console.log(`6 lever variants x 1,000 paths: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(1500);
  });
});

describe('personas', () => {
  it('gives plausible, different headlines', () => {
    const counts = PERSONAS.map((p) => inControl(p.inputs));
    for (const n of counts) {
      expect(n).toBeGreaterThan(50);
      expect(n).toBeLessThan(950);
    }
    expect(new Set(counts).size).toBe(PERSONAS.length);
  });
});
