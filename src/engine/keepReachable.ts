// "Keep yours reachable": some workplace plans now let your own contributions
// go to a TFSA for shorter-term needs while the employer match stays invested
// for retirement. This compares that with putting everything in the retirement
// plan, on the same 1,000 lives and with the same take-home pay.
import { leverAvailable } from './analyse';
import { simulate, summarise } from './simulate';
import type { AssumptionSetId, Inputs, Levers, PathResult, Scenario } from './types';

export interface KeepReachable {
  inControl: { plan: number; split: number };
  // Futures that had to take money out of the retirement plan early.
  dipped: { plan: number; split: number };
  // Lost to tax on those withdrawals, in the middle future that dipped.
  lostToTax: number;
  // Savings at 65 in the middle future, after tax on the retirement plan.
  at65: { plan: number; split: number };
}

// Only for someone with a plan that has, or may have, an employer match.
export const canKeepReachable = (inputs: Inputs): boolean =>
  inputs.plan === 'unsure' || (inputs.plan === 'yes' && inputs.matchPct > 0);

const middle = (v: number[]): number => (v.length ? [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)] : 0);
const dipped = (paths: PathResult[]): PathResult[] => paths.filter((p) => p.raidLost > 0);

export function keepReachable(
  inputs: Inputs,
  levers: Levers,
  seed: number,
  set: AssumptionSetId = 'middle',
  scenario: Scenario = {},
): KeepReachable {
  // The comparison assumes the full match is being taken.
  const used: Levers = { ...levers, match: levers.match || leverAvailable('match', inputs) };
  const plan = simulate(inputs, scenario, used, seed, { detail: false, set });
  const split = simulate(inputs, scenario, used, seed, { detail: false, set, keepReachable: true });
  return {
    inControl: { plan: summarise(plan).counts[0], split: summarise(split).counts[0] },
    dipped: { plan: dipped(plan).length, split: dipped(split).length },
    lostToTax: middle(dipped(plan).map((p) => p.raidLost)),
    at65: { plan: middle(plan.map((p) => p.at65Net)), split: middle(split.map((p) => p.at65Net)) },
  };
}
