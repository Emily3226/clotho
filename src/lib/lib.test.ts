import { describe, expect, it } from 'vitest';
import { Engine } from '../engine/analyse';
import { PERSONAS } from '../engine/personas';
import { NO_LEVERS } from '../engine/types';
import { factNumbers, numbersIn, validateNarration } from '../narrate/validate';
import { pathFacts, story, timeline, worryAnswer } from './copy';
import { buildIcs, nextFriday } from './ics';

const maya = PERSONAS[0].inputs;
const analysis = new Engine().analyse(maya, { ai: 'moderate' }, {}, NO_LEVERS, 2026);

describe('narration validator', () => {
  const facts = { futuresThatGetHarder: 621, total: 1000, savedAt70: 640000, events: [{ age: 27, what: 'out of work for 5 months' }] };

  it('accepts text that only uses computed numbers', () => {
    expect(validateNarration('In 621 of your 1,000 futures things get harder. At 27 you were out of work for 5 months, with $640k saved.', facts)).toBe(true);
  });

  it('rejects any number the simulation did not compute', () => {
    expect(validateNarration('In 622 of your 1,000 futures things get harder.', facts)).toBe(false);
    expect(validateNarration('That is 62.1% of your futures.', facts)).toBe(false);
    expect(validateNarration('', facts)).toBe(false);
  });

  it('rejects numbers spelled out in words, which cannot be checked', () => {
    expect(validateNarration('At twenty-seven you were out of work for 5 months.', facts)).toBe(false);
    expect(validateNarration('You saved three hundred thousand dollars.', facts)).toBe(false);
    expect(validateNarration('This is one version of you: at 27 you were out of work for 5 months.', facts)).toBe(true);
  });

  it('rejects advice and shaming words', () => {
    expect(validateNarration('You should buy an index fund.', facts)).toBe(false);
    expect(validateNarration('You are behind in 621 futures.', facts)).toBe(false);
  });

  it('reads numbers with thousands separators', () => {
    expect(numbersIn('1,000 futures and $2,080.50')).toEqual([1000, 2080.5]);
    expect(factNumbers({ a: [1, { b: '7 months' }] })).toEqual(new Set([1, 7]));
  });
});

describe('templates', () => {
  it('only use numbers that are in the facts they would send', () => {
    for (const p of analysis.paths.slice(0, 200)) {
      expect(validateNarration(story(p), pathFacts(p))).toBe(true);
    }
    for (const card of analysis.cards) {
      const a = worryAnswer(card, maya);
      expect(validateNarration(a.plain, a.facts)).toBe(true);
    }
  });

  it('never say nothing changes when a worry makes some futures harder', () => {
    const card = analysis.cards[0];
    const flat = { ...card, affected: 12, inControl: card.baseInControl, middleAt65: card.baseMiddleAt65 };
    expect(worryAnswer(flat, maya).plain).not.toMatch(/none of your/);
    expect(validateNarration(worryAnswer(flat, maya).plain, worryAnswer(flat, maya).facts)).toBe(true);
    expect(worryAnswer({ ...flat, affected: 0 }, maya).plain).toMatch(/none of your/);
  });

  it('never use shaming words, and group the timeline by age', () => {
    for (const p of analysis.paths.slice(0, 200)) {
      expect(story(p)).not.toMatch(/behind|should have|too late|at risk|danger|doom/i);
      const ages = timeline(p.events).map((r) => r.age);
      expect(ages).toEqual([...new Set(ages)].sort((x, y) => x - y));
    }
  });
});

describe('calendar reminder', () => {
  it('builds an all-day event on the chosen payday', () => {
    const ics = buildIcs('2026-11-27', 'Clotho: Take the full employer match', 'Line one, line two; done.', new Date(Date.UTC(2026, 10, 21, 15, 0, 0)));
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261127');
    expect(ics).toContain('DTEND;VALUE=DATE:20261128');
    expect(ics).toContain('DESCRIPTION:Line one\\, line two\\; done.');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('repeats monthly when asked, for the check-in', () => {
    const ics = buildIcs('2026-11-27', 'Clotho: Automate $25 a month', 'Check in.', new Date(Date.UTC(2026, 10, 21)), true);
    expect(ics).toContain('RRULE:FREQ=MONTHLY\r\n');
    expect(buildIcs('2026-11-27', 'x', 'y')).not.toContain('RRULE');
  });

  it('picks the coming Friday as the default payday', () => {
    expect(nextFriday(new Date(2026, 10, 21))).toBe('2026-11-27');
    expect(nextFriday(new Date(2026, 10, 27))).toBe('2026-12-04');
  });
});
