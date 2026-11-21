import { useMemo, useState } from 'react';
import { DEFAULT_SEED } from '../config';
import { AnimatedNumber, Segmented, Switch, Term } from '../components/bits';
import { Inspector } from '../components/Inspector';
import { River } from '../components/River';
import type { Analysis, WorryCard } from '../engine/analyse';
import { A } from '../engine/assumptions';
import { simulate } from '../engine/simulate';
import { STATUS_LABELS, type Severity, type WorryId } from '../engine/types';
import { worryInfo } from '../engine/worries';
import { ASK_HINT, ask } from '../lib/ask';
import { ageShift, leverCopy, leverCostLine, worryAnswer, worryTitle } from '../lib/copy';
import { money, moneyShort, num } from '../lib/format';
import { narrate, narrationAvailable, useNarration } from '../narrate/client';
import { leverIsOn, useStore } from '../store';
import { WorryChips } from './Intro';

function Headline({ a }: { a: Analysis | null }) {
  const levers = useStore((s) => s.levers);
  const activeWorry = useStore((s) => s.activeWorry);
  const inputs = useStore((s) => s.inputs);
  const leversOn = levers.match || levers.raises || levers.cushion || levers.auto > 0;
  const now = a?.summary.counts[0] ?? 0;
  const before = !a ? null : leversOn ? a.scenarioSummary.counts[0] : activeWorry ? a.baseSummary.counts[0] : null;
  const context: string[] = [];
  if (activeWorry) context.push(`What if: ${worryTitle(activeWorry)}`);
  if (levers.match) context.push(inputs.plan === 'unsure' ? 'employer match found and taken' : 'full employer match');
  if (levers.auto) context.push(`+$${levers.auto} a paycheque`);
  if (levers.raises) context.push('a little of every raise');
  if (levers.cushion) context.push('cushion first');
  return (
    <div className="headline">
      <p className="count" aria-live="polite">
        You stay in control in{' '}
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
      <p className="context">{context.length ? context.join(' · ') : 'Same you, a thousand different runs of luck.'}</p>
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
  const items: [string, number | null, string][] = [
    ['Shock-proof', m.shockProof, 'Never had to dip into the workplace plan, and never ended a year short.'],
    ['Room to move at 35', a.startAge <= 35 ? m.room35 : null, 'Savings you can reach cover 6 months of spending: enough to change jobs, retrain or take time off.'],
    ['Room to move at 45', m.room45, 'Savings you can reach cover 12 months of spending.'],
    ['Home', m.home, 'The down payment is reached by your target age.'],
    ['Work-optional by 65', m.workOptional65, 'Savings and public pensions cover 70% of your recent spending, so working is a choice.'],
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

function AskBox({ a }: { a: Analysis }) {
  const aiOn = useStore((s) => s.aiOn);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<{ text: string; narrated: boolean } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    const res = ask(q, a.paths);
    setAnswer({ text: res.text, narrated: false });
    if (aiOn && res.facts) {
      const text = await narrate('ask', res.facts, q);
      if (text) setAnswer({ text, narrated: true });
    }
  };
  return (
    <form className="ask card" onSubmit={submit}>
      <label htmlFor="ask">Ask about your futures</label>
      <div className="ask-row">
        <input id="ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="What happens if I lose my job at 30?" />
        <button type="submit" className="secondary">
          Ask
        </button>
      </div>
      <p className="hint" aria-live="polite">
        {answer ? (
          <>
            {answer.text}
            {answer.narrated && <span className="tag">AI wording</span>}
          </>
        ) : (
          `Answers come only from your thousand futures. ${ASK_HINT}`
        )}
      </p>
    </form>
  );
}

function FuturesPanel({ a }: { a: Analysis }) {
  const seed = useStore((s) => s.seed);
  const set = useStore((s) => s.set);
  return (
    <>
      <p className="lede">
        Each line is one version of your life, from now to 70: same choices, different luck with jobs and markets. The
        dark line is the middle future, and the shaded band holds half of them.
      </p>
      <Milestones a={a} />
      <p className="hint">
        Tap any line to read that life. Amounts are in today’s dollars.{' '}
        <button type="button" className="link" onClick={() => set({ seed: seed === DEFAULT_SEED ? Math.floor(Math.random() * 1e6) : DEFAULT_SEED, selectedPath: null })}>
          {seed === DEFAULT_SEED ? 'Try a new run of luck' : 'Back to the first run of luck'}
        </button>
      </p>
      <AskBox a={a} />
    </>
  );
}

function WorryCardView({ card }: { card: WorryCard }) {
  const inputs = useStore((s) => s.inputs);
  const worries = useStore((s) => s.worries);
  const active = useStore((s) => s.activeWorry);
  const setActive = useStore((s) => s.setActiveWorry);
  const setSeverity = useStore((s) => s.setSeverity);
  const answer = worryAnswer(card, inputs);
  const { text, narrated } = useNarration('worry', answer.facts, answer.plain);
  const on = active === card.id;
  return (
    <article className={`card worry${on ? ' on' : ''}`}>
      <header>
        <h3>{worryTitle(card.id)}</h3>
        {card.id !== 'all' && (
          <Segmented<Severity>
            label={`How hard: ${worryTitle(card.id)}`}
            value={worries[card.id as WorryId] ?? 'moderate'}
            onChange={(sev) => setSeverity(card.id as WorryId, sev)}
            options={[
              { value: 'mild', label: 'Mild' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'severe', label: 'Severe' },
            ]}
          />
        )}
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
      {card.id !== 'all' && (
        <p className="hint">What if, not a forecast: {worryInfo(card.id as WorryId).changes[['mild', 'moderate', 'severe'].indexOf(worries[card.id as WorryId] ?? 'moderate')].toLowerCase()}.</p>
      )}
      {card.id === 'all' && <p className="hint">The honest hard case: every worry you picked, in the same life.</p>}
      <button type="button" className="secondary" aria-pressed={on} onClick={() => setActive(on ? null : card.id)}>
        {on ? 'Showing in the river · tap to clear' : 'Show in the river'}
      </button>
    </article>
  );
}

function WorriesPanel({ a }: { a: Analysis }) {
  return (
    <>
      <p className="lede">Name it, then size it. Each worry is run against the same thousand futures.</p>
      <WorryChips />
      {a.cards.length === 0 && <p className="hint">Pick one above to see how many of your futures it touches, and what protects them.</p>}
      <div className="stack">
        {a.cards.map((c) => (
          <WorryCardView key={c.id} card={c} />
        ))}
      </div>
    </>
  );
}

function Together() {
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const rows = useMemo(() => {
    const [p] = simulate(inputs, {}, levers, 1, { calm: true, paths: 1, trace: true, detail: false });
    const t = p.trace!;
    return [1, 2, 3, 4, 5].map((y) => ({ year: y, cushion: t.cushion[y], target: t.target[y], long: t.plan[y] + t.flex[y] }));
  }, [inputs, levers]);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.cushion, r.long, r.target)));
  return (
    <section className="card together">
      <h3>Short-term and long-term, together</h3>
      <p className="hint">
        You don’t have to choose. In a steady five years with your plan, the cushion fills while long-term savings
        {inputs.plan !== 'no' ? ' and the workplace plan grow' : ' grow'} beside it.
      </p>
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

function LeversPanel({ a }: { a: Analysis }) {
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const toggle = useStore((s) => s.toggleLever);
  const worries = useStore((s) => s.worries);
  const active = useStore((s) => s.activeWorry);
  const setActive = useStore((s) => s.setActiveWorry);
  const ids = Object.keys(worries) as WorryId[];
  const now = a.summary.counts[0];
  return (
    <>
      <p className="lede">Smallest step, biggest shift. Each habit is tested alone against your thousand futures. Switch one on and watch the river move.</p>
      {ids.length > 0 && (
        <label className="against">
          Test against
          <select value={active ?? ''} onChange={(e) => setActive((e.target.value || null) as WorryId | 'all' | null)}>
            <option value="">an ordinary run of luck</option>
            {ids.map((id) => (
              <option key={id} value={id}>
                {worryInfo(id).label}
              </option>
            ))}
            {ids.length > 1 && <option value="all">Everything at once</option>}
          </select>
        </label>
      )}
      <ol className="levers">
        {a.ranking.map((row, i) => {
          const copy = leverCopy(row.id, inputs);
          const on = leverIsOn(levers, row.id);
          return (
            <li key={row.id} className={`card lever${on ? ' on' : ''}`}>
              <span className="rank" aria-hidden="true">{i + 1}</span>
              <div className="lever-body">
                <h3>{copy.title}</h3>
                <p className="cost">{leverCostLine(row)}</p>
                {row.id === 'match' && (
                  <p className="hint">
                    {row.askHR ? 'If your plan has matching, that could be about ' : 'Money your employer adds: about '}
                    <b>{money(row.yearlyMatch)} a year</b>.
                  </p>
                )}
                <p className="effect">
                  <b>{row.gained >= 0 ? '+' : '−'}{num(Math.abs(row.gained))}</b> futures in control
                  {row.ageDelta !== null && row.ageDelta !== 0 && <span> · {ageShift(row.ageDelta)}</span>}
                </p>
                <p className="hint">{copy.explain}</p>
              </div>
              <Switch checked={on} onChange={() => toggle(row.id)} label={copy.title} />
            </li>
          );
        })}
      </ol>
      <section className="card waiting">
        <h3>What waiting costs</h3>
        <p>
          The same plan, started {A.waitingYears} years later, keeps you in control in <b>{num(a.waiting.inControl)}</b> of
          1,000 futures instead of <b>{num(now)}</b>
          {a.waiting.ageDelta !== null && a.waiting.ageDelta > 0 ? `, and work becomes optional about ${a.waiting.ageDelta === 1 ? '1 year' : `${a.waiting.ageDelta} years`} later.` : '.'}
        </p>
        <p className="hint">Not a choice to make, just what time is worth. Starting small now does more than starting bigger later.</p>
      </section>
      <Together />
    </>
  );
}

function AiToggle() {
  const aiOn = useStore((s) => s.aiOn);
  const set = useStore((s) => s.set);
  const [note, setNote] = useState('');
  const change = async (on: boolean) => {
    setNote('');
    if (!on) return set({ aiOn: false });
    if (await narrationAvailable()) set({ aiOn: true });
    else setNote('AI narration isn’t set up here, so the built-in wording stays on. Nothing was sent.');
  };
  return (
    <div className="ai-toggle">
      <Switch checked={aiOn} onChange={change} label="AI narration" />
      <p className="hint" aria-live="polite">
        <b>AI narration {aiOn ? 'on' : 'off'}.</b>{' '}
        {note || 'When on, anonymous simulation facts (counts, ages, events) are sent to be put into warmer words. Every number still comes from the simulation.'}
      </p>
    </div>
  );
}

const NEXT_LABEL: Record<number, string> = { 3: 'Size my worries', 4: 'See what I control', 5: 'Pick my one step' };
const TITLES: Record<number, string> = { 3: 'Your thousand futures', 4: 'Your worries, sized', 5: 'What you control' };

export function Explore() {
  const step = useStore((s) => s.step);
  const setStep = useStore((s) => s.setStep);
  const a = useStore((s) => s.analysis);
  const selected = useStore((s) => s.selectedPath);
  const activeWorry = useStore((s) => s.activeWorry);
  const set = useStore((s) => s.set);
  const mask = step === 4 && a && activeWorry ? (a.cards.find((c) => c.id === activeWorry)?.mask ?? null) : null;
  const path = a && selected !== null ? a.paths[selected] : null;
  return (
    <section className="explore">
      <div className="stage">
        <p className="eyebrow">{TITLES[step]}</p>
        <Headline a={a} />
        <River analysis={a} mask={mask} selected={selected} onSelect={(i) => set({ selectedPath: i })} />
        <Legend a={a} />
      </div>
      <div className="side">
        {path && selected !== null && <Inspector index={selected} path={path} onClose={() => set({ selectedPath: null })} />}
        {a && step === 3 && <FuturesPanel a={a} />}
        {a && step === 4 && <WorriesPanel a={a} />}
        {a && step === 5 && <LeversPanel a={a} />}
        <AiToggle />
        <div className="nav">
          <button type="button" className="ghost" onClick={() => setStep(step - 1)}>
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
