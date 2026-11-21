// Checks that each worry only makes things harder. Run: npx tsx scripts/worry-check.ts
import { PERSONAS } from '../src/engine/personas';
import { simulate } from '../src/engine/simulate';
import { NO_LEVERS, WORRY_IDS, type PathResult } from '../src/engine/types';

const h = (p: PathResult[]) => p.reduce((s, x) => s + x.status, 0);
for (const p of PERSONAS) {
  const base = h(simulate(p.inputs, {}, NO_LEVERS, 2026, { detail: false }));
  for (const id of WORRY_IDS) {
    const r = (['mild', 'moderate', 'severe'] as const).map((sev) => h(simulate(p.inputs, { [id]: sev }, NO_LEVERS, 2026, { detail: false })));
    const ok = r[0] >= base && r[1] >= r[0] && r[2] >= r[1];
    if (!ok) console.log(p.name, id, 'base', base, 'mild/moderate/severe', r.join(' / '));
  }
}
