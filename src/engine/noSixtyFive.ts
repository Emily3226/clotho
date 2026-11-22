// "What if there's no 65?" Many people doubt the long-term future enough to
// ask why they should save at all. This answers it on the same 1,000 lives:
// stop the clock at an earlier age and compare what is yours to use, with the
// habit and without it, against the spending the habit cost along the way.
import { simulate } from './simulate';
import { NO_LEVERS, type AssumptionSetId, type Inputs, type Levers, type Scenario } from './types';

export const CUT_AGES = [35, 40, 50] as const;

// 35, 40 and 50 while at least two are ahead; after that, 5, 10 and 15 years out.
export const cutAgesFor = (age: number): number[] => {
  const fixed = CUT_AGES.filter((a) => a > age);
  return fixed.length >= 2 ? fixed : [age + 5, age + 10, age + 15].filter((a) => a < 65);
};
export const defaultCutAge = (age: number): number => {
  const ages = cutAgesFor(age);
  return ages.includes(40) ? 40 : ages[0];
};

export interface CutShort {
  cutAge: number;
  // What is yours to use at that age, in the middle future.
  without: number;
  withHabit: number;
  // Spending given up to get there, in the middle future.
  gaveUp: number;
  // Futures where what you gained is at least what you gave up.
  ahead: number;
  total: number;
}

const middle = (v: number[]): number => [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)];

export function ifCutShort(
  inputs: Inputs,
  levers: Levers,
  cutAge: number,
  seed: number,
  set: AssumptionSetId = 'middle',
  scenario: Scenario = {},
): CutShort {
  const opts = { detail: false, set, cutAge };
  const plain = simulate(inputs, scenario, NO_LEVERS, seed, opts);
  const habit = simulate(inputs, scenario, levers, seed, opts);
  const gaveUp: number[] = [];
  let ahead = 0;
  habit.forEach((p, i) => {
    const a = p.atCut!;
    const b = plain[i].atCut!;
    const cost = Math.max(0, b.lived - a.lived);
    gaveUp.push(cost);
    if (a.yours - b.yours >= cost) ahead++;
  });
  return {
    cutAge,
    without: middle(plain.map((p) => p.atCut!.yours)),
    withHabit: middle(habit.map((p) => p.atCut!.yours)),
    gaveUp: middle(gaveUp),
    ahead,
    total: habit.length,
  };
}
