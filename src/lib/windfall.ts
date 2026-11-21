// A raise or bonus at the monthly check-in: a decision moment. A raise can
// start the lasting "save part of every raise" habit; a bonus is a one-off
// that is added to savings once. Numbers come from the engine, and are always
// shown as where things point, never as progress already made.
import { rescueOf } from '../engine/analyse';
import { simulate, summarise } from '../engine/simulate';
import { leverOnly, type AssumptionSetId, type Inputs, type LeverId, type Levers } from '../engine/types';

export type Windfall = 'raise' | 'bonus' | 'none';

// Calendar months in local time, like the "Yes" at the check-in.
const monthOf = (d: Date) => d.getFullYear() * 12 + d.getMonth();

// The question is answered at most once a month.
export function windfallAnsweredThisMonth(lastISO: string | null | undefined, now = new Date()): boolean {
  return !!lastISO && monthOf(new Date(lastISO)) === monthOf(now);
}

// The levers for someone's step, plus the raise habit if they added it.
export function leversFor(lever: LeverId, alsoRaises = false): Levers {
  const l = leverOnly(lever);
  return alsoRaises ? { ...l, raises: true } : l;
}

// Already saving part of every raise: just ask whether they did. Otherwise
// offer the habit on top of their step.
export function raiseOffer(lever: LeverId, alsoRaises = false): 'ask' | 'offer' {
  return lever === 'raises' || alsoRaises ? 'ask' : 'offer';
}

const count = (inputs: Inputs, levers: Levers, seed: number, set: AssumptionSetId) =>
  simulate(inputs, {}, levers, seed, { detail: false, set });

// How many more futures the raise habit rescues on top of the current step,
// against the same luck.
export function raiseOnTop(inputs: Inputs, lever: LeverId, seed: number, set: AssumptionSetId) {
  const before = count(inputs, leversFor(lever), seed, set);
  const after = count(inputs, leversFor(lever, true), seed, set);
  return {
    rescued: rescueOf(before, after).total,
    before: summarise(before).counts[0],
    after: summarise(after).counts[0],
  };
}

// A bonus adds what was put aside to savings, once. It does not touch the
// monthly amount or any habit, so nothing repeats next month.
export function withBonus(inputs: Inputs, putAside: number): Inputs {
  return { ...inputs, saved: Math.round(inputs.saved + Math.max(0, putAside)) };
}

export function bonusEffect(inputs: Inputs, levers: Levers, putAside: number, seed: number, set: AssumptionSetId) {
  return {
    before: summarise(count(inputs, levers, seed, set)).counts[0],
    after: summarise(count(withBonus(inputs, putAside), levers, seed, set)).counts[0],
  };
}
