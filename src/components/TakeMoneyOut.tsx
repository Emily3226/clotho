import { useEffect, useRef, useState } from 'react';
import { ChipGroup, Field } from './bits';
import { CRA_WITHDRAWAL_URL, type PayFrom, type WithdrawalCompare } from '../engine/plannedWithdrawal';
import type { WithdrawalRequest } from '../engine/plannedWithdrawal.worker';
import type { Levers } from '../engine/types';
import { money, moneyRound, num } from '../lib/format';
import { currentScenario, selectedWorries, useStore } from '../store';

// "What if I take money out for something I want?" Three ways to pay for the
// same thing, on the same lives. A choice, shown as a trade-off: no warnings.
export function TakeMoneyOut({ levers }: { levers: Levers }) {
  const inputs = useStore((s) => s.inputs);
  const seed = useStore((s) => s.seed);
  const set = useStore((s) => s.set);
  const worries = useStore((s) => s.worries);
  const concerns = useStore((s) => s.concerns);
  const active = useStore((s) => s.activeWorry);
  const [amount, setAmount] = useState(3000);
  const [years, setYears] = useState(3);
  const age = inputs.age + years;

  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const [result, setResult] = useState<WithdrawalCompare | null>(null);
  useEffect(() => {
    const w = new Worker(new URL('../engine/plannedWithdrawal.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; result: WithdrawalCompare }>) => {
      if (e.data.id === latest.current) setResult(e.data.result);
    };
    worker.current = w;
    return () => w.terminate();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const req: WithdrawalRequest = { id: ++latest.current, inputs, levers, amount, age, seed, set, scenario: currentScenario(selectedWorries(worries, concerns), active) };
      worker.current?.postMessage(req);
    }, 80);
    return () => clearTimeout(t);
  }, [inputs, levers, amount, age, seed, set, worries, concerns, active]);

  const opt = (from: PayFrom) => result?.options.find((o) => o.from === from);
  const plan = opt('plan');
  const reachable = opt('reachable');
  const saveFirst = opt('saveFirst');
  const noPlan = result && result.plan.lives === 0;
  // Say so plainly when taking it from the plan costs little here.
  const smallGap = plan && reachable && Math.abs(plan.inControl - reachable.inControl) <= 10;
  const perMonth = Math.ceil(amount / Math.max(1, years * 12) / 5) * 5;

  return (
    <article className="card worry take-out">
      <header>
        <h3>Taking money out for something you want</h3>
      </header>
      <div className="fields two">
        <Field id="take-amount" label="How much do you want in hand?" value={amount} min={500} max={20000} step={500} prefix="$" onChange={(v) => setAmount(Math.max(0, Math.round(v)))} />
      </div>
      <ChipGroup
        legend="When?"
        selected={(v) => v === years}
        options={[1, 3, 5].map((y) => ({ value: y, label: y === 1 ? 'Next year' : `In ${y} years` }))}
        onPick={(v) => setYears(v)}
      />
      {!result || !plan || !reachable || !saveFirst ? (
        <p className="answer" aria-live="polite">
          Working it out…
        </p>
      ) : (
        <>
          <p className="hint">Three ways to have {money(amount)} at {age}, on the same 1,000 lives. Middle future shown, after tax.</p>
          <ul className="pay-ways" aria-live="polite">
            {!noPlan && (
              <li>
                <b>From the workplace plan.</b> About {money(Math.round(result.plan.gross))} comes out to leave {money(amount)}: it’s added to your income
                that year. <span className="nums">{num(plan.inControl)} in control · {moneyRound(plan.at65)} at 65</span>
              </li>
            )}
            <li>
              <b>From your cushion or TFSA.</b> No tax on the way out, and TFSA room you use comes back the next year. <span className="nums">{num(reachable.inControl)} in control · {moneyRound(reachable.at65)} at 65</span>
            </li>
            <li>
              <b>Save up first,</b> about {money(perMonth)} a month until then. <span className="nums">{num(saveFirst.inControl)} in control · {moneyRound(saveFirst.at65)} at 65</span>
            </li>
          </ul>
          {smallGap && !noPlan && <p>Here the difference is small, so taking it from the plan is a reasonable call if it’s worth it to you now.</p>}
          {noPlan ? (
            <p className="hint">There’s no workplace plan money by {age} in the middle future, so only the other two ways apply.</p>
          ) : (
            <p className="hint">
              When it comes out, the plan holds back about {money(Math.round(result.plan.withheld))} (
              <a href={CRA_WITHDRAWAL_URL} target="_blank" rel="noreferrer">
                CRA withholding
              </a>
              ). That may not be the final tax, which depends on your income that year. Some plans limit withdrawals, especially of the employer’s
              match.
              {result.planShort > 0 ? ` In ${num(result.planShort)} lives the plan held less than that by ${age}, so the rest came from other savings.` : ''}
            </p>
          )}
        </>
      )}
    </article>
  );
}
