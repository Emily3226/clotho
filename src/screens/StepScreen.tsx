import { useEffect, useRef, useState } from 'react';
import { APP_NAME } from '../config';
import { AnimatedNumber } from '../components/bits';
import type { LeverRow } from '../engine/analyse';
import { HR_MESSAGE, leverCopy, leverCostLine, planLines } from '../lib/copy';
import { download, num } from '../lib/format';
import { buildIcs, nextFriday } from '../lib/ics';
import { ROOM_FOR, STEP, leverIsOn, testMode, useStore } from '../store';
import { ConfidenceSlider } from './Intro';

const CHECKLIST = [
  'Pick the day: the same day your pay arrives.',
  'Set it up once, in your bank app or with HR.',
  'Leave it alone. We’ll check in once a month.',
];

interface CardData {
  step: string;
  room: string[];
  rescued: number;
  confBefore: number | null;
  confAfter: number;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number): number {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y);
      y += lh;
      line = w;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

// A 9:16 summary card, sized for a story, drawn to a canvas so it can be saved.
function drawCard(canvas: HTMLCanvasElement, d: CardData): void {
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0d1412';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5fd0bf';
  ctx.fillRect(0, 0, W, 14);
  const X = 96;
  const MAX = W - 2 * X;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5fd0bf';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillText(APP_NAME.toUpperCase(), X, 180);
  ctx.fillStyle = '#ecefe9';
  ctx.font = '500 76px Georgia, serif';
  let y = wrap(ctx, 'You can’t predict the future.', X, 320, MAX, 92);
  ctx.fillStyle = '#5fd0bf';
  y = wrap(ctx, 'You can stack the odds.', X, y, MAX, 92);

  const label = (text: string, at: number) => {
    ctx.fillStyle = '#a3aea9';
    ctx.font = '500 34px system-ui, sans-serif';
    ctx.fillText(text, X, at);
  };
  y += 110;
  if (d.room.length) {
    label('I want room for', y);
    ctx.fillStyle = '#ecefe9';
    ctx.font = '500 52px system-ui, sans-serif';
    y = wrap(ctx, d.room.join(' · '), X, y + 74, MAX, 66) + 70;
  }
  label('My one step', y);
  ctx.fillStyle = '#ecefe9';
  ctx.font = '500 52px system-ui, sans-serif';
  y = wrap(ctx, d.step, X, y + 74, MAX, 66) + 70;
  label('Futures it rescues, of 1,000', y);
  ctx.fillStyle = '#5fd0bf';
  ctx.font = '600 200px Georgia, serif';
  ctx.fillText(num(d.rescued), X, y + 210);
  y += 330;
  label('Confidence, out of 10', y);
  ctx.fillStyle = '#ecefe9';
  ctx.font = '600 120px Georgia, serif';
  ctx.fillText(d.confBefore === null ? String(d.confAfter) : `${d.confBefore} → ${d.confAfter}`, X, y + 140);
  ctx.fillStyle = '#6f7b76';
  ctx.font = '400 28px system-ui, sans-serif';
  wrap(ctx, 'A thousand simulated futures in today’s dollars. Educational, not financial advice.', X, H - 140, MAX, 40);
}

