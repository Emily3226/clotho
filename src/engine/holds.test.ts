import { describe, expect, it } from 'vitest';
import { Engine, rescueOf } from './analyse';
import { PERSONAS } from './personas';
import { simulate } from './simulate';
import { NO_LEVERS, leverOnly, type Scenario } from './types';

const SEED = 2026;
const worries: Scenario = { ai: 'moderate', costs: 'moderate' };

describe('does the best step still hold', () => {
  it('is only worked out when asked for', () => {
    const a = new Engine().analyse(PERSONAS[0].inputs, {}, {}, NO_LEVERS, SEED);
    expect(a.holds).toBeNull();
  });

  it('tests the top habit under the other two return settings and each worry', () => {
    for (const p of PERSONAS) {
      const a = new Engine().analyse(p.inputs, worries, {}, NO_LEVERS, SEED, 'middle', false, true);
      const h = a.holds!;
      expect(h).not.toBeNull();
      // The step being tested is the one ranked first, with the same count.
      expect(h.lever).toBe(a.ranking[0].id);
      expect(h.rescued).toBe(a.ranking[0].rescued);
      expect(h.tests.map((t) => `${t.kind}:${t.id}`)).toEqual(['market:cautious', 'market:hopeful', 'worry:ai', 'worry:costs']);
      expect(h.held).toBe(h.tests.filter((t) => t.same).length);
      for (const t of h.tests) expect(t.same).toBe(t.top === h.lever);
    }
  }, 30000);

  it('counts rescued futures in each test on the same 1,000 paths', () => {
    const maya = PERSONAS[0].inputs;
    const h = new Engine().analyse(maya, worries, {}, NO_LEVERS, SEED, 'middle', false, true).holds!;
    const direct = (s: Scenario, set: 'cautious' | 'middle' | 'hopeful') =>
      rescueOf(simulate(maya, s, NO_LEVERS, SEED, { detail: false, set }), simulate(maya, s, leverOnly(h.lever), SEED, { detail: false, set })).total;
    expect(h.tests[0].rescued).toBe(direct({}, 'cautious'));
    expect(h.tests[1].rescued).toBe(direct({}, 'hopeful'));
    expect(h.tests[2].rescued).toBe(direct({ ai: 'moderate' }, 'middle'));
  });

  it('leaves the rest of the analysis unchanged', () => {
    const maya = PERSONAS[0].inputs;
    const plain = new Engine().analyse(maya, worries, {}, NO_LEVERS, SEED);
    const withHolds = new Engine().analyse(maya, worries, {}, NO_LEVERS, SEED, 'middle', false, true);
    expect(withHolds.summary).toEqual(plain.summary);
    expect(withHolds.ranking).toEqual(plain.ranking);
    expect(withHolds.cards.map((c) => [c.id, c.inControl])).toEqual(plain.cards.map((c) => [c.id, c.inControl]));
  });

  it('keeps each return setting separate when the setting is switched', () => {
    const maya = PERSONAS[0].inputs;
    const e = new Engine();
    const middle = e.analyse(maya, {}, {}, NO_LEVERS, SEED, 'middle', false, true).summary.counts[0];
    const cautious = e.analyse(maya, {}, {}, NO_LEVERS, SEED, 'cautious', false, true).summary.counts[0];
    expect(cautious).toBe(new Engine().analyse(maya, {}, {}, NO_LEVERS, SEED, 'cautious').summary.counts[0]);
    expect(e.analyse(maya, {}, {}, NO_LEVERS, SEED, 'middle').summary.counts[0]).toBe(middle);
  });
});
