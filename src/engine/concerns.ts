// "Other" answers, in the person's own words. A typed worry or field is
// matched offline to something the simulation already knows how to test,
// and the person can always change what it was matched to. Nothing here
// invents a number: a typed worry runs one of the six what-ifs as they are.
import type { FieldId, Scenario, WorryId } from './types';

export interface Concern {
  id: string;
  label: string;
  // What it is tested as. null until matched or picked.
  kind: WorryId | null;
}

export const MAX_CONCERNS = 3;

// What a worry would mostly do, in plain words, each tied to one what-if.
export const CONCERN_EFFECTS: { kind: WorryId; label: string }[] = [
  { kind: 'ai', label: 'I’d earn less or lose work' },
  { kind: 'costs', label: 'Things would cost more' },
  { kind: 'world', label: 'A big surprise bill' },
  { kind: 'recession', label: 'Markets and jobs take a hit' },
  { kind: 'home', label: 'Housing gets out of reach' },
  { kind: 'pensions', label: 'Less help from government later' },
];

export const effectLabel = (kind: WorryId): string => CONCERN_EFFECTS.find((e) => e.kind === kind)!.label;

const CONCERN_WORDS: Record<WorryId, string[]> = {
  ai: ['ai', 'automation', 'automated', 'robot', 'robots', 'replaced', 'laid', 'layoff', 'layoffs', 'fired', 'job', 'jobs', 'career', 'unemployed', 'unemployment', 'salary', 'wage', 'wages', 'income', 'raise', 'promotion', 'burnout', 'outsourced', 'contract'],
  costs: ['inflation', 'prices', 'price', 'expensive', 'groceries', 'grocery', 'food', 'gas', 'bills', 'utilities', 'tuition', 'childcare', 'daycare', 'insurance', 'cost', 'costs', 'afford', 'tariff', 'tariffs', 'taxes', 'tax'],
  world: ['sick', 'illness', 'ill', 'health', 'injury', 'injured', 'accident', 'hospital', 'medical', 'dental', 'emergency', 'emergencies', 'repair', 'repairs', 'climate', 'flood', 'fire', 'wildfire', 'war', 'disaster', 'pandemic', 'divorce', 'breakup', 'funeral', 'parents', 'parent', 'mom', 'dad', 'caregiving', 'vet', 'pet', 'scam', 'theft', 'lawsuit'],
  recession: ['recession', 'crash', 'market', 'markets', 'stocks', 'stock', 'economy', 'economic', 'depression', 'downturn', 'bubble', 'crypto', 'investments', 'bank', 'banks'],
  home: ['home', 'house', 'housing', 'condo', 'rent', 'rents', 'landlord', 'mortgage', 'evicted', 'eviction', 'renoviction', 'apartment', 'downpayment'],
  pensions: ['pension', 'pensions', 'cpp', 'oas', 'retirement', 'retire', 'government', 'benefits'],
};

function bestMatch<T extends string>(text: string, table: Record<T, string[]>): T | null {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let best: T | null = null;
  let score = 0;
  for (const key of Object.keys(table) as T[]) {
    const list = table[key];
    const hits = words.filter((w) => list.includes(w) || list.some((k) => k.length > 4 && w.startsWith(k))).length;
    if (hits > score) {
      best = key;
      score = hits;
    }
  }
  return best;
}

// Fast, offline. null when nothing fits: the person is asked what it would do.
export const matchConcern = (text: string): WorryId | null => bestMatch(text, CONCERN_WORDS);

export function newConcern(text: string): Concern {
  return {
    id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    label: text.trim().slice(0, 60),
    kind: matchConcern(text),
  };
}

// Every worry being tested: the chips, plus what each typed worry is tested
// as. A typed worry never changes the strength of a chip that is already on.
export function selectedWorries(worries: Scenario, concerns: Concern[]): Scenario {
  const all: Scenario = { ...worries };
  for (const c of concerns) if (c.kind && !all[c.kind]) all[c.kind] = 'moderate';
  return all;
}

type RealField = Exclude<FieldId, 'unsure'>;
const FIELD_WORDS: Record<RealField, string[]> = {
  health: ['nurse', 'nursing', 'doctor', 'medicine', 'medical', 'dental', 'dentist', 'pharmacy', 'pharmacist', 'physio', 'physiotherapy', 'paramedic', 'health', 'healthcare', 'kinesiology', 'veterinary', 'vet', 'midwife', 'therapist', 'psw', 'caregiver'],
  trades: ['electrician', 'plumber', 'plumbing', 'carpenter', 'carpentry', 'welder', 'welding', 'mechanic', 'hvac', 'construction', 'trades', 'trade', 'apprentice', 'machinist', 'chef', 'cook', 'culinary', 'hairdresser', 'barber', 'trucker', 'trucking', 'driver', 'landscaping', 'roofer'],
  engcs: ['engineer', 'engineering', 'software', 'developer', 'programmer', 'programming', 'coding', 'computer', 'tech', 'data', 'cyber', 'cybersecurity', 'robotics', 'ai', 'devops', 'hardware', 'electrical', 'mechanical', 'civil', 'aerospace'],
  business: ['business', 'finance', 'accounting', 'accountant', 'marketing', 'sales', 'commerce', 'management', 'consulting', 'banking', 'economics', 'hr', 'logistics', 'insurance', 'entrepreneur', 'retail', 'hospitality', 'tourism', 'administration'],
  science: ['science', 'biology', 'chemistry', 'physics', 'math', 'mathematics', 'statistics', 'lab', 'research', 'environmental', 'geology', 'agriculture', 'forestry', 'neuroscience', 'astronomy'],
  social: ['teacher', 'teaching', 'education', 'law', 'lawyer', 'paralegal', 'psychology', 'sociology', 'social', 'politics', 'political', 'policy', 'government', 'nonprofit', 'counselling', 'counsellor', 'criminology', 'police', 'firefighter', 'military', 'childcare', 'ece', 'library'],
  arts: ['art', 'arts', 'artist', 'design', 'designer', 'music', 'musician', 'film', 'media', 'journalism', 'journalist', 'writing', 'writer', 'english', 'history', 'philosophy', 'theatre', 'acting', 'actor', 'dance', 'photography', 'fashion', 'animation', 'games', 'languages', 'humanities', 'content', 'creator'],
};

// The closest field the app has pay figures for, or null when nothing fits.
export const matchField = (text: string): RealField | null => bestMatch(text, FIELD_WORDS);
