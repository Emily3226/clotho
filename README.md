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

## The flow (about 90 seconds)

1. **Landing.** The tagline, a start button, and three one-tap personas (Maya, Dev, Sam).
2. **Check-in.** Confidence from 1 to 10, and what's on your mind.
3. **Basics.** Four numbers and one question about the plan at work.
4. **The river.** A thousand lives from now to 70, with a headline count: "You stay in control in 705 of your 1,000 futures." Tap any line to read that life.
5. **Your worries.** Each worry is sized: how many futures get harder, how many still get there, and which habit lifts the most back up.
6. **What you control.** Habits ranked by futures gained per dollar. Toggle one and the river morphs, path by path.
7. **Your one step.** One habit, a two-line plan, a calendar reminder, a message for HR, and the confidence question again.

`#/employer` is a read-only page for a plan sponsor, filled with a clearly labelled sample cohort of 200 synthetic employees.

## Architecture

```
src/
  config.ts              product name and tagline (change the name here)
  engine/                pure TypeScript, no DOM, unit-tested
    assumptions.ts       every constant, with source and date
    worries.ts           what each "what if" changes, at three strengths
    rng.ts               seeded draws, generated up front per path
    simulate.ts          simulate(inputs, scenario, levers, seed) and summarise(paths)
    analyse.ts           worry cards, lever ranking, cost of waiting, river data
    worker.ts            Web Worker entry
    engine.test.ts       the test suite
  components/River.tsx   Canvas 2D river: draw-in, per-path morph, hit testing
  screens/               the seven screens and the employer page
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
- "Build the cushion first" is an extra $40 a paycheque that stops by itself when the cushion is full.

All of these are listed in the Assumptions panel and in `docs/ASSUMPTIONS.md`.

## Honest limitations

1. **The parameters are illustrative, not forecasts.** A thousand runs of luck show a range of what could happen, not what will.
2. **Taxes, CPP and OAS are simplified.** Approximate effective tax rates for a single Ontario earner, and simple pension estimates.
3. **One set of life events cannot cover everyone.** No partners, children, inheritances or moves between provinces.

The 2026 limits (TFSA, FHSA, RRSP, CPP, YMPE, OAS) were entered from published figures and marked "as of 2026"; check them against the linked official pages before relying on them.

## Useful scripts

```
npx tsx scripts/probe.ts             # headline numbers for the three personas
npx tsx scripts/assumptions-doc.ts   # regenerate docs/ASSUMPTIONS.md from the code
```
