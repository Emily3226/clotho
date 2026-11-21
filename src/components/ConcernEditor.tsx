import { useState } from 'react';
import { ChipGroup } from './bits';
import { CONCERN_EFFECTS, MAX_CONCERNS, effectLabel } from '../engine/concerns';
import { classifyWorry, useAiAvailable } from '../narrate/client';
import { useStore } from '../store';

// A worry in the person's own words. It is matched to one of the what-ifs
// the simulation can run, and they can change what it is tested as.
export function ConcernEditor({ inline = false }: { inline?: boolean }) {
  const concerns = useStore((s) => s.concerns);
  const add = useStore((s) => s.addConcern);
  const setKind = useStore((s) => s.setConcernKind);
  const remove = useStore((s) => s.removeConcern);
  const aiOn = useStore((s) => s.aiOn);
  const aiThere = useAiAvailable();
  const [text, setText] = useState('');
  const [sorting, setSorting] = useState<string | null>(null);
  // Tucked away until asked for, unless they already typed one.
  const [startOpen] = useState(concerns.length > 0);
  const prefix = inline ? 'intake' : 'results';

  const sort = async (id: string, label: string) => {
    setSorting(id);
    const kind = await classifyWorry(label);
    setSorting(null);
    if (kind && useStore.getState().concerns.some((c) => c.id === id && !c.kind)) setKind(id, kind);
  };

  const body = (
    <div className="goals concerns">
      {concerns.map((c) => (
        <div className="home-q goal" key={c.id}>
          <div className="goal-head">
            <b>{c.label}</b>
            <button type="button" className="link" onClick={() => remove(c.id)} aria-label={`Remove ${c.label}`}>
              Remove
            </button>
          </div>
          {c.kind ? (
            // Matched: one line, with the choices tucked away until asked for.
            <details className="tested-as">
              <summary>
                Tested as: {effectLabel(c.kind)} <span className="link">Change</span>
              </summary>
              <ChipGroup legend={`Tested as (${prefix} ${c.id})`} label="Test it as" selected={(v) => v === c.kind} options={CONCERN_EFFECTS.map((e) => ({ value: e.kind, label: e.label }))} onPick={(v) => setKind(c.id, v)} />
            </details>
          ) : (
            <>
              {aiThere && !aiOn && (
                <button type="button" className="secondary" disabled={sorting === c.id} onClick={() => void sort(c.id, c.label)}>
                  {sorting === c.id ? 'Sorting…' : 'Sort it with AI'}
                </button>
              )}
              <ChipGroup legend={`What would it mostly do? (${prefix} ${c.id})`} label="What would it mostly do?" selected={() => false} options={CONCERN_EFFECTS.map((e) => ({ value: e.kind, label: e.label }))} onPick={(v) => setKind(c.id, v)} />
            </>
          )}
        </div>
      ))}
      {concerns.length < MAX_CONCERNS && (
        <form
          className="goal-add"
          onSubmit={(e) => {
            e.preventDefault();
            const added = add(text);
            setText('');
            // Keywords first; with AI wording on, Gemini sorts what they miss.
            if (added && !added.kind && aiOn) void sort(added.id, added.label);
          }}
        >
          <label className="q-label" htmlFor={`concern-text-${prefix}`}>
            {concerns.length ? 'Anything else?' : 'In your own words'}
          </label>
          <div className="goal-row">
            <input id={`concern-text-${prefix}`} value={text} maxLength={60} autoComplete="off" placeholder="My parents need care, rent keeps rising…" onChange={(e) => setText(e.target.value)} />
            <button type="submit" className="secondary" disabled={!text.trim()}>
              Add
            </button>
          </div>
          <p className="hint">{aiOn ? 'With AI wording on, what you type is sent to sort it.' : 'Stays on this device unless you tap to sort it with AI.'} We test it as the closest what-if, and you can change which one.</p>
        </form>
      )}
    </div>
  );

  if (inline) return body;
  return (
    <details className="drawer concerns-drawer" open={startOpen}>
      <summary>Something else on your mind?</summary>
      {body}
    </details>
  );
}
