// "What if I take money out for something I want?" Canada Life's headline
// worry is people taking money out of retirement savings early. This compares
// three ways to pay for the same thing, on the same 1,000 lives: from the
// workplace plan, from the cushion or TFSA, or by saving up for it first.
// It is a choice, not a mistake: the job here is to show the trade-off.
import { marginalRate } from './assumptions';
import { simulate, summarise } from './simulate';
import type { AssumptionSetId, Inputs, Levers, Scenario } from './types';

export type PayFrom = 'plan' | 'reachable' | 'saveFirst';
export const PAY_FROM: PayFrom[] = ['plan', 'reachable', 'saveFirst'];

export interface WithdrawalPlan {
  // The amount wanted in hand, in today's dollars.
  amount: number;
  // Paid at this age.
  age: number;
  from: PayFrom;
}

export const CRA_WITHDRAWAL_URL =
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/making-withdrawals/tax-rates-on-withdrawals.html';

// Withholding held back by the plan when money comes out (outside Quebec).
// It is a prepayment: the tax actually owed is settled at tax time.
export function withholdingRate(gross: number): number {
  if (gross <= 5000) return 0.1;
  if (gross <= 15000) return 0.2;
  return 0.3;
}

// To have `net` in hand, this much has to come out of the plan: the
// withdrawal is added to that year's income and taxed at the marginal rate.
export function grossUp(net: number, income: number): { gross: number; tax: number } {
  const m = marginalRate(income);
  const gross = net / (1 - m);
  return { gross, tax: gross - net };
}

export interface PayOption {
  from: PayFrom;
  inControl: number;
  // Savings at 65 in the middle future, after tax on the retirement plan.
  at65: number;
}

export interface WithdrawalCompare {
  amount: number;
  age: number;
  options: PayOption[];
  // Taking it from the plan, in the middle future that did.
  plan: { gross: number; tax: number; withheld: number; lives: number };
  // Lives where the plan held less than was needed by then.
  planShort: number;
}

const middle = (v: number[]): number => (v.length ? [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)] : 0);

export function compareWithdrawal(
  inputs: Inputs,
  levers: Levers,
  amount: number,
  age: number,
  seed: number,
  set: AssumptionSetId = 'middle',
  scenario: Scenario = {},
): WithdrawalCompare {
  const runs = PAY_FROM.map((from) => ({
    from,
    paths: simulate(inputs, scenario, levers, seed, { detail: false, set, withdrawal: { amount, age, from } }),
  }));
  const planPaths = runs[0].paths;
  const took = planPaths.filter((p) => (p.planned?.fromPlan ?? 0) > 0);
  const gross = middle(took.map((p) => p.planned!.fromPlan));
  return {
    amount,
    age,
    options: runs.map(({ from, paths }) => ({ from, inControl: summarise(paths).counts[0], at65: middle(paths.map((p) => p.at65Net)) })),
    plan: {
      gross,
      tax: middle(took.map((p) => p.planned!.tax)),
      withheld: gross * withholdingRate(gross),
      lives: took.length,
    },
    planShort: planPaths.filter((p) => (p.planned?.topUp ?? 0) > 0).length,
  };
}
