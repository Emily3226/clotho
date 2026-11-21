import { useState } from 'react';
import type { PathLite } from '../engine/analyse';
import { STATUS_LABELS } from '../engine/types';
import { pathFacts, story, timeline } from '../lib/copy';
import { useNarration } from '../narrate/client';
import { useStore } from '../store';

// One life out of the thousand, told as a short story and a timeline. With a
// habit switched on, the same life (same luck) can be shown without it.
export function Inspector({
  index,
  path,
  plain,
  onAnother,
  onClose,
}: {
  index: number;
  path: PathLite;
  plain: PathLite | null;
  onAnother: () => void;
  onClose: () => void;
}) {
  const [without, setWithout] = useState(false);
  const goals = useStore((s) => s.inputs.goals ?? []);
  const shown = without && plain ? plain : path;
  const rows = timeline(shown.events, goals);
  const { text, narrated } = useNarration('story', pathFacts(shown, goals), story(shown));
  const m = shown.milestones;
  const marks: [string, boolean | null][] = [
    ['Got through bad years', m.shockProof],
    ['6 months saved by 35', m.room35],
    ['A year saved by 45', m.room45],
    ['Home', m.home],
    ['Work optional by 65', m.workOptional65],
    ...goals.map((g, k): [string, boolean | null] => [`${g.label} by ${g.byAge}`, m.goals[k] ?? null]),
  ];
  const changed = plain && plain.status !== path.status;
  return (
    <section className="inspector card" aria-label={`Future ${index + 1}`}>
      <header>
        <div>
          <p className="eyebrow">Future {index + 1} of 1,000</p>
          <h3>
            <span className={`status-line s${shown.status}`} aria-hidden="true" /> {STATUS_LABELS[shown.status as 0 | 1 | 2 | 3]}
          </h3>
        </div>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close this future">
          Close
        </button>
      </header>
      {plain && (
        <div className="segmented" role="radiogroup" aria-label="Show this life">
          <button type="button" role="radio" aria-checked={!without} onClick={() => setWithout(false)}>
            With the habit
          </button>
          <button type="button" role="radio" aria-checked={without} onClick={() => setWithout(true)}>
            Without the habit
          </button>
        </div>
      )}
      {plain && changed && (
        <p className="hint">Same luck. Without it: {STATUS_LABELS[plain.status as 0 | 1 | 2 | 3].toLowerCase()}.</p>
      )}
      <p className="story">
        {text}
        {narrated && <span className="tag">AI wording</span>}
      </p>
      <ul className="marks">
        {marks
          .filter(([, ok]) => ok !== null)
          .map(([label, ok]) => (
            <li key={label} className={ok ? 'yes' : 'no'}>
              <span aria-hidden="true">{ok ? '✓' : '–'}</span> {label}
              <span className="sr-only">{ok ? ': reached' : ': not reached'}</span>
            </li>
          ))}
      </ul>
      <ol className="timeline">
        {rows.length === 0 && <li className="plain">A quiet life.</li>}
        {rows.map((r) => (
          <li key={r.age} className={r.kind}>
            <b>{r.age}</b>
            <span>{r.text}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="secondary" onClick={onAnother}>
        Show me another
      </button>
    </section>
  );
}
