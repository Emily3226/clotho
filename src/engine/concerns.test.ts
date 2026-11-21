import { describe, expect, it } from 'vitest';
import { Engine } from './analyse';
import { CONCERN_EFFECTS, matchConcern, matchField, newConcern, selectedWorries } from './concerns';
import { PERSONAS } from './personas';
import { NO_LEVERS, WORRY_IDS } from './types';

describe('worries in your own words', () => {
  it('matches common worries to the closest what-if, offline', () => {
    expect(matchConcern('What if I get laid off')).toBe('ai');
    expect(matchConcern('AI takes my job')).toBe('ai');
    expect(matchConcern('groceries and gas keep going up')).toBe('costs');
    expect(matchConcern('my mom gets sick')).toBe('world');
    expect(matchConcern('a big medical emergency')).toBe('world');
    expect(matchConcern('the stock market crashes')).toBe('recession');
    expect(matchConcern('my landlord raises the rent')).toBe('home');
    expect(matchConcern('CPP runs out before I retire')).toBe('pensions');
  });

  it('asks instead of guessing when nothing fits', () => {
    expect(matchConcern('zxqv')).toBeNull();
    expect(matchConcern('everything, honestly')).toBeNull();
    expect(newConcern('  zxqv  ')).toMatchObject({ label: 'zxqv', kind: null });
  });

  it('offers every what-if as something a typed worry can be tested as', () => {
    expect(CONCERN_EFFECTS.map((e) => e.kind).sort()).toEqual([...WORRY_IDS].sort());
  });

  it('adds typed worries to the chips without changing a chip that is on', () => {
    const typed = [
      { id: 'a', label: 'my mom gets sick', kind: 'world' as const },
      { id: 'b', label: 'not sure', kind: null },
      { id: 'c', label: 'layoffs', kind: 'ai' as const },
    ];
    expect(selectedWorries({}, typed)).toEqual({ world: 'moderate', ai: 'moderate' });
    expect(selectedWorries({ ai: 'severe' }, typed)).toEqual({ ai: 'severe', world: 'moderate' });
    expect(selectedWorries({ costs: 'moderate' }, [])).toEqual({ costs: 'moderate' });
  });

  it('gives a typed worry the same sized card as the what-if it is tested as', () => {
    const maya = PERSONAS[0].inputs;
    const typed = selectedWorries({}, [{ id: 'a', label: 'my mom gets sick', kind: 'world' }]);
    const a = new Engine().analyse(maya, typed, {}, NO_LEVERS, 2026);
    const b = new Engine().analyse(maya, { world: 'moderate' }, {}, NO_LEVERS, 2026);
    expect(a.cards).toHaveLength(1);
    expect(a.cards[0].id).toBe('world');
    expect(a.cards[0].affected).toBe(b.cards[0].affected);
  });
});

describe('a field in your own words', () => {
  it('matches to the closest field with pay figures', () => {
    expect(matchField('Nursing')).toBe('health');
    expect(matchField('electrician apprentice')).toBe('trades');
    expect(matchField('software developer')).toBe('engcs');
    expect(matchField('accounting')).toBe('business');
    expect(matchField('high school teacher')).toBe('social');
    expect(matchField('film and animation')).toBe('arts');
    expect(matchField('marine biology')).toBe('science');
  });

  it('says nothing fits rather than picking one', () => {
    expect(matchField('zxqv')).toBeNull();
    expect(matchField('')).toBeNull();
  });
});
