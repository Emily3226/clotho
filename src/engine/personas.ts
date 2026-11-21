import { inputsForStage } from './profile';
import type { Inputs } from './types';

export const DEFAULT_INPUTS: Inputs = inputsForStage('first', 23);

export interface Persona {
  id: string;
  name: string;
  line: string;
  room: string[];
  inputs: Inputs;
  // Shown on stage to compare with Maya, not on the landing page.
  compare?: boolean;
}

export const PERSONAS: Persona[] = [
  {
    id: 'maya',
    name: 'Maya, 20',
    line: 'Arts student in Toronto, renting, some student debt',
    room: ['travel', 'career'],
    inputs: {
      ...inputsForStage('student', 20),
      income: 16000,
      saved: 800,
      monthly: 40,
      field: 'arts',
      city: 'major',
      living: 'renting',
      debt: { balance: 15000, rate: 5 },
      finishAge: 22,
    },
  },
  {
    id: 'jordan',
    name: 'Jordan, 23',
    line: 'First job in business, lives with family in Ottawa, not sure about a plan at work',
    room: ['home', 'time'],
    inputs: {
      ...inputsForStage('first', 23),
      income: 64000,
      saved: 4000,
      monthly: 350,
      field: 'business',
      city: 'big',
      living: 'family',
      moveOutAge: 26,
    },
  },
  {
    id: 'sam',
    name: 'Sam, 25',
    line: 'Gig work in a smaller city, no workplace plan',
    room: ['time', 'family'],
    inputs: {
      ...inputsForStage('gig', 25),
      income: 38000,
      saved: 1500,
      monthly: 75,
      field: 'unsure',
      city: 'small',
      living: 'renting',
    },
  },
  {
    id: 'priya',
    name: 'Priya, 20',
    line: 'Health student in Halifax, lives with family, no debt',
    room: ['travel', 'career'],
    compare: true,
    inputs: {
      ...inputsForStage('student', 20),
      income: 16000,
      saved: 800,
      monthly: 40,
      field: 'health',
      city: 'small',
      living: 'family',
      moveOutAge: 24,
      finishAge: 22,
    },
  },
];

export const persona = (id: string): Persona => PERSONAS.find((p) => p.id === id)!;
