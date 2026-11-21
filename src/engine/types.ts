import type { LifeEventType, LifePlan } from './lifePlan';

export type PlanAnswer = 'yes' | 'no' | 'unsure';

export type Stage = 'student' | 'coop' | 'part' | 'first' | 'gig' | 'full';
export type FieldId = 'health' | 'trades' | 'engcs' | 'business' | 'science' | 'social' | 'arts' | 'unsure';
export type City = 'major' | 'big' | 'small';
export type Living = 'family' | 'renting' | 'own';
export type AssumptionSetId = 'cautious' | 'middle' | 'hopeful';
export type HomeType = 'condo' | 'townhouse' | 'house';
export type GoalKind = 'car' | 'travel' | 'school' | 'wedding' | 'family' | 'business' | 'move' | 'pet' | 'gear' | 'other';

// Something the person wants room for, in their own words, with an amount
// and an age they chose. Paid from long-term savings if there is enough.
export interface Goal {
  id: string;
  label: string;
  kind: GoalKind;
  cost: number;
  byAge: number;
}

export interface Inputs {
  age: number;
  stage: Stage;
  // Current yearly income before tax (part-time pay for a student).
  income: number;
  saved: number;
  // What you set aside each month, in today's dollars.
  monthly: number;
  plan: PlanAnswer;
  employeePct: number;
  matchPct: number;
  cushionMonths: number;
  // With a type, the price comes from the city and the type; without one,
  // the typed price is used.
  home: { price: number; byAge: number; type?: HomeType } | null;
  debt: { balance: number; rate: number } | null;
  // "Make it more you". null means not answered: the default is used.
  field: FieldId | null;
  city: City | null;
  living: Living | null;
  moveOutAge: number;
  // Students only: the age full-time pay starts.
  finishAge: number;
  goals?: Goal[];
  // What they want out of life: kids, family, travel, time off and so on.
  life?: LifePlan | null;
}

export type WorryId = 'ai' | 'recession' | 'costs' | 'home' | 'world' | 'pensions';
export type Severity = 'mild' | 'moderate' | 'severe';
export type Scenario = Partial<Record<WorryId, Severity>>;

export const WORRY_IDS: WorryId[] = ['ai', 'recession', 'costs', 'home', 'world', 'pensions'];

export interface Levers {
  match: boolean;
  auto: 0 | 25 | 50 | 100;
  raises: boolean;
  cushion: boolean;
  delay: number;
}

export const NO_LEVERS: Levers = { match: false, auto: 0, raises: false, cushion: false, delay: 0 };

export type LeverId = 'match' | 'auto25' | 'auto50' | 'auto100' | 'raises' | 'cushion';
export const LEVER_IDS: LeverId[] = ['match', 'auto25', 'auto50', 'auto100', 'raises', 'cushion'];

export function leverOnly(id: LeverId): Levers {
  return {
    match: id === 'match',
    auto: id === 'auto25' ? 25 : id === 'auto50' ? 50 : id === 'auto100' ? 100 : 0,
    raises: id === 'raises',
    cushion: id === 'cushion',
    delay: 0,
  };
}

export type EventType =
  | 'job'
  | 'dip'
  | 'fulltime'
  | 'cushion'
  | 'flex'
  | 'raid'
  | 'short'
  | 'crash'
  | 'cost'
  | 'raise'
  | 'cushionFull'
  | 'home'
  | 'goal'
  | 'debtFree'
  | 'room'
  | 'optional'
  | LifeEventType;

export interface PathEvent {
  age: number;
  type: EventType;
  value?: number;
}

// 0 In control, 1 Mostly there, 2 Tight, 3 Not there yet
export type Status = 0 | 1 | 2 | 3;
export const STATUS_LABELS = ['In control', 'Mostly there', 'Tight', 'Not there yet'] as const;

export interface Milestones {
  shockProof: boolean;
  room35: boolean;
  room45: boolean;
  home: boolean | null;
  // One per goal, in order: reached at the age chosen.
  goals: boolean[];
  workOptional65: boolean;
}

export interface PathResult {
  index: number;
  status: Status;
  milestones: Milestones;
  workOptionalAge: number | null;
  ratio65: number;
  final: number;
  // Total savings at 65.
  at65: number;
  // At opts.cutAge: what is yours to use after tax, and spending so far.
  atCut?: { yours: number; lived: number };
  // With a planned withdrawal: what came out of the workplace plan (before
  // tax), the tax on it, and anything paid from elsewhere because the plan
  // or the savings set aside fell short.
  planned?: { fromPlan: number; tax: number; topUp: number };
  // Lost to tax by withdrawing from the workplace plan early.
  raidLost: number;
  // Total savings at 65, after the tax owed on the workplace plan.
  at65Net: number;
  balances: Float32Array | null;
  events: PathEvent[];
  // diagnostics used by tests
  peakTfsaOver: number;
  peakFhsaLifetime: number;
  peakFhsaYear: number;
  peakRrspOver: number;
  minBalance: number;
  // year-by-year cushion and workplace-plan balances, when asked for
  trace?: { cushion: number[]; plan: number[]; flex: number[]; target: number[] };
}

export interface Summary {
  counts: [number, number, number, number];
  medianWorkOptionalAge: number | null;
  milestoneCounts: { shockProof: number; room35: number; room45: number; home: number | null; workOptional65: number; goals: number[] };
}

export interface SimOptions {
  detail?: boolean;
  paths?: number;
  calm?: boolean;
  trace?: boolean;
  set?: AssumptionSetId;
  // Also record what is yours to use at this age (see noSixtyFive.ts).
  cutAge?: number;
  // Your own plan contributions go to a TFSA; the employer match stays in
  // the retirement plan (see keepReachable.ts).
  keepReachable?: boolean;
  // Take money out for something you want, at an age, from one place (see
  // plannedWithdrawal.ts). Off by default: without it nothing changes.
  withdrawal?: { amount: number; age: number; from: 'plan' | 'reachable' | 'saveFirst' };
}
