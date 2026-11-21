import { describe, expect, it } from 'vitest';
import { A } from './assumptions';
import { PERSONAS } from './personas';
import { inputsForStage } from './profile';
import { simulate, summarise } from './simulate';
import { NO_LEVERS, leverOnly, type PathResult } from './types';
import { WAYS, testWays, waysFor } from './ways';

const SEED = 2026;
const maya = PERSONAS[0].inputs;
const of = (paths: PathResult[], type: string) => paths.flatMap((p) => p.events.filter((e) => e.type === type).map((e) => ({ ...e, value: e.value ?? 0 })));
const careers = (paths: PathResult[]) => paths.map((p) => p.events.filter((e) => e.type === 'move' || e.type === 'fulltime').map((e) => `${e.age}:${e.type}`).join('|'));

describe('careers', () => {
  it('has job changes that raise pay and job changes that lower it', () => {
    const moves = of(simulate(maya, {}, NO_LEVERS, SEED), 'move');
    expect(moves.some((e) => e.value > 0)).toBe(true);
    expect(moves.some((e) => e.value < 0)).toBe(true);
    for (const e of moves) {
      expect(e.value).toBeGreaterThanOrEqual(Math.round(A.moveMin * 100));
      expect(e.value).toBeLessThanOrEqual(Math.round(A.moveMax * 100));
    }
  });

  it('gives students a spread of first full-time salaries', () => {
    const pays = of(simulate(inputsForStage('student', 20), {}, NO_LEVERS, SEED), 'fulltime').map((e) => e.value).sort((a, b) => a - b);
    expect(pays.length).toBeGreaterThan(500);
    expect(pays[Math.floor(pays.length * 0.9)]!).toBeGreaterThan(pays[Math.floor(pays.length * 0.1)]! * 1.3);
  });

  it('lets some part-time and gig workers land a full-time job', () => {
    for (const stage of ['part', 'gig'] as const) {
      const paths = simulate(inputsForStage(stage, 24), {}, NO_LEVERS, SEED);
      expect(paths.filter((p) => p.events.some((e) => e.type === 'fulltime')).length).toBeGreaterThan(100);
    }
  });

  it('keeps the same career luck when a habit changes', () => {
    const base = simulate(maya, {}, NO_LEVERS, SEED);
    const habit = simulate(maya, {}, leverOnly('auto25'), SEED);
    expect(careers(habit)).toEqual(careers(base));
  });
});

describe('more ways', () => {
  it('changes nothing unless a way is switched on', () => {
    const a = summarise(simulate(maya, {}, NO_LEVERS, SEED, { detail: false })).counts;
    const b = summarise(simulate(maya, {}, NO_LEVERS, SEED, { detail: false, ways: [] })).counts;
    expect(b).toEqual(a);
  });

  it('only offers the FHSA to someone planning to buy', () => {
    expect(waysFor({ ...maya, home: null })).not.toContain('fhsa');
    expect(WAYS.length).toBeGreaterThanOrEqual(4);
  });

  it('returns a whole-number result for every way offered', () => {
    const results = testWays(maya, NO_LEVERS, SEED, 'middle', {});
    expect(results.map((r) => r.id).sort()).toEqual([...waysFor(maya)].sort());
    for (const r of results) {
      expect(Number.isInteger(r.rescued)).toBe(true);
      expect(r.inControl).toBeGreaterThanOrEqual(0);
      expect(r.inControl).toBeLessThanOrEqual(1000);
    }
  });
});
