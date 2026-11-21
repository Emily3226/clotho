import { useEffect, useRef, useState } from 'react';
import { A } from '../engine/assumptions';
import { canKeepReachable, type KeepReachable } from '../engine/keepReachable';
import type { KeepReachableRequest } from '../engine/keepReachable.worker';
import { keepReachableAnswer } from '../lib/copy';
import { currentScenario, selectedWorries, useStore } from '../store';

// Worked out only once it is opened, in its own worker.
export function KeepReachableCard() {
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const seed = useStore((s) => s.seed);
  const set = useStore((s) => s.set);
  const worries = useStore((s) => s.worries);
  const concerns = useStore((s) => s.concerns);
  const active = useStore((s) => s.activeWorry);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<KeepReachable | null>(null);
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const eligible = canKeepReachable(inputs);

  useEffect(() => {
    if (!open || !eligible) return;
    const w = new Worker(new URL('../engine/keepReachable.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; result: KeepReachable }>) => {
      if (e.data.id === latest.current) setResult(e.data.result);
    };
    worker.current = w;
    return () => {
      w.terminate();
      worker.current = null;
    };
  }, [open, eligible]);

  useEffect(() => {
    if (!open || !eligible) return;
    setResult(null);
    const t = setTimeout(() => {
      const req: KeepReachableRequest = { id: ++latest.current, inputs, levers, seed, set, scenario: currentScenario(selectedWorries(worries, concerns), active) };
      worker.current?.postMessage(req);
    }, 60);
    return () => clearTimeout(t);
  }, [open, eligible, inputs, levers, seed, set, worries, concerns, active]);

  if (!eligible) return null;
  const answer = result ? keepReachableAnswer(result) : null;
  return (
    <details className="drawer keep-reachable" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Keep yours reachable?</summary>
      <p className="hint">Some workplace plans let your own contributions go to a TFSA while your employer’s match stays invested for retirement.</p>
      <p className="answer" aria-live="polite">
        {answer ? answer.parts.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : <strong key={i}>{p.strong}</strong>)) : 'Working it out…'}
      </p>
      <p className="hint">
        Compared with the full match, same take-home pay. Not every plan offers this, so ask HR.
        {inputs.plan === 'unsure' ? ` Assumes your plan matches ${A.defaultMatchPct}%.` : ''}
      </p>
    </details>
  );
}
