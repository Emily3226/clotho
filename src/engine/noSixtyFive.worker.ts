/// <reference lib="webworker" />
import { ifCutShort } from './noSixtyFive';
import type { AssumptionSetId, Inputs, Levers, Scenario } from './types';

export interface CutShortRequest {
  id: number;
  inputs: Inputs;
  levers: Levers;
  cutAge: number;
  seed: number;
  set: AssumptionSetId;
  scenario: Scenario;
}

self.onmessage = (e: MessageEvent<CutShortRequest>) => {
  const { id, inputs, levers, cutAge, seed, set, scenario } = e.data;
  (self as unknown as Worker).postMessage({ id, result: ifCutShort(inputs, levers, cutAge, seed, set, scenario) });
};
