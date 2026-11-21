export type PlanAnswer = 'yes' | 'no' | 'unsure';

export interface Inputs {
  age: number;
  income: number;
  saved: number;
  perPaycheque: number;
  plan: PlanAnswer;
  employeePct: number;
  matchPct: number;
  cushionMonths: number;
  home: { price: number; byAge: number } | null;
  debt: { balance: number; rate: number } | null;
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
  | 'cushion'
  | 'flex'
  | 'raid'
  | 'short'
  | 'crash'
  | 'cost'
  | 'raise'
  | 'cushionFull'
  | 'home'
  | 'debtFree'
  | 'room'
  | 'optional';

export interface PathEvent {
  age: number;
  type: EventType;
  value?: number;
}

// 0 In control, 1 Mostly there, 2 Tight, 3 Off track
export type Status = 0 | 1 | 2 | 3;
export const STATUS_LABELS = ['In control', 'Mostly there', 'Tight', 'Off track'] as const;

export interface Milestones {
  shockProof: boolean;
  room35: boolean;
  room45: boolean;
  home: boolean | null;
  workOptional65: boolean;
}

export interface PathResult {
  index: number;
  status: Status;
  milestones: Milestones;
  workOptionalAge: number | null;
  ratio65: number;
  final: number;
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
  milestoneCounts: { shockProof: number; room35: number; room45: number; home: number | null; workOptional65: number };
}

export interface SimOptions {
  detail?: boolean;
  paths?: number;
  calm?: boolean;
  trace?: boolean;
}
