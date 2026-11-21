// Turning "a trip to Japan" into a goal the simulation can test. The typical
// costs are illustrative, rounded, in today's dollars, and always shown to
// the person as a starting point they can change. No language model ever
// supplies an amount: at most it picks one of these kinds.
import type { Goal, GoalKind } from './types';

export interface GoalKindInfo {
  id: GoalKind;
  name: string;
  typical: number | null;
  words: string[];
}

export const GOAL_KINDS: GoalKindInfo[] = [
  { id: 'car', name: 'a car', typical: 25000, words: ['car', 'vehicle', 'truck', 'suv', 'motorcycle', 'motorbike', 'tesla', 'civic'] },
  { id: 'travel', name: 'a big trip', typical: 6000, words: ['trip', 'travel', 'vacation', 'holiday', 'backpack', 'europe', 'asia', 'japan', 'korea', 'italy', 'france', 'abroad', 'world', 'tour', 'flight'] },
  { id: 'school', name: 'more school', typical: 30000, words: ['school', 'grad', 'graduate', 'master', 'masters', 'mba', 'phd', 'degree', 'college', 'university', 'law', 'med', 'medical', 'diploma', 'course', 'certificate', 'bootcamp'] },
  { id: 'wedding', name: 'a wedding', typical: 30000, words: ['wedding', 'marry', 'married', 'marriage', 'engagement', 'ring', 'elope'] },
  { id: 'family', name: 'starting a family', typical: 20000, words: ['baby', 'babies', 'kid', 'kids', 'child', 'children', 'family', 'parent', 'adopt', 'ivf'] },
  { id: 'business', name: 'starting a business', typical: 25000, words: ['business', 'startup', 'start-up', 'company', 'shop', 'store', 'cafe', 'restaurant', 'brand', 'studio', 'freelance'] },
  { id: 'move', name: 'a move', typical: 8000, words: ['move', 'moving', 'relocate', 'city', 'country', 'apartment', 'rent', 'deposit'] },
  { id: 'pet', name: 'a pet', typical: 3000, words: ['dog', 'puppy', 'cat', 'kitten', 'pet', 'horse'] },
  { id: 'gear', name: 'gear or tech', typical: 3000, words: ['laptop', 'computer', 'camera', 'bike', 'guitar', 'piano', 'gear', 'phone', 'pc', 'gaming', 'console', 'furniture'] },
  { id: 'other', name: 'something of your own', typical: null, words: [] },
];

export const goalKind = (id: GoalKind): GoalKindInfo => GOAL_KINDS.find((k) => k.id === id)!;

// Fast, offline matching on words. Returns 'other' when nothing fits.
export function matchGoal(text: string): GoalKind {
  const words = text.toLowerCase().match(/[a-z-]+/g) ?? [];
  let best: GoalKind = 'other';
  let score = 0;
  for (const k of GOAL_KINDS) {
    const hits = words.filter((w) => k.words.includes(w) || k.words.some((kw) => kw.length > 4 && w.startsWith(kw))).length;
    if (hits > score) {
      best = k.id;
      score = hits;
    }
  }
  return best;
}

export const isGoalKind = (x: unknown): x is GoalKind => typeof x === 'string' && GOAL_KINDS.some((k) => k.id === x);

export const GOAL_WHEN = [
  { label: 'In a year', years: 1 },
  { label: 'In 3 years', years: 3 },
  { label: 'In 5 years', years: 5 },
  { label: 'In 10 years', years: 10 },
] as const;

export function newGoal(text: string, kind: GoalKind, age: number): Goal {
  const info = goalKind(kind);
  return {
    id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    label: text.trim().slice(0, 60),
    kind,
    cost: info.typical ?? 10000,
    byAge: age + 3,
  };
}

export const MAX_GOALS = 3;
