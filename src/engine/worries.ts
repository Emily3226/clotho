import type { Severity, WorryId } from './types';

// Each worry is an explicit, visible change to the model. Values are listed
// as [mild, moderate, severe]. These are "what if" settings, not predictions.
export const SEV_INDEX: Record<Severity, number> = { mild: 0, moderate: 1, severe: 2 };

export const WORRY = {
  ai: { jobMult: [1.5, 2, 3], spellMult: [1.25, 1.5, 2], wageDrag: [0.005, 0.01, 0.015], years: 10, untilAge: 45 },
  recession: { crash: [-0.2, -0.3, -0.4], jobMult: [1.75, 2.5, 3.5], window: 3, jobYears: 2 },
  // Applied to essentials, taken as half of spending.
  costs: { extra: [0.0075, 0.015, 0.025], essentialsShare: 0.5, years: 10 },
  home: { faster: [0.005, 0.01, 0.02], defaultPrice: 500000, defaultYears: 10, minAge: 32 },
  world: { chance: [0.02, 0.03, 0.05], months: 2, returns: [0.0025, 0.005, 0.01] },
  pensions: { paid: [0.9, 0.75, 0.5] },
} as const;

export interface WorryInfo {
  id: WorryId;
  label: string;
  short: string;
  ifClause: string;
  changes: [string, string, string];
}

export const WORRIES: WorryInfo[] = [
  {
    id: 'ai',
    label: 'AI changes my job',
    short: 'AI and my job',
    ifClause: 'If AI changes your job',
    changes: [
      'Job-loss chance ×1.5 before 45, time out of work ×1.25, wage growth −0.5 point for 10 years',
      'Job-loss chance ×2 before 45, time out of work ×1.5, wage growth −1 point for 10 years',
      'Job-loss chance ×3 before 45, time out of work ×2, wage growth −1.5 points for 10 years',
    ],
  },
  {
    id: 'recession',
    label: 'A recession hits soon',
    short: 'A recession',
    ifClause: 'If a recession hits soon',
    changes: [
      'One market fall of at least 20% in the next 3 years; job-loss chance ×1.75 for 2 years',
      'One market fall of at least 30% in the next 3 years; job-loss chance ×2.5 for 2 years',
      'One market fall of at least 40% in the next 3 years; job-loss chance ×3.5 for 2 years',
    ],
  },
  {
    id: 'costs',
    label: 'Everything keeps getting more expensive',
    short: 'Rising costs',
    ifClause: 'If everything keeps getting more expensive',
    changes: [
      'Essentials (half of spending) rise an extra 0.75% a year for 10 years',
      'Essentials (half of spending) rise an extra 1.5% a year for 10 years',
      'Essentials (half of spending) rise an extra 2.5% a year for 10 years',
    ],
  },
  {
    id: 'home',
    label: 'I’ll never afford a home',
    short: 'Affording a home',
    ifClause: 'If home prices keep pulling away',
    changes: [
      'Adds a home goal; prices rise 0.5% a year faster than wages',
      'Adds a home goal; prices rise 1% a year faster than wages',
      'Adds a home goal; prices rise 2% a year faster than wages',
    ],
  },
  {
    id: 'world',
    label: 'The world gets rougher',
    short: 'A rougher world',
    ifClause: 'If the world gets rougher',
    changes: [
      'A 2% chance each year of a one-off cost worth 2 months of spending; average returns −0.25 point',
      'A 3% chance each year of a one-off cost worth 2 months of spending; average returns −0.5 point',
      'A 5% chance each year of a one-off cost worth 2 months of spending; average returns −1 point',
    ],
  },
  {
    id: 'pensions',
    label: 'Government pensions won’t be there for me',
    short: 'Public pensions',
    ifClause: 'If public pensions pay less',
    changes: ['CPP and OAS paid at 90%', 'CPP and OAS paid at 75%', 'CPP and OAS paid at 50%'],
  },
];

export const worryInfo = (id: WorryId): WorryInfo => WORRIES.find((w) => w.id === id)!;
