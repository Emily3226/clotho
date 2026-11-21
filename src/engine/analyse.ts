import { A, marginalRate } from './assumptions';
import { fieldSalaryFor, isStudent } from './profile';
import { simulate, summarise } from './simulate';
import {
  LEVER_IDS,
  NO_LEVERS,
  leverOnly,
  type AssumptionSetId,
  type Goal,
  type Inputs,
  type LeverId,
  type Levers,
  type Milestones,
  type PathEvent,
  type PathResult,
  type Scenario,
  type Summary,
  type WorryId,
} from './types';

export interface WorryCard {
  id: WorryId | 'all';
  affected: number;
  recovered: number;
  // The habit that leaves the most futures in control under this worry.
  best: { lever: LeverId; protects: number; inControl: number } | null;
  mask: Uint8Array;
  // Futures in control, and savings at 65 in the middle future, without
  // the worry and with it. A worry is sized by how far these move.
  baseInControl: number;
  inControl: number;
  baseMiddleAt65: number;
  middleAt65: number;
}

export interface LeverRow {
  id: LeverId;
  // Take-home pay given up per month.
  costPerMonth: number;
  costLater: boolean;
  noExtraCost: boolean;
  // Futures whose status improves to In control or Mostly there.
  rescued: number;
  gained: number;
  inControl: number;
  ageDelta: number | null;
  perDollar: number;
  askHR: boolean;
  yearlyMatch: number;
}

export interface PathLite {
  status: number;
  milestones: Milestones;
  workOptionalAge: number | null;
  final: number;
  events: PathEvent[];
}

export interface Rescue {
  mask: Uint8Array;
  toControl: number;
  toMostly: number;
  total: number;
}

// One test of the top habit: under another return setting, or under a worry.
export interface HoldTest {
  kind: 'market' | 'worry';
  id: AssumptionSetId | WorryId;
  // Futures the habit rescues in that test.
  rescued: number;
  // The best step in that test, or null when no habit rescues anything there.
  top: LeverId | null;
  same: boolean;
}

// Whether the best step is still the best step when the assumptions or the
// person's own worries change. This is the claim to defend, not the count.
export interface Holds {
  lever: LeverId;
  rescued: number;
  tests: HoldTest[];
  held: number;
}

export interface Analysis {
  set: AssumptionSetId;
  goals: Goal[];
  startAge: number;
  years: number;
  balances: Float32Array;
  statuses: Uint8Array;
  paths: PathLite[];
  summary: Summary;
  band: { p25: Float32Array; p50: Float32Array; p75: Float32Array };
  reps: number[];
  baseSummary: Summary;
  scenarioSummary: Summary;
  // What the switched-on habits rescue, against the same luck without them.
  rescue: Rescue | null;
  // The same lives without the habits, for the inspector.
  plainPaths: PathLite[] | null;
  cards: WorryCard[];
  ranking: LeverRow[];
  waiting: { inControl: number; ageDelta: number | null };
  yearlyMatch: number;
  // Only worked out when asked for (it takes extra runs).
  holds: Holds | null;
  // Futures in control for what is on screen, under each return setting.
  // The count is one point in this range, not a forecast.
  range: { low: number; high: number; bySet: Record<AssumptionSetId, number> };
}

export function leverAvailable(id: LeverId, inputs: Inputs): boolean {
  if (id === 'match') {
    if (inputs.plan === 'no') return false;
    if (inputs.plan === 'yes') return inputs.matchPct > inputs.employeePct;
    return true;
  }
  if (id === 'cushion') return inputs.cushionMonths > 0;
  return true;
}

export function matchPctFor(inputs: Inputs): number {
  return inputs.plan === 'yes' ? inputs.matchPct : inputs.plan === 'unsure' ? A.defaultMatchPct : 0;
}

export function leverCost(id: LeverId, inputs: Inputs): { perMonth: number; later: boolean } {
  switch (id) {
    case 'match': {
      const from = inputs.plan === 'yes' ? inputs.employeePct : 0;
      const gross = (((matchPctFor(inputs) - from) / 100) * inputs.income) / 12;
      return { perMonth: gross * (1 - marginalRate(inputs.income)), later: false };
    }
    case 'auto25':
      return { perMonth: 25, later: false };
    case 'auto50':
      return { perMonth: 50, later: false };
    case 'auto100':
      return { perMonth: 100, later: false };
    case 'raises':
      return { perMonth: (0.01 * (isStudent(inputs.stage) ? fieldSalaryFor('first', inputs.field) : inputs.income)) / 12, later: true };
    case 'cushion':
      return { perMonth: A.cushionTopUp, later: false };
  }
}

// Why a future is not in control: the milestones it misses. A future can
// miss more than one, so the counts can add up to more than `others`.
export type WhyKey = 'workOptional65' | 'room45' | 'room35' | 'shockProof';
export interface WhyNot {
  others: number;
  missed: { key: WhyKey; count: number }[];
}

