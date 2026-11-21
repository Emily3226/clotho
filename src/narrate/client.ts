import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { isGoalKind } from '../engine/goals';
import { FIELDS } from '../engine/profile';
import { WORRY_IDS, type FieldId, type GoalKind, type WorryId } from '../engine/types';
import { validateNarration } from './validate';

export type NarrateKind = 'story' | 'worry' | 'ask';
const TIMEOUT_MS = 5000;
const cache = new Map<string, string>();

// Returns narrated text, or null when narration is off, unavailable, slow,
// or says anything the simulation did not compute. Callers show the template.
export async function narrate(kind: NarrateKind, facts: unknown, question = ''): Promise<string | null> {
  const key = JSON.stringify([kind, facts, question]);
  const hit = cache.get(key);
  if (hit) return hit;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, facts, question }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? '').trim();
    if (!validateNarration(text, facts, question)) return null;
    cache.set(key, text);
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Asks the server to sort a goal into a kind. Null on any failure: the
// offline word match stands.
export type SortType = 'goal' | 'worry' | 'field' | 'stage' | 'city' | 'living';

// The server answers with one word from a fixed list. Callers check it.
export async function classifyAnswer(type: SortType, text: string): Promise<string | null> {
  return classify(type, text);
}

async function classify(type: SortType, text: string): Promise<string | null> {
  try {
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { kind?: string }).kind ?? null;
  } catch {
    return null;
  }
}

export async function classifyGoal(text: string): Promise<GoalKind | null> {
  const kind = await classify('goal', text);
  return isGoalKind(kind) ? kind : null;
}

export async function classifyWorry(text: string): Promise<WorryId | null> {
  const kind = await classify('worry', text);
  return WORRY_IDS.includes(kind as WorryId) ? (kind as WorryId) : null;
}

export async function classifyField(text: string): Promise<FieldId | null> {
  const kind = await classify('field', text);
  return kind !== 'unsure' && FIELDS.some((f) => f.id === kind) ? (kind as FieldId) : null;
}

// Whether Gemini can be reached at all, asked once per visit. The hosted static
// site has no server, so this is false there and the keyword match stands.
let aiCheck: Promise<boolean> | null = null;
export function useAiAvailable(): boolean {
  const [there, setThere] = useState(false);
  useEffect(() => {
    let live = true;
    aiCheck = aiCheck ?? narrationAvailable();
    void aiCheck.then((v) => {
      if (live) setThere(v);
    });
    return () => {
      live = false;
    };
  }, []);
  return there;
}

export async function narrationAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return false;
    return Boolean(((await res.json()) as { ai?: boolean }).ai);
  } catch {
    return false;
  }
}

// Shows the template at once and swaps in narrated text if it arrives and passes validation.
export function useNarration(kind: NarrateKind, facts: unknown, template: string): { text: string; narrated: boolean } {
  const aiOn = useStore((s) => s.aiOn);
  const [state, setState] = useState<{ key: string; text: string } | null>(null);
  const key = JSON.stringify([kind, facts]);

  useEffect(() => {
    if (!aiOn) return;
    let live = true;
    void narrate(kind, facts).then((text) => {
      if (live && text) setState({ key, text });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiOn, key]);

  const narrated = aiOn && state?.key === key;
  return { text: narrated ? state!.text : template, narrated };
}
