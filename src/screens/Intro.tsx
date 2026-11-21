import { useState } from 'react';
import { APP_NAME, TAGLINE } from '../config';
import { Field, Segmented, Term } from '../components/bits';
import { A } from '../engine/assumptions';
import { PERSONAS } from '../engine/personas';
import { WORRIES } from '../engine/worries';
import { money } from '../lib/format';
import { useStore } from '../store';

export function Landing() {
  const setStep = useStore((s) => s.setStep);
  const set = useStore((s) => s.set);
  const [first, second] = TAGLINE.split('. ');
  return (
    <section className="landing">
      <p className="eyebrow">{APP_NAME} · a thousand versions of your financial life</p>
      <h1>
        {first}.<br />
        <em>{second}</em>
      </h1>
      <p className="lede">
        See a thousand ways your money life could go. Test the things you’re worried about against them. Find the one
        small habit that keeps the most of them on track.
      </p>
      <div className="cta">
        <button type="button" className="primary big" onClick={() => setStep(1)}>
          Start (60 seconds)
        </button>
        <span className="hint">No sign-up. Your answers stay on this device.</span>
      </div>
      <h2 className="small-head">Or step into someone else’s shoes</h2>
      <div className="personas">
        {PERSONAS.map((p) => (
          <button
            type="button"
            key={p.id}
            className="persona card"
            onClick={() => {
              set({ inputs: p.inputs });
              setStep(1);
            }}
          >
            <b>{p.name}</b>
            <span>{p.line}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function ConfidenceSlider({ id, value, onChange }: { id: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="confidence">
      <output htmlFor={id} aria-hidden="true">
        {value}
      </output>
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        aria-valuetext={`${value} out of 10`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="scale" aria-hidden="true">
        <span>1 · no idea where I stand</span>
        <span>10 · I’ve got this</span>
      </div>
    </div>
  );
}

export function WorryChips() {
  const worries = useStore((s) => s.worries);
  const toggle = useStore((s) => s.toggleWorry);
  return (
    <div className="chips">
      {WORRIES.map((w) => (
        <button type="button" key={w.id} className="chip" aria-pressed={!!worries[w.id]} onClick={() => toggle(w.id)}>
          <span aria-hidden="true">{worries[w.id] ? '✓ ' : '+ '}</span>
          {w.label}
        </button>
      ))}
    </div>
  );
}

export function CheckIn() {
  const setStep = useStore((s) => s.setStep);
  const set = useStore((s) => s.set);
  const before = useStore((s) => s.confBefore);
  const [conf, setConf] = useState(before ?? 5);
  return (
    <section className="narrow">
      <p className="eyebrow">Check-in</p>
      <h1 className="h-question">
        <label htmlFor="conf-before">How do you feel about your financial future right now?</label>
      </h1>
      <ConfidenceSlider id="conf-before" value={conf} onChange={setConf} />
      <h2 className="h-sub">What’s on your mind?</h2>
      <p className="hint">Pick any that fit, or none. We’ll size each one against your futures.</p>
      <WorryChips />
      <div className="nav">
        <button type="button" className="ghost" onClick={() => setStep(0)}>
          Back
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            set({ confBefore: conf });
            setStep(2);
          }}
        >
          Next
        </button>
      </div>
    </section>
  );
}

export function Basics() {
  const inputs = useStore((s) => s.inputs);
  const setInputs = useStore((s) => s.setInputs);
  const setStep = useStore((s) => s.setStep);
  const yearlyMatch = (inputs.matchPct / 100) * inputs.income;
  return (
    <section className="narrow">
      <p className="eyebrow">Basics</p>
      <h1 className="h-question">Four numbers. Rough is fine.</h1>
      <p className="hint">Everything here is in today’s dollars, and it stays on this device.</p>
      <div className="fields">
        <Field id="age" label="Your age" value={inputs.age} min={18} max={35} step={1} onChange={(v) => setInputs({ age: Math.min(35, Math.round(v)) })} />
        <Field id="income" label="Yearly income before tax" value={inputs.income} min={15000} max={200000} step={1000} prefix="$" onChange={(v) => setInputs({ income: v })} />
        <Field id="saved" label="Total saved so far" value={inputs.saved} min={0} max={100000} step={500} prefix="$" onChange={(v) => setInputs({ saved: v })} />
        <Field id="per" label="Saved from each paycheque" value={inputs.perPaycheque} min={0} max={1000} step={5} prefix="$" hint="Zero is a fine answer." onChange={(v) => setInputs({ perPaycheque: v })} />
      </div>

      <fieldset className="plan">
        <legend>
          Does your job have a savings plan with{' '}
          <Term explain="Matching means your employer adds money when you put some in, up to a set share of your pay.">matching</Term>?
        </legend>
        <Segmented
          label="Workplace savings plan"
          value={inputs.plan}
          onChange={(plan) => setInputs({ plan })}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'unsure', label: 'Not sure' },
          ]}
        />
        {inputs.plan === 'yes' && (
          <div className="fields two">
            <Field id="emp" label="You put in" value={inputs.employeePct} min={0} max={15} step={0.5} suffix="% of pay" hint="On top of what you save from each paycheque." onChange={(v) => setInputs({ employeePct: Math.min(30, v) })} />
            <Field id="match" label="Employer matches up to" value={inputs.matchPct} min={0} max={10} step={0.5} suffix="% of pay" hint={`Money your employer adds: up to ${money(yearlyMatch)} a year.`} onChange={(v) => setInputs({ matchPct: Math.min(20, v) })} />
          </div>
        )}
        {inputs.plan === 'unsure' && (
          <p className="hint">That’s common. We’ll treat it as “no” for now and show you what one question to HR could be worth.</p>
        )}
      </fieldset>

      <details className="drawer">
        <summary>More, if you like (optional)</summary>
        <div className="fields">
          <Field id="cushion" label="Months of cushion you’d like" value={inputs.cushionMonths} min={0} max={12} step={1} suffix="months" hint="Short-term savings, filled first." onChange={(v) => setInputs({ cushionMonths: Math.min(24, Math.round(v)) })} />
          <label className="check">
            <input
              type="checkbox"
              checked={!!inputs.home}
              onChange={(e) => setInputs({ home: e.target.checked ? { price: 500000, byAge: Math.max(inputs.age + 8, 32) } : null })}
            />
            I’d like to buy a home
          </label>
          {inputs.home && (
            <div className="fields two">
              <Field id="price" label="Home price" value={inputs.home.price} min={150000} max={1500000} step={10000} prefix="$" hint={`Down payment goal: ${money(inputs.home.price * A.downPaymentShare)}.`} onChange={(v) => setInputs({ home: { ...inputs.home!, price: v } })} />
              <Field id="by" label="By age" value={inputs.home.byAge} min={inputs.age + 1} max={50} step={1} onChange={(v) => setInputs({ home: { ...inputs.home!, byAge: Math.min(60, Math.max(inputs.age + 1, Math.round(v))) } })} />
            </div>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={!!inputs.debt}
              onChange={(e) => setInputs({ debt: e.target.checked ? { balance: 20000, rate: 6 } : null })}
            />
            I have student debt
          </label>
          {inputs.debt && (
            <div className="fields two">
              <Field id="debt" label="Balance" value={inputs.debt.balance} min={0} max={100000} step={500} prefix="$" onChange={(v) => setInputs({ debt: { ...inputs.debt!, balance: v } })} />
              <Field id="rate" label="Interest rate" value={inputs.debt.rate} min={0} max={12} step={0.25} suffix="%" onChange={(v) => setInputs({ debt: { ...inputs.debt!, rate: Math.min(25, v) } })} />
            </div>
          )}
        </div>
      </details>

      <div className="nav">
        <button type="button" className="ghost" onClick={() => setStep(1)}>
          Back
        </button>
        <button type="button" className="primary" onClick={() => setStep(3)}>
          Show my thousand futures
        </button>
      </div>
    </section>
  );
}
