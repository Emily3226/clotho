import { useMemo, useState } from 'react';
import { DEFAULT_SEED } from '../config';
import { AnimatedNumber, Switch, Term } from '../components/bits';
import { AboutYou, CompareCard } from '../components/AboutYou';
import { Inspector } from '../components/Inspector';
import { River } from '../components/River';
import type { Analysis, WorryCard } from '../engine/analyse';
import { A } from '../engine/assumptions';
import { mulberry32 } from '../engine/rng';
import { simulate } from '../engine/simulate';
import { LEVER_IDS, STATUS_LABELS, type LeverId, type WorryId } from '../engine/types';
import { WORRIES, worryInfo } from '../engine/worries';
import { ageShift, leverCopy, leverCostLine, worryAnswer, worryTitle } from '../lib/copy';
import { money, moneyShort, num } from '../lib/format';
import { narrationAvailable, useNarration } from '../narrate/client';
import { STEP, anyLever, leverIsOn, useStore } from '../store';

function onLevers(): LeverId[] {
  const l = useStore.getState().levers;
  return LEVER_IDS.filter((id) => leverIsOn(l, id));
}

function Headline({ a }: { a: Analysis | null }) {
  const step = useStore((s) => s.step);
  const levers = useStore((s) => s.levers);
  const activeWorry = useStore((s) => s.activeWorry);
  const inputs = useStore((s) => s.inputs);
  const now = a?.summary.counts[0] ?? 0;
  const ids = onLevers();
  // With a habit switched on, lead with what it rescues.
  if (a && a.rescue && anyLever(levers)) {
    const subject = ids.length === 1 ? leverCopy(ids[0], inputs).noun : 'These habits';
    return (
      <div className="headline">
        <p className="count" aria-live="polite">
          {subject} {ids.length === 1 ? 'rescues' : 'rescue'}{' '}
          <strong>
            <AnimatedNumber value={a.rescue.total} />
          </strong>{' '}
          of your futures{activeWorry ? `, ${worryTitle(activeWorry).toLowerCase()} included` : ''}.
        </p>
        <p className="context">
          In control in <span className="was">{num(a.scenarioSummary.counts[0])}</span>
          <span aria-hidden="true"> → </span>
          <span className="sr-only"> then </span>
          <b>
            <AnimatedNumber value={now} />
          </b>{' '}
          of 1,000 · {num(a.rescue.toControl)} move to in control, {num(a.rescue.toMostly)} to mostly there
        </p>
      </div>
    );
  }
  const before = a && activeWorry ? a.baseSummary.counts[0] : null;
  return (
    <div className="headline">
      <p className="count" aria-live="polite">
        You’re in control in{' '}
        <strong>
          {before !== null && before !== now && (
            <>
              <span className="was">{num(before)}</span>
              <span aria-hidden="true"> → </span>
              <span className="sr-only"> then </span>
            </>
          )}
          <AnimatedNumber value={now} />
        </strong>{' '}
        of your 1,000 futures.
      </p>
      <p className="context">
        {activeWorry ? `What if: ${worryTitle(activeWorry)}` : step === STEP.habits ? 'Switch on a habit to see which futures it rescues.' : 'Same you, a thousand different runs of luck.'}
      </p>
    </div>
  );
}

function Legend({ a }: { a: Analysis | null }) {
  return (
    <ul className="legend" aria-label="Futures by status">
      {STATUS_LABELS.map((label, s) => (
        <li key={label}>
          <span className={`status-line s${s}`} aria-hidden="true" />
          <span>{label}</span>
          <b>{a ? <AnimatedNumber value={a.summary.counts[s]} /> : '–'}</b>
        </li>
      ))}
    </ul>
  );
}

