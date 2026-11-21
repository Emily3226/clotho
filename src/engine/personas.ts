import type { Inputs } from './types';

export const DEFAULT_INPUTS: Inputs = {
  age: 23,
  income: 50000,
  saved: 2000,
  perPaycheque: 50,
  plan: 'unsure',
  employeePct: 0,
  matchPct: 4,
  cushionMonths: 3,
  home: null,
  debt: null,
};

export interface Persona {
  id: string;
  name: string;
  line: string;
  inputs: Inputs;
}

export const PERSONAS: Persona[] = [
  {
    id: 'maya',
    name: 'Maya, 22',
    line: 'First job, $52k, no savings yet, employer match unclaimed',
    inputs: { ...DEFAULT_INPUTS, age: 22, income: 52000, saved: 0, perPaycheque: 0, plan: 'yes', employeePct: 0, matchPct: 4 },
  },
  {
    id: 'dev',
    name: 'Dev, 26',
    line: '$68k, $8k saved, already contributing to the plan at work',
    inputs: { ...DEFAULT_INPUTS, age: 26, income: 68000, saved: 8000, perPaycheque: 100, plan: 'yes', employeePct: 2, matchPct: 4 },
  },
  {
    id: 'sam',
    name: 'Sam, 24',
    line: 'Gig income around $38k, no workplace plan',
    inputs: { ...DEFAULT_INPUTS, age: 24, income: 38000, saved: 500, perPaycheque: 20, plan: 'no', employeePct: 0, matchPct: 0 },
  },
];
