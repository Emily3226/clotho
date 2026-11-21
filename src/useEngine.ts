import { useEffect, useRef } from 'react';
import type { Analysis } from './engine/analyse';
import type { EngineRequest } from './engine/worker';
import { STEP, currentScenario, selectedWorries, useStore } from './store';

// Keeps the analysis in the store in step with the inputs, worries and levers.
export function useEngine(): void {
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const inputs = useStore((s) => s.inputs);
  const chips = useStore((s) => s.worries);
  const concerns = useStore((s) => s.concerns);
  const activeWorry = useStore((s) => s.activeWorry);
  const showAll = useStore((s) => s.showAll);
  const levers = useStore((s) => s.levers);
  const seed = useStore((s) => s.seed);
  const set = useStore((s) => s.set);
  const active = useStore((s) => s.step >= STEP.futures);

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
      const noLevers = !st.levers.match && !st.levers.raises && !st.levers.cushion && st.levers.auto === 0;
      const kept = st.first && st.first.worry === st.activeWorry ? st.first : null;
      const first = kept ?? (noLevers ? { monthly: st.inputs.monthly, inControl: analysis.summary.counts[0], worry: st.activeWorry } : null);
      st.setState({ analysis, computing: false, note, pendingNote: null, first });
    };
    worker.current = w;
    return () => w.terminate();
  }, []);

  useEffect(() => {
    if (!active || !worker.current) {
      if (useStore.getState().computing) useStore.getState().setState({ computing: false });
      return;
    }
    const worries = selectedWorries(chips, concerns);
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
    // A short wait so dragging the dial sends only the latest value. Busy is
    // only set once the request is really sent, so a cancelled one (leaving
    // the results within the wait) never leaves it stuck on.
    const t = setTimeout(() => {
      useStore.getState().setState({ computing: true });
      worker.current?.postMessage(req);
    }, 60);
    return () => clearTimeout(t);
  }, [active, inputs, chips, concerns, activeWorry, levers, seed, set, showAll]);
}