function Milestones({ a }: { a: Analysis }) {
  const m = a.summary.milestoneCounts;
  const goals = useStore((s) => s.inputs.goals ?? []);
  const items: [string, number | null, string][] = [
    ['Shock-proof', m.shockProof, 'Never had to dip into the workplace plan, and never ended a year short.'],
    ['Room to move at 35', a.startAge <= 35 ? m.room35 : null, 'Savings you can reach cover 6 months of spending: enough to change jobs, retrain or take time off.'],
    ['Room to move at 45', m.room45, 'Savings you can reach cover 12 months of spending.'],
    ['Home', m.home, 'The down payment is reached by your target age.'],
    ['Work-optional by 65', m.workOptional65, 'Savings and public pensions cover 70% of the spending you’re used to, so working is a choice.'],
    ...goals.map((g, k): [string, number | null, string] => [
      `${g.label} by ${g.byAge}`,
      m.goals[k] ?? null,
      `Paid from savings you can reach, without touching the cushion. Counted on its own: it doesn’t change whether a future is in control.`,
    ]),
  ];
  return (
    <ul className="milestones">
      {items
        .filter(([, n]) => n !== null)
        .map(([label, n, explain]) => (
          <li key={label}>
            <b>
              <AnimatedNumber value={n!} />
            </b>
            <Term explain={explain}>{label}</Term>
          </li>
        ))}
    </ul>
  );
}

function FuturesPanel({ a }: { a: Analysis }) {
  const seed = useStore((s) => s.seed);
  const note = useStore((s) => s.note);
  const computing = useStore((s) => s.computing);
  const setState = useStore((s) => s.setState);
  return (
    <>
      <p className="lede">Each line is one life to 70. Tap one to read it.</p>
      <Milestones a={a} />
      <CompareCard />
      <details className="drawer live-answers">
        <summary>Change your answers</summary>
        <p className={`note-line${computing ? ' busy' : ''}`} aria-live="polite">
          {note ?? 'Tap an answer and watch the river move.'}
        </p>
        <AboutYou live />
      </details>
      <p className="hint">
        In today’s dollars.{' '}
        <button type="button" className="link" onClick={() => setState({ seed: seed === DEFAULT_SEED ? Math.floor(Math.random() * 1e6) : DEFAULT_SEED, selectedPath: null })}>
          {seed === DEFAULT_SEED ? 'New run of luck' : 'First run of luck'}
        </button>
      </p>
    </>
  );
}

function WorryCardView({ card }: { card: WorryCard }) {
  const inputs = useStore((s) => s.inputs);
  const active = useStore((s) => s.activeWorry);
  const setActive = useStore((s) => s.setActiveWorry);
  const answer = worryAnswer(card, inputs);
  const { text, narrated } = useNarration('worry', answer.facts, answer.plain);
  const on = active === card.id;
  return (
    <article className={`card worry${on ? ' on' : ''}`}>
      <header>
        <h3>{worryTitle(card.id)}</h3>
      </header>
      <p className="answer">
        {narrated ? (
          <>
            {text}
            <span className="tag">AI wording</span>
          </>
        ) : (
          answer.parts.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : <strong key={i}>{p.strong}</strong>))
        )}
      </p>
      <details className="why">
        <summary>What changes</summary>
        <p className="hint">{card.id === 'all' ? 'Every worry you picked, in the same life.' : `A what-if, not a forecast: ${worryInfo(card.id as WorryId).changes[1].toLowerCase()}.`}</p>
      </details>
      <button type="button" className="secondary" aria-pressed={on} onClick={() => setActive(on ? null : card.id)}>
        {on ? 'Shown in the river' : 'Show in the river'}
      </button>
    </article>
  );
}

