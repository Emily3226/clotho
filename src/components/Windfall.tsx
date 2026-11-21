import { useMemo, useState } from 'react';
import { Field } from './bits';
import { leverCopy } from '../lib/copy';
import { money, num } from '../lib/format';
import { bonusEffect, leversFor, raiseOffer, raiseOnTop, windfallAnsweredThisMonth, withBonus, type Windfall } from '../lib/windfall';
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
  const raise = useMemo(
    () => (pick === 'raise' && offer === 'offer' ? raiseOnTop(inputs, commitment.lever, seed, set) : null),
    [pick, offer, inputs, commitment.lever, seed, set],
  );
  const aside = Math.min(putAside, bonus);
  const levers = leversFor(commitment.lever, commitment.alsoRaises);
  const effect = useMemo(
    () => (pick === 'bonus' ? bonusEffect(inputs, levers, aside, seed, set) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pick, inputs, aside, seed, set, commitment.lever, commitment.alsoRaises],
  );

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
          <p>
            Send part of each raise to savings before it reaches everyday spending. On top of {habit}, it would rescue{' '}
            <b>{num(raise.rescued)}</b> more of your futures, pointing to <b>{num(raise.after)}</b> of 1,000 instead of{' '}
            {num(raise.before)}. It costs $0 today.
          </p>
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

      {pick === 'bonus' && effect && (
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
            Putting {money(aside)} aside points to <b>{num(effect.after)}</b> of 1,000 instead of {num(effect.before)}. It’s a
            one-off, so your monthly amount stays the same.
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
