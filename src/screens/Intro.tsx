import { useState } from 'react';
import { TAGLINE } from '../config';
import { AboutYou } from '../components/AboutYou';
import { ChipGroup } from '../components/bits';
import { ConcernEditor } from '../components/ConcernEditor';
import { WORRIES } from '../engine/worries';
import type { WorryId } from '../engine/types';
import { LandingRiver } from '../components/LandingRiver';
import { PERSONAS } from '../engine/personas';
import { STEP, useStore } from '../store';

export function Landing() {
  const setStep = useStore((s) => s.setStep);
  const setState = useStore((s) => s.setState);
  const restart = useStore((s) => s.restart);
  const commitment = useStore((s) => s.commitment);
  const [first, second] = TAGLINE.split('. ');
  const usePersona = (id: string) => {
    const p = PERSONAS.find((x) => x.id === id)!;
    restart();
    setState({ inputs: p.inputs, room: p.room, personaId: p.id, incomeEdited: true, fieldOther: null, others: {} });
    // Prefilled, so it's one tap to the results, but confidence is still asked.
    setStep(STEP.about);
  };
  return (
    <section className="landing">
      <h1>
        {first}.<br />
        <em>{second}</em>
      </h1>
      <p className="lede">1,000 runs of luck. One habit that helps most.</p>
      <LandingRiver />
      {commitment && (
        <div className="card welcome">
          <p>
            <b>Welcome back.</b> 30-second check-in?
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
            setStep(STEP.about);
          }}
        >
          Start
        </button>
        <span className="hint">No sign-up. Stays on this device.</span>
      </div>
      <h2 className="small-head">Or try someone else’s</h2>
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
        <span>1 · not sure where I stand</span>
        <span>10 · I’ve got this</span>
      </div>
    </div>
  );
}

// Every question on one screen, mostly taps.
export function About() {
  const setStep = useStore((s) => s.setStep);
  const setState = useStore((s) => s.setState);
  const before = useStore((s) => s.confBefore);
  const worries = useStore((s) => s.worries);
  const toggleWorry = useStore((s) => s.toggleWorry);
  const [conf, setConf] = useState(before ?? 5);
  const concerns = useStore((s) => s.concerns);
  const [otherWorry, setOtherWorry] = useState(concerns.length > 0);
  return (
    <section className="narrow about-screen">
      <h1 className="h-question">Tap what fits.</h1>
      <div className="card intake">
        <div className="q">
          <label className="q-label" htmlFor="conf-before">
            How do you feel about your financial future?
          </label>
          <ConfidenceSlider id="conf-before" value={conf} onChange={setConf} />
        </div>
        <ChipGroup<WorryId | 'other'>
          legend="What worries you most?"
          options={[...WORRIES.map((w) => ({ value: w.id as WorryId | 'other', label: w.label })), { value: 'other', label: 'Other' }]}
          selected={(v) => (v === 'other' ? otherWorry : !!worries[v])}
          onPick={(v) => (v === 'other' ? setOtherWorry(!otherWorry) : toggleWorry(v))}
        />
        {otherWorry && <ConcernEditor inline />}
        <AboutYou />
      </div>
      <div className="nav">
        <button type="button" className="ghost" onClick={() => setStep(STEP.start)}>
          Back
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            // Picked worries open as cards on the first result. The river starts
            // without them, so the first number is today, not the worst case.
            setState({ confBefore: conf, first: null, activeWorry: null, selectedPath: null });
            setStep(STEP.futures);
          }}
        >
          See my 1,000 futures
        </button>
      </div>
    </section>
  );
}