function WhatIfPanel({ a }: { a: Analysis }) {
  const worries = useStore((s) => s.worries);
  const toggle = useStore((s) => s.toggleWorry);
  const showAll = useStore((s) => s.showAll);
  const setState = useStore((s) => s.setState);
  const active = useStore((s) => s.activeWorry);
  const count = Object.keys(worries).length;
  return (
    <>
      <p className="lede">Pick a worry. See its size, and what protects you.</p>
      <div className="chips">
        {WORRIES.map((w) => (
          <button type="button" key={w.id} className="chip" aria-pressed={!!worries[w.id]} onClick={() => toggle(w.id)}>
            <span aria-hidden="true">{worries[w.id] ? '✓ ' : '+ '}</span>
            {w.label}
          </button>
        ))}
      </div>
      {a.cards.length === 0 && <p className="hint">Or skip this.</p>}
      <div className="stack">
        {a.cards.map((c) => (
          <WorryCardView key={c.id} card={c} />
        ))}
      </div>
      {count > 1 && (
        <button
          type="button"
          className="link"
          onClick={() => setState({ showAll: !showAll, activeWorry: showAll && active === 'all' ? null : active })}
        >
          {showAll ? 'Hide the toughest case' : 'All at once'}
        </button>
      )}
    </>
  );
}

function Together() {
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const rows = useMemo(() => {
    const [p] = simulate(inputs, {}, levers, 1, { calm: true, paths: 1, trace: true, detail: false });
    const t = p.trace!;
    return [1, 2, 3, 4, 5].map((y) => ({ year: y, cushion: t.cushion[y] ?? 0, target: t.target[y] ?? 0, long: (t.plan[y] ?? 0) + (t.flex[y] ?? 0) }));
  }, [inputs, levers]);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.cushion, r.long, r.target)));
  return (
    <section className="card together">
      <p className="hint">You don’t have to choose. Five steady years, side by side.</p>
      <div className="bars" role="img" aria-label={`After 5 steady years: cushion ${money(rows[4].cushion)}, long-term savings ${money(rows[4].long)}.`}>
        {rows.map((r) => (
          <div key={r.year} className="bar-col">
            <div className="bar-pair">
              <span className="bar cushion" style={{ height: `${(r.cushion / max) * 100}%` }} />
              <span className="bar long" style={{ height: `${(r.long / max) * 100}%` }} />
            </div>
            <span className="bar-label">Year {r.year}</span>
          </div>
        ))}
      </div>
      <p className="bar-key">
        <span><i className="key cushion" /> Cushion: {moneyShort(rows[4].cushion)} by year 5</span>
        <span><i className="key long" /> Long-term: {moneyShort(rows[4].long)} by year 5</span>
      </p>
    </section>
  );
}

function HabitsPanel({ a }: { a: Analysis }) {
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const toggle = useStore((s) => s.toggleLever);
  const now = a.summary.counts[0];
  return (
    <>
      <p className="lede">Switch one on. The futures it rescues light up.</p>
      <ol className="levers">
        {a.ranking.map((row, i) => {
          const copy = leverCopy(row.id, inputs);
          const on = leverIsOn(levers, row.id);
          return (
            <li key={row.id} className={`card lever${on ? ' on' : ''}`}>
              <span className="rank" aria-hidden="true">{i + 1}</span>
              <div className="lever-body">
                <h3>
                  {copy.title}
                  {row.noExtraCost && <span className="tag">No extra cost</span>}
                </h3>
                <p className="cost">{leverCostLine(row)}</p>
                {row.id === 'match' && (
                  <p className="hint">
                    {row.askHR ? 'If your plan has matching, that could be about ' : 'Money your employer adds: about '}
                    <b>{money(row.yearlyMatch)} a year</b>.
                  </p>
                )}
                <p className="effect">
                  Rescues <b>{num(row.rescued)}</b> futures
                  {row.ageDelta !== null && row.ageDelta !== 0 && <span> · {ageShift(row.ageDelta)}</span>}
                </p>
                <details className="why">
                  <summary>How it works</summary>
                  <p className="hint">{copy.explain}</p>
                </details>
              </div>
              <Switch checked={on} onChange={() => toggle(row.id)} label={copy.title} />
            </li>
          );
        })}
      </ol>
      <p className="hint waiting-line">
        Starting {A.waitingYears} years later: <b>{num(a.waiting.inControl)}</b> in control instead of <b>{num(now)}</b>.
      </p>
      <details className="drawer">
        <summary>Short-term and long-term, together</summary>
        <Together />
      </details>
    </>
  );
}