export function whyNot(paths: { status: number; milestones: Milestones }[], startAge: number): WhyNot {
  const keys: WhyKey[] = ['workOptional65', 'room45', 'room35', 'shockProof'];
  const count: Record<WhyKey, number> = { workOptional65: 0, room45: 0, room35: 0, shockProof: 0 };
  let others = 0;
  for (const p of paths) {
    if (p.status === 0) continue;
    others++;
    for (const k of keys) if (!p.milestones[k]) count[k]++;
  }
  const missed = keys
    // The 35 check only exists for people who start before it.
    .filter((k) => k !== 'room35' || startAge <= 35)
    .map((key) => ({ key, count: count[key] }))
    .filter((m) => m.count > 0)
    .sort((x, y) => y.count - x.count);
  return { others, missed };
}

export function rescueOf(before: PathResult[], after: PathResult[]): Rescue {
  const n = after.length;
  const mask = new Uint8Array(n);
  let toControl = 0;
  let toMostly = 0;
  for (let i = 0; i < n; i++) {
    if (after[i].status < before[i].status && after[i].status <= 1) {
      mask[i] = 1;
      if (after[i].status === 0) toControl++;
      else toMostly++;
    }
  }
  return { mask, toControl, toMostly, total: toControl + toMostly };
}

const lite = (p: PathResult): PathLite => ({
  status: p.status,
  milestones: p.milestones,
  workOptionalAge: p.workOptionalAge,
  final: p.final,
  events: p.events,
});

// Savings at 65 in the middle future, rounded to the nearest $1,000.
function middle(paths: PathResult[]): number {
  const v = paths.map((p) => p.at65).sort((x, y) => x - y);
  return Math.round(v[Math.floor(v.length / 2)] / 1000) * 1000;
}

const ageDelta = (a: number | null, b: number | null): number | null => (a === null || b === null ? null : a - b);

const MARKET_ORDER: AssumptionSetId[] = ['cautious', 'middle', 'hopeful'];

// The habit that rescues the most futures comes first, so the headline, the
// list and the "does it hold" card all name the same step. Ties go to the
// one that costs less.
function byRank(x: { rescued: number; perDollar: number }, y: { rescued: number; perDollar: number }): number {
  return y.rescued - x.rescued || y.perDollar - x.perDollar;
}

// Runs variants on demand and remembers them, so toggling a lever only
// simulates what has not been seen yet.
export class Engine {
  private cache = new Map<string, PathResult[]>();
  private key = '';

  private run(inputs: Inputs, scenario: Scenario, levers: Levers, seed: number, detail: boolean, set: AssumptionSetId): PathResult[] {
    const k = JSON.stringify([set, scenario, levers, detail]);
    const hit = this.cache.get(k) ?? (detail ? undefined : this.cache.get(JSON.stringify([set, scenario, levers, true])));
    if (hit) return hit;
    const res = simulate(inputs, scenario, levers, seed, { detail, set });
    this.cache.set(k, res);
    return res;
  }

