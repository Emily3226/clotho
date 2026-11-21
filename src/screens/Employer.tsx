import { useMemo } from 'react';
import { APP_NAME } from '../config';
import { mulberry32 } from '../engine/rng';
import { WORRIES } from '../engine/worries';

const COHORT = 200;

// A synthetic cohort. Nobody here is a real person.
function sampleCohort() {
  const rng = mulberry32(13);
  const weights = [0.58, 0.41, 0.72, 0.63, 0.34, 0.29];
  let fullMatch = 0;
  let someMatch = 0;
  let auto = 0;
  let before = 0;
  let after = 0;
  let tookStep = 0;
  const worries = WORRIES.map(() => 0);
  for (let i = 0; i < COHORT; i++) {
    const r = rng();
    if (r < 0.44) fullMatch++;
    else if (r < 0.67) someMatch++;
    if (rng() < 0.39) auto++;
    weights.forEach((w, k) => {
      if (rng() < w) worries[k]++;
    });
    const b = 2 + Math.floor(rng() * 5);
    const lift = rng() < 0.82 ? 1 + Math.floor(rng() * 3) : 0;
    before += b;
    after += Math.min(10, b + lift);
    if (rng() < 0.61) tookStep++;
  }
  return {
    fullMatch,
    someMatch,
    auto,
    tookStep,
    before: before / COHORT,
    after: after / COHORT,
    worries: WORRIES.map((w, k) => ({ label: w.label, n: worries[k] })).sort((a, b) => b.n - a.n),
  };
}

function Meter({ label, n, note }: { label: string; n: number; note?: string }) {
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <b>
          {n} of {COHORT}
        </b>
      </div>
      <div className="meter-track" aria-hidden="true">
        <span style={{ width: `${(n / COHORT) * 100}%` }} />
      </div>
      {note && <p className="hint">{note}</p>}
    </div>
  );
}

export function Employer() {
  const c = useMemo(sampleCohort, []);
  return (
    <section className="narrow employer">
      <p className="sample-flag" role="note">
        Sample data · {COHORT} synthetic employees · no real people
      </p>
      <p className="eyebrow">{APP_NAME} for plan sponsors</p>
      <h1 className="h-question">What your people are worried about, and what moved them.</h1>
      <p className="lede">
        A plan sponsor sees totals only, never a person. This page shows what that view could look like, filled with a
        made-up cohort.
      </p>

      <div className="card">
        <h2>The behaviours that matter</h2>
        <Meter label="Taking the full employer match" n={c.fullMatch} note={`${c.someMatch} more take part of it. The rest leave money their employer would add.`} />
        <Meter label="Automatic contributions switched on" n={c.auto} />
        <Meter label="Chose one step after seeing their futures" n={c.tookStep} />
      </div>

      <div className="card">
        <h2>What’s on their minds</h2>
        {c.worries.map((w) => (
          <Meter key={w.label} label={w.label} n={w.n} />
        ))}
      </div>

      <div className="card summary">
        <h2>Confidence, before and after</h2>
        <div className="summary-grid">
          <div>
            <p className="eyebrow">Average, out of 10</p>
            <p className="big-num">
              <span className="was">{c.before.toFixed(1)}</span>
              <span aria-hidden="true"> → </span>
              <span className="sr-only"> then </span>
              {c.after.toFixed(1)}
            </p>
          </div>
        </div>
        <p className="hint">Asked at the start and again after choosing one step.</p>
      </div>

      <p className="hint">
        Nothing on this page comes from real use. In the app itself, answers never leave the device.{' '}
        <a href="#/">Back to {APP_NAME}</a>
      </p>
    </section>
  );
}
