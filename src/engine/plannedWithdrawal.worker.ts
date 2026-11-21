/// <reference lib="webworker" />
import { compareWithdrawal } from './plannedWithdrawal';
import type { AssumptionSetId, Inputs, Levers, Scenario } from './types';

export interface WithdrawalRequest {
  id: number;
  inputs: Inputs;
  levers: Levers;
  amount: number;
  age: number;
  seed: number;
  set: AssumptionSetId;
  scenario: Scenario;
}

self.onmessage = (e: MessageEvent<WithdrawalRequest>) => {
  const { id, inputs, levers, amount, age, seed, set, scenario } = e.data;
  (self as unknown as Worker).postMessage({ id, result: compareWithdrawal(inputs, levers, amount, age, seed, set, scenario) });
};
