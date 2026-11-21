/// <reference lib="webworker" />
import { Engine } from './analyse';
import type { AssumptionSetId, Inputs, Levers, Scenario } from './types';

export interface EngineRequest {
  id: number;
  inputs: Inputs;
  selected: Scenario;
  scenario: Scenario;
  levers: Levers;
  seed: number;
  set: AssumptionSetId;
  showAll: boolean;
}

const engine = new Engine();

self.onmessage = (e: MessageEvent<EngineRequest>) => {
  const { id, inputs, selected, scenario, levers, seed, set, showAll } = e.data;
  const analysis = engine.analyse(inputs, selected, scenario, levers, seed, set, showAll);
  const transfer: Transferable[] = [
    analysis.balances.buffer,
    analysis.statuses.buffer,
    analysis.band.p25.buffer,
    analysis.band.p50.buffer,
    analysis.band.p75.buffer,
    ...analysis.cards.map((c) => c.mask.buffer),
    ...(analysis.rescue ? [analysis.rescue.mask.buffer] : []),
  ];
  (self as unknown as Worker).postMessage({ id, analysis }, transfer);
};
