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
  const showAll = useStore((s) => s.showAll);
  const levers = useStore((s) => s.levers);
  const seed = useStore((s) => s.seed);
  const set = useStore((s) => s.set);
  const active = useStore((s) => s.step >= 3);

  useEffect(() => {
    const w = new Worker(new URL('./engine/worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; analysis: Analysis }>) => {
      if (e.data.id !== latest.current) return;
      const st = useStore.getState();
      const analysis = e.data.analysis;
      // Say what a "Make it more you" answer changed, in a neutral line.
      let note = st.note;
      if (st.pendingNote) {
        const d = analysis.summary.counts[0] - st.pendingNote.before;
        const n = Math.abs(d).toLocaleString('en-CA');
        note =
          d > 0
            ? `${st.pendingNote.label}: ${n} more of your futures in control.`
            : d < 0
              ? st.pendingNote.whyDown
                ? `${st.pendingNote.label}: ${n} fewer in control. ${st.pendingNote.whyDown}`
                : `${st.pendingNote.label}: your river shifts down a little (${n} fewer in control). That’s what the habits are for.`
              : `${st.pendingNote.label}: no change to how many futures are in control.`;
      }
      st.setState({ analysis, computing: false, note, pendingNote: null });
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
      set,
      showAll,
    };
    useStore.getState().setState({ computing: true });
    worker.current.postMessage(req);
  }, [active, inputs, worries, activeWorry, levers, seed, set, showAll]);
}
