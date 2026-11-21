// Shows how each "Make it more you" answer moves the in-control count.
// Run: npx tsx scripts/chip-check.ts
import { PERSONAS } from '../src/engine/personas';
import { inputsForStage } from '../src/engine/profile';
import { simulate, summarise } from '../src/engine/simulate';
import { NO_LEVERS, type Inputs } from '../src/engine/types';

const n = (i: Inputs) => summarise(simulate(i, {}, NO_LEVERS, 2026, { detail: false })).counts[0];
const cases: [string, Inputs][] = [...PERSONAS.map((p): [string, Inputs] => [p.name, p.inputs]), ['First job default', inputsForStage('first', 23)]];
for (const [name, i] of cases) {
  console.log(
    name.padEnd(18),
    'base', n(i),
    '| no debt', n({ ...i, debt: null }),
    '| $35k debt', n({ ...i, debt: { balance: 35000, rate: 5 } }),
    '| family', n({ ...i, living: 'family', monthly: i.living === 'family' ? i.monthly : i.monthly * 1.5, moveOutAge: Math.max(i.age + 1, 25) }),
    '| renting', n({ ...i, living: 'renting', monthly: i.living === 'family' ? i.monthly / 1.5 : i.monthly }),
  );
}
