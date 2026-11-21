import { useMemo, useState } from 'react';
import { DEFAULT_SEED } from '../config';
import { AnimatedNumber, Explain, Switch, Term } from '../components/bits';
import { AboutYou, CompareCard } from '../components/AboutYou';
import { Inspector } from '../components/Inspector';
import { River } from '../components/River';
import type { Analysis, WorryCard } from '../engine/analyse';
import { A } from '../engine/assumptions';
import { mulberry32 } from '../engine/rng';
import { simulate } from '../engine/simulate';
import { LEVER_IDS, STATUS_LABELS, type LeverId } from '../engine/types';
import { WORRIES, worryInfo } from '../engine/worries';
import { leverCopy, leverCostLine, worryAnswer, worryTitle } from '../lib/copy';
import { money, moneyShort, num } from '../lib/format';
import { useNarration } from '../narrate/client';
import { STEP, anyLever, leverIsOn, useStore } from '../store';

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function onLevers(): LeverId[] {
  const l = useStore.getState().levers;
  return LEVER_IDS.filter((id) => leverIsOn(l, id));
}

function Headline({ a }: { a: Analysis | null }) {
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
          <strong>
            +<AnimatedNumber value={a.rescue.total} />
          </strong>{' '}
          futures rescued
        </p>
        <p className="context">
          {subject}{activeWorry ? ` · ${worryTitle(activeWorry)}` : ''} · <span className="was">{num(a.scenarioSummary.counts[0])}</span>
          <span aria-hidden="true"> → </span>
          <span className="sr-only"> then </span>
          <b>
            <AnimatedNumber value={now} />
          </b>{' '}
          in control
        </p>
      </div>
    );
  }
  const before = a && activeWorry ? a.baseSummary.counts[0] : null;
  // The single habit that leaves the most futures in control, same luck.
  const best = a?.ranking.reduce<(typeof a.ranking)[number] | null>((b, r) => (!b || r.inControl > b.inControl ? r : b), null) ?? null;
  return (
    <div className="headline">
      <p className="count" aria-live="polite">
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
        of 1,000 futures in control{activeWorry ? '' : ' today'}
      </p>
      {activeWorry && <p className="context">{activeWorry === 'all' ? 'If all of it happens at once' : worryInfo(activeWorry).ifClause}</p>}
      {best && best.inControl > now && (
        <p className="reach">
          <strong>
            <AnimatedNumber value={best.inControl} />
          </strong>{' '}
          within reach with one habit: {lowerFirst(leverCopy(best.id, inputs).noun)}
        </p>
      )}
    </div>
  );
}