export function StepScreen() {
  const a = useStore((s) => s.analysis);
  const inputs = useStore((s) => s.inputs);
  const levers = useStore((s) => s.levers);
  const chosen = useStore((s) => s.chosen);
  const room = useStore((s) => s.room);
  const confBefore = useStore((s) => s.confBefore);
  const confAfter = useStore((s) => s.confAfter);
  const reminderAdded = useStore((s) => s.reminderAdded);
  const hrCopied = useStore((s) => s.hrCopied);
  const testLog = useStore((s) => s.testLog);
  const setState = useStore((s) => s.setState);
  const setStep = useStore((s) => s.setStep);
  const restart = useStore((s) => s.restart);
  const [payday, setPayday] = useState(nextFriday());
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<boolean[]>([false, false, false]);
  const [conf, setConf] = useState(confAfter ?? confBefore ?? 5);
  const canvas = useRef<HTMLCanvasElement>(null);

  const ranking = a?.ranking ?? [];
  const pick: LeverRow | undefined = ranking.find((r) => r.id === chosen) ?? ranking.find((r) => leverIsOn(levers, r.id));
  const copy = pick ? leverCopy(pick.id, inputs) : null;
  const roomLabels = ROOM_FOR.filter((r) => room.includes(r.id)).map((r) => r.label);

  useEffect(() => {
    if (canvas.current && copy && pick && confAfter !== null) {
      drawCard(canvas.current, { step: copy.title, room: roomLabels, rescued: pick.rescued, confBefore, confAfter });
    }
  }, [copy, pick, confBefore, confAfter, roomLabels]);

  if (!a) return <section className="narrow"><p className="lede">Working out your futures…</p></section>;

  const lines = pick ? planLines(pick.id, inputs, a.yearlyMatch) : null;
  const showHR = pick?.id === 'match';

  const reminder = () => {
    if (!copy || !lines) return;
    const ics = buildIcs(payday, `${APP_NAME}: ${copy.title}`, `${lines[0]} ${lines[1]} Then open ${APP_NAME} for your 30-second check-in.`, new Date(), true);
    download('my-monthly-step.ics', new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    setState({ reminderAdded: true });
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
    setState({ hrCopied: true });
    setTimeout(() => setCopied(false), 2500);
  };
  const saveImage = () => canvas.current?.toBlob((b) => b && download('my-thousand-futures.png', b), 'image/png');
  const share = async () => {
    const blob = await new Promise<Blob | null>((r) => canvas.current?.toBlob(r, 'image/png'));
    if (!blob) return;
    const file = new File([blob], 'my-thousand-futures.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: APP_NAME }).catch(() => {});
    else saveImage();
  };
  const finish = () => {
    setState({ confAfter: conf });
    if (pick) {
      setState({
        commitment: {
          lever: pick.id,
          startedISO: new Date().toISOString(),
          startInControl: a.scenarioSummary.counts[0],
          startInputs: inputs,
          streak: 0,
          lastCheckISO: null,
        },
      });
    }
    if (testMode()) {
      setState({
        testLog: [
          ...testLog,
          {
            at: new Date().toISOString(),
            stage: inputs.stage,
            field: inputs.field ?? '',
            confBefore,
            confAfter: conf,
            lever: pick?.id ?? '',
            reminder: reminderAdded,
            hrCopied,
          },
        ],
      });
    }
  };
  const exportCsv = () => {
    const head = 'at,stage,field,confBefore,confAfter,lever,reminder,hrCopied';
    const rows = testLog.map((r) => [r.at, r.stage, r.field, r.confBefore ?? '', r.confAfter ?? '', r.lever, r.reminder, r.hrCopied].join(','));
    download('user-test-results.csv', new Blob([[head, ...rows].join('\n') + '\n'], { type: 'text/csv' }));
  };

  return (
    <section className="narrow step">
      <p className="eyebrow">Pick one to try</p>
      <h1 className="h-question">Pick one. Just one.</h1>
      <p className="hint">Each shows what it costs and what it does. You decide. One step you keep does more than five you don’t.</p>

      <div className="choices" role="radiogroup" aria-label="Pick one to try">
        {ranking.map((r) => {
          const c = leverCopy(r.id, inputs);
          const on = r.id === pick?.id;
          return (
            <button type="button" key={r.id} role="radio" aria-checked={on} className={`card choice${on ? ' on' : ''}`} onClick={() => setState({ chosen: r.id })}>
              <b>{c.title}</b>
              <span>{leverCostLine(r)}</span>
              <span className="effect">Rescues {num(r.rescued)} futures</span>
            </button>
          );
        })}
      </div>

      {pick && copy && lines && (
        <div className="card plan-card">
          <h2>{copy.title}</h2>
          <p>{lines[0]}</p>
          <p>{lines[1]}</p>
          <div className="row">
            <label htmlFor="payday">Next payday</label>
            <input id="payday" type="date" value={payday} onChange={(e) => setPayday(e.target.value || nextFriday())} />
            <button type="button" className="secondary" onClick={reminder}>
              {reminderAdded ? 'Reminder downloaded' : 'Add a monthly reminder'}
            </button>
          </div>
          <p className="hint">A calendar file that repeats each month, with a link back here for a 30-second check-in.</p>
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
      )}

      {pick && (
        <>
          <h2 className="h-sub">
            <label htmlFor="conf-after">One last thing. How do you feel about your financial future now?</label>
          </h2>
          <ConfidenceSlider id="conf-after" value={conf} onChange={setConf} />
          {confAfter === null || confAfter !== conf ? (
            <button type="button" className="primary" onClick={finish}>
              See my summary
            </button>
          ) : null}
        </>
      )}
      {!pick && <p className="hint">Tap one above to see the plan.</p>}

      {confAfter !== null && pick && copy && (
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
              <p className="eyebrow">Futures it rescues, of 1,000</p>
              <p className="big-num">
                <AnimatedNumber value={pick.rescued} />
              </p>
            </div>
          </div>
          {roomLabels.length > 0 && (
            <p>
              <b>Room for:</b> {roomLabels.join(', ').toLowerCase()}.
            </p>
          )}
          <p>
            <b>My one step:</b> {copy.title.charAt(0).toLowerCase() + copy.title.slice(1)}.
          </p>
          <p className="hint">You can’t predict which future you get. You just moved the odds. See you at next month’s check-in.</p>
          <div className="row">
            <button type="button" className="secondary" onClick={share}>
              Share
            </button>
            <button type="button" className="ghost" onClick={saveImage}>
              Save image
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvas} className="sr-only" aria-hidden="true" />

      {testMode() && (
        <div className="card test-mode">
          <p>
            <b>User-test mode.</b> {testLog.length} anonymous {testLog.length === 1 ? 'session' : 'sessions'} recorded on this device.
          </p>
          <button type="button" className="secondary" onClick={exportCsv} disabled={!testLog.length}>
            Export results (CSV)
          </button>
        </div>
      )}

      <div className="nav">
        <button type="button" className="ghost" onClick={() => setStep(STEP.whatIf)}>
          Back
        </button>
        <button type="button" className="ghost" onClick={restart}>
          Start over
        </button>
      </div>
    </section>
  );
}
