import { useEffect, useRef } from 'react';
import { DISCLAIMER } from '../config';
import { ASSUMPTIONS, LIMITATIONS, type Assumption } from '../engine/assumptions';
import { CITIES, FIELDS, MARKET_SETS, STAGES, STATCAN_GRAD_URL } from '../engine/profile';
import stability from '../engine/stability.json';
import type { AssumptionSetId } from '../engine/types';
import { WORRIES } from '../engine/worries';
import { leverCopy } from '../lib/copy';
import { money } from '../lib/format';
import { useStore } from '../store';
import { Segmented } from './bits';

function Rows({ items }: { items: Assumption[] }) {
  return (
    <dl className="assume">
      {items.map((a) => (
        <div key={a.key}>
          <dt>{a.label}</dt>
          <dd>
            <strong>{a.display}</strong>
            {a.note && <span className="note">{a.note}</span>}
            <span className="src">
              <a href={a.source} target="_blank" rel="noreferrer">
                {a.sourceLabel}
              </a>{' '}
              · as of {a.asOf}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const pct = (x: number) => `${(x * 100).toFixed(1).replace(/\.0$/, '')}%`;

export function AssumptionsPanel() {
  const open = useStore((s) => s.showAssumptions);
  const set = useStore((s) => s.set);
  const inputs = useStore((s) => s.inputs);
  const setState = useStore((s) => s.setState);
  const ref = useRef<HTMLDialogElement>(null);
  const allSame = stability.result.every((r) => r.same);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="panel"
      aria-labelledby="assume-title"
      onClose={() => setState({ showAssumptions: false })}
      onClick={(e) => {
        if (e.target === ref.current) setState({ showAssumptions: false });
      }}
    >
      <div className="panel-body">
        <header>
          <h2 id="assume-title">What this is built on</h2>
          <button type="button" className="ghost" onClick={() => setState({ showAssumptions: false })}>
            Close
          </button>
        </header>
        <p className="lede">{DISCLAIMER}</p>
        <p>
          Every amount is in today’s dollars, so inflation is already taken out. The same inputs and the same seed always
          give the same thousand futures.
        </p>

        <h3>Change the assumptions</h3>
        <p className="note">Returns are the biggest unknown, so you can pick how hopeful to be. Everything re-runs.</p>
        <Segmented<AssumptionSetId>
          label="Return assumptions"
          value={set}
          onChange={(v) => setState({ set: v })}
          options={(['cautious', 'middle', 'hopeful'] as const).map((id) => ({ value: id, label: MARKET_SETS[id].label }))}
        />
        <p className="note">
          {(['cautious', 'middle', 'hopeful'] as const)
            .map((id) => `${MARKET_SETS[id].label}: stocks ${pct(MARKET_SETS[id].stockMean)}, bonds ${pct(MARKET_SETS[id].bondMean)} after inflation`)
            .join(' · ')}
          .
        </p>
        <p>
          <b>Does the best habit change?</b>{' '}
          {allSame
            ? 'For every demo persona, the top-ranked habit is the same under all three settings. The exact count depends on assumptions; which habit helps most does not.'
            : 'For some demo personas the top-ranked habit changes between settings. We show that honestly rather than tune it away.'}
        </p>
        <ul className="limits">
          {stability.result.map((r) => (
            <li key={r.persona}>
              <b>{r.persona}:</b>{' '}
              {r.same
                ? `${leverCopy(r.middle as never, inputs).title} in all three`
                : `cautious ${r.cautious}, middle ${r.middle}, hopeful ${r.hopeful}`}
            </li>
          ))}
        </ul>

        <h3>Three honest limits</h3>
        <ol className="limits">
          {LIMITATIONS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ol>

        <h3>Published figures</h3>
        <Rows items={ASSUMPTIONS.filter((a) => a.kind === 'official')} />

        <h3>Illustrative assumptions</h3>
        <p className="note">These are modelling choices, not facts and not forecasts. Change them and the futures change.</p>
        <Rows items={ASSUMPTIONS.filter((a) => a.kind === 'illustrative')} />

        <h3>Life-stage defaults</h3>
        <p className="note">Illustrative starting numbers, all editable under Fine-tune.</p>
        <dl className="assume">
          {STAGES.map((s) => (
            <div key={s.id}>
              <dt>{s.label}</dt>
              <dd>
                <strong>
                  {money(s.income)} income · {money(s.saved)} saved · {money(s.monthly)} a month
                </strong>
                <span className="note">Workplace plan: {s.plan === 'yes' ? `yes, ${s.employeePct}% with a ${s.matchPct}% match` : s.plan === 'unsure' ? 'not sure' : 'no'}.</span>
              </dd>
            </div>
          ))}
        </dl>

        <h3>Field of study</h3>
        <p className="note">
          Starting pay: median employment income two years after graduation, bachelor’s graduates, class of 2022, in 2024
          dollars, rounded.{' '}
          <a href={STATCAN_GRAD_URL} target="_blank" rel="noreferrer">
            Statistics Canada, Table 37-10-0284-01
          </a>
          . These are medians across many programs, not offered salaries, and are to be confirmed against the table. Wage growth and the
          AI strength are illustrative, not forecasts.
        </p>
        <dl className="assume">
          {FIELDS.map((f) => (
            <div key={f.id}>
              <dt>{f.label}</dt>
              <dd>
                <strong>
                  {money(f.salary)} · +{pct(f.growthTo30)} a year to 30 · “AI changes my job” ×{f.aiStrength}
                </strong>
                <span className="note">{f.basis}</span>
              </dd>
            </div>
          ))}
        </dl>

        <h3>Where you live</h3>
        <dl className="assume">
          {CITIES.map((c) => (
            <div key={c.id}>
              <dt>{c.label}</dt>
              <dd>
                <strong>
                  {Math.round(c.raiseSpent * 100)}% of each raise spent · home {money(c.homePrice)} · rent saved living with family {money(c.moveOutCost)} a year
                </strong>
              </dd>
            </div>
          ))}
        </dl>

        <h3>What each “what if” changes</h3>
        <p className="note">Worries are tested as what-ifs, never as predictions:</p>
        <dl className="assume">
          {WORRIES.map((w) => (
            <div key={w.id}>
              <dt>{w.label}</dt>
              <dd>
                <span className="note">{w.changes[1]}</span>
              </dd>
            </div>
          ))}
        </dl>

        <h3>How a future is judged</h3>
        <ul className="limits">
          <li><b>Shock-proof:</b> never had to dip into the workplace plan and never ended a year short.</li>
          <li><b>Room to move:</b> the cushion plus reachable long-term savings cover 6 months of spending at 35 and 12 months at 45.</li>
          <li><b>Home</b> (only if set): the down payment is reached by the target age.</li>
          <li><b>Work-optional by 65:</b> income from savings and public pensions covers 70% of the spending you’re used to.</li>
          <li><b>In control</b> means all of these. <b>Mostly there</b> means work-optional with one other missed. <b>Tight</b> means work-optional with two or more missed, or missing work-optional by less than 20 points. <b>Off track</b> is the rest.</li>
          <li>A habit <b>rescues</b> a future when, with the same luck, that future moves up to in control or mostly there.</li>
        </ul>

        <h3>Privacy</h3>
        <p>
          Your answers stay in this browser. Nothing is sent anywhere unless you turn on AI narration, and then only
          anonymous simulation facts (counts, ages, events) are sent to be put into words. Numbers always come from the
          simulation.
        </p>
      </div>
    </dialog>
  );
}