function AiToggle() {
  const aiOn = useStore((s) => s.aiOn);
  const setState = useStore((s) => s.setState);
  const [note, setNote] = useState('');
  const change = async (on: boolean) => {
    setNote('');
    if (!on) return setState({ aiOn: false });
    if (await narrationAvailable()) setState({ aiOn: true });
    else setNote('AI narration isn’t set up here, so the built-in wording stays on. Nothing was sent.');
  };
  return (
    <div className="ai-toggle">
      <Switch checked={aiOn} onChange={change} label="AI narration" />
      <p className="hint" aria-live="polite">
        <b>AI wording {aiOn ? 'on' : 'off'}.</b> {note || 'Sends only anonymous counts. Numbers never change.'}
      </p>
    </div>
  );
}

const NEXT_LABEL: Record<number, string> = { [STEP.futures]: 'Smallest step', [STEP.habits]: 'What if…', [STEP.whatIf]: 'Pick one to try' };
const TITLES: Record<number, string> = { [STEP.futures]: 'Your thousand futures', [STEP.habits]: 'Smallest step, biggest shift', [STEP.whatIf]: 'What if…' };

export function Explore() {
  const step = useStore((s) => s.step);
  const setStep = useStore((s) => s.setStep);
  const a = useStore((s) => s.analysis);
  const selected = useStore((s) => s.selectedPath);
  const activeWorry = useStore((s) => s.activeWorry);
  const seed = useStore((s) => s.seed);
  const setState = useStore((s) => s.setState);
  const [another, setAnother] = useState(0);
  const mask =
    a && step === STEP.whatIf && activeWorry
      ? (a.cards.find((c) => c.id === activeWorry)?.mask ?? null)
      : a && step === STEP.habits && a.rescue
        ? a.rescue.mask
        : null;
  const path = a && selected !== null ? a.paths[selected] : null;
  const plain = a && selected !== null && a.plainPaths ? a.plainPaths[selected] : null;
  // Lives shown by "Show me another", in a seeded order so the mix of
  // statuses matches the real counts.
  const order = useMemo(() => {
    const rng = mulberry32(seed + 7);
    const idx = Array.from({ length: 1000 }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  }, [seed]);
  const showAnother = () => {
    setState({ selectedPath: order[another % order.length] });
    setAnother(another + 1);
  };
  return (
    <section className="explore">
      <div className="stage">
        <p className="eyebrow">{TITLES[step]}</p>
        <Headline a={a} />
        <River analysis={a} mask={mask} selected={selected} onSelect={(i) => setState({ selectedPath: i })} />
        <Legend a={a} />
      </div>
      <div className="side">
        {path && selected !== null && (
          <Inspector key={selected} index={selected} path={path} plain={plain} onAnother={showAnother} onClose={() => setState({ selectedPath: null })} />
        )}
        {!path && a && (
          <button type="button" className="link" onClick={showAnother}>
            Read one of your futures
          </button>
        )}
        {a && step === STEP.futures && <FuturesPanel a={a} />}
        {a && step === STEP.habits && <HabitsPanel a={a} />}
        {a && step === STEP.whatIf && <WhatIfPanel a={a} />}
        <AiToggle />
        <div className="nav">
          <button type="button" className="ghost" onClick={() => setStep(step === STEP.futures ? STEP.about : step - 1)}>
            Back
          </button>
          <button type="button" className="primary" onClick={() => setStep(step + 1)}>
            {NEXT_LABEL[step]}
          </button>
        </div>
      </div>
    </section>
  );
}
