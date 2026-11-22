import { useEffect, useRef, useState } from 'react';
import { APP_NAME, LIVE_URL } from '../config';
import { AnimatedNumber } from '../components/bits';
import { SaveProgressButton, SaveProgressNote } from '../components/Account';
import { CanadaLifeNext } from '../components/CanadaLifeNext';
import type { LeverRow } from '../engine/analyse';
import { HR_MESSAGE, leverCopy, leverCostLine, planLines } from '../lib/copy';
import { download, num } from '../lib/format';
import { CANADA_LIFE_NOTE, NO_PLAN_NOTE, doNow, hrMailto, outcomeLabel, outcomeSuffix, testCsv, testSummary, yearFromToday, type Outcome } from '../lib/doNow';
import { buildIcs, googleCalendarUrl, nextFriday, todayISO } from '../lib/ics';
import { windfallCarryOver } from '../lib/windfall';
import { isStudent } from '../engine/profile';
import { ROOM_FOR, STEP, leverIsOn, testMode, useStore } from '../store';
import { ConfidenceSlider } from './Intro';

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
  y += 70;
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
  y += 300;
  label('Confidence, out of 10', y);
  ctx.fillStyle = '#ecefe9';
  ctx.font = '600 120px Georgia, serif';
  ctx.fillText(d.confBefore === null ? String(d.confAfter) : `${d.confBefore} → ${d.confAfter}`, X, y + 140);
  ctx.fillStyle = '#5fd0bf';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillText(LIVE_URL.replace(/^https:\/\//, '').replace(/\/$/, ''), X, H - 200);
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
  const outcome = useStore((s) => s.outcome);
  const commitment = useStore((s) => s.commitment);
  const setState = useStore((s) => s.setState);
  const setStep = useStore((s) => s.setStep);
  const restart = useStore((s) => s.restart);
  const [payday, setPayday] = useState(nextFriday());
  const [raiseDay, setRaiseDay] = useState(yearFromToday());
  const [copied, setCopied] = useState(false);
  const [calNote, setCalNote] = useState<{ id: string; text: string } | null>(null);
  const [conf, setConf] = useState(confAfter ?? confBefore ?? 5);
  const canvas = useRef<HTMLCanvasElement>(null);

  const ranking = a?.ranking ?? [];
  // The best step that can be started today. Saving part of a raise waits
  // for the raise, so it is never the default here.
  const today = ranking.find((r) => !r.startsLater);
  const pick: LeverRow | undefined = ranking.find((r) => r.id === chosen) ?? ranking.find((r) => leverIsOn(levers, r.id)) ?? today;
  const copy = pick ? leverCopy(pick.id, inputs) : null;
  const roomLabels = ROOM_FOR.filter((r) => room.includes(r.id)).map((r) => r.label);

  useEffect(() => {
    if (canvas.current && copy && pick && confAfter !== null) {
      drawCard(canvas.current, { step: copy.title + outcomeSuffix(outcome), room: roomLabels, rescued: pick.rescued, confBefore, confAfter });
    }
  }, [copy, pick, confBefore, confAfter, roomLabels, outcome]);

  // A change after the summary updates this person's row instead of being lost.
  useEffect(() => {
    const { testRowAt, testLog: log } = useStore.getState();
    if (!testRowAt || confAfter === null) return;
    const row = log.find((r) => r.at === testRowAt);
    if (row && (row.outcome !== outcome || row.reminder !== reminderAdded || row.hrCopied !== hrCopied)) {
      setState({ testLog: log.map((r) => (r.at === testRowAt ? { ...r, outcome, reminder: reminderAdded, hrCopied } : r)) });
    }
  }, [outcome, reminderAdded, hrCopied, confAfter, setState]);

  if (!a) return <section className="narrow"><p className="lede">Working out your futures…</p></section>;

  const lines = pick ? planLines(pick.id, inputs, a.yearlyMatch) : null;
  const now = pick ? doNow(pick.id, inputs) : null;
  const showHR = pick?.id === 'match';
  const noPlan = !isStudent(inputs.stage) && inputs.plan === 'no';

  // Acting on the step shown by default makes it the chosen one, so the
  // answer stays with this habit even if the ranking or habits change later.
  const pin = () => {
    if (pick && chosen !== pick.id) setState({ chosen: pick.id });
  };

  // Only a recurring transfer repeats. A message to HR, a plan change or the
  // next raise happens once, so its reminder does too.
  const repeats = now?.kind === 'bank';
  const isRaise = now?.kind === 'raise';
  const remindDay = isRaise ? raiseDay : payday;
  const remindTitle = copy ? `${APP_NAME}: ${copy.title}` : APP_NAME;
  const remindText = lines ? `${lines[0]} ${lines[1]} Then open ${APP_NAME} for your 30-second check-in: ${LIVE_URL}` : '';
  const nudgeQuestion = repeats ? 'Want a reminder each month on payday?' : isRaise ? 'Want a reminder for your next raise?' : 'Want a reminder to do it?';
  const reminder = () => {
    if (!copy || !lines || !now || !pick) return;
    pin();
    const ics = buildIcs(remindDay, remindTitle, remindText, new Date(), repeats, LIVE_URL);
    download(isRaise ? 'my-next-raise.ics' : repeats ? 'my-monthly-step.ics' : 'my-reminder.ics', new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    setState({ reminderAdded: true });
    setCalNote({ id: pick.id, text: 'Downloaded. Open the file to add it to your calendar.' });
  };
  // Saying "I set it up" starts the first month today, at the check-in too.
  const pickOutcome = (o: Outcome) => {
    pin();
    const next = outcome === o ? null : o;
    setState({ outcome: next });
    // Only while the streak is still just this first answer.
    const onlyThis = commitment && (commitment.streak === 0 || (commitment.streak === 1 && commitment.outcome === 'done'));
    if (commitment && pick && commitment.lever === pick.id && onlyThis) {
      setState({ commitment: { ...commitment, outcome: next, streak: next === 'done' ? 1 : 0, lastCheckISO: next === 'done' ? new Date().toISOString() : null } });
    }
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
    pin();
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
    // Read from the store, not this render: the outcome may have just changed.
    const outcome = useStore.getState().outcome;
    pin();
    setState({ confAfter: conf });
    if (pick) {
      setState({
        commitment: {
          lever: pick.id,
          startedISO: new Date().toISOString(),
          startInControl: a.baseSummary.counts[0],
          startInputs: inputs,
          streak: outcome === 'done' ? 1 : 0,
          lastCheckISO: outcome === 'done' ? new Date().toISOString() : null,
          outcome,
          ...windfallCarryOver(useStore.getState().commitment),
          months: useStore.getState().commitment?.months,
        },
      });
    }
    if (testMode()) {
      // One row per person: finishing again updates it.
      const { testRowAt, testLog: log, reminderAdded: reminder, hrCopied: copiedHR } = useStore.getState();
      const row = {
        at: testRowAt ?? new Date().toISOString(),
        stage: inputs.stage,
        field: inputs.field ?? '',
        confBefore,
        confAfter: conf,
        lever: pick?.id ?? '',
        reminder,
        hrCopied: copiedHR,
        outcome,
      };
      setState({ testRowAt: row.at, testLog: testRowAt ? log.map((r) => (r.at === testRowAt ? row : r)) : [...log, row] });
    }
  };
  // Clears this person's answers and step, and keeps the results.
  const nextPerson = () => {
    setState({ commitment: null });
    restart();
  };
  const results = testSummary(testLog);
  const exportCsv = () => {
    download('user-test-results.csv', new Blob([testCsv(testLog)], { type: 'text/csv' }));
  };

  return (
    <section className="narrow step">
      <h1 className="h-question">Pick one. Just one.</h1>

      <div className="choices" role="radiogroup" aria-label="Pick one to try">
        {ranking.map((r) => {
          const c = leverCopy(r.id, inputs);
          const on = r.id === pick?.id;
          return (
            <button type="button" key={r.id} role="radio" aria-checked={on} className={`card choice${on ? ' on' : ''}`} onClick={() => r.id !== pick?.id && setState({ chosen: r.id, outcome: null, confAfter: null, reminderAdded: false, hrCopied: false })}>
              <b>{c.title}</b>
              {r.startsLater && <span className="tag">Starts at your next raise</span>}
              <span>{leverCostLine(r)}</span>
              <span className="effect">Rescues {num(r.rescued)} futures</span>
            </button>
          );
        })}
      </div>

      {pick && copy && lines && now && (
        <div className="card plan-card">
          <p className="eyebrow">Do it now</p>
          <h2>{copy.title}</h2>
          <ol className="do-steps">
            {now.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {showHR && (
            <div className="hr">
              <blockquote>{HR_MESSAGE}</blockquote>
              <div className="row">
                <a className="primary button-link" href={hrMailto(HR_MESSAGE)} onClick={() => {
                  pin();
                  setState({ hrCopied: true });
                }}>
                  Open it as an email
                </a>
                <button type="button" className="secondary" onClick={copyHR}>
                  {copied ? 'Copied' : 'Copy message'}
                </button>
              </div>
              <span className="sr-only" aria-live="polite">{copied ? 'Message copied' : ''}</span>
              <p className="hint">{CANADA_LIFE_NOTE}</p>
            </div>
          )}
          {now.kind === 'plan' && <p className="hint">{CANADA_LIFE_NOTE}</p>}
          {now.kind === 'raise' && today && (
            <p className="hint">
              Want one you can do today too?{' '}
              <button type="button" className="link" onClick={() => setState({ chosen: today.id, outcome: null, confAfter: null, reminderAdded: false, hrCopied: false })}>
                {leverCopy(today.id, inputs).title}
              </button>{' '}
              rescues {num(today.rescued)}.
            </p>
          )}
          {noPlan && now.kind === 'bank' && <p className="hint">{NO_PLAN_NOTE}</p>}

          <div className="outcomes" role="group" aria-labelledby="did-it">
            <p className="q-label" id="did-it">
              Did you do it?
            </p>
            <div className="row">
              {now.outcomes.map((o) => (
                <button type="button" key={o} className="secondary" aria-pressed={outcome === o} onClick={() => pickOutcome(o)}>
                  {outcomeLabel(o, now.kind)}
                </button>
              ))}
            </div>
          </div>
          {(outcome === 'done' || outcome === 'sent') && <p className="did-it">Done. That’s the hard part.</p>}
          <div className="nudge" role="group" aria-labelledby="nudge-title">
            <p className="q-label" id="nudge-title">
              {outcome === 'notyet' ? `No problem. ${nudgeQuestion}` : nudgeQuestion}
            </p>
            <div className="row">
              <label htmlFor="remind-day">{repeats ? 'Next payday' : isRaise ? 'Next raise or review, roughly' : 'Remind me on'}</label>
              <input
                id="remind-day"
                type="date"
                min={todayISO()}
                value={remindDay}
                onChange={(e) => (isRaise ? setRaiseDay(e.target.value || yearFromToday()) : setPayday(e.target.value || nextFriday()))}
              />
            </div>
            <div className="row">
              <a
                className="primary button-link"
                href={googleCalendarUrl(remindDay, remindTitle, remindText, repeats)}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  pin();
                  setState({ reminderAdded: true });
                  setCalNote({ id: pick.id, text: 'Opened in Google Calendar. Tap Save there to keep it.' });
                }}
              >
                Add to Google Calendar
              </a>
              <button type="button" className="secondary" onClick={reminder}>
                Apple or Outlook calendar
              </button>
              <SaveProgressButton />
            </div>
            <p className="hint" aria-live="polite">
              {calNote?.id === pick.id ? calNote.text : 'Calendar reminders aren’t sent to us. They link back to your check-in.'}
            </p>
            <SaveProgressNote />
          </div>
        </div>
      )}

      {pick && (
        <>
          <h2 className="h-sub">
            <label htmlFor="conf-after">How do you feel about your financial future now?</label>
          </h2>
          <ConfidenceSlider id="conf-after" value={conf} onChange={setConf} />
          {confAfter === null || confAfter !== conf ? (
            <button type="button" className="primary" onClick={finish}>
              See my summary
            </button>
          ) : null}
        </>
      )}

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
            <b>My one step:</b> {copy.title.charAt(0).toLowerCase() + copy.title.slice(1)}
            {outcomeSuffix(outcome)}.
          </p>
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
      {confAfter !== null && pick && <CanadaLifeNext />}
      <canvas ref={canvas} className="sr-only" aria-hidden="true" />

      {testMode() && (
        <div className="card test-mode">
          <p>
            <b>User-test mode.</b> {results.people} anonymous {results.people === 1 ? 'person' : 'people'} recorded on this device.
          </p>
          {results.people > 0 && (
            <p className="test-summary">
              {results.confBefore !== null && (
                <>
                  Confidence <b>{results.confBefore}</b> → <b>{results.confAfter}</b> out of 10.{' '}
                </>
              )}
              <b>{results.tookStep} of {results.people}</b> took the step
              {results.reminderOnly > 0 ? ` (${results.reminderOnly} by adding a reminder for their next raise)` : ''}.
            </p>
          )}
          <div className="row">
            <button type="button" className="primary" onClick={nextPerson}>
              Next person
            </button>
            <button type="button" className="secondary" onClick={exportCsv} disabled={!testLog.length}>
              Export results (CSV)
            </button>
          </div>
        </div>
      )}

      <div className="nav">
        <button type="button" className="ghost" onClick={() => setStep(STEP.habits)}>
          Back
        </button>
        <button type="button" className="ghost" onClick={restart}>
          Start over
        </button>
      </div>
    </section>
  );
}
