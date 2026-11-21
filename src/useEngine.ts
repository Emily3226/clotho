import { useEffect, useRef } from 'react';
import type { Analysis } from './engine/analyse';
import type { EngineRequest } from './engine/worker';
import { currentScenario, useStore } from './store';

// Keeps the analysis in the store in step with the inputs, worries and levers.
export function useEngine(): void {
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const inputs = useStore((s) => s.inputs);
  const worries = useStore((s) => s.worries);
  const activeWorry = useStore((s) => s.activeWorry);
  const levers = useStore((s) => s.levers);
  const seed = useStore((s) => s.seed);
  const active = useStore((s) => s.step >= 3);

  useEffect(() => {
    const w = new Worker(new URL('./engine/worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; analysis: Analysis }>) => {
      if (e.data.id !== latest.current) return;
      useStore.getState().set({ analysis: e.data.analysis, computing: false });
    };
    worker.current = w;
    return () => w.terminate();
  }, []);

  useEffect(() => {
    if (!active || !worker.current) return;
    const id = ++latest.current;
    const req: EngineRequest = {
      id,
      inputs,
      selected: worries,
      scenario: currentScenario(worries, activeWorry),
      levers,
      seed,
    };
    useStore.getState().set({ computing: true });
    worker.current.postMessage(req);
  }, [active, inputs, worries, activeWorry, levers, seed]);
}
