import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SEED } from '../config';
import { AnimatedNumber, ChipGroup, Explain, Switch, Term } from '../components/bits';
import { AboutYou, CompareCard } from '../components/AboutYou';
import { Inspector } from '../components/Inspector';
import { KeepReachableCard } from '../components/KeepReachable';
import { River } from '../components/River';
import { whyNot, type Analysis, type HoldTest, type WhyKey, type WorryCard } from '../engine/analyse';
import { A } from '../engine/assumptions';
import { mulberry32 } from '../engine/rng';
import { simulate } from '../engine/simulate';
import { MARKET_SETS } from '../engine/profile';
import { LEVER_IDS, NO_LEVERS, STATUS_LABELS, leverOnly, type AssumptionSetId, type LeverId, type WorryId } from '../engine/types';
import { CONCERN_EFFECTS, MAX_CONCERNS, effectLabel } from '../engine/concerns';
import { WORRIES, worryInfo } from '../engine/worries';
import { cutAgesFor, defaultCutAge, type CutShort } from '../engine/noSixtyFive';
import type { CutShortRequest } from '../engine/noSixtyFive.worker';
import { leverCopy, leverCostLine, noSixtyFiveAnswer, worryAnswer, worryTitle } from '../lib/copy';
import { money, moneyShort, num } from '../lib/format';
import { classifyWorry, useNarration } from '../narrate/client';
import { STEP, anyLever, currentScenario, leverIsOn, selectedWorries, useStore } from '../store';

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function onLevers(): LeverId[] {
  const l = useStore.getState().levers;
  return LEVER_IDS.filter((id) => leverIsOn(l, id));
}

// The count is one point in a range: the same futures under cautious,
// middle and hopeful returns. Shown with the headline so the number is never
// read as a forecast.
function RangeLine({ a, inControl = false }: { a: Analysis; inControl?: boolean }) {
  const { low, high, bySet } = a.range;
  if (high === 0) return null;
  if (low === high) {
    return <p className="range">The same under cautious, middle and hopeful markets.</p>;
  }
  return (
    <p className="range">
      <Term
        explain={`Cautious markets: ${num(bySet.cautious)}. Middle: ${num(bySet.middle)}. Hopeful: ${num(bySet.hopeful)}. Same lives, same luck, different long-run returns. You are seeing ${MARKET_SETS[a.set].label.toLowerCase()}; change it under Assumptions.`}
      >
        {num(low)} to {num(high)}
        {inControl ? ' in control,' : ''} depending on how markets do
      </Term>
    </p>
  );
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
        <p className="range">
          {num(a.rescue.toControl)} now in control, {num(a.rescue.toMostly)} mostly there
        </p>
        <RangeLine a={a} inControl />
      </div>
    );
  }
  const before = a && activeWorry ? a.baseSummary.counts[0] : null;
  // The habit ranked first: the same one the list and the card name.
  const best = a?.ranking[0] ?? null;
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
      {a && <RangeLine a={a} />}
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
  const goals = a.goals;
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

const WHY_LABEL: Record<WhyKey, string> = {
  workOptional65: 'Work isn’t optional by 65',
  room45: 'Less than a year saved by 45',
  room35: 'Less than 6 months saved by 35',
  shockProof: 'A bad year ran short or dipped into the workplace plan',
};
const STATUS_MEANS = ['all four checks met', 'work optional by 65, one other check missed', 'work optional by 65 with two or more missed, or close to it', 'the rest'];

// Where the headline count comes from: what "in control" means, how the
// other futures are sorted, and which checks they miss.
function WhyNumber({ a }: { a: Analysis }) {
  const inputs = useStore((s) => s.inputs);
  const why = useMemo(() => whyNot(a.paths, a.startAge), [a]);
  const counts = a.summary.counts;
  const top = a.ranking[0];
  return (
    <details className="drawer why-number">
      <summary>Why {num(counts[0])}?</summary>
      <p className="hint">
        Each of your 1,000 futures gets four checks: getting through bad years, 6 months saved by 35, a year saved by 45, and work optional by 65. In
        control means all four.
      </p>
      <ul className="why-status">
        {STATUS_LABELS.map((label, i) => (
          <li key={label}>
            <i className={`status-line s${i}`} aria-hidden="true" />
            <span>
              <b>{num(counts[i])}</b> {label.toLowerCase()}: <small>{STATUS_MEANS[i]}</small>
            </span>
          </li>
        ))}
      </ul>
      {why.others > 0 && (
        <>
          <p className="q-label">What the other {num(why.others)} miss</p>
          <ul className="why-bars">
            {why.missed.map((m) => (
              <li key={m.key}>
                <span>
                  {WHY_LABEL[m.key]} <b>{num(m.count)}</b>
                </span>
                <i style={{ width: `${Math.max(2, (100 * m.count) / why.others)}%` }} aria-hidden="true" />
              </li>
            ))}
          </ul>
          <p className="hint">A future can miss more than one, so these can add up to more than {num(why.others)}.</p>
        </>
      )}
      {top && top.rescued > 0 && (
        <p className="hint">
          What moves the most: <b>{leverCopy(top.id, inputs).noun}</b> rescues {num(top.rescued)} of them.
        </p>
      )}
    </details>
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
      <WhyNumber a={a} />
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
  const aiOn = useStore((s) => s.aiOn);
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
            const added = add(text);
            setText('');
            // Keywords first; with AI wording on, Gemini sorts what they miss.
            if (added && !added.kind && aiOn) {
              void classifyWorry(added.label).then((kind) => {
                if (kind && useStore.getState().concerns.some((c) => c.id === added.id && !c.kind)) setKind(added.id, kind);
              });
            }
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
          <p className="hint">{aiOn ? 'With AI wording on, what you type is sent to sort it.' : 'Stays on this device.'} It is tested as the closest what-if, which you can change.</p>
        </form>
      )}
    </div>
  );
}

