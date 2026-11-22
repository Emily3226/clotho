// Monthly progress, and how a device and an account agree on it.
import { LEVER_IDS, type Inputs } from '../engine/types';
import type { Commitment, MonthRecord } from '../store';

// All that an account stores. Typed worries and test logs stay on the device.
export interface Progress {
  inputs: Inputs;
  room: string[];
  confBefore: number | null;
  commitment: Commitment | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const monthKey = (d = new Date()): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

// One record per month, oldest first. Answering again updates that month.
export function recordMonth(months: MonthRecord[] | undefined, month: string, pointsTo: number, saved: number): MonthRecord[] {
  const rest = (months ?? []).filter((m) => m.month !== month);
  return [...rest, { month, pointsTo, saved }].sort((a, b) => a.month.localeCompare(b.month)).slice(-120);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
}

// Whichever has kept the habit longer, then whichever was active most recently.
// A tie stays with this device.
export function chooseProgress(local: Progress, cloud: Progress | null): 'local' | 'cloud' {
  if (!cloud?.commitment) return 'local';
  if (!local.commitment) return 'cloud';
  const a = local.commitment;
  const b = cloud.commitment;
  if (a.streak !== b.streak) return b.streak > a.streak ? 'cloud' : 'local';
  const when = (c: Commitment) => Date.parse(c.lastCheckISO ?? c.startedISO) || 0;
  return when(b) > when(a) ? 'cloud' : 'local';
}

// Signed in on Pick one: save the step right away, without waiting for the
// summary. A step already being kept is only replaced by finishing again.
export const shouldSaveStep = (c: Commitment | null, lever: string): boolean => !c || (c.lever !== lever && c.streak === 0);

// Saved data is checked before it replaces anything on this device.
export function parseProgress(json: unknown): Progress | null {
  if (typeof json !== 'string') return null;
  try {
    const p = JSON.parse(json) as Partial<Progress>;
    if (!p || typeof p.inputs !== 'object' || p.inputs === null || !Array.isArray(p.room)) return null;
    const c = p.commitment ?? null;
    if (c) {
      const lever = (LEVER_IDS as readonly string[]).includes(c.lever);
      if (!lever || typeof c.streak !== 'number' || typeof c.startedISO !== 'string' || typeof c.startInControl !== 'number' || typeof c.startInputs !== 'object') return null;
    }
    return { inputs: p.inputs as Inputs, room: p.room, confBefore: typeof p.confBefore === 'number' ? p.confBefore : null, commitment: c };
  } catch {
    return null;
  }
}
