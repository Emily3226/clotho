/// <reference lib="webworker" />
import { keepReachable } from './keepReachable';
import type { AssumptionSetId, Inputs, Levers, Scenario } from './types';

export interface KeepReachableRequest {
  id: number;
  inputs: Inputs;
  levers: Levers;
  seed: number;
  set: AssumptionSetId;
  scenario: Scenario;
}

self.onmessage = (e: MessageEvent<KeepReachableRequest>) => {
  const { id, inputs, levers, seed, set, scenario } = e.data;
  (self as unknown as Worker).postMessage({ id, result: keepReachable(inputs, levers, seed, set, scenario) });
};
