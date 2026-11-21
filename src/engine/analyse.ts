import { A, marginalRate } from './assumptions';
import { simulate, summarise } from './simulate';
import {
  LEVER_IDS,
  NO_LEVERS,
  leverOnly,
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
  best: { lever: LeverId; protects: number } | null;
  mask: Uint8Array;
}

export interface LeverRow {
  id: LeverId;
  costPerPay: number;
  costLater: boolean;
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

export interface Analysis {
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
  cards: WorryCard[];
  ranking: LeverRow[];
  waiting: { inControl: number; ageDelta: number | null };
  yearlyMatch: number;
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

export function leverCost(id: LeverId, inputs: Inputs): { perPay: number; later: boolean } {
  switch (id) {
    case 'match': {
      const from = inputs.plan === 'yes' ? inputs.employeePct : 0;
      const gross = (((matchPctFor(inputs) - from) / 100) * inputs.income) / A.paycheques;
      return { perPay: gross * (1 - marginalRate(inputs.income)), later: false };
    }
    case 'auto25':
      return { perPay: 25, later: false };
    case 'auto50':
      return { perPay: 50, later: false };
    case 'auto100':
      return { perPay: 100, later: false };
    case 'raises':
      return { perPay: (0.01 * inputs.income) / A.paycheques, later: true };
    case 'cushion':
      return { perPay: A.cushionTopUp, later: false };
  }
}

const ageDelta = (a: number | null, b: number | null): number | null => (a === null || b === null ? null : a - b);

// Runs variants on demand and remembers them, so toggling a lever only
// simulates what has not been seen yet.
export class Engine {
  private cache = new Map<string, PathResult[]>();
  private key = '';

  private run(inputs: Inputs, scenario: Scenario, levers: Levers, seed: number, detail: boolean): PathResult[] {
    const k = JSON.stringify([scenario, levers, detail]);
    const hit = this.cache.get(k) ?? (detail ? undefined : this.cache.get(JSON.stringify([scenario, levers, true])));
    if (hit) return hit;
    const res = simulate(inputs, scenario, levers, seed, { detail });
    this.cache.set(k, res);
    return res;
  }

  analyse(inputs: Inputs, selected: Scenario, scenario: Scenario, levers: Levers, seed: number): Analysis {
    const key = JSON.stringify([inputs, seed]);
    if (key !== this.key) {
      this.cache.clear();
      this.key = key;
    }
    const run = (s: Scenario, l: Levers, detail = false) => this.run(inputs, s, l, seed, detail);
    const available = LEVER_IDS.filter((id) => leverAvailable(id, inputs));

    const base = run({}, NO_LEVERS);
    const view = run(scenario, levers, true);
    const scen = run(scenario, NO_LEVERS);
    const baseSummary = summarise(base);
    const scenarioSummary = summarise(scen);
    const summary = summarise(view);
    const n = view.length;
    const years = A.endAge - inputs.age;

    // Worry cards: each selected worry alone, then all together.
    const ids = Object.keys(selected) as WorryId[];
    const sets: { id: WorryId | 'all'; scenario: Scenario }[] = ids.map((id) => ({ id, scenario: { [id]: selected[id] } }));
    if (ids.length > 1) sets.push({ id: 'all', scenario: selected });
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
      let best: WorryCard['best'] = null;
      if (affected > 0) {
        for (const lever of available) {
          const helped = run(s, leverOnly(lever));
          let protects = 0;
          for (let i = 0; i < n; i++) if (mask[i] && helped[i].status < worried[i].status) protects++;
          if (protects > 0 && (!best || protects > best.protects)) best = { lever, protects };
        }
      }
      return { id, affected, recovered, best, mask };
    });

    // Lever ranking against the current scenario.
    const yearlyMatch = (matchPctFor(inputs) / 100) * inputs.income;
    const ranking: LeverRow[] = available.map((id) => {
      const s = summarise(run(scenario, leverOnly(id)));
      const cost = leverCost(id, inputs);
      const gained = s.counts[0] - scenarioSummary.counts[0];
      return {
        id,
        costPerPay: cost.perPay,
        costLater: cost.later,
        gained,
        inControl: s.counts[0],
        ageDelta: ageDelta(s.medianWorkOptionalAge, scenarioSummary.medianWorkOptionalAge),
        perDollar: gained / Math.max(1, cost.perPay),
        askHR: id === 'match' && inputs.plan === 'unsure',
        yearlyMatch: id === 'match' ? yearlyMatch : 0,
      };
    });
    ranking.sort((x, y) => Number(y.askHR) - Number(x.askHR) || y.perDollar - x.perDollar || y.gained - x.gained);

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
      paths[i] = { status: p.status, milestones: p.milestones, workOptionalAge: p.workOptionalAge, final: p.final, events: p.events };
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
      cards,
      ranking,
      waiting,
      yearlyMatch,
    };
  }
}
