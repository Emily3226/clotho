import { describe, expect, it } from 'vitest';
import { PERSONAS } from '../engine/personas';
import type { Commitment } from '../store';
import { chooseProgress, monthKey, parseProgress, recordMonth, type Progress } from './progress';

const inputs = PERSONAS[0].inputs;
const commitment = (streak: number, lastCheckISO: string | null): Commitment => ({
  lever: 'auto25',
  startedISO: '2026-11-01T12:00:00.000Z',
  startInControl: 518,
  startInputs: inputs,
  streak,
  lastCheckISO,
});
const progress = (c: Commitment | null): Progress => ({ inputs, room: [], confBefore: 5, commitment: c });

describe('monthly progress', () => {
  it('keeps one record per month, in order', () => {
    let m = recordMonth(undefined, '2026-12', 600, 500);
    m = recordMonth(m, '2026-11', 550, 400);
    m = recordMonth(m, '2026-12', 610, 700);
    expect(m).toEqual([
      { month: '2026-11', pointsTo: 550, saved: 400 },
      { month: '2026-12', pointsTo: 610, saved: 700 },
    ]);
  });

  it('uses the local month', () => {
    expect(monthKey(new Date(2026, 0, 31, 23, 59))).toBe('2026-01');
  });
});

describe('choosing between a device and an account', () => {
  it('restores the account on a new device', () => {
    expect(chooseProgress(progress(null), progress(commitment(4, '2026-11-01T00:00:00.000Z')))).toBe('cloud');
  });

  it('keeps this device when the account is empty', () => {
    expect(chooseProgress(progress(commitment(1, null)), null)).toBe('local');
    expect(chooseProgress(progress(commitment(1, null)), progress(null))).toBe('local');
  });

  it('does not let a fresh start replace a longer run', () => {
    expect(chooseProgress(progress(commitment(1, '2026-12-01T00:00:00.000Z')), progress(commitment(5, '2026-11-01T00:00:00.000Z')))).toBe('cloud');
  });

  it('breaks a tie by the latest check-in, then stays local', () => {
    const early = commitment(2, '2026-10-01T00:00:00.000Z');
    const late = commitment(2, '2026-11-01T00:00:00.000Z');
    expect(chooseProgress(progress(early), progress(late))).toBe('cloud');
    expect(chooseProgress(progress(late), progress(early))).toBe('local');
    expect(chooseProgress(progress(late), progress(late))).toBe('local');
  });
});

describe('reading saved progress', () => {
  it('round-trips', () => {
    const p = progress(commitment(2, null));
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
  });

  it('refuses anything malformed', () => {
    expect(parseProgress('not json')).toBeNull();
    expect(parseProgress(42)).toBeNull();
    expect(parseProgress(JSON.stringify({ inputs: null, room: [] }))).toBeNull();
    expect(parseProgress(JSON.stringify({ ...progress(commitment(1, null)), commitment: { lever: 'nope', streak: 1 } }))).toBeNull();
  });
});