// Why save if there may be no 65? The same lives, stopped early: what the
// best step leaves you to use then, against what it cost along the way.
function NoSixtyFive({ a }: { a: Analysis }) {
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const seed = useStore((s) => s.seed);
  const market = useStore((s) => s.set);
  const worries = useStore((s) => s.worries);
  const concerns = useStore((s) => s.concerns);
  const active = useStore((s) => s.activeWorry);
  const [picked, setPicked] = useState<number | null>(null);
  const ages = cutAgesFor(inputs.age);
  const cutAge = picked !== null && ages.includes(picked) ? picked : defaultCutAge(inputs.age);
  // The habits switched on, or else the one ranked first.
  const on = LEVER_IDS.filter((id) => leverIsOn(levers, id));
  const top = a.ranking[0]?.rescued > 0 ? a.ranking[0] : null;
  const topId = top?.id ?? null;
  const used = useMemo(() => (anyLever(levers) ? levers : topId ? leverOnly(topId) : NO_LEVERS), [levers, topId]);
  const askHR = (on.length ? on.includes('match') : topId === 'match') && inputs.plan === 'unsure';
  const single = on.length === 1 ? on[0] : on.length === 0 ? topId : null;
  // The cost and the money come from taking the match, not from asking about it.
  const noun = on.length > 1 ? 'These habits' : single === 'match' && askHR ? 'Taking the employer match' : single ? leverCopy(single, inputs).noun : null;

  // In its own worker, so opening the card never freezes the screen.
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const [result, setResult] = useState<CutShort | null>(null);
  useEffect(() => {
    const w = new Worker(new URL('../engine/noSixtyFive.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; result: CutShort }>) => {
      if (e.data.id === latest.current) setResult(e.data.result);
    };
    worker.current = w;
    return () => w.terminate();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const req: CutShortRequest = { id: ++latest.current, inputs, levers: used, cutAge, seed, set: market, scenario: currentScenario(selectedWorries(worries, concerns), active) };
      worker.current?.postMessage(req);
    }, 60);
    return () => clearTimeout(t);
  }, [inputs, used, cutAge, seed, market, worries, concerns, active]);
  const answer = result ? noSixtyFiveAnswer(result, noun) : null;
  return (
    <article className="card worry no65">
      <header>
        <h3>If there’s no 65</h3>
      </header>
      <ChipGroup legend="Say everything changes at" selected={(v) => v === cutAge} options={ages.map((v) => ({ value: v, label: `Age ${v}` }))} onPick={(v) => setPicked(v)} />
      <p className="answer" aria-live="polite">
        {answer ? answer.parts.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : <strong key={i}>{p.strong}</strong>)) : 'Working it out…'}
      </p>
      <p className="hint">
        Saving isn’t only for 65: it’s money for time off, a move or a hard year. Middle future shown. The workplace plan is counted after tax, and some plans limit withdrawals.
        {askHR ? ` Assumes your plan matches ${A.defaultMatchPct}%.` : ''}
      </p>
    </article>
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
  const [no65, setNo65] = useState(false);
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
        <button type="button" className="chip" aria-pressed={no65} onClick={() => setNo65(!no65)}>
          <span aria-hidden="true">{no65 ? '✓ ' : '+ '}</span>
          What if there’s no 65?
        </button>
      </div>
      <ConcernEditor />
      <div className="stack">
        {no65 && <NoSixtyFive a={a} />}
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

// Is the best step still the best step when the return assumptions or the
// person's own worries change? The answer a calculator cannot give.
function HoldsCard({ a }: { a: Analysis }) {
  const inputs = useStore((s) => s.inputs);
  const h = a.holds;
  if (!h) return null;
  const n = h.tests.length;
  const worries = h.tests.some((t) => t.kind === 'worry');
  const where = (t: HoldTest) => (t.kind === 'market' ? `${MARKET_SETS[t.id as AssumptionSetId].label} markets` : worryInfo(t.id as WorryId).ifClause);
  return (
    <section className="card holds" aria-labelledby="holds-title">
      <h3 id="holds-title">Does it still hold?</h3>
      <p className="answer">
        {leverCopy(h.lever, inputs).noun} is ranked first below: it rescues <strong>{num(h.rescued)}</strong> of your futures.{' '}
        {h.held === n ? (
          <>It stays first in <strong>all {num(n)}</strong> tests.</>
        ) : (
          <>
            It stays first in <strong>{num(h.held)} of {num(n)}</strong> tests.
          </>
        )}
      </p>
      <ul className="holds-list">
        {h.tests.map((t) => (
          <li key={`${t.kind}-${t.id}`} className={t.same ? 'yes' : 'no'}>
            <span className="holds-mark" aria-hidden="true">
              {t.same ? '✓' : '–'}
            </span>
            <span>
              <b>{where(t)}:</b>{' '}
              {t.same
                ? `still first, rescues ${num(t.rescued)}.`
                : t.top
                  ? `${leverCopy(t.top, inputs).noun.toLowerCase()} ranks first there. This one rescues ${num(t.rescued)}.`
                  : 'no single habit changes much there.'}
            </span>
          </li>
        ))}
      </ul>
      {!worries && <p className="hint">Pick a worry on the previous screen and it is tested here too.</p>}
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
      <HoldsCard a={a} />
      {a.ranking.some((r) => r.askHR) && a.ranking[0] && !a.ranking[0].askHR && (
        <p className="hint">Not sure about a match at work? Asking HR is free, so it’s worth doing either way.</p>
      )}
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
      <KeepReachableCard />
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
