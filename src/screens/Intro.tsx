import { useState } from 'react';
import { APP_NAME, TAGLINE } from '../config';
import { Field, Segmented, Term } from '../components/bits';
import { A } from '../engine/assumptions';
import { PERSONAS } from '../engine/personas';
import { STAGES, inputsForStage, stageInfo } from '../engine/profile';
import type { Stage } from '../engine/types';
import { money } from '../lib/format';
import { ROOM_FOR, STEP, useStore } from '../store';

export function Landing() {
  const setStep = useStore((s) => s.setStep);
  const setState = useStore((s) => s.setState);
  const restart = useStore((s) => s.restart);
  const commitment = useStore((s) => s.commitment);
  const [first, second] = TAGLINE.split('. ');
  const usePersona = (id: string) => {
    const p = PERSONAS.find((x) => x.id === id)!;
    restart();
    setState({ inputs: p.inputs, room: p.room, personaId: p.id, incomeEdited: true });
    setStep(STEP.checkin);
  };
  return (
    <section className="landing">
      <p className="eyebrow">{APP_NAME} · a thousand versions of your financial life</p>
      <h1>
        {first}.<br />
        <em>{second}</em>
      </h1>
      <p className="lede">
        Test your small money habits against a thousand runs of luck. See exactly which of your futures each habit
        rescues, including the ones you worry about. Then pick one to try.
      </p>
      {commitment && (
        <div className="card welcome">
          <p>
            <b>Welcome back.</b> Ready for your 30-second check-in?
          </p>
          <button type="button" className="primary" onClick={() => setStep(STEP.back)}>
            Check in
          </button>
        </div>
      )}
      <div className="cta">
        <button
          type="button"
          className={commitment ? 'secondary big' : 'primary big'}
          onClick={() => {
            restart();
            setStep(STEP.checkin);
          }}
        >
          Start (2 minutes)
        </button>
        <span className="hint">No sign-up. Your answers stay on this device. Not another feed: after today, it’s 30 seconds a month.</span>
      </div>
      <h2 className="small-head">Or step into someone else’s shoes</h2>
      <div className="personas">
        {PERSONAS.filter((p) => !p.compare).map((p) => (
          <button type="button" key={p.id} className="persona card" onClick={() => usePersona(p.id)}>
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

export function CheckIn() {
  const setStep = useStore((s) => s.setStep);
  const setState = useStore((s) => s.setState);
  const before = useStore((s) => s.confBefore);
  const room = useStore((s) => s.room);
  const toggleRoom = useStore((s) => s.toggleRoom);
  const inputs = useStore((s) => s.inputs);
  const personaId = useStore((s) => s.personaId);
  const [conf, setConf] = useState(before ?? 5);
  const next = () => {
    const patch: Partial<typeof inputs> = {};
    // Wanting room for a home turns on the home goal.
    if (room.includes('home') && !inputs.home) patch.home = { price: 550000, byAge: Math.max(inputs.age + 10, 32) };
    if (!room.includes('home') && inputs.home && !personaId) patch.home = null;
    setState({ confBefore: conf, inputs: { ...inputs, ...patch } });
    setStep(personaId ? STEP.futures : STEP.basics);
  };
  return (
    <section className="narrow">
      <p className="eyebrow">Check-in</p>
      <h1 className="h-question">
        <label htmlFor="conf-before">How do you feel about your financial future right now?</label>
      </h1>
      <ConfidenceSlider id="conf-before" value={conf} onChange={setConf} />
      <h2 className="h-sub">What do you want room for?</h2>
      <p className="hint">Pick any that fit. Money is just a way to have more choices.</p>
      <div className="chips">
        {ROOM_FOR.map((r) => (
          <button type="button" key={r.id} className="chip" aria-pressed={room.includes(r.id)} onClick={() => toggleRoom(r.id)}>
            <span aria-hidden="true">{room.includes(r.id) ? '✓ ' : '+ '}</span>
            {r.label}
          </button>
        ))}
      </div>
      <div className="nav">
        <button type="button" className="ghost" onClick={() => setStep(STEP.start)}>
          Back
        </button>
        <button type="button" className="primary" onClick={next}>
          Next
        </button>
      </div>
    </section>
  );
}

export function Basics() {
  const inputs = useStore((s) => s.inputs);
  const setInputs = useStore((s) => s.setInputs);
  const setState = useStore((s) => s.setState);
  const setStep = useStore((s) => s.setStep);
  const yearlyMatch = (inputs.matchPct / 100) * inputs.income;
  const setStage = (stage: Stage) => setState({ inputs: inputsForStage(stage, inputs.age, inputs), incomeEdited: false });
  return (
    <section className="narrow">
      <p className="eyebrow">Basics</p>
      <h1 className="h-question">Three quick questions. Rough is fine.</h1>
      <p className="hint">Everything is in today’s dollars, and it stays on this device.</p>
      <div className="fields">
        <Field
          id="age"
          label="Your age"
          value={inputs.age}
          min={18}
          max={35}
          step={1}
          onChange={(v) => {
            const age = Math.min(35, Math.max(18, Math.round(v)));
            setInputs({ age, finishAge: Math.max(age, inputs.finishAge), moveOutAge: Math.max(age + 1, inputs.moveOutAge) });
          }}
        />
      </div>
      <fieldset className="plan">
        <legend>Where are you right now?</legend>
        <Segmented<Stage> label="Life stage" value={inputs.stage} onChange={setStage} options={STAGES.map((s) => ({ value: s.id, label: s.label }))} />
        <p className="hint">
          We fill in typical numbers for {stageInfo(inputs.stage).label.toLowerCase()}s. You can change any of them below.
        </p>
      </fieldset>
      <div className="fields">
        <Field id="monthly" label="About how much could you set aside a month?" value={inputs.monthly} min={0} max={1000} step={5} prefix="$" hint="Zero is a fine answer." onChange={(v) => setInputs({ monthly: v })} />
      </div>

      <details className="drawer">
        <summary>Fine-tune (optional)</summary>
        <div className="fields">
          <Field
            id="income"
            label={inputs.stage === 'student' ? 'Yearly income now, before tax (part-time is fine)' : 'Yearly income before tax'}
            value={inputs.income}
            min={0}
            max={200000}
            step={1000}
            prefix="$"
            onChange={(v) => setState({ inputs: { ...inputs, income: v }, incomeEdited: true })}
          />
          <Field id="saved" label="Total saved so far" value={inputs.saved} min={0} max={100000} step={500} prefix="$" onChange={(v) => setInputs({ saved: v })} />
          {inputs.stage !== 'student' && (
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
                  <Field id="emp" label="You put in" value={inputs.employeePct} min={0} max={15} step={0.5} suffix="% of pay" hint="On top of what you set aside each month." onChange={(v) => setInputs({ employeePct: Math.min(30, v) })} />
                  <Field id="match" label="Employer matches up to" value={inputs.matchPct} min={0} max={10} step={0.5} suffix="% of pay" hint={`Money your employer adds: up to ${money(yearlyMatch)} a year.`} onChange={(v) => setInputs({ matchPct: Math.min(20, v) })} />
                </div>
              )}
              {inputs.plan === 'unsure' && <p className="hint">That’s common. We’ll treat it as “no” for now and show what one question to HR could be worth.</p>}
            </fieldset>
          )}
          <Field id="cushion" label="Months of cushion you’d like" value={inputs.cushionMonths} min={0} max={12} step={1} suffix="months" hint="Short-term savings, filled first." onChange={(v) => setInputs({ cushionMonths: Math.min(24, Math.round(v)) })} />
          <label className="check">
            <input type="checkbox" checked={!!inputs.home} onChange={(e) => setInputs({ home: e.target.checked ? { price: 550000, byAge: Math.max(inputs.age + 10, 32) } : null })} />
            I’d like to buy a home
          </label>
          {inputs.home && (
            <div className="fields two">
              <Field id="price" label="Home price" value={inputs.home.price} min={150000} max={1500000} step={10000} prefix="$" hint={`Down payment goal: ${money(inputs.home.price * A.downPaymentShare)}.`} onChange={(v) => setInputs({ home: { ...inputs.home!, price: v } })} />
              <Field id="by" label="By age" value={inputs.home.byAge} min={inputs.age + 1} max={50} step={1} onChange={(v) => setInputs({ home: { ...inputs.home!, byAge: Math.min(60, Math.max(inputs.age + 1, Math.round(v))) } })} />
            </div>
          )}
          {inputs.debt && (
            <div className="fields two">
              <Field id="debt" label="Student debt balance" value={inputs.debt.balance} min={0} max={100000} step={500} prefix="$" onChange={(v) => setInputs({ debt: { ...inputs.debt!, balance: v } })} />
              <Field id="rate" label="Interest rate" value={inputs.debt.rate} min={0} max={12} step={0.25} suffix="%" onChange={(v) => setInputs({ debt: { ...inputs.debt!, rate: Math.min(25, v) } })} />
            </div>
          )}
        </div>
      </details>

      <div className="nav">
        <button type="button" className="ghost" onClick={() => setStep(STEP.checkin)}>
          Back
        </button>
        <button type="button" className="primary" onClick={() => setStep(STEP.futures)}>
          Show my thousand futures
        </button>
      </div>
    </section>
  );
}
