import { useEffect, useRef } from 'react';
import { DISCLAIMER } from '../config';
import { ASSUMPTIONS, LIMITATIONS, type Assumption } from '../engine/assumptions';
import { WORRIES } from '../engine/worries';
import { useStore } from '../store';

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

export function AssumptionsPanel() {
  const open = useStore((s) => s.showAssumptions);
  const set = useStore((s) => s.set);
  const ref = useRef<HTMLDialogElement>(null);

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
      onClose={() => set({ showAssumptions: false })}
      onClick={(e) => {
        if (e.target === ref.current) set({ showAssumptions: false });
      }}
    >
      <div className="panel-body">
        <header>
          <h2 id="assume-title">What this is built on</h2>
          <button type="button" className="ghost" onClick={() => set({ showAssumptions: false })}>
            Close
          </button>
        </header>
        <p className="lede">{DISCLAIMER}</p>
        <p>
          Every amount is in today’s dollars, so inflation is already taken out. The same inputs and the same seed always
          give the same thousand futures.
        </p>

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

        <h3>What each “what if” changes</h3>
        <p className="note">Worries are tested as what-ifs, never as predictions. Mild, moderate and severe settings:</p>
        <dl className="assume">
          {WORRIES.map((w) => (
            <div key={w.id}>
              <dt>{w.label}</dt>
              <dd>
                {w.changes.map((c, i) => (
                  <span className="note" key={c}>
                    <b>{['Mild', 'Moderate', 'Severe'][i]}:</b> {c}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        <h3>How a future is judged</h3>
        <ul className="limits">
          <li><b>Shock-proof:</b> never had to dip into the workplace plan and never ended a year short.</li>
          <li><b>Room to move:</b> the cushion plus reachable long-term savings cover 6 months of spending at 35 and 12 months at 45.</li>
          <li><b>Home</b> (only if set): the down payment is reached by the target age.</li>
          <li><b>Work-optional by 65:</b> income from savings and public pensions covers 70% of recent spending.</li>
          <li><b>In control</b> means all of these. <b>Mostly there</b> means work-optional with one other missed. <b>Tight</b> means work-optional with two or more missed, or missing work-optional by less than 20 points. <b>Off track</b> is the rest.</li>
          <li>A worry <b>makes a future harder</b> when its status drops. A habit <b>lifts it back up</b> when the status improves again under the same worry.</li>
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
