import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Engine, rescueOf } from './analyse';
import { A, stockShareAt } from './assumptions';
import { PERSONAS, persona } from './personas';
import { matchGoal } from './goals';
import { inputsForStage, minDownPayment } from './profile';
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
      for (const monthly of [0, 25, 50, 100, 200, 400]) {
        const n = inControl({ ...persona.inputs, monthly });
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
    ...inputsForStage('full', 30),
    income: 220000,
    saved: 150000,
    monthly: 5400,
    plan: 'yes',
    employeePct: 12,
    matchPct: 10,
    home: { price: 900000, byAge: 40 },
    debt: { balance: 30000, rate: 6 },
    city: 'major',
    living: 'family',
    moveOutAge: 33,
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
      ...inputsForStage('full', 50),
      income: 60000,
      saved: 0,
      monthly: 200,
      plan: 'no',
      employeePct: 0,
      matchPct: 0,
      cushionMonths: 0,
    };
    const [p] = simulate(inputs, {}, NO_LEVERS, SEED, { calm: true, paths: 1 });
    // Returns are earned on the opening balance; $2,400 is added at year end.
    let expected = 0;
    for (let age = 50; age < 60; age++) {
      const w = stockShareAt(age);
      const r = w * 0.05 + (1 - w) * 0.01 - 0.0075;
      expected = expected * (1 + r) + 200 * 12;
    }
    expect(p.balances![10]).toBeCloseTo(expected, 0);
    expect(expected).toBeGreaterThan(24000);
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
      const a = new Engine().analyse(persona.inputs, all, {}, NO_LEVERS, SEED, 'middle', true);
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
  it('gives plausible, different headlines, each with a habit that rescues 50 or more', () => {
    const counts = PERSONAS.map((p) => inControl(p.inputs));
    for (const n of counts) {
      expect(n).toBeGreaterThan(25);
      expect(n).toBeLessThan(950);
    }
    expect(new Set(counts).size).toBe(PERSONAS.length);
    for (const p of PERSONAS) {
      const a = new Engine().analyse(p.inputs, {}, {}, NO_LEVERS, SEED);
      expect(Math.max(...a.ranking.map((r) => r.rescued))).toBeGreaterThanOrEqual(50);
    }
  }, 30000);

  it('gives two students of the same age different futures', () => {
    const maya = persona('maya').inputs;
    const priya = persona('priya').inputs;
    expect(maya.age).toBe(priya.age);
    expect(Math.abs(inControl(maya) - inControl(priya))).toBeGreaterThanOrEqual(50);
  });
});

