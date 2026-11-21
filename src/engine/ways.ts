// More ways to get ahead than setting more aside: using the tax rules, paying
// less in fees, earning more. Each is tested on the same 1,000 lives, on top
// of whatever habits are switched on, and costs nothing extra each month.
import { rescueOf } from './analyse';
import { simulate, summarise } from './simulate';
import type { AssumptionSetId, Inputs, Levers, PathResult, Scenario, WayId } from './types';

export interface WayInfo {
  id: WayId;
  title: string;
  how: string;
}

export const WAYS: WayInfo[] = [
  {
    id: 'refund',
    title: 'Use an RRSP and reinvest the refund',
    how: 'Money in an RRSP lowers your tax this year. Putting that refund back in means the government helps fund your saving. It’s taxed when you take it out.',
  },
  {
    id: 'fhsa',
    title: 'Use an FHSA for your first home',
    how: 'You get a tax deduction going in, and it comes out tax-free for a first home. Up to $8,000 a year, $40,000 in total.',
  },
  {
    id: 'fees',
    title: 'Pay less in investment fees',
    how: 'Fees come out every year, whether markets are up or down. This compares paying 0.25% a year instead of 0.75%.',
  },
  {
    id: 'earn',
    title: 'Ask for 5% more at your next review or job',
    how: 'One conversation can beat years of small savings, because it lifts every paycheque after it. This keeps your spending from rising by the whole amount.',
  },
];

export const wayInfo = (id: WayId): WayInfo => WAYS.find((w) => w.id === id)!;

export const waysFor = (inputs: Inputs): WayId[] => WAYS.map((w) => w.id).filter((id) => id !== 'fhsa' || !!inputs.home);

export interface WayResult {
  id: WayId;
  // Futures that move up to In control or Mostly there.
  rescued: number;
  inControl: number;
  // More saved at 65 in the middle future, after tax on the RRSP.
  moreAt65: number;
}

const middleNet = (paths: PathResult[]): number => {
  const v = paths.map((p) => p.at65Net).sort((x, y) => x - y);
  return v[Math.floor(v.length / 2)];
};

export function testWays(inputs: Inputs, levers: Levers, seed: number, set: AssumptionSetId, scenario: Scenario): WayResult[] {
  const opts = { detail: false, set };
  const plain = simulate(inputs, scenario, levers, seed, opts);
  const base = middleNet(plain);
  return waysFor(inputs)
    .map((id): WayResult => {
      const res = simulate(inputs, scenario, levers, seed, { ...opts, ways: [id] });
      return {
        id,
        rescued: rescueOf(plain, res).total,
        inControl: summarise(res).counts[0],
        moreAt65: Math.round((middleNet(res) - base) / 100) * 100,
      };
    })
    .sort((x, y) => y.rescued - x.rescued || y.moreAt65 - x.moreAt65);
}