  analyse(
    inputs: Inputs,
    selected: Scenario,
    scenario: Scenario,
    levers: Levers,
    seed: number,
    set: AssumptionSetId = 'middle',
    showAll = false,
    wantHolds = false,
  ): Analysis {
    const key = JSON.stringify([inputs, seed]);
    if (key !== this.key) {
      this.cache.clear();
      this.key = key;
    }
    const run = (s: Scenario, l: Levers, detail = false) => this.run(inputs, s, l, seed, detail, set);
    const leversOn = levers.match || levers.raises || levers.cushion || levers.auto > 0;
    const available = LEVER_IDS.filter((id) => leverAvailable(id, inputs));

    const base = run({}, NO_LEVERS);
    const view = run(scenario, levers, true);
    const scen = run(scenario, NO_LEVERS, leversOn);
    const baseSummary = summarise(base);
    const scenarioSummary = summarise(scen);
    const summary = summarise(view);
    const n = view.length;
    const years = A.endAge - inputs.age;
    const bySet = Object.fromEntries(
      MARKET_ORDER.map((m) => [m, m === set ? summary.counts[0] : summarise(this.run(inputs, scenario, levers, seed, false, m)).counts[0]]),
    ) as Record<AssumptionSetId, number>;
    const range = { low: Math.min(...Object.values(bySet)), high: Math.max(...Object.values(bySet)), bySet };

    // Worry cards: each selected worry alone, then all together.
    const ids = Object.keys(selected) as WorryId[];
    const sets: { id: WorryId | 'all'; scenario: Scenario }[] = ids.map((id) => ({ id, scenario: { [id]: selected[id] } }));
    if (ids.length > 1 && showAll) sets.push({ id: 'all', scenario: selected });
    const cards: WorryCard[] = sets.map(({ id, scenario: s }) => {
      const worried = run(s, NO_LEVERS);
      const mask = new Uint8Array(n);
      let affected = 0;
      let recovered = 0;
      for (let i = 0; i < n; i++) {
        if (worried[i].status > base[i].status) {
          mask[i] = 1;
          affected++;
          if (worried[i].workOptionalAge !== null) recovered++;
        }
      }
      const inControl = summarise(worried).counts[0];
      let best: WorryCard['best'] = null;
      if (affected > 0) {
        for (const lever of available) {
          const helped = run(s, leverOnly(lever));
          let protects = 0;
          for (let i = 0; i < n; i++) if (mask[i] && helped[i].status < worried[i].status) protects++;
          const kept = summarise(helped).counts[0];
          if (protects > 0 && (!best || kept > best.inControl || (kept === best.inControl && protects > best.protects))) {
            best = { lever, protects, inControl: kept };
          }
        }
      }
      return {
        id,
        affected,
        recovered,
        best,
        mask,
        baseInControl: baseSummary.counts[0],
        inControl,
        baseMiddleAt65: middle(base),
        middleAt65: middle(worried),
      };
    });

    // Lever ranking against the current scenario.
    const yearlyMatch = (matchPctFor(inputs) / 100) * inputs.income;
    const ranking: LeverRow[] = available.map((id) => {
      const res = run(scenario, leverOnly(id));
      const s = summarise(res);
      const cost = leverCost(id, inputs);
      const gained = s.counts[0] - scenarioSummary.counts[0];
      const rescued = rescueOf(scen, res).total;
      const askHR = id === 'match' && inputs.plan === 'unsure';
      return {
        id,
        costPerMonth: cost.perMonth,
        costLater: cost.later,
        // Asking costs nothing; the habit itself starts later.
        noExtraCost: askHR,
        rescued,
        gained,
        inControl: s.counts[0],
        ageDelta: ageDelta(s.medianWorkOptionalAge, scenarioSummary.medianWorkOptionalAge),
        perDollar: rescued / Math.max(1, cost.perMonth),
        askHR,
        yearlyMatch: id === 'match' ? yearlyMatch : 0,
      };
    });
    ranking.sort(byRank);

    // Does the best step hold? Rank the habits again under the other return
    // settings and under each selected worry, on the same 1,000 paths.
    let holds: Holds | null = null;
    if (wantHolds) {
      const rankIn = (s: Scenario, m: AssumptionSetId) => {
        const plain = this.run(inputs, s, NO_LEVERS, seed, false, m);
        return available
          .map((id) => {
            const rescued = rescueOf(plain, this.run(inputs, s, leverOnly(id), seed, false, m)).total;
            return { id, rescued, perDollar: rescued / Math.max(1, leverCost(id, inputs).perMonth) };
          })
          .sort(byRank);
      };
      const first = rankIn({}, set)[0];
      if (first && first.rescued > 0) {
        const test = (kind: HoldTest['kind'], id: HoldTest['id'], s: Scenario, m: AssumptionSetId): HoldTest => {
          const rows = rankIn(s, m);
          const mine = rows.find((r) => r.id === first.id)!;
          const top = rows[0].rescued > 0 ? rows[0].id : null;
          return { kind, id, rescued: mine.rescued, top, same: top === first.id };
        };
        const tests: HoldTest[] = [
          ...MARKET_ORDER.filter((m) => m !== set).map((m) => test('market', m, {}, m)),
          ...ids.map((id) => test('worry', id, { [id]: selected[id] }, set)),
        ];
        holds = { lever: first.id, rescued: first.rescued, tests, held: tests.filter((t) => t.same).length };
      }
    }
    const rescue = leversOn ? rescueOf(scen, view) : null;
    const plainPaths = leversOn ? scen.map(lite) : null;

    const late = summarise(run(scenario, { ...levers, delay: A.waitingYears }));
    const waiting = {
      inControl: late.counts[0],
      ageDelta: ageDelta(late.medianWorkOptionalAge, summary.medianWorkOptionalAge),
    };

    // Pack the view for the river.
    const w = years + 1;
    const balances = new Float32Array(n * w);
    const statuses = new Uint8Array(n);
    const paths: PathLite[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = view[i];
      balances.set(p.balances!, i * w);
      statuses[i] = p.status;
      paths[i] = lite(p);
    }
    const p25 = new Float32Array(w);
    const p50 = new Float32Array(w);
    const p75 = new Float32Array(w);
    const col = new Float32Array(n);
    for (let t = 0; t < w; t++) {
      for (let i = 0; i < n; i++) col[i] = balances[i * w + t];
      col.sort();
      p25[t] = col[Math.floor(n * 0.25)];
      p50[t] = col[Math.floor(n * 0.5)];
      p75[t] = col[Math.floor(n * 0.75)];
    }
    const order = Array.from({ length: n }, (_, i) => i).sort((x, y) => view[x].final - view[y].final);
    const reps = [0.02, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98].map((q) => order[Math.min(n - 1, Math.floor(n * q))]);

    return {
      set,
      // The goals these futures were run with, so event labels always match.
      goals: inputs.goals ?? [],
      startAge: inputs.age,
      years,
      balances,
      statuses,
      paths,
      summary,
      band: { p25, p50, p75 },
      reps,
      baseSummary,
      scenarioSummary,
      rescue,
      plainPaths,
      cards,
      ranking,
      waiting,
      yearlyMatch,
      holds,
      range,
    };
  }
}
