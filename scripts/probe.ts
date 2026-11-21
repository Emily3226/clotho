// Prints headline numbers for the demo personas. Run: npx tsx scripts/probe.ts
import { Engine } from '../src/engine/analyse';
import { PERSONAS } from '../src/engine/personas';
import { NO_LEVERS, type Scenario, type WorryId } from '../src/engine/types';
import { simulate, summarise } from '../src/engine/simulate';

const all: Scenario = { ai: 'moderate', recession: 'moderate', costs: 'moderate', home: 'moderate', world: 'moderate', pensions: 'moderate' };
for (const p of PERSONAS) {
  const e = new Engine();
  const t0 = performance.now();
  const a = e.analyse(p.inputs, all, {}, NO_LEVERS, 2026);
  const ms = performance.now() - t0;
  console.log(`\n${p.name}  [${ms.toFixed(0)} ms]`);
  console.log('  counts', a.summary.counts.join(' / '), ' median work-optional age', a.summary.medianWorkOptionalAge);
  console.log('  milestones', JSON.stringify(a.summary.milestoneCounts));
  for (const c of a.cards) {
    const sc = c.id === 'all' ? all : { [c.id]: 'moderate' } as Scenario;
    const s = summarise(simulate(p.inputs, sc, NO_LEVERS, 2026, { detail: false }));
    console.log(`  worry ${c.id as WorryId}: [${s.counts.join('/')}] age ${s.medianWorkOptionalAge} affected ${c.affected}, recovered ${c.recovered}, best ${c.best?.lever} ${c.best?.protects}`);
  }
  for (const r of a.ranking) console.log(`  lever ${r.id}: $${r.costPerPay.toFixed(0)} gained ${r.gained} -> ${r.inControl}, age ${r.ageDelta}`);
  console.log('  waiting', JSON.stringify(a.waiting));
}
