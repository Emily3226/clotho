// In-control count by field, for a student and a first job. Run: npx tsx scripts/field-check.ts
import { persona } from '../src/engine/personas';
import { FIELDS, fieldSalaryFor, inputsForStage } from '../src/engine/profile';
import { simulate, summarise } from '../src/engine/simulate';
import { NO_LEVERS, type Inputs } from '../src/engine/types';

const n = (i: Inputs) => summarise(simulate(i, {}, NO_LEVERS, 2026, { detail: false }));
const first = inputsForStage('first', 23);
for (const f of FIELDS) {
  const s = n({ ...persona('maya').inputs, field: f.id });
  const income = fieldSalaryFor('first', f.id);
  const j = n({ ...first, field: f.id, income, monthly: Math.round((first.monthly * income) / first.income) });
  console.log(f.label.padEnd(34), 'student', String(s.counts[0]).padStart(4), ' wo65', String(s.milestoneCounts.workOptional65).padStart(4), ' | first job', String(j.counts[0]).padStart(4), ' wo65', String(j.milestoneCounts.workOptional65).padStart(4), 'r35', j.milestoneCounts.room35);
}