// The toy: drag what you set aside each month and watch all 1,000 lives move.
function SaveDial() {
  const monthly = useStore((s) => s.inputs.monthly);
  const first = useStore((s) => s.first);
  const now = useStore((s) => s.analysis?.summary.counts[0] ?? null);
  const setInputs = useStore((s) => s.setInputs);
  const set = (v: number) => setInputs({ monthly: Math.max(0, Math.min(2000, Math.round(v / 5) * 5)) });
  const moved = first && now !== null && monthly !== first.monthly;
  return (
    <div className="dial">
      <div className="dial-top">
        <label htmlFor="dial">Set aside</label>
        <span className="dial-amount">
          <AnimatedNumber value={monthly} duration={200} prefix="$" />
          <small> a month</small>
        </span>
      </div>
      <input
        id="dial"
        type="range"
        min={0}
        max={1000}
        step={5}
        value={Math.min(1000, monthly)}
        aria-valuetext={`$${monthly} a month`}
        onChange={(e) => set(Number(e.target.value))}
      />
      <div className="dial-row">
        {[25, 50, 100].map((d) => (
          <button type="button" key={d} className="chip" onClick={() => set(monthly + d)}>
            +${d}
          </button>
        ))}
        {moved && (
          <button type="button" className="link" onClick={() => set(first!.monthly)}>
            Back to ${first!.monthly}
          </button>
        )}
        <span className="dial-delta" aria-live="polite">
          {moved && now !== null ? (
            <>
              {num(first!.inControl)} → <b>{num(now)}</b> in control
            </>
          ) : null}
        </span>
      </div>
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
    // Each line finishes "In 849 of your 1,000 futures, …".
    ['Got through bad years', m.shockProof, 'every rough patch (a layoff, a market drop) was covered. You never ran out of money or had to touch your retirement savings.'],
    ['6 months saved by 35', a.startAge <= 35 ? m.room35 : null, 'by 35 you have 6 months of living costs saved that you can use any time. That’s enough to switch jobs or take a break.'],
    ['A year saved by 45', m.room45, 'by 45 you have a full year of living costs saved that you can use any time.'],
    ['Home', m.home, 'you have the down payment by the age you picked.'],
    ['Work optional by 65', m.workOptional65, 'by 65 your savings plus government pensions (CPP and OAS) pay for at least 70% of what you usually spend. That’s enough to stop working if you want to.'],
    ...goals.map((g, k): [string, number | null, string] => [
      `${g.label} by ${g.byAge}`,
      m.goals[k] ?? null,
      'you can pay for it by then from savings, without touching your emergency cushion.',
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
            <Term explain={`In ${num(n!)} of your 1,000 futures, ${explain}`}>{label}</Term>
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
      <WhatIfPanel a={a} />
      <Milestones a={a} />
      <CompareCard />
      <details className="drawer live-answers">
        <summary>Change your answers</summary>
        <p className={`note-line${computing ? ' busy' : ''}${note ? '' : ' empty'}`} aria-live="polite">
          {note}
        </p>
        <AboutYou live />
      </details>
      <p className="hint">
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
      <button type="button" className="secondary" aria-pressed={on} onClick={() => setActive(on ? null : card.id)}>
        {on ? 'Showing' : 'Show'}
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
    <section className="worries" aria-label="Worries">
      <h2 className="small-head">What if…</h2>
      <div className="chips">
        {WORRIES.map((w) => (
          <button type="button" key={w.id} className="chip" aria-pressed={!!worries[w.id]} onClick={() => toggle(w.id)}>
            <span aria-hidden="true">{worries[w.id] ? '✓ ' : '+ '}</span>
            {w.label}
          </button>
        ))}
      </div>
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
    </section>
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
                <Explain label={copy.title} text={copy.explain} />
                {row.id === 'match' && (
                  <p className="hint">
                    {row.askHR ? 'If matched: ' : 'Employer adds '}
                    <b>~{money(row.yearlyMatch)}/yr</b>
                  </p>
                )}
                <p className="effect">
                  <b>+{num(row.rescued)}</b> rescued
                </p>
              </div>
              <Switch checked={on} onChange={() => toggle(row.id)} label={copy.title} />
            </li>
          );
        })}
      </ol>
      <p className="hint waiting-line">
        Wait {A.waitingYears} years: <b>{num(a.waiting.inControl)}</b> instead of <b>{num(now)}</b>.
      </p>
      <details className="drawer">
        <summary>Short and long term, together</summary>
        <Together />
      </details>
    </>
  );
}


const NEXT_LABEL: Record<number, string> = { [STEP.futures]: 'What helps most?', [STEP.habits]: 'Pick one to try' };

export function Explore() {
  const step = useStore((s) => s.step);
  const setStep = useStore((s) => s.setStep);
  const a = useStore((s) => s.analysis);
  const selected = useStore((s) => s.selectedPath);
  const playing = useStore((s) => s.playing);
  const activeWorry = useStore((s) => s.activeWorry);
  const seed = useStore((s) => s.seed);
  const setState = useStore((s) => s.setState);
  const [another, setAnother] = useState(0);
  // A switched-on habit lights up what it rescues; otherwise a worry lights up
  // the futures it makes harder.
  const mask =
    a && step === STEP.habits && a.rescue
      ? a.rescue.mask
      : a && activeWorry
        ? (a.cards.find((c) => c.id === activeWorry)?.mask ?? null)
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
        <Headline a={a} />
        {step === STEP.futures && <SaveDial />}
        <River
          analysis={a}
          mask={mask}
          selected={selected}
          playing={playing}
          onPlayDone={(i) => setState({ playing: null, selectedPath: i })}
          onSelect={(i) => setState({ selectedPath: i, playing: null })}
        />
        <Legend a={a} />
      </div>
      <div className="side">
        {path && selected !== null && (
          <Inspector key={selected} index={selected} path={path} plain={plain} onAnother={showAnother} onClose={() => setState({ selectedPath: null })} />
        )}
        {a && (
          <button
            type="button"
            className="secondary play"
            disabled={playing !== null}
            onClick={() => {
              setState({ selectedPath: null, playing: order[another % order.length] });
              setAnother(another + 1);
            }}
          >
            {playing !== null ? 'Playing one of your lives…' : '▶ Play one of your lives'}
          </button>
        )}
        {a && step === STEP.futures && <FuturesPanel a={a} />}
        {a && step === STEP.habits && <HabitsPanel a={a} />}
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
