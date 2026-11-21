import { useMemo, useState } from 'react';
import { DEFAULT_SEED } from '../config';
import { AnimatedNumber, ChipGroup, Switch, Term } from '../components/bits';
import { AboutYou, CompareCard } from '../components/AboutYou';
import { Inspector } from '../components/Inspector';
import { River } from '../components/River';
import type { Analysis, WorryCard } from '../engine/analyse';
import { A } from '../engine/assumptions';
import { mulberry32 } from '../engine/rng';
import { simulate } from '../engine/simulate';
import { LEVER_IDS, STATUS_LABELS, type LeverId } from '../engine/types';
import { CONCERN_EFFECTS, MAX_CONCERNS, effectLabel } from '../engine/concerns';
import { WORRIES } from '../engine/worries';
import { leverCopy, leverCostLine, worryAnswer, worryTitle } from '../lib/copy';
import { money, moneyShort, num } from '../lib/format';
import { useNarration } from '../narrate/client';
import { STEP, anyLever, leverIsOn, selectedWorries, useStore } from '../store';

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
        of 1,000 futures in control
      </p>
      {activeWorry && <p className="context">What if: {worryTitle(activeWorry)}</p>}
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
    ['Got through bad years', m.shockProof, 'Never had to dip into the workplace plan, and never ended a year short.'],
    ['6 months saved by 35', a.startAge <= 35 ? m.room35 : null, 'Savings you can reach cover 6 months of spending: enough to change jobs, retrain or take time off.'],
    ['A year saved by 45', m.room45, 'Savings you can reach cover 12 months of spending.'],
    ['Home', m.home, 'The down payment is reached by your target age.'],
    ['Work optional by 65', m.workOptional65, 'Savings and public pensions cover 70% of the spending you’re used to, so working is a choice.'],
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
  // A worry typed in the person's own words keeps their words as the title.
  const typed = useStore((s) => s.concerns).filter((c) => c.kind === card.id);
  const chipOn = useStore((s) => card.id !== 'all' && !!s.worries[card.id]);
  const words = typed.map((c) => `“${c.label}”`).join(', ');
  return (
    <article className={`card worry${on ? ' on' : ''}`}>
      <header>
        <h3>{typed.length && !chipOn ? words : worryTitle(card.id)}</h3>
      </header>
      {typed.length > 0 && <p className="hint">{chipOn ? `Also covers ${words}.` : `Tested as: ${worryTitle(card.id)}.`}</p>}
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

// A worry in the person's own words. It is matched to one of the what-ifs
// the simulation can run, and they can change what it is tested as.
function ConcernEditor() {
  const concerns = useStore((s) => s.concerns);
  const add = useStore((s) => s.addConcern);
  const setKind = useStore((s) => s.setConcernKind);
  const remove = useStore((s) => s.removeConcern);
  const [text, setText] = useState('');
  return (
    <div className="goals concerns">
      {concerns.map((c) => (
        <div className="home-q goal" key={c.id}>
          <div className="goal-head">
            <b>{c.label}</b>
            <button type="button" className="link" onClick={() => remove(c.id)} aria-label={`Remove ${c.label}`}>
              Remove
            </button>
          </div>
          {c.kind ? (
            // Matched: one line, with the choices tucked away until asked for.
            <details className="tested-as">
              <summary>
                Tested as: {effectLabel(c.kind)} <span className="link">Change</span>
              </summary>
              <ChipGroup legend={`Tested as (${c.label})`} label="Test it as" selected={(v) => v === c.kind} options={CONCERN_EFFECTS.map((e) => ({ value: e.kind, label: e.label }))} onPick={(v) => setKind(c.id, v)} />
            </details>
          ) : (
            <ChipGroup legend={`What would it mostly do? (${c.label})`} label="What would it mostly do?" selected={() => false} options={CONCERN_EFFECTS.map((e) => ({ value: e.kind, label: e.label }))} onPick={(v) => setKind(c.id, v)} />
          )}
          {!c.kind && <p className="hint">Pick the closest one and it joins the cards below.</p>}
        </div>
      ))}
      {concerns.length < MAX_CONCERNS && (
        <form
          className="goal-add"
          onSubmit={(e) => {
            e.preventDefault();
            add(text);
            setText('');
          }}
        >
          <label className="q-label" htmlFor="concern-text">
            {concerns.length ? 'Anything else?' : 'Something else on your mind?'}
          </label>
          <div className="goal-row">
            <input id="concern-text" value={text} maxLength={60} autoComplete="off" placeholder="My parents need care, rent keeps rising…" onChange={(e) => setText(e.target.value)} />
            <button type="submit" className="secondary" disabled={!text.trim()}>
              Add
            </button>
          </div>
          <p className="hint">Stays on this device. It is tested as the closest what-if, which you can change.</p>
        </form>
      )}
    </div>
  );
}

function WhatIfPanel({ a }: { a: Analysis }) {
  const worries = useStore((s) => s.worries);
  const toggle = useStore((s) => s.toggleWorry);
  const showAll = useStore((s) => s.showAll);
  const setState = useStore((s) => s.setState);
  const active = useStore((s) => s.activeWorry);
  const concerns = useStore((s) => s.concerns);
  const count = Object.keys(selectedWorries(worries, concerns)).length;
  return (
    <>
      <div className="chips">
        {WORRIES.map((w) => (
          <button type="button" key={w.id} className="chip" aria-pressed={!!worries[w.id]} onClick={() => toggle(w.id)}>
            <span aria-hidden="true">{worries[w.id] ? '✓ ' : '+ '}</span>
            {w.label}
          </button>
        ))}
      </div>
      <ConcernEditor />
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


const NEXT_LABEL: Record<number, string> = { [STEP.futures]: 'What helps most?', [STEP.habits]: 'What if…', [STEP.whatIf]: 'Pick one to try' };

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
        {a && step === STEP.whatIf && <WhatIfPanel a={a} />}
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
