import { useEffect, useRef, useState } from 'react';
import { APP_NAME, TAGLINE } from '../config';
import { AnimatedNumber } from '../components/bits';
import type { LeverRow } from '../engine/analyse';
import { HR_MESSAGE, leverCopy, leverCostLine, planLines } from '../lib/copy';
import { download, num } from '../lib/format';
import { buildIcs, nextFriday } from '../lib/ics';
import { leverIsOn, useStore } from '../store';
import { ConfidenceSlider } from './Intro';

const CHECKLIST = [
  'Pick the day: the same day your pay arrives.',
  'Set it up once, in your bank app or with HR.',
  'Leave it alone. Look again in three months.',
];

interface CardData {
  step: string;
  confBefore: number | null;
  confAfter: number;
  before: number;
  after: number;
}

// Draws the summary card to a canvas so it can be saved as an image.
function drawCard(canvas: HTMLCanvasElement, d: CardData): void {
  const W = 1200;
  const H = 630;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0d1412';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5fd0bf';
  ctx.fillRect(0, 0, 14, H);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5fd0bf';
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText(APP_NAME.toUpperCase(), 72, 92);
  ctx.fillStyle = '#ecefe9';
  ctx.font = '500 46px Georgia, serif';
  ctx.fillText(TAGLINE.split('. ')[0] + '.', 72, 168);
  ctx.fillStyle = '#5fd0bf';
  ctx.fillText(TAGLINE.split('. ')[1], 72, 226);

  const block = (x: number, label: string, from: string, to: string) => {
    ctx.fillStyle = '#a3aea9';
    ctx.font = '500 24px system-ui, sans-serif';
    ctx.fillText(label, x, 330);
    ctx.fillStyle = '#ecefe9';
    ctx.font = '600 84px Georgia, serif';
    const text = from ? `${from} → ${to}` : to;
    ctx.fillText(text, x, 420);
  };
  block(72, 'Confidence, out of 10', d.confBefore === null ? '' : String(d.confBefore), String(d.confAfter));
  block(620, 'Futures in control, of 1,000', num(d.before), num(d.after));

  ctx.fillStyle = '#a3aea9';
  ctx.font = '500 24px system-ui, sans-serif';
  ctx.fillText('My one step', 72, 510);
  ctx.fillStyle = '#ecefe9';
  ctx.font = '500 36px system-ui, sans-serif';
  ctx.fillText(d.step, 72, 560);
  ctx.fillStyle = '#6f7b76';
  ctx.font = '400 18px system-ui, sans-serif';
  ctx.fillText('A thousand simulated futures in today’s dollars. Educational, not financial advice.', 72, 604);
}

