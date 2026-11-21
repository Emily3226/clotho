import { describe, expect, it } from 'vitest';
import { persona } from '../engine/personas';
import { simulate, summarise } from '../engine/simulate';
import { leverOnly } from '../engine/types';
import { bonusEffect, leversFor, raiseOffer, raiseOnTop, windfallAnsweredThisMonth, withBonus } from './windfall';

const maya = persona('maya').inputs;
const SEED = 2026;

describe('raise or bonus: once a month', () => {
  it('is answered at most once per calendar month', () => {
    const now = new Date(2026, 10, 21, 12);
    expect(windfallAnsweredThisMonth(null, now)).toBe(false);
    expect(windfallAnsweredThisMonth(undefined, now)).toBe(false);
    expect(windfallAnsweredThisMonth(new Date(2026, 10, 2).toISOString(), now)).toBe(true);
    expect(windfallAnsweredThisMonth(new Date(2026, 9, 30).toISOString(), now)).toBe(false);
    expect(windfallAnsweredThisMonth(new Date(2025, 10, 21).toISOString(), now)).toBe(false);
  });
});

describe('raise', () => {
  it('does not offer the raise habit to someone who already has it', () => {
    expect(raiseOffer('raises')).toBe('ask');
    expect(raiseOffer('auto25', true)).toBe('ask');
    expect(raiseOffer('auto25')).toBe('offer');
    expect(raiseOffer('match', false)).toBe('offer');
  });

  it('keeps the original step and adds the raise habit on top', () => {
    expect(leversFor('auto50')).toEqual(leverOnly('auto50'));
    expect(leversFor('auto50', true)).toEqual({ ...leverOnly('auto50'), raises: true });
  });

  it('counts the futures the raise habit rescues on top of the step, from the engine', () => {
    const r = raiseOnTop(maya, 'auto25', SEED, 'middle');
    const before = summarise(simulate(maya, {}, leverOnly('auto25'), SEED, { detail: false })).counts[0];
    expect(r.before).toBe(before);
    expect(r.after).toBeGreaterThanOrEqual(r.before);
    expect(r.rescued).toBeGreaterThan(0);
  });
});

describe('bonus', () => {
  it('adds what was put aside to savings once, and nothing else', () => {
    const after = withBonus(maya, 800);
    expect(after.saved).toBe(maya.saved + 800);
    // A one-off: the monthly amount and everything else stay the same.
    expect({ ...after, saved: maya.saved }).toEqual(maya);
    expect(withBonus(maya, -50).saved).toBe(maya.saved);
  });

  it('is not run through the raise habit', () => {
    const levers = leversFor('auto25');
    const e = bonusEffect(maya, levers, 2000, SEED, 'middle');
    const direct = summarise(simulate(withBonus(maya, 2000), {}, levers, SEED, { detail: false })).counts[0];
    expect(e.after).toBe(direct);
    expect(levers.raises).toBe(false);
    expect(e.after).toBeGreaterThanOrEqual(e.before);
  });
});
