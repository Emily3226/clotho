// How many futures reach a home goal, by home type and age. Run: npx tsx scripts/home-check.ts
import { persona } from '../src/engine/personas';
import { HOME_TYPES, HOME_WHEN, homePriceFor, minDownPayment } from '../src/engine/profile';
import { simulate, summarise } from '../src/engine/simulate';
import { NO_LEVERS, type Inputs } from '../src/engine/types';

for (const id of ['maya', 'priya', 'jordan']) {
  const base = persona(id).inputs;
  console.log(`\n${persona(id).name} (${base.city})`);
  for (const t of HOME_TYPES) {
    const price = homePriceFor(base.city, t.id);
    const row = HOME_WHEN.map((w) => {
      const i: Inputs = { ...base, home: { price: 0, byAge: w.age, type: t.id } };
      const s = summarise(simulate(i, {}, NO_LEVERS, 2026, { detail: false }));
      return `${w.label} ${s.milestoneCounts.home}`;
    });
    console.log(`  ${t.label.padEnd(10)} $${price / 1000}k, down $${minDownPayment(price) / 1000}k: ${row.join(' | ')}`);
  }
}
