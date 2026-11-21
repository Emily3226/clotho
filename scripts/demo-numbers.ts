// The numbers the demo script quotes, straight from the engine.
// Run: npx tsx scripts/demo-numbers.ts
import { Engine } from '../src/engine/analyse';
import { persona } from '../src/engine/personas';
import { simulate, summarise } from '../src/engine/simulate';
import { NO_LEVERS, leverOnly, type Inputs } from '../src/engine/types';

const inControl = (i: Inputs, l = NO_LEVERS) => summarise(simulate(i, {}, l, 2026, { detail: false })).counts[0];
const maya = persona('maya').inputs;
const a = new Engine().analyse(maya, { ai: 'moderate' }, {}, NO_LEVERS, 2026);
const row = (id: string) => a.ranking.find((r) => r.id === id);
console.log('Maya in control:', inControl(maya));
console.log('Maya at $150 a month:', inControl({ ...maya, monthly: 150 }));
console.log('Priya in control:', inControl(persona('priya').inputs));
console.log('Automate $25 rescues:', row('auto25')?.rescued);
console.log('Save part of every raise rescues:', row('raises')?.rescued);
const card = a.cards[0];
console.log('AI worry: harder', card.affected, 'recovered', card.recovered, 'best', card.best?.lever, card.best?.protects);
// Check-in after 3 months of the raise habit: saved grows by 3 months of saving.
const after = { ...maya, saved: maya.saved + 3 * maya.monthly };
console.log('Check-in start (no habit):', inControl(maya), '→ after 3 months with the raise habit:', inControl(after, leverOnly('raises')));
