import { useEffect, useState } from 'react';
import { AnimatedNumber, Field } from '../components/bits';
import { River } from '../components/River';
import { WindfallQuestion } from '../components/Windfall';
import { leverCopy } from '../lib/copy';
import { num } from '../lib/format';
import { leversFor } from '../lib/windfall';
import { STEP, demoMode, useStore } from '../store';

// The monthly check-in: about 30 seconds, then out.
export function Return() {
  const commitment = useStore((s) => s.commitment);
  const inputs = useStore((s) => s.inputs);
  const a = useStore((s) => s.analysis);
  const setState = useStore((s) => s.setState);
  const setStep = useStore((s) => s.setStep);
  const [answer, setAnswer] = useState<'yes' | 'notyet' | 'changed' | null>(null);

  // Run the futures with the committed habit locked in, plus the raise habit
  // if it was added at a check-in.
  useEffect(() => {
    if (commitment) setState({ levers: leversFor(commitment.lever, commitment.alsoRaises), worries: {}, activeWorry: null });
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
  // One "Yes" per calendar month. The demo jump is the only way past it.
  // Months are counted in local time, so a check-in late on the last evening
  // of a month still counts for that month.
  const monthOf = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const last = commitment.lastCheckISO ? monthOf(new Date(commitment.lastCheckISO)) : null;
  const gap = last === null ? null : monthOf(new Date()) - last;
  const doneThisMonth = gap === 0;
  // A missed month ends the run: "in a row" means in a row.
  const streak = gap !== null && gap <= 1 ? commitment.streak : 0;
  const started = streak > 0;

  const yes = (months = 1) => {
    // Each month done adds what was set aside, plus the habit's amount.
    const extra = commitment.lever.startsWith('auto') ? Number(commitment.lever.slice(4)) : 0;
    const add = months * (inputs.monthly + extra);
    setState({
      commitment: { ...commitment, streak: streak + months, lastCheckISO: new Date().toISOString() },
      inputs: { ...inputs, saved: Math.round(inputs.saved + add) },
    });
    setAnswer('yes');
  };

  return (
    <section className="explore back">
      <div className="stage">
        <p className="eyebrow">Monthly check-in</p>
        <div className="headline">
          {/* Honest at any streak: where you started, and where keeping the
              habit points. The number is a projection, never claimed progress. */}
          <p className="count" aria-live="polite">
            You started at <strong>{num(commitment.startInControl)}</strong>. Keeping it up points to{' '}
            <strong>
              <AnimatedNumber value={now} />
            </strong>{' '}
            of 1,000.
          </p>
          <p className="context">
            {copy.title}
            {commitment.alsoRaises && commitment.lever !== 'raises' ? ' + part of every raise' : ''} ·{' '}
            {started
              ? `kept ${streak} ${streak === 1 ? 'month' : 'months'} in a row`
              : commitment.streak > 0
                ? 'starting a new run this month'
                : commitment.outcome === 'done'
                  ? 'kept 0 months · set up, first month counting'
                  : 'not started yet'}
          </p>
        </div>
        <River analysis={a} mask={null} selected={null} onSelect={() => {}} />
      </div>
      <div className="side">
        <h1 className="h-question">{doneThisMonth && answer !== 'yes' ? 'You’ve checked in this month.' : 'Did you do it this month?'}</h1>
        <p className="hint">{doneThisMonth && answer !== 'yes' ? 'See you next month.' : `${copy.title}.`}</p>
        <div className="row">
          <button type="button" className="primary" aria-pressed={answer === 'yes'} disabled={doneThisMonth || answer === 'yes'} onClick={() => yes(1)}>
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
              value={inputs.saved}
              min={0}
              max={100000}
              step={100}
              prefix="$"
              // Read from the store, so a bonus added below shows here and
              // editing this field builds on it rather than erasing it.
              onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, saved: v } })}
            />
          </>
        )}
        <WindfallQuestion commitment={commitment} />
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
