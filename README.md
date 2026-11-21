# Clotho

**You can't predict the future. You can stack the odds.**

Clotho shows a young Canadian a thousand simulated versions of their own financial life, sizes the things they are worried about against those lives, and shows which single small habit keeps the most of them on track. It ends with one step they commit to.

Built at Hack Western 13 for the Canada Life "Future Me" challenge. Clotho is the Fate who spins the thread of life; here you get to see a thousand threads and nudge them.

It is an educational tool, not financial advice. It never names a product, fund or provider.

## Run it

```
npm install
npm run dev      # web app on http://localhost:5173, narration server on :8787
npm test         # engine test suite
npm run build    # static build in dist/, works without any server
npm run preview  # serve the static build
```

Node 20 or newer.

The app needs no network and no API key. AI narration is optional: copy `.env.example` to `.env`, set `GEMINI_API_KEY`, and switch "AI narration" on in the app. Without a key (or without the server) the app quietly uses its built-in wording.

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | none | Enables narration. Stays on the server. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Model used for wording. |
| `API_PORT` | `8787` | Narration server port. `PORT` is never read. |
| `NARRATE_TIMEOUT_MS` | `4000` | After this, the template is used. |

## The flow (about 2 minutes, 30 seconds a month after that)

1. **Landing.** The tagline, a small real river drawing in, a start button, and three one-tap personas (Maya, a student; Jordan, a first job; Sam, gig work). A fourth, Priya, is used on stage to compare with Maya.
2. **About you.** One screen, mostly taps (with "Other" for a field of work in your own words and for an exact debt amount): confidence, what worries you most, age, monthly saving, life stage (including co-op or internship and part-time), field and city. Under "More (optional)": when school ends, what you want room for (a home asks what kind and when), living situation, debt, goals typed in your own words, and exact numbers. **What do you want in life?** lets people choose kids (0 to 4, when, with a partner or alone, and leave), a home, helping family, caring for a parent, travel, time off, going back to school and a four-day week. Each is off until chosen and changes the same 1,000 lives.
3. **Your futures.** A thousand lives from now to 70. The headline is today's count with what one habit puts within reach ("599 in control today, 921 within reach"). The worries you picked open as cards, each sized and shown with the habit that protects the most. A worry can also be typed in your own words: it is matched offline to the closest what-if, and you can change what it is tested as. **Show** puts one on the river, and "All at once" is behind a link. A savings dial ("Set aside $150 a month") moves every life live and shows "599 → 907". **Play one of your lives** draws a single life across the river with its events as it goes. **Why 599?** opens the working behind the headline: the four checks, how the 1,000 futures sort, and which checks the others miss. "Change your answers" re-runs the river from any answer. **What if there is no 65?** stops the same lives at 35, 40 or 50 and compares what is yours to use with the top habit and without it, against the spending it cost along the way.
4. **What helps most.** Habits ranked by futures rescued per dollar a month. Switch one on and the futures it rescues light up: "+114 futures rescued" for automating $25 a month. Each habit has a "?" with one plain sentence. The inspector can show the same life, with the same luck, without the habit. A **Does it still hold?** card re-ranks the habits under the other two return settings and under each worry you picked, and says in how many of those tests the top step stays first.
5. **Pick one to try.** One habit, a two-line plan, a monthly calendar reminder, a message for HR when relevant, the confidence question again, and a 9:16 summary card to save or share.
6. **Monthly check-in.** On a return visit: "Did you do it this month?", a streak, and "You started at 599. Keeping it up points to 924 of 1,000". One "Yes" per month. `?demo=1` adds a "jump ahead 3 months" button for the stage.

`?test=1` turns on user-test mode: each finished session adds an anonymous record (life stage, field, confidence before and after, habit picked, whether the reminder was added or the HR message copied) on this device, with a CSV export.

## Architecture

```
src/
  config.ts              product name and tagline (change the name here)
  engine/                pure TypeScript, no DOM, unit-tested
    assumptions.ts       every constant, with source and date
    worries.ts           what each "what if" changes (the app uses the moderate setting)
    profile.ts           life stages, field of study, city, living situation, assumption sets
    rng.ts               seeded draws, generated up front per path
    simulate.ts          simulate(inputs, scenario, levers, seed) and summarise(paths)
    analyse.ts           worry cards, lever ranking, cost of waiting, river data
    worker.ts            Web Worker entry
    engine.test.ts       the test suite
  components/River.tsx   Canvas 2D river: draw-in, per-path morph, hit testing
  screens/               intro, explore (futures, make it more you, habits, what if), pick one, monthly check-in
  lib/                   copy, templates, calendar file, question box
  narrate/               client and the number validator shared with the server
server/index.ts          Express proxy for /api/narrate (keeps the key off the client)
docs/                    ASSUMPTIONS, PITCH, DEVPOST
```

**The engine is the product.** 1,000 paths, yearly steps to age 70, three buckets (cushion, reachable long-term savings, workplace plan).

