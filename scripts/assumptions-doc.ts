// Writes docs/ASSUMPTIONS.md from the engine's own tables, so the document
// cannot drift from the code. Run: npx tsx scripts/assumptions-doc.ts
import { writeFileSync } from 'node:fs';
import { APP_NAME } from '../src/config';
import { ASSUMPTIONS, LIMITATIONS, type Assumption } from '../src/engine/assumptions';
import { WORRIES } from '../src/engine/worries';

const table = (items: Assumption[]) =>
  [
    '| What | Value | Notes | Source | As of |',
    '|---|---|---|---|---|',
    ...items.map((a) => `| ${a.label} | ${a.display} | ${a.note ?? ''} | [${a.sourceLabel}](${a.source}) | ${a.asOf} |`),
  ].join('\n');

const md = `# ${APP_NAME}: assumptions

Generated from \`src/engine/assumptions.ts\` and \`src/engine/worries.ts\`. To change a number, change it there and run \`npx tsx scripts/assumptions-doc.ts\`.

All amounts are in today's dollars: inflation is already taken out, so every return and growth rate below is a real rate.

## Published figures

${table(ASSUMPTIONS.filter((a) => a.kind === 'official'))}

## Illustrative assumptions

These are modelling choices, not facts and not forecasts.

${table(ASSUMPTIONS.filter((a) => a.kind === 'illustrative'))}

## What each worry changes

Worries are tested as what-ifs, never as predictions. Each one is run against the same 1,000 paths with the same luck.

| Worry | Mild | Moderate (default) | Severe |
|---|---|---|---|
${WORRIES.map((w) => `| ${w.label} | ${w.changes[0]} | ${w.changes[1]} | ${w.changes[2]} |`).join('\n')}

## How a future is judged

- **Shock-proof:** never had to dip into the workplace plan and never ended a year short.
- **Room to move:** the cushion plus reachable long-term savings cover 6 months of spending at 35 and 12 months at 45.
- **Home** (only if set): the down payment is reached by the target age.
- **Work-optional by 65:** income from savings and public pensions covers 70% of average spending over the last five working years. The earliest age this holds is recorded from 50 to 70. Before 65, savings must also bridge the years until public pensions start.
- **In control:** all milestones met. **Mostly there:** work-optional by 65, one other missed. **Tight:** work-optional by 65 with two or more others missed, or work-optional missed by less than 20 points. **Off track:** the rest.
- A worry makes a future **harder** when its status drops against the no-worry run of the same path. It counts as **back on track later** when work still becomes optional by 70. A habit **lifts it back up** when the status improves under the same worry.
- Habits are ranked by futures gained per dollar of take-home pay given up per paycheque today.

## Model order within a year

1. Balances are recorded and milestones are checked.
2. Investment returns are applied to opening balances.
3. Pay is set (trend, lasting effects of past layoffs, yearly noise) and spending follows the half-of-each-raise rule.
4. Job loss is drawn. While out of work, income is 45% of pay and contributions stop for those months.
5. Money left after spending goes to the workplace plan first (with the employer match), then the cushion, then long-term savings (FHSA if a home goal is set, TFSA, then a taxable pot).
6. If spending is more than income, money comes from the cushion, then long-term savings, then the workplace plan (30% lost to tax).

## Limitations

${LIMITATIONS.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Other simplifications worth knowing: contribution room for the workplace plan does not carry forward; the plan's tax relief uses an approximate marginal rate; home prices are flat in today's dollars unless the home worry is on; a home purchase withdraws the down payment and does not model a mortgage; CPP assumes work from age 22 and does not index the earnings ceiling; people keep working to 65, and past 65 only until work becomes optional or 70.
`;

writeFileSync('docs/ASSUMPTIONS.md', md);
console.log('wrote docs/ASSUMPTIONS.md');
