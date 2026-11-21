import { useEffect, useRef, useState } from 'react';
import { Field } from './bits';
import { leverCopy } from '../lib/copy';
import { money, num } from '../lib/format';
import { countMoves, raiseOffer, windfallAnsweredThisMonth, withBonus, type Windfall } from '../lib/windfall';
import type { WindfallRequest, WindfallResult } from '../lib/windfall.worker';
import { useStore, type Commitment } from '../store';

// "Got a raise or bonus since last time?" at the monthly check-in.
// Answered once a month; "No" adds nothing more.
export function WindfallQuestion({ commitment }: { commitment: Commitment }) {
  const inputs = useStore((s) => s.inputs);
  const seed = useStore((s) => s.seed);
  const set = useStore((s) => s.set);
  const setState = useStore((s) => s.setState);
  const [pick, setPick] = useState<Windfall | null>(null);
  const [bonus, setBonus] = useState(1000);
  const [putAside, setPutAside] = useState(500);
  const [done, setDone] = useState<string | null>(null);

  const offer = raiseOffer(commitment.lever, commitment.alsoRaises);
  const aside = Math.min(putAside, bonus);
  const [raise, setRaise] = useState<Extract<WindfallResult, { kind: 'raise' }>['result'] | null>(null);
  const [effect, setEffect] = useState<Extract<WindfallResult, { kind: 'bonus' }>['result'] | null>(null);

  // The counts run in a background worker, like the other what-ifs. Only the
  // latest answer is shown, so a fast drag never shows a stale count.
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const wanted = pick === 'bonus' || (pick === 'raise' && offer === 'offer');
  useEffect(() => {
    if (!wanted) return;
    const w = new Worker(new URL('../lib/windfall.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<WindfallResult>) => {
      if (e.data.id !== latest.current) return;
      if (e.data.kind === 'raise') setRaise(e.data.result);
      else setEffect(e.data.result);
    };
    worker.current = w;
    return () => {
      w.terminate();
      worker.current = null;
    };
  }, [wanted]);

  useEffect(() => {
    if (!wanted) return;
    const t = setTimeout(() => {
      const base = { id: ++latest.current, inputs, lever: commitment.lever, seed, set };
      const req: WindfallRequest =
        pick === 'raise' ? { ...base, kind: 'raise' } : { ...base, kind: 'bonus', alsoRaises: !!commitment.alsoRaises, aside };
      worker.current?.postMessage(req);
    }, 60);
    return () => clearTimeout(t);
  }, [wanted, pick, inputs, commitment.lever, commitment.alsoRaises, aside, seed, set]);

  if (windfallAnsweredThisMonth(commitment.lastWindfallISO) && !done) return null;

  // Record the answer for this month, with any change it brings.
  const finish = (message: string, patch: Partial<Commitment> = {}, saved?: number) => {
    const st = useStore.getState();
    setState({
      commitment: { ...commitment, ...patch, lastWindfallISO: new Date().toISOString() },
      ...(saved !== undefined ? { inputs: { ...st.inputs, saved } } : {}),
    });
    setDone(message);
  };

  if (done) {
    return (
      <div className="card windfall" aria-live="polite">
        <p>{done}</p>
      </div>
    );
  }

  const habit = leverCopy(commitment.lever, inputs).title.toLowerCase();

  return (
    <div className="card windfall">
      <h2 className="h-sub" id="windfall-q">
        Got a raise or bonus since last time?
      </h2>
      <div className="row" role="group" aria-labelledby="windfall-q">
        {(['raise', 'bonus'] as const).map((w) => (
          <button key={w} type="button" className="secondary" aria-pressed={pick === w} onClick={() => setPick(w)}>
            {w === 'raise' ? 'Raise' : 'Bonus'}
          </button>
        ))}
        <button type="button" className="ghost" onClick={() => finish('Got it. Carry on as you were.')}>
          No
        </button>
      </div>

      {pick === 'raise' && offer === 'ask' && (
        <>
          <p>Did you send part of it to savings before it reached everyday spending?</p>
          <div className="row">
            <button type="button" className="primary" onClick={() => finish('Nice. That part of the raise keeps working for you.')}>
              Yes
            </button>
            <button type="button" className="ghost" onClick={() => finish('That’s fine. There will be other raises.')}>
              Not this time
            </button>
          </div>
        </>
      )}

      {pick === 'raise' && offer === 'offer' && raise && (
        <>
          {countMoves(raise.before, raise.after, raise.rescued) ? (
            <p>
              Send part of each raise to savings before it reaches everyday spending. On top of {habit}, it would rescue{' '}
              <b>{num(raise.rescued)}</b> more of your futures, pointing to <b>{num(raise.after)}</b> of 1,000 instead of{' '}
              {num(raise.before)}. It costs $0 today.
            </p>
          ) : (
            <p>
              Send part of each raise to savings before it reaches everyday spending. With {habit}, your futures point to{' '}
              <b>{num(raise.after)}</b> of 1,000 either way, so the count doesn’t move, but every raise would still add to your
              savings. It costs $0 today.
            </p>
          )}
          <div className="row">
            <button
              type="button"
              className="primary"
              onClick={() => finish(`Added. You keep ${habit}, and save part of every raise too.`, { alsoRaises: true })}
            >
              Add it
            </button>
            <button type="button" className="ghost" onClick={() => finish('Okay. Your step stays as it is.')}>
              Not now
            </button>
          </div>
        </>
      )}

      {pick === 'bonus' && (
        <>
          <div className="fields two">
            <Field id="bonus-amount" label="About how much was it?" value={bonus} min={0} max={20000} step={100} prefix="$" onChange={(v) => setBonus(Math.max(0, v))} />
            <Field
              id="bonus-aside"
              label="How much would you put aside?"
              value={aside}
              min={0}
              max={Math.max(100, bonus)}
              step={50}
              prefix="$"
              onChange={(v) => setPutAside(Math.max(0, v))}
            />
          </div>
          <p aria-live="polite">
            {!effect ? (
              <>Working out where that points…</>
            ) : aside <= 0 ? (
              <>Nothing put aside, so nothing changes.</>
            ) : countMoves(effect.before, effect.after) ? (
              <>
                Putting {money(aside)} aside points to <b>{num(effect.after)}</b> of 1,000 instead of {num(effect.before)}.
              </>
            ) : (
              <>
                Putting {money(aside)} aside adds {money(aside)} to your savings. Your futures point to <b>{num(effect.after)}</b> of
                1,000 either way, so the count doesn’t move.
              </>
            )}
            {effect && aside > 0 ? ' It’s a one-off, so your monthly amount stays the same.' : ''}
          </p>
          <div className="row">
            <button
              type="button"
              className="primary"
              disabled={aside <= 0}
              onClick={() => finish(`Added ${money(aside)} to what you’ve saved.`, {}, withBonus(useStore.getState().inputs, aside).saved)}
            >
              Add it to my savings
            </button>
            <button type="button" className="ghost" onClick={() => finish('Enjoy it. Nothing changes.')}>
              Spend it all
            </button>
          </div>
        </>
      )}
    </div>
  );
}
