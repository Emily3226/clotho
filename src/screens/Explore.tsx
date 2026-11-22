import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedNumber, ChipGroup, Explain, Switch, Term } from '../components/bits';
import { ConcernEditor } from '../components/ConcernEditor';
import { MoreWays } from '../components/MoreWays';
import { AboutYou } from '../components/AboutYou';
import { Inspector } from '../components/Inspector';
import { KeepReachableCard } from '../components/KeepReachable';
import { TakeMoneyOut } from '../components/TakeMoneyOut';
import { River } from '../components/River';
import { whyNot, type Analysis, type HoldTest, type WhyKey, type WorryCard } from '../engine/analyse';
import { A, roomAges } from '../engine/assumptions';
import { mulberry32 } from '../engine/rng';
import { MARKET_SETS } from '../engine/profile';
import { LEVER_IDS, NO_LEVERS, STATUS_LABELS, leverOnly, type AssumptionSetId, type LeverId, type WorryId } from '../engine/types';
import { WORRIES, worryInfo } from '../engine/worries';
import { cutAgesFor, defaultCutAge, type CutShort } from '../engine/noSixtyFive';
import type { CutShortRequest } from '../engine/noSixtyFive.worker';
import { leverCopy, leverCostLine, noSixtyFiveAnswer, worryAnswer, worryTitle } from '../lib/copy';
import { money, num } from '../lib/format';
import { useNarration } from '../narrate/client';
import { STEP, anyLever, currentScenario, leverIsOn, selectedWorries, useStore } from '../store';

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function onLevers(): LeverId[] {
  const l = useStore.getState().levers;
  return LEVER_IDS.filter((id) => leverIsOn(l, id));
}

