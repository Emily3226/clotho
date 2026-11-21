import { useEffect, useState } from 'react';
import { AnimatedNumber, Field } from '../components/bits';
import { River } from '../components/River';
import { NO_LEVERS } from '../engine/types';
import { leverCopy } from '../lib/copy';
import { num } from '../lib/format';
import { STEP, demoMode, leverOn, useStore } from '../store';

// The monthly check-in: about 30 seconds, then out.
export function Return() {
  const commitment = useStore((s) => s.commitment);
  const inputs = useStore((s) => s.inputs);
  const a = useStore((s) => s.analysis);
  const setState = useStore((s) => s.setState);
  const setStep = useStore((s) => s.setStep);
  const [answer, setAnswer] = useState<'yes' | 'notyet' | 'changed' | null>(null);
  const [saved, setSaved] = useState(inputs.saved);

  // Run the futures with the committed habit locked in.
  useEffect(() => {
    if (commitment) setState({ levers: leverOn(NO_LEVERS, commitment.lever), worries: {}, activeWorry: null });
  }, [commitment, setState]);

  if (!commitment) {
    return (
      <section className="narrow">
        <p className="lede">No step picked yet.</p>
        <button type="button" className="primary" onClick={() => setStep(STEP.about)}>
          Start
        </button>
      </section>
    );
  }

  const copy = leverCopy(commitment.lever, inputs);
  const now = a?.summary.counts[0] ?? commitment.startInControl;
  const smaller = commitment.lever === 'auto100' ? 'auto50' : commitment.lever === 'auto50' ? 'auto25' : null;

  const yes = (months = 1) => {
    // Each month done adds what was set aside, plus the habit's amount.
    const extra = commitment.lever.startsWith('auto') ? Number(commitment.lever.slice(4)) : 0;
    const add = months * (inputs.monthly + extra);
    setState({
      commitment: { ...commitment, streak: commitment.streak + months, lastCheckISO: new Date().toISOString() },
      inputs: { ...inputs, saved: Math.round(inputs.saved + add) },
    });
    setSaved(Math.round(inputs.saved + add));
    setAnswer('yes');
  };

  return (
    <section className="explore back">
      <div className="stage">
        <p className="eyebrow">Monthly check-in</p>
        <div className="headline">
          <p className="count" aria-live="polite">
            Since you started:{' '}
            <strong>
              <span className="was">{num(commitment.startInControl)}</span>
              <span aria-hidden="true"> → </span>
              <span className="sr-only"> then </span>
              <AnimatedNumber value={now} />
            </strong>{' '}
            futures in control.
          </p>
          <p className="context">
            {copy.title} · streak: {commitment.streak} {commitment.streak === 1 ? 'month' : 'months'}
          </p>
        </div>
        <River analysis={a} mask={null} selected={null} onSelect={() => {}} />
      </div>
      <div className="side">
        <h1 className="h-question">Did you do it this month?</h1>
        <p className="hint">{copy.title}.</p>
        <div className="row">
          <button type="button" className="primary" aria-pressed={answer === 'yes'} onClick={() => yes(1)}>
            Yes
          </button>
          <button type="button" className="secondary" aria-pressed={answer === 'notyet'} onClick={() => setAnswer('notyet')}>
            Not yet
          </button>
          <button type="button" className="ghost" aria-pressed={answer === 'changed'} onClick={() => setAnswer('changed')}>
            Changed my mind
          </button>
        </div>
        {answer === 'yes' && (
          <>
            <p className="lede">Nice. That’s {commitment.streak} {commitment.streak === 1 ? 'month' : 'months'} in a row.</p>
            <Field
              id="saved-now"
              label="About how much have you saved now? (optional)"
              value={saved}
              min={0}
              max={100000}
              step={100}
              prefix="$"
              onChange={(v) => {
                setSaved(v);
                setState({ inputs: { ...useStore.getState().inputs, saved: v } });
              }}
            />
          </>
        )}
        {answer === 'notyet' && (
          <div className="card">
            <p>No problem. Life gets busy.{smaller ? ' Want a smaller version?' : ' It will be here next month.'}</p>
            {smaller && (
              <button type="button" className="secondary" onClick={() => setState({ commitment: { ...commitment, lever: smaller } })}>
                Switch to {leverCopy(smaller, inputs).title.toLowerCase()}
              </button>
            )}
          </div>
        )}
        {answer === 'changed' && (
          <div className="card">
            <p>That’s fine. You decide. Pick a different step any time.</p>
            <button type="button" className="secondary" onClick={() => setStep(STEP.habits)}>
              See the habits again
            </button>
          </div>
        )}
        {demoMode() && (
          <button type="button" className="link" onClick={() => yes(3)}>
            Demo: jump ahead 3 months
          </button>
        )}
        <div className="nav">
          <button type="button" className="ghost" onClick={() => setStep(STEP.start)}>
            Done
          </button>
          <button type="button" className="ghost" onClick={() => setStep(STEP.futures)}>
            Explore my futures
          </button>
        </div>
      </div>
    </section>
  );
}
