import { useState } from 'react';
import { ChipGroup } from './bits';
import { classifyAnswer, useAiAvailable, type SortType } from '../narrate/client';
import { useStore } from '../store';

interface Props<T extends string> {
  id: string;
  label: string;
  placeholder: string;
  type: SortType;
  // What has been saved so far, in the person's words.
  text: string;
  // What it is being treated as, if anything.
  current: T | null;
  options: { value: T; label: string }[];
  match: (text: string) => T | null;
  onUse: (text: string, value: T | null) => void;
  describe?: (value: T) => string;
}

// "Other", in the person's own words. Keywords first, on this device. If they
// miss, Gemini can sort it into the same fixed list, only when AI wording is
// on or the person taps to ask. The person can always pick the closest one.
export function OtherAnswer<T extends string>({ id, label, placeholder, type, text, current, options, match, onUse, describe }: Props<T>) {
  const aiOn = useStore((s) => s.aiOn);
  const aiThere = useAiAvailable();
  const [draft, setDraft] = useState(text);
  const [status, setStatus] = useState<'idle' | 'working' | 'ask'>(text && !current ? 'ask' : 'idle');
  const used = text.trim();

  const sort = async (t: string) => {
    setStatus('working');
    const kind = await classifyAnswer(type, t);
    const hit = options.find((o) => o.value === kind);
    if (hit) {
      onUse(t, hit.value);
      setStatus('idle');
    } else {
      setStatus('ask');
    }
  };

  const use = async () => {
    const t = draft.trim().slice(0, 60);
    if (!t || t === used) return;
    const found = match(t);
    if (found) {
      onUse(t, found);
      setStatus('idle');
      return;
    }
    onUse(t, null);
    if (aiOn) await sort(t);
    else setStatus('ask');
  };

  const shown = current ? options.find((o) => o.value === current) : null;
  return (
    <form
      className="goal-add other-answer"
      onSubmit={(e) => {
        e.preventDefault();
        void use();
      }}
    >
      <label className="q-label" htmlFor={id}>
        {label}
      </label>
      <div className="goal-row">
        <input id={id} value={draft} maxLength={60} autoComplete="off" placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={() => void use()} />
        <button type="submit" className="secondary" disabled={!draft.trim() || draft.trim() === used || status === 'working'}>
          {status === 'working' ? 'Sorting…' : 'Use'}
        </button>
      </div>
      {used && shown && status === 'idle' && (
        <p className="hint" aria-live="polite">
          {describe && current ? describe(current) : `We’ll treat that as: ${shown.label}.`}
        </p>
      )}
      {used && status === 'ask' && (
        <div className="home-q">
          {aiThere && !aiOn && (
            <button type="button" className="secondary" onClick={() => void sort(used)}>
              Sort it with AI
            </button>
          )}
          <ChipGroup legend={`Closest fit (${id})`} label="Which is closest?" selected={() => false} options={options} onPick={(v) => { onUse(used, v); setStatus('idle'); }} />
          {aiThere && !aiOn && <p className="hint">Sorting sends only what you typed here. No amounts or other answers.</p>}
        </div>
      )}
    </form>
  );
}
