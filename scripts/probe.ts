// Prints headline numbers for the demo personas. Run: npx tsx scripts/probe.ts
import { Engine } from '../src/engine/analyse';
import { PERSONAS } from '../src/engine/personas';
import { NO_LEVERS, WORRY_IDS, type AssumptionSetId, type Scenario } from '../src/engine/types';

const all: Scenario = Object.fromEntries(WORRY_IDS.map((id) => [id, 'moderate']));
const sets: AssumptionSetId[] = ['cautious', 'middle', 'hopeful'];
const quiet = process.argv.includes('--short');
for (const p of PERSONAS) {
  const t0 = performance.now();
  const a = new Engine().analyse(p.inputs, all, {}, NO_LEVERS, 2026, 'middle', true);
  const ms = performance.now() - t0;
  console.log(`\n${p.name}  [${ms.toFixed(0)} ms]`);
  console.log('  counts', a.summary.counts.join(' / '), ' median work-optional age', a.summary.medianWorkOptionalAge);
  console.log('  milestones', JSON.stringify(a.summary.milestoneCounts));
  if (!quiet) for (const c of a.cards) console.log(`  worry ${c.id}: affected ${c.affected}, recovered ${c.recovered}, best ${c.best?.lever} ${c.best?.protects}`);
  for (const r of a.ranking) console.log(`  lever ${r.id}: $${r.costPerMonth.toFixed(0)}/mo rescued ${r.rescued} in control ${r.inControl}, age ${r.ageDelta}`);
  console.log('  waiting', JSON.stringify(a.waiting));
  const tops = sets.map((s) => new Engine().analyse(p.inputs, {}, {}, NO_LEVERS, 2026, s).ranking[0].id);
  console.log('  top lever by set', tops.join(' / '));
}
