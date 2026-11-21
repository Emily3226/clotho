import type { PathLite } from '../engine/analyse';
import { STATUS_LABELS } from '../engine/types';
import { pathFacts, story, timeline } from '../lib/copy';
import { useNarration } from '../narrate/client';

// One life out of the thousand, told as a short story and a timeline.
export function Inspector({ index, path, onClose }: { index: number; path: PathLite; onClose: () => void }) {
  const rows = timeline(path.events);
  const { text, narrated } = useNarration('story', pathFacts(path), story(path));
  const m = path.milestones;
  const marks: [string, boolean | null][] = [
    ['Shock-proof', m.shockProof],
    ['Room to move at 35', m.room35],
    ['Room to move at 45', m.room45],
    ['Home', m.home],
    ['Work-optional by 65', m.workOptional65],
  ];
  return (
    <section className="inspector card" aria-label={`Future ${index + 1}`}>
      <header>
        <div>
          <p className="eyebrow">Future {index + 1} of 1,000</p>
          <h3>
            <span className={`status-line s${path.status}`} aria-hidden="true" /> {STATUS_LABELS[path.status as 0 | 1 | 2 | 3]}
          </h3>
        </div>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close this future">
          Close
        </button>
      </header>
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
        {rows.length === 0 && <li className="plain">A quiet life: no layoffs, no big market falls.</li>}
        {rows.map((r) => (
          <li key={r.age} className={r.kind}>
            <b>{r.age}</b>
            <span>{r.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