- **Common random numbers.** Every random draw for path *i* comes from a generator seeded with `(seed, i)` and is drawn up front, in a fixed order, whatever the scenario or lever. Path *i* has the same luck in every variant. That is why the river can morph line by line when a habit is switched on, and why "this habit lifts 570 of your futures" is a real per-path comparison rather than two unrelated samples.
- **Deterministic.** Same inputs and seed, same thousand futures. The "new run of luck" button changes the seed; it is never the default.
- **Fast.** One 1,000-path run takes about 10 ms. Results are cached per variant in the worker, so a habit toggle only simulates what has not been seen.

**Numbers only come from the engine.** The language model is used for wording only. It receives a small JSON of anonymous facts, is told not to add numbers or advice, and every reply is checked: if it contains a number that is not in the facts, or a banned word, it is discarded and the template is shown. This check runs on the server and again in the browser.

**Privacy.** No accounts, no database. Inputs live in `localStorage`. Nothing leaves the device unless AI narration is switched on, and then only counts, ages and events are sent.

**Accessibility.** No red and no alarm colours; status is also shown by line style and by counts. Full keyboard use (arrow keys step through representative futures on the river). `prefers-reduced-motion` swaps the morph for a cross-fade. A text summary of the river updates for screen readers. Light and dark themes.

## Choices made where the brief left room

- The workplace-plan percentage is **on top of** the amount saved per paycheque (the form says so), and plan contributions get approximate tax relief.
- A future that is work-optional by 65 but misses two or more other milestones is "Tight", not "Off track".
- "Back on track later" means work still becomes optional by 70. "Lifts back up" means the habit improves the status under the same worry.
- "Everything keeps getting more expensive" applies to essentials, taken as half of spending. Applied to all spending it wiped out nearly every future for a low saver, which said more about the setting than about the person.
- People keep working past 65 until work becomes optional or 70, so the work-optional age can move in both directions.
- "Build the cushion first" is an extra $90 a month that stops by itself when the cushion is full.
- Spending rises by 75% to 85% of each raise depending on the city, and follows the expected career: a layoff, a pay cut or a slower career squeezes saving, not lifestyle. An earlier version spent half of each raise, which quietly saved the other half and showed someone saving nothing as "in control" in 7 of 10 futures. The results are sensitive to this rule; it is listed in the Assumptions panel.
- Living with family is modelled as the same lifestyle as renting, plus the rent not paid, saved until moving out.
- Student debt payments start when school ends (now, for anyone already working). The saving someone enters includes what goes to student loans, so payments come out of what would have been saved first, then out of spending (up to 15% of it), and only then out of savings. They pause in a year with time out of work, but not during a gig slow stretch.
- Careers have good luck as well as bad: a 4% chance each year before 45 of a lasting 6% step up in pay, balancing the lasting 5% cut after a layoff. The 6% is in line with the extra pay growth ADP Canada measures for people who change jobs (about 5 points on total pay), and the 4% chance is set so luck balances: 4% × 6% adds about 0.24% a year on average, and a 5% chance of a layoff with a 5% cut takes away about 0.25%. The 5% cut is at the mild end of what Statistics Canada found for laid-off workers five years on (2% to 15% for the early 2000s). Every number's origin is in the Assumptions panel and `docs/ASSUMPTIONS.md`.
- Lifestyle adjusts slowly when life differs from the plan (lower pay, higher costs, or a step up), closing a quarter of the gap each year. Trimming never lowers the targets a future is judged against; spending more after a step up raises them.
- A worry is sized by how many futures stay in control with and without it, and by the savings at 65 in the middle future.
- Work becoming optional is checked from age 30. Before 65, savings first have to stand in for public pensions until they start, so it takes a very high saving rate to get there in your thirties.
- "Save part of every raise" adds one point of pay at each raise of 3% or more, up to 5 points.
- Higher-paid fields can show fewer futures in control at the same share of pay saved, because CPP and OAS replace less of a higher income. The app says so when it happens instead of hiding it.
- Three return settings (cautious, middle, hopeful) can be switched in the Assumptions panel. A test records whether the top-ranked habit changes between them (`src/engine/stability.json`); for all four personas it does not.

All of these are listed in the Assumptions panel and in `docs/ASSUMPTIONS.md`.

## Honest limitations

1. **The parameters are illustrative, not forecasts.** A thousand runs of luck show a range of what could happen, not what will.
2. **Taxes, CPP and OAS are simplified.** Approximate effective tax rates for a single Ontario earner, and simple pension estimates.
3. **One set of life events cannot cover everyone.** No partners, children, inheritances or moves between provinces, and field-of-study effects are broad averages, not a prediction for any one person.

Starting pay by field comes from Statistics Canada Table 37-10-0284-01 (median employment income two years after graduation, bachelor's, class of 2022). The figures were gathered while the table was offline; confirm each one against the table before quoting it.

The 2026 limits (TFSA, FHSA, RRSP, CPP, YMPE, OAS) were entered from published figures and marked "as of 2026"; check them against the linked official pages before relying on them.

## Useful scripts

```
npx tsx scripts/probe.ts             # headline numbers, habits and stability for the personas
npx tsx scripts/worry-check.ts       # checks every worry only makes things harder
npx tsx scripts/chip-check.ts        # how debt and living situation move the count
npx tsx scripts/field-check.ts       # in-control count by field of study
npx tsx scripts/assumptions-doc.ts   # regenerate docs/ASSUMPTIONS.md from the code
```
