/// <reference lib="webworker" />
import { testWays } from './ways';
import type { AssumptionSetId, Inputs, Levers, Scenario } from './types';

export interface WaysRequest {
  id: number;
  inputs: Inputs;
  levers: Levers;
  seed: number;
  set: AssumptionSetId;
  scenario: Scenario;
}

self.onmessage = (e: MessageEvent<WaysRequest>) => {
  const { id, inputs, levers, seed, set, scenario } = e.data;
  (self as unknown as Worker).postMessage({ id, results: testWays(inputs, levers, seed, set, scenario) });
};