describe('make it more you', () => {
  it('each of the five questions changes the count for at least one persona', () => {
    const changes: [string, (i: Inputs) => Inputs][] = [
      ['field', (i) => ({ ...i, field: i.field === 'health' ? 'arts' : 'health' })],
      ['city', (i) => ({ ...i, city: i.city === 'major' ? 'small' : 'major' })],
      ['living', (i) => ({ ...i, living: i.living === 'family' ? 'renting' : 'family', moveOutAge: i.age + 3 })],
      ['debt', (i) => ({ ...i, debt: i.debt ? null : { balance: 35000, rate: 5 } })],
      ['finish', (i) => ({ ...i, finishAge: i.finishAge + 3 })],
    ];
    for (const [name, change] of changes) {
      const moved = PERSONAS.some((p) => inControl(change(p.inputs)) !== inControl(p.inputs));
      expect(moved, name).toBe(true);
    }
  });

  it('matches goals typed in your own words to a kind, offline', () => {
    expect(matchGoal('a trip to Japan')).toBe('travel');
    expect(matchGoal('Buy a car')).toBe('car');
    expect(matchGoal('grad school in Montreal')).toBe('school');
    expect(matchGoal('my wedding')).toBe('wedding');
    expect(matchGoal('learn to fly')).toBe('other');
  });

  it('pays a goal at the age chosen, counts it on its own, and never from the cushion', () => {
    const maya = persona('maya').inputs;
    const base = simulate(maya, {}, NO_LEVERS, SEED, { detail: false });
    const goal = (cost: number, byAge: number) => ({ ...maya, goals: [{ id: 'g', label: 'Japan', kind: 'travel' as const, cost, byAge }] });
    const small = summarise(simulate(goal(3000, 30), {}, NO_LEVERS, SEED, { detail: false })).milestoneCounts.goals[0];
    const big = summarise(simulate(goal(60000, 30), {}, NO_LEVERS, SEED, { detail: false })).milestoneCounts.goals[0];
    const later = summarise(simulate(goal(60000, 45), {}, NO_LEVERS, SEED, { detail: false })).milestoneCounts.goals[0];
    expect(small).toBeGreaterThan(big);
    expect(later).toBeGreaterThan(big);
    // A goal that is never paid leaves the future exactly as it was.
    const huge = simulate(goal(10_000_000, 30), {}, NO_LEVERS, SEED, { detail: false });
    huge.forEach((p, i) => {
      expect(p.milestones.goals[0]).toBe(false);
      expect(p.status).toBe(base[i].status);
      expect(p.final).toBeCloseTo(base[i].final, 6);
    });
  });

  it('never lets a home or goal make habits or more saving look worse', () => {
    const maya = persona('maya').inputs;
    const jordan = persona('jordan').inputs;
    const cases: Inputs[] = [
      { ...maya, home: { price: 0, byAge: 35, type: 'condo' } },
      { ...jordan, home: { price: 0, byAge: 40, type: 'house' } },
      { ...maya, goals: [{ id: 'g', label: 'Japan', kind: 'travel', cost: 6000, byAge: 28 }] },
    ];
    for (const i of cases) {
      const base = inControl(i);
      for (const id of LEVER_IDS) expect(inControl(i, {}, leverOnly(id)), id).toBeGreaterThanOrEqual(base);
      let last = -1;
      for (const monthly of [0, 25, 50, 100, 200]) {
        const n = inControl({ ...i, monthly });
        expect(n).toBeGreaterThanOrEqual(last);
        last = n;
      }
    }
    // Adding the goal itself barely moves the count: it is judged on its own.
    expect(Math.abs(inControl(cases[1]) - inControl(jordan))).toBeLessThanOrEqual(15);
  });

  it('only shrinks student debt by what is paid', () => {
    const sam = { ...persona('sam').inputs, debt: { balance: 35000, rate: 5 } };
    // More saving can never be "paid" by debt: with debt, savings are lower in every life.
    const withDebt = simulate(sam, {}, NO_LEVERS, SEED);
    const without = simulate({ ...sam, debt: null }, {}, NO_LEVERS, SEED);
    withDebt.forEach((p, i) => expect(p.balances![10]).toBeLessThanOrEqual(without[i].balances![10] + 0.01));
  });

  it('uses the Canadian minimum down payment', () => {
    expect(minDownPayment(400000)).toBe(20000);
    expect(minDownPayment(550000)).toBe(30000);
    expect(minDownPayment(1400000)).toBe(115000);
    expect(minDownPayment(1500000)).toBe(300000);
  });

  it('counts a home goal on its own, without changing whether a future is in control', () => {
    const maya = persona('maya').inputs;
    const plain = simulate(maya, {}, NO_LEVERS, SEED, { detail: false });
    const withHome = simulate({ ...maya, home: { price: 0, byAge: 35, type: 'condo' } }, {}, NO_LEVERS, SEED, { detail: false });
    const reached = withHome.filter((p) => p.milestones.home).length;
    expect(reached).toBeGreaterThan(0);
    // Buying uses savings, so a future can change, but never because the home was missed.
    withHome.forEach((p, i) => {
      if (!p.milestones.home) expect(p.status).toBe(plain[i].status);
    });
  });

  it('debt never helps, and living with family never hurts', () => {
    for (const p of PERSONAS) {
      const i = p.inputs;
      expect(inControl({ ...i, debt: { balance: 35000, rate: 5 } })).toBeLessThanOrEqual(inControl({ ...i, debt: null }));
      expect(inControl({ ...i, living: 'family', moveOutAge: i.age + 4 })).toBeGreaterThanOrEqual(inControl({ ...i, living: 'renting' }));
    }
  });

  it('keeps students out of layoffs while in school, and gives gig workers dips instead of layoffs', () => {
    const student = persona('maya').inputs;
    for (const p of simulate(student, {}, NO_LEVERS, SEED)) {
      expect(p.events.some((e) => e.type === 'job' && e.age < student.finishAge)).toBe(false);
    }
    const gig = persona('sam').inputs;
    const paths = simulate(gig, {}, NO_LEVERS, SEED);
    expect(paths.some((p) => p.events.some((e) => e.type === 'job'))).toBe(false);
    expect(paths.some((p) => p.events.some((e) => e.type === 'dip'))).toBe(true);
  });
});

describe('rescue', () => {
  it('counts exactly the futures whose status improves to In control or Mostly there', () => {
    const before = simulate(maya, {}, NO_LEVERS, SEED, { detail: false });
    const after = simulate(maya, {}, leverOnly('auto50'), SEED, { detail: false });
    const r = rescueOf(before, after);
    let want = 0;
    for (let i = 0; i < before.length; i++) {
      const ok = after[i].status < before[i].status && after[i].status <= 1;
      expect(r.mask[i] === 1).toBe(ok);
      if (ok) want++;
    }
    expect(r.total).toBe(want);
    expect(r.toControl + r.toMostly).toBe(want);
    expect(want).toBeGreaterThan(0);
  });
});

describe('assumption sets', () => {
  it('cautious gives no more futures in control than middle, and middle no more than hopeful', () => {
    for (const p of PERSONAS) {
      const n = (set: 'cautious' | 'middle' | 'hopeful') => summarise(simulate(p.inputs, {}, NO_LEVERS, SEED, { detail: false, set })).counts[0];
      expect(n('cautious')).toBeLessThanOrEqual(n('middle'));
      expect(n('middle')).toBeLessThanOrEqual(n('hopeful'));
    }
  });

  it('records whether the top habit stays the same under all three sets', () => {
    // This test reports; it does not force the answer. The result is shown in
    // the Assumptions panel and the pitch, whatever it is.
    const result = PERSONAS.map((p) => {
      const top = (['cautious', 'middle', 'hopeful'] as const).map((set) => new Engine().analyse(p.inputs, {}, {}, NO_LEVERS, SEED, set).ranking[0].id);
      return { persona: p.name, cautious: top[0], middle: top[1], hopeful: top[2], same: new Set(top).size === 1 };
    });
    writeFileSync(new URL('./stability.json', import.meta.url), JSON.stringify({ seed: SEED, result }, null, 2) + '\n');
    expect(result).toHaveLength(PERSONAS.length);
  }, 30000);
});
