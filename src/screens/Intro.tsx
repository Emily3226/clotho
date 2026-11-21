import { useState } from 'react';
import { APP_NAME, TAGLINE } from '../config';
import { AboutYou } from '../components/AboutYou';
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
    setState({ inputs: p.inputs, room: p.room, personaId: p.id, incomeEdited: true });
    setStep(STEP.futures);
  };
  return (
    <section className="landing">
      <p className="eyebrow">{APP_NAME}</p>
      <h1>
        {first}.<br />
        <em>{second}</em>
      </h1>
      <p className="lede">A thousand runs of luck. See which small habit rescues the most of your futures.</p>
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
        <span>1 · lost</span>
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
  const [conf, setConf] = useState(before ?? 5);
  return (
    <section className="narrow about-screen">
      <p className="eyebrow">About you</p>
      <h1 className="h-question">Tap what fits. Rough is fine.</h1>
      <div className="card intake">
        <div className="q">
          <label className="q-label" htmlFor="conf-before">
            How do you feel about your financial future?
          </label>
          <ConfidenceSlider id="conf-before" value={conf} onChange={setConf} />
        </div>
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
            setState({ confBefore: conf });
            setStep(STEP.futures);
          }}
        >
          Show my thousand futures
        </button>
      </div>
    </section>
  );
}
