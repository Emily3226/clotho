import { describe, expect, it } from 'vitest';
import { PERSONAS } from '../engine/personas';
import { LEVER_IDS } from '../engine/types';
import { CSV_HEAD, csvRow, doNow, hrMailto, outcomeSuffix, testCsv, type CsvRecord } from './doNow';

const base: CsvRecord = {
  at: '2026-11-21T20:00:00.000Z',
  stage: 'student',
  field: 'arts',
  confBefore: 4,
  confAfter: 7,
  lever: 'raises',
  reminder: true,
  hrCopied: false,
};

describe('user-test CSV', () => {
  it('adds the outcome column at the end', () => {
    expect(CSV_HEAD.split(',').at(-1)).toBe('outcome');
    expect(csvRow({ ...base, outcome: 'done' })).toBe('2026-11-21T20:00:00.000Z,student,arts,4,7,raises,true,false,done');
  });

  it('still exports rows saved before outcomes existed', () => {
    expect(csvRow(base)).toBe('2026-11-21T20:00:00.000Z,student,arts,4,7,raises,true,false,');
    const lines = testCsv([base, { ...base, outcome: 'sent' }]).trim().split('\n');
    expect(lines).toHaveLength(3);
    for (const l of lines) expect(l.split(',')).toHaveLength(9);
  });
});

describe('do it now', () => {
  const people = PERSONAS.map((p) => p.inputs);

  it('gives every habit its own plain steps', () => {
    for (const inputs of people) {
      const seen = new Set<string>();
      for (const id of LEVER_IDS) {
        const d = doNow(id, inputs);
        expect(d.steps.length).toBeGreaterThan(1);
        seen.add(d.steps.join('|'));
      }
      expect(seen.size).toBe(LEVER_IDS.length);
    }
  });

  it('offers "I sent it" only when there is a message to send', () => {
    for (const id of LEVER_IDS) {
      const d = doNow(id, people[0]);
      expect(d.outcomes.includes('sent')).toBe(d.kind === 'hr');
      expect(d.outcomes).toContain('notyet');
    }
  });

  it('names no product, bank or provider in the steps', () => {
    for (const inputs of people)
      for (const id of LEVER_IDS)
        for (const s of doNow(id, inputs).steps) expect(s).not.toMatch(/canada life|rbc|td\b|scotia|bmo|cibc|wealthsimple|tangerine|eq bank/i);
  });

  it('says the raise habit cannot be done today', () => {
    expect(doNow('raises', people[0]).steps[0]).toMatch(/can’t be done today/);
  });

  it('builds a mailto with the message filled in', () => {
    const m = hrMailto('Hi, does our plan match?');
    expect(m.startsWith('mailto:?subject=')).toBe(true);
    expect(decodeURIComponent(m.split('body=')[1])).toBe('Hi, does our plan match?');
  });

  it('marks the summary only when they did it', () => {
    expect(outcomeSuffix('done')).toBe(' · set up today');
    expect(outcomeSuffix('notyet')).toBe('');
    expect(outcomeSuffix(null)).toBe('');
  });
});