export function StepScreen() {
  const a = useStore((s) => s.analysis);
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const chosen = useStore((s) => s.chosen);
  const confBefore = useStore((s) => s.confBefore);
  const confAfter = useStore((s) => s.confAfter);
  const set = useStore((s) => s.set);
  const setStep = useStore((s) => s.setStep);
  const restart = useStore((s) => s.restart);
  const [payday, setPayday] = useState(nextFriday());
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<boolean[]>([false, false, false]);
  const [conf, setConf] = useState(confAfter ?? confBefore ?? 5);
  const canvas = useRef<HTMLCanvasElement>(null);

  const ranking = a?.ranking ?? [];
  const pick: LeverRow | undefined =
    ranking.find((r) => r.id === chosen) ?? ranking.find((r) => leverIsOn(levers, r.id)) ?? ranking[0];

  useEffect(() => {
    if (pick && pick.id !== chosen) set({ chosen: pick.id });
  }, [pick, chosen, set]);

  const copy = pick ? leverCopy(pick.id, inputs) : null;
  const before = a?.scenarioSummary.counts[0] ?? 0;
  const after = pick ? pick.inControl : before;

  useEffect(() => {
    if (canvas.current && copy && confAfter !== null) {
      drawCard(canvas.current, { step: copy.title, confBefore, confAfter, before, after });
    }
  }, [copy, confBefore, confAfter, before, after]);

  if (!a || !pick || !copy) return <section className="narrow"><p className="lede">Working out your futures…</p></section>;

  const lines = planLines(pick.id, inputs, a.yearlyMatch);
  const showHR = pick.id === 'match';

  const reminder = () => {
    const ics = buildIcs(payday, `${APP_NAME}: ${copy.title}`, `${lines[0]} ${lines[1]}`);
    download('my-one-step.ics', new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  };
  const copyHR = async () => {
    try {
      await navigator.clipboard.writeText(HR_MESSAGE);
    } catch {
      const t = document.createElement('textarea');
      t.value = HR_MESSAGE;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const saveImage = () => canvas.current?.toBlob((b) => b && download('my-thousand-futures.png', b), 'image/png');

  return (
    <section className="narrow step">
      <p className="eyebrow">Your one step</p>
      <h1 className="h-question">Pick one. Just one.</h1>
      <p className="hint">You can always add another later. One step you keep does more than five you don’t.</p>

      <div className="choices" role="radiogroup" aria-label="Your one step">
        {ranking.map((r) => {
          const c = leverCopy(r.id, inputs);
          const on = r.id === pick.id;
          return (
            <button type="button" key={r.id} role="radio" aria-checked={on} className={`card choice${on ? ' on' : ''}`} onClick={() => set({ chosen: r.id })}>
              <b>{c.title}</b>
              <span>{leverCostLine(r)}</span>
              <span className="effect">
                {r.gained >= 0 ? '+' : '−'}
                {num(Math.abs(r.gained))} futures in control
              </span>
            </button>
          );
        })}
      </div>

      <div className="card plan-card">
        <h2>{copy.title}</h2>
        <p>{lines[0]}</p>
        <p>{lines[1]}</p>
        <div className="row">
          <label htmlFor="payday">Next payday</label>
          <input id="payday" type="date" value={payday} onChange={(e) => setPayday(e.target.value || nextFriday())} />
          <button type="button" className="secondary" onClick={reminder}>
            Add a reminder
          </button>
        </div>
        {showHR && (
          <div className="hr">
            <p className="hint">A message you can send as it is:</p>
            <blockquote>{HR_MESSAGE}</blockquote>
            <button type="button" className="secondary" onClick={copyHR}>
              {copied ? 'Copied' : 'Copy message'}
            </button>
            <span className="sr-only" aria-live="polite">{copied ? 'Message copied' : ''}</span>
          </div>
        )}
        <h3>Make it automatic</h3>
        <ul className="checklist">
          {CHECKLIST.map((item, i) => (
            <li key={item}>
              <label className="check">
                <input type="checkbox" checked={done[i]} onChange={() => setDone(done.map((d, k) => (k === i ? !d : d)))} />
                {item}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <h2 className="h-sub">
        <label htmlFor="conf-after">One last thing. How do you feel about your financial future now?</label>
      </h2>
      <ConfidenceSlider id="conf-after" value={conf} onChange={setConf} />
      {confAfter === null || confAfter !== conf ? (
        <button type="button" className="primary" onClick={() => set({ confAfter: conf })}>
          See my summary
        </button>
      ) : null}

      {confAfter !== null && (
        <div className="card summary" aria-live="polite">
          <div className="summary-grid">
            <div>
              <p className="eyebrow">Confidence, out of 10</p>
              <p className="big-num">
                {confBefore !== null && <><span className="was">{confBefore}</span><span aria-hidden="true"> → </span><span className="sr-only"> then </span></>}
                <AnimatedNumber value={confAfter} />
              </p>
            </div>
            <div>
              <p className="eyebrow">Futures in control, of 1,000</p>
              <p className="big-num">
                <span className="was">{num(before)}</span>
                <span aria-hidden="true"> → </span>
                <span className="sr-only"> then </span>
                <AnimatedNumber value={after} />
              </p>
            </div>
          </div>
          <p>
            <b>My one step:</b> {copy.title.charAt(0).toLowerCase() + copy.title.slice(1)}.
          </p>
          <p className="hint">You can’t predict which future you get. You just moved the odds.</p>
          <button type="button" className="secondary" onClick={saveImage}>
            Save image
          </button>
        </div>
      )}
      <canvas ref={canvas} className="sr-only" aria-hidden="true" />

      <div className="nav">
        <button type="button" className="ghost" onClick={() => setStep(5)}>
          Back
        </button>
        <button type="button" className="ghost" onClick={restart}>
          Start over
        </button>
      </div>
    </section>
  );
}
