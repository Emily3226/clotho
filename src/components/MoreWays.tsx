import { useEffect, useRef, useState } from 'react';
import { hasLife } from '../engine/lifePlan';
import { isStudent } from '../engine/profile';
import { wayInfo, type WayResult } from '../engine/ways';
import type { WaysRequest } from '../engine/ways.worker';
import { money, num } from '../lib/format';
import { currentScenario, selectedWorries, useStore } from '../store';

const CRA = 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics';

// Saving more isn't the only lever. These use the tax rules, lower costs or
// higher pay, tested on the same 1,000 lives at no extra monthly cost.
export function MoreWays() {
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const seed = useStore((s) => s.seed);
  const set = useStore((s) => s.set);
  const worries = useStore((s) => s.worries);
  const concerns = useStore((s) => s.concerns);
  const active = useStore((s) => s.activeWorry);
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const [results, setResults] = useState<WayResult[] | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('../engine/ways.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; results: WayResult[] }>) => {
      if (e.data.id === latest.current) setResults(e.data.results);
    };
    worker.current = w;
    return () => w.terminate();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const req: WaysRequest = { id: ++latest.current, inputs, levers, seed, set, scenario: currentScenario(selectedWorries(worries, concerns), active) };
      worker.current?.postMessage(req);
    }, 120);
    return () => clearTimeout(t);
  }, [inputs, levers, seed, set, worries, concerns, active]);

  const life = hasLife(inputs.life) ? inputs.life : null;
  return (
    <details className="drawer more-ways">
      <summary>More ways to get ahead, with no extra money each month</summary>
      <p className="hint">Your savings already go to your cushion first, then an FHSA if you’re buying a home, then a TFSA, so growth stays tax-free.</p>
      {!results && <p className="hint">Testing them on your futures…</p>}
      <ul className="ways">
        {results?.map((r) => {
          const w = wayInfo(r.id);
          return (
            <li key={r.id} className="card way">
              <h3>{w.title}</h3>
              <p className="hint">{w.how}</p>
              <p className="effect">
                {r.rescued > 0 ? (
                  <>
                    <b>+{num(r.rescued)}</b> futures rescued
                  </>
                ) : (
                  'No change to your count'
                )}
                {r.moreAt65 > 0 ? ` · about ${money(r.moreAt65)} more at 65` : r.moreAt65 < 0 ? ` · about ${money(-r.moreAt65)} less at 65 after tax` : ''}
              </p>
            </li>
          );
        })}
      </ul>
      <details className="drawer">
        <summary>Other programs worth knowing</summary>
        <ul className="programs">
          <li>
            <a href={`${CRA}/tax-free-savings-account.html`} target="_blank" rel="noreferrer">TFSA</a>: growth and withdrawals are tax-free, and what you take out goes back into your room the next year.
          </li>
          {inputs.home && (
            <li>
              <a href={`${CRA}/rrsps-related-plans/what-home-buyers-plan.html`} target="_blank" rel="noreferrer">Home Buyers’ Plan</a>: borrow up to $60,000 from your own RRSP for a first home, then pay it back.
            </li>
          )}
          {(isStudent(inputs.stage) || (life?.schoolYears ?? 0) > 0) && (
            <li>
              <a href={`${CRA}/rrsps-related-plans/lifelong-learning-plan.html`} target="_blank" rel="noreferrer">Lifelong Learning Plan</a>: borrow up to $10,000 a year, $20,000 in total, from your RRSP for training or school.
            </li>
          )}
          {(life?.kids ?? 0) > 0 && (
            <li>
              <a href={`${CRA}/registered-education-savings-plans-resps/canada-education-savings-programs-cesp/canada-education-savings-grant-cesg.html`} target="_blank" rel="noreferrer">RESP and education grant</a>: the government adds 20% on the first $2,500 a year, up to $500 a year and $7,200 per child.
            </li>
          )}
        </ul>
      </details>
    </details>
  );
}
