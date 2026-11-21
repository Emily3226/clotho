/// <reference lib="webworker" />
// Runs the raise and bonus counts off the main thread, so dragging the bonus
// fields stays smooth on a phone.
import type { AssumptionSetId, Inputs, LeverId } from '../engine/types';
import { bonusEffect, leversFor, raiseOnTop } from './windfall';

export type WindfallRequest =
  | { id: number; kind: 'raise'; inputs: Inputs; lever: LeverId; seed: number; set: AssumptionSetId }
  | { id: number; kind: 'bonus'; inputs: Inputs; lever: LeverId; alsoRaises: boolean; aside: number; seed: number; set: AssumptionSetId };

export type WindfallResult =
  | { id: number; kind: 'raise'; result: ReturnType<typeof raiseOnTop> }
  | { id: number; kind: 'bonus'; result: ReturnType<typeof bonusEffect> };

self.onmessage = (e: MessageEvent<WindfallRequest>) => {
  const r = e.data;
  const out: WindfallResult =
    r.kind === 'raise'
      ? { id: r.id, kind: 'raise', result: raiseOnTop(r.inputs, r.lever, r.seed, r.set) }
      : { id: r.id, kind: 'bonus', result: bonusEffect(r.inputs, leversFor(r.lever, r.alsoRaises), r.aside, r.seed, r.set) };
  (self as unknown as Worker).postMessage(out);
};