// The count is one point in a range: the same futures under cautious,
// middle and hopeful returns, so the number is never read as a forecast.
function RangeLine({ a }: { a: Analysis }) {
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
        {num(low)} to {num(high)} depending on how markets do
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
      {best && best.rescued > 0 && (best.inControl - now) * 2 >= best.rescued && (
        <p className="reach">
          <strong>
            <AnimatedNumber value={best.inControl} />
          </strong>{' '}
          within reach with one habit: {lowerFirst(leverCopy(best.id, inputs).noun)}
        </p>
      )}
      {best && best.rescued > 0 && (best.inControl - now) * 2 < best.rescued && (
        <p className="reach">
          <strong>
            <AnimatedNumber value={best.rescued} />
          </strong>{' '}
          of your futures move up with one habit: {lowerFirst(leverCopy(best.id, inputs).noun)}
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
  const [r1, r2] = roomAges(a.startAge);
  const items: [string, number | null, string][] = [
    // Each line finishes "In 849 of your 1,000 futures, …".
    ['Got through bad years', m.shockProof, 'every rough patch (a layoff, a market drop) was covered. You never ran out of money or had to touch your retirement savings.'],
    [`6 months saved by ${r1}`, m.room35, `by ${r1} you have 6 months of living costs saved that you can use any time. That’s enough to switch jobs or take a break.`],
    [`A year saved by ${r2}`, m.room45, `by ${r2} you have a full year of living costs saved that you can use any time.`],
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

// A check by the same name as its tile, so the two read as one list.
const checkName = (key: WhyKey, startAge: number): string => {
  const [r1, r2] = roomAges(startAge);
  return key === 'room35' ? `6 months saved by ${r1}` : key === 'room45' ? `a year saved by ${r2}` : key === 'workOptional65' ? 'work optional by 65' : 'getting through bad years';
};

// Where the headline count comes from: what "in control" means, how the
// other futures are sorted, and which checks they miss.
function WhyNumber({ a }: { a: Analysis }) {
  const inputs = useStore((s) => s.inputs);
  const why = useMemo(() => whyNot(a.paths, a.startAge), [a]);
  const counts = a.summary.counts;
  const top = a.ranking[0];
  const missed = why.missed[0];
  return (
    <details className="drawer why-number">
      <summary>Why {num(counts[0])}?</summary>
      <p className="hint">A future is in control when it passes all four checks:</p>
      <Milestones a={a} />
      <RangeLine a={a} />
      {missed && (
        <p className="hint">
          Most often missed: <b>{checkName(missed.key, a.startAge)}</b>, by {num(missed.count)} futures.
          {top && top.rescued > 0 && (
            <>
              {' '}
              <b>{leverCopy(top.id, inputs).noun}</b> rescues {num(top.rescued)}.
            </>
          )}
        </p>
      )}
    </details>
  );
}

function FuturesPanel({ a }: { a: Analysis }) {
  const note = useStore((s) => s.note);
  const computing = useStore((s) => s.computing);
  return (
    <>
      <WhatIfPanel a={a} />
      <WhyNumber a={a} />
      <details className="drawer live-answers">
        <summary>Change your answers</summary>
        <p className={`note-line${computing ? ' busy' : ''}${note ? '' : ' empty'}`} aria-live="polite">
          {note}
        </p>
        <AboutYou live />
      </details>
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
  const [takeOut, setTakeOut] = useState(false);
  // The habits switched on, or else the one ranked first, as in "no 65".
  const levers = useStore((s) => s.levers);
  const topId = a.ranking[0]?.rescued > 0 ? a.ranking[0].id : null;
  const used = useMemo(() => (anyLever(levers) ? levers : topId ? leverOnly(topId) : NO_LEVERS), [levers, topId]);
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
        <button type="button" className="chip" aria-pressed={takeOut} onClick={() => setTakeOut(!takeOut)}>
          <span aria-hidden="true">{takeOut ? '✓ ' : '+ '}</span>
          What if I take money out for something I want?
        </button>
      </div>
      <ConcernEditor />
      <div className="stack">
        {no65 && <NoSixtyFive a={a} />}
        {takeOut && <TakeMoneyOut levers={used} />}
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

// Is the best step still the best step when the return assumptions or the
// person's own worries change? The answer a calculator cannot give.
function HoldsCard({ a }: { a: Analysis }) {
  const inputs = useStore((s) => s.inputs);
  const h = a.holds;
  if (!h) return null;
  const n = h.tests.length;
  const worries = h.tests.some((t) => t.kind === 'worry');
  const where = (t: HoldTest) => {
    if (t.kind === 'market') return `${MARKET_SETS[t.id as AssumptionSetId].label} markets`;
    const clause = worryInfo(t.id as WorryId).ifClause;
    return t.onTop ? `Also ${lowerFirst(clause)}` : clause;
  };
  return (
    <details className="drawer holds">
      <summary>
        Does the top habit still hold? {num(h.held)} of {num(n)} tests
      </summary>
      <p className="answer">
        {leverCopy(h.lever, inputs).noun} is ranked first: it rescues <strong>{num(h.rescued)}</strong> of your futures.{' '}
        {h.held === n ? (
          <>It stays first in <strong>{n === 2 ? 'both' : `all ${num(n)}`}</strong> tests.</>
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
    </details>
  );
}

function HabitsPanel({ a }: { a: Analysis }) {
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const toggle = useStore((s) => s.toggleLever);
  const now = a.summary.counts[0];
  return (
    <>
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
                  {copy.title}{' '}
                  {row.noExtraCost && <span className="tag">No extra cost</span>}
                  {row.startsLater && <span className="tag">Starts at your next raise</span>}
                </h3>
                <p className="cost">{leverCostLine(row)}</p>
                {row.startsLater && i === 0 && row.grownPerMonth && (
                  <p className="hint">It rescues the most because it grows into the biggest amount here. Saving that much from today would do about as well.</p>
                )}
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
      {a.waiting.inControl !== now && (
        <p className="hint waiting-line">
          Starting {A.waitingYears} years later: <b>{num(a.waiting.inControl)}</b> instead of <b>{num(now)}</b>.
        </p>
      )}
      <MoreWays />
      <HoldsCard a={a} />
      <KeepReachableCard />
    </>
  );
}


const NEXT_LABEL: Record<number, string> = { [STEP.futures]: 'What helps most?', [STEP.habits]: 'Pick one to try' };
const NEXT_WHY: Record<number, string> = {
  [STEP.futures]: 'Next: the one habit that moves the most of your futures.',
  [STEP.habits]: 'Next: pick one and set it up in a few minutes.',
};

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
        {step === STEP.futures && <SaveDial />}
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
        {NEXT_WHY[step] && <p className="hint next-why">{NEXT_WHY[step]}</p>}
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
