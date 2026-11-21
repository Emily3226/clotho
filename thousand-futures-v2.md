# Thousand Futures (v2) — build prompt

You are building a complete, demo-ready web app in one pass. Read this whole document before writing code. Every decision you need is here; where it is not, choose the simplest option that keeps the demo reliable and note it in the README. Do not stop to ask questions.

---

## 1. What we are building and why

**Thousand Futures** lets a young Canadian test their small money habits against a thousand runs of luck and see exactly which of those futures each habit rescues, including the futures they are most worried about. They pick one habit to try, set a monthly reminder, and come back to see how many futures they have rescued so far.

**One-line pitch:** "You can't predict the future. You can stack the odds."

**The one sentence that separates us from a retirement calculator:** "A calculator gives you one number. This shows you which habit holds up in the futures you're afraid of."

**Event:** Hack Western 13 (theme: "Discover the unknown"). Team of 2. Judged on Innovation & Creativity, Technical Complexity, Completeness, Design, equally.

**Primary target: The Canada Life Future Me Challenge.** Their brief:

> many young Canadians are struggling to engage with long-term financial planning due to uncertainty about the world ahead. Your challenge is to design and build a digital solution that helps Gen Z take meaningful action toward their financial future through motivation, visualization, behavioral nudges, education, or innovation. Create a solution that turns uncertainty into confidence and helps young people see that the future is still worth planning for.

**Secondary (must not distort the product):** MLH Best Use of Gemini, Organizers' Choice "Most Adventurous", Overall.

### 1.1 What the sponsor's research says (design to this)

From Canada Life's page and trade-press coverage of their Canada Life / Deloitte study (reported figures; the team verifies them against the full report before quoting on stage):

- Young people feel "existential dread", which leads to doomscrolling and "growing feelings of helplessness".
- People who feel that dread were reported as 16% less likely to enrol in long-term savings.
- Gen Z was reported to doomscroll about 74 minutes a day; each extra hour was associated with a 4.4% lower chance of setting up automatic contributions.
- Gen Z was reported to withdraw from RRSPs more often than earlier generations at the same age.
- **Fear-based messaging backfires.** Framing saving as **flexibility and control** works better than a distant retirement date.
- Canada Life recommends addressing fears directly with "approachable steps", and offers plans that combine short-term saving with retirement saving.

### 1.2 What that means for the product (non-negotiable)

1. **Open on what the user wants room for, not on what they fear.** Worries come only after the first result, and every worry is shown next to the habit that protects against it.
2. **Never scare.** No red, no alarms, no shame. Arc: what you want room for → your futures → make it more you → the habit that rescues the most → the worries, each with its protection → one step → come back.
3. **The hero is the rescue**, not the fan chart: the specific futures a habit moves into "on track", highlighted.
4. **Not another feed.** The answer to doomscrolling is the opposite of a feed: a first visit of a few minutes, then 30 seconds once a month. No infinite scroll, no engagement tricks.
5. **It has to feel like *my* futures.** Two students with the same age and savings but different fields, cities and debt must get visibly different rivers. Personal detail is collected as one-tap questions that each change the river on the spot.
6. **Work for people without a workplace plan.** Students and gig workers are first-class users. The employer match is one lever among several, offered only when relevant.
7. **Action, then a reason to return.** End with one step and a monthly check-in that shows progress.
8. **Measure what people do, not only how they feel.** Confidence before/after plus whether they set a reminder or copied the HR message.

---

## 2. Hard constraints

- **Educational tool, not financial advice.** Never recommend a specific investment, fund, provider or product. Account types (TFSA, FHSA, RRSP, workplace plan) may be named. No lever is labelled "recommended"; the user picks. A short plain disclaimer sits in the footer and the Assumptions panel.
- **Numbers come only from the simulation engine.** The language model never produces or changes a number (§10).
- **Works with no network and no API key.** No runtime CDN calls; fonts and assets are local.
- **No accounts, no bank linking, no database.** State lives in `localStorage`. Nothing leaves the device unless the user turns on AI narration, and then only anonymous simulation facts.
- **Deterministic.** Seeded random numbers; same inputs and seed → same thousand futures.
- **Fast.** Input to river in under 2 s on a mid-range laptop; lever toggle recomputes and starts animating in under 300 ms.
- **Phone first**, and good on a 1080p projector.
- **Accessible.** WCAG AA contrast, colour never the only signal, full keyboard use, `prefers-reduced-motion` respected, screen-reader text summary of the river.
- **All amounts in today's dollars.** Say so on screen once, plainly.

---

## 3. Tech stack

- Vite + React + TypeScript (strict). Vitest for tests.
- Simulation in a **Web Worker** (`src/engine/`), pure TypeScript, no DOM, fully unit-tested.
- River on **Canvas 2D**.
- Installable **PWA** (manifest + service worker caching the build) so it lives on the home screen and runs offline.
- State: Zustand or plain React context. Styling: one consistent system (Tailwind or CSS modules).
- Tiny **Express** server only for `/api/narrate` (Gemini proxy so the key stays server-side). Port from `API_PORT` (default 8787), **never** `PORT`. Vite proxies `/api`. Missing server or key → silent fallback to templates.
- `.env.example`: `GEMINI_API_KEY`, `GEMINI_MODEL` (check the current model name against Google's docs before the event and put it here), `API_PORT`, `NARRATE_TIMEOUT_MS` (default 4000).
- `npm run dev` starts both; `npm test` runs the suite; `npm run build` produces a static build that works without the server.

### Environment notes (Windows)

- Use the file-writing tool for files; shell heredocs with apostrophes or backticks fail in Git Bash.
- The app launcher sets `PORT`; the API server must not read it.
- Do not rely on `postinstall`.

### Repository

- Work on a new orphan branch `thousand-futures` in a separate git worktree next to the main checkout (for example `../HackWestern-thousand-futures`). Do not touch other branches.
- Commit in small logical steps under the repository's configured git user. Follow Hack Western's and Devpost's rules on disclosing AI tools; describe the tools used honestly in `docs/DEVPOST.md`.
- Do not push unless asked.

### Working as a pair (do this in hour 1)

Write `src/engine/types.ts` (`Inputs`, `Scenario`, `Lever`, `PathResult`, `Summary`, `RescueResult`) and a fixture `src/fixtures/maya.json` produced from those types. One person builds the engine against tests; the other builds the UI against the fixture. Swap the fixture for the worker when the engine passes its tests.

---

## 4. The simulation engine

Build and test it first.

### 4.1 Structure

- 1,000 paths. Annual steps from current age to 70 (contributions and unemployment handled in months within the year).
- **Common random numbers:** every draw for path *i* comes from a generator seeded with `(seed, i)`, drawn up front into typed arrays, the same sequence regardless of scenario or lever. Path *i* has the same luck in every variant. This is what makes "this habit rescues 214 of your futures" a real per-path comparison and lets the river morph line by line. Never branch the random stream on state.
- Functions: `simulate(inputs, scenario, levers, seed, assumptionSet) → PathResult[]`, `summarise(paths)`, and `rescue(basePaths, variantPaths) → RescueResult` (indices of paths whose status improved, split into "moved to In control" and "moved to Mostly there").

### 4.2 Inputs: a fast start, then "Make it more you"

**Fast start (three questions, first river in under 30 seconds):**

1. **Age** (16–35).
2. **Life stage:** Student / First job / Gig or contract / Full-time.
3. **"About how much could you set aside a month?"** Slider, $0–$1,000, default from the life stage.

**Make it more you (§4.2.1)** comes right after the first river: five one-tap questions that each re-run the model and morph the river.

Exact numbers live in a "Fine-tune" drawer: yearly income, total saved, workplace plan (Yes / No / Not sure; if Yes, you put in X%, employer matches up to Y%), months of cushion wanted (default 3), home goal (price, by age), student debt (exact balance, rate). Every field accepts "I don't know", which keeps the default. A typed exact value always overrides a default from the chips.

**Life-stage defaults** (illustrative, labelled as such in the Assumptions panel; check against Statistics Canada figures if the network is available, otherwise mark "illustrative"):

| Stage | Income | Saved | Monthly saving | Workplace plan | Special rules |
|---|---|---|---|---|---|
| Student | $18,000 part-time | $1,500 | $50 | No | Starts full-time work at the later of age 23 or age + 2, at $52,000. No job-loss draws while a student. |
| First job | $52,000 | $2,000 | $150 | Not sure | — |
| Gig or contract | $38,000 | $3,000 | $100 | No | Yearly income noise ±12% instead of ±2%. Instead of job loss: 8%/yr chance of a 3-month dip to 50% of income. |
| Full-time | $68,000 | $8,000 | $300 | Yes, 3% / 4% | — |

#### 4.2.1 Make it more you

Each question is a row of chips with "Skip" and "I'd rather not say" (both keep the default). Each answer re-runs the engine (same seed) and morphs the river, with a one-line note of what changed. The note is neutral and never scolds: "Studying health: 41 more of your futures in control." / "Toronto rent: your river shifts down a little. That's what the habits are for."

| Question | Chips | What it changes |
|---|---|---|
| **What are you studying or working toward?** | Health · Trades · Engineering & computer science · Business & finance · Science & math · Social sciences, education & law · Arts, media & humanities · Not sure yet | Full-time starting salary, early-career wage growth, and the strength of the "AI changes my job" worry (table below) |
| **Where do you live?** | Toronto or Vancouver · Another big city · Smaller city or town | Spending multiplier ×1.15 / ×1.00 / ×0.90; default home price $850,000 / $550,000 / $400,000 |
| **Living situation?** | With family · Renting · Own place | With family: spending ×0.60 and default monthly saving ×1.5 until a move-out age (default 25, editable), then renting costs. Renting: no change. Own place: no change, home goal off |
| **Student debt?** | None · Some (~$15,000) · A lot (~$35,000) · Enter amount | Repaid over 10 years starting 6 months after school ends; payments come out of saving capacity. Default rate 3% real (illustrative; the federal part of Canada Student Loans is interest-free, provincial parts vary; verify) |
| **When do you finish school?** (students only) | This year · Next year · In 2–3 years · 4+ years | Sets the age full-time income starts, replacing the student default |

**Field groups.** Starting salaries are based on Statistics Canada Table 37-10-0284-01, *Characteristics and median employment income of postsecondary graduates two years after graduation, by educational qualification and field of study (STEM and BHASE groupings)* (https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3710028401): bachelor's graduates, class of 2022, median employment income two years after graduation, 2024 constant dollars, rounded. These figures were gathered from search summaries while the table was offline; **the team confirms each one against the table before the event** and records the source and `asOf` in `assumptions.ts`. Wage growth and the AI multipliers are labelled "illustrative, not a forecast".

| Field | Starting salary | Basis | Early-career wage growth to 30 | "AI changes my job" strength |
|---|---|---|---|---|
| Health | $82,000 | Health care, bachelor's ($82,100) | +3.0%/yr | ×0.6 |
| Trades | $49,000 | Estimate: college diploma median, all fields (~$48,900); no trades-specific figure checked | +3.5%/yr | ×0.5 |
| Engineering & computer science | $77,000 | Midpoint of engineering ($80,200) and math & computer science ($73,600) | +3.5%/yr | ×1.2 |
| Business & finance | $64,000 | Business & administration ($63,800) | +3.0%/yr | ×1.3 |
| Science & math | $47,000 | Science ($47,300) | +3.0%/yr | ×1.0 |
| Social sciences, education & law | $50,000 | Social & behavioural sciences ($50,100); education is higher ($65,400) | +2.5%/yr | ×1.0 |
| Arts, media & humanities | $40,000 | Arts & humanities ($40,000) | +2.5%/yr | ×1.3 |
| Not sure yet | $50,000 | Assumption, below the all-fields bachelor's median ($61,600) | +3.0%/yr | ×1.0 |

These are medians of employment income for graduates two years out, not offered starting salaries, and they cover a broad mix of programs within each group. The Assumptions panel says so.

"Strength" scales every part of the AI worry's moderate change (§4.7) toward or away from no change; ×1.0 is the moderate setting.

**Demo personas** (one tap each, all five chip questions pre-answered): "Maya, 20, arts student in Toronto, renting, some OSAP"; "Jordan, 23, first job in business, lives with family in Ottawa, not sure about a plan"; "Sam, 25, gig work in a smaller city, no workplace plan". At least one persona has no workplace plan, and the student persona leads the demo. **A second Maya** ("Priya, 20, health student in Halifax, lives with family, no debt") exists to show on stage that two students of the same age get different rivers and possibly a different top habit.

### 4.3 Three buckets

| Bucket | What it is | Real return | Rules |
|---|---|---|---|
| **Cushion** | Short-term savings | +0.5%/yr | Filled first up to the target months of spending. |
| **Flexible** | Long-term investing you can reach (TFSA, FHSA if a home goal is set) | Portfolio return | TFSA room = $7,000 × years since age 18, less used. FHSA $8,000/yr, $40,000 lifetime, only with a home goal. Overflow to a taxable pot with an extra 0.5%/yr drag. |
| **Workplace plan** | Group RRSP with employer match (only if the user has one) | Portfolio return | Employee % and employer match on salary. Room = 18% of income up to $33,810/yr. Can be raided in an emergency (§4.6). |

Routing of monthly saving: workplace plan percentage first (if any), then Cushion until full, then Flexible.

### 4.4 Constants and parameters

Every constant lives in `src/engine/assumptions.ts` with a `source` URL and `asOf` date and is rendered in the Assumptions panel. Starting values (2026; re-verify if the network is available, otherwise mark "as of 2026"):

- TFSA $7,000/yr. FHSA $8,000/yr, $40,000 lifetime. RRSP 18% of prior-year earned income, max $33,810.
- CPP maximum at 65: $1,507.65/month. YMPE $74,600. OAS (65–74): about $742/month.
- CPP estimate: `maxCPP × min(1, careerAverageIncome / YMPE) × min(1, yearsWorked / 39)`. OAS in full. Both labelled "simple estimates".

Model parameters, labelled **illustrative assumptions**, in three named sets. **Middle** is the default:

| Parameter | Cautious | Middle | Hopeful |
|---|---|---|---|
| Stocks real return | 4.0% | 5.0% | 6.0% |
| Stock volatility | 18% | 17% | 16% |
| Crash regime | 6%/yr, around −25% | 5%/yr, around −25% | 4%/yr, around −25% |
| Bonds real return / vol | 0.5% / 6% | 1.0% / 6% | 1.5% / 6% |
| Fees | 0.75% | 0.75% | 0.75% |

Normal years are re-centred so the long-run average matches the set's stock return. Mix: 80/20 until 40, gliding linearly to 40/60 at 65.

Shared across sets:

- Real wage growth: +3%/yr to 30, +1.5% to 40, +0.5% to 50, then flat; yearly noise ±2% (gig: ±12%).
- Job loss (not students, not gig): 5%/yr under 30, 3.5% after; spell median 4 months (lognormal, capped at 18). While out of work, income is 45% of previous pay, contributions stop, pay on return is 5% lower.
- Tax: piecewise effective rate for a single Ontario earner (about 12% at $30k, 18% at $50k, 23% at $75k, 27% at $100k, 32% at $150k, 36% at $200k), interpolated, labelled "approximate".
- Spending = take-home pay minus saving; spending rises by half of each raise.
- At 65: sustainable income = 4% of Flexible + 4% of Workplace (taxed at 15%) + CPP + OAS.

### 4.5 What counts as a good future

Milestones per path:

- **Shock-proof:** never raided the workplace plan and never ended a year short.
- **Room to move at 35 / 45:** Cushion + Flexible covers ≥ 6 months of spending at 35 and ≥ 12 months at 45.
- **Home** (only if set): down payment reached by the target age.
- **Work-optional by 65:** retirement income ≥ 70% of average spending in the last five working years. Also record the earliest age this becomes true.

Status: **In control** (all met), **Mostly there** (work-optional met, one other missed), **Tight** (work-optional missed by under 20 points), **Off track** (the rest).

**Headlines lead with the rescue, not the absolute count.** Primary: "Automating $25 a month rescues **214** of your futures." Secondary: "You're in control in 612 of 1,000." Counts only, never percentages.

### 4.6 Bad years

If spending exceeds income in a year: draw from Cushion, then Flexible, then raid the Workplace plan (30% lost to tax, room gone). Record each as an event ("Used the cushion", "Had to dip into retirement savings").

### 4.7 Worries (moderate setting only)

Shown after the first result as optional "What if…" chips. Each is an explicit, visible model change, phrased as "what if", never a prediction.

| Worry | Model change |
|---|---|
| "AI changes my job" | Job-loss chance ×2 before 45, spells ×1.5, wage growth −1 point for 10 years (gig: income dips ×2). Scaled by the field's strength (§4.2.1) |
| "A recession hits soon" | One forced −30% stock year in a random year of the next 3; job-loss chance ×2.5 for 2 years |
| "Everything keeps getting more expensive" | Spending rises an extra 1.5%/yr for 10 years |
| "I'll never afford a home" | Turns on the home goal; prices rise 1%/yr faster than wages |
| "The world gets rougher" | 3%/yr chance of a one-off cost of 2 months' spending; returns −0.5 point |
| "Government pensions won't be there for me" | CPP and OAS paid at 75% |

For each worry, against the same 1,000 paths: **affected** (status got worse), **recovered** (affected but back to at least "Mostly there" by 65), **best protection** (the lever that restores the most affected paths).

Card pattern: "If AI changes your job, **138** of your futures get harder. In **97** of those you're back on track later. **Building a cushion first protects 61 more.**" The protection appears on the same card as the worry, never on a later screen.

"Everything at once" sits behind a "See the toughest case" link: honest, offered, not forced.

### 4.8 Levers (habits)

Default levers work with **no employer**:

- **Automate a monthly amount** into Flexible: +$25, +$50, +$100 a month.
- **Build the cushion first** (re-routes existing saving; no extra cost).
- **Save part of every raise:** +1 point of income saved each time real pay rises 3%, capped at 15%.

Only when relevant:

- **Take the full employer match** (plan = Yes). Always described as "money your employer adds", with its yearly dollar value.
- **Ask HR one question** (plan = Not sure). Modelled as taking the match; shows the estimated yearly value they may be missing.

Information, not a choice:

- **Cost of waiting:** the same plan started 5 years later.

Run every lever alone against the current scenario. Rank as "Smallest step, biggest shift":

- Levers with **no extra cost** (cushion first, ask HR, take match when it needs no new saving) rank first, ordered by futures rescued, tagged "No extra cost".
- The rest rank by futures rescued per dollar of take-home pay given up per month.

Each row: cost per month in plain dollars, futures rescued, change in median work-optional age. Nothing is labelled "recommended".

### 4.9 Engine tests (write before the UI)

- Determinism: same inputs and seed → identical output.
- Common random numbers: path *i* market, job and shock draws are identical across levers, scenarios and assumption sets.
- Monotonicity: more saving never lowers the "In control" count (same seed).
- Limits: TFSA, FHSA and RRSP room never exceeded; balances never negative.
- Sanity: zero volatility and no shocks reproduces a hand-calculated compound-growth figure.
- `rescue()` returns exactly the paths whose status improved.
- **Personal detail matters:** Maya and Priya (§4.2.1) give different "In control" counts by at least 50, and each of the five chip questions changes the count for at least one persona.
- **Ranking stability:** for each persona, record whether the top-ranked lever is the same under Cautious, Middle and Hopeful. The test asserts it runs and writes the result to `docs/stability.json`; the Assumptions panel and pitch report what it found. **If the ranking changes, say so honestly. Do not tune parameters to force stability.**
- Performance: 1,000 paths × 6 variants in under 300 ms in the worker (generous bound in CI).
- Plausibility: no persona shows 0 or 1,000 "In control" in the base run, and every persona has at least one lever rescuing 50+ futures. If not, fix the model or thresholds; never fake the display.

---

## 5. The experience

Target: landing to the first rescue in under 45 seconds with a persona; under 2 minutes by hand including "Make it more you".

1. **Landing.** Tagline, one sentence, "Start (2 minutes)", the personas. No sign-up.
2. **Check-in.** "How do you feel about your financial future right now?" (1–10). Then **"What do you want room for?"** chips: Travel, Switching careers, A home, Time off, Helping family, Something else. Picking "A home" turns on the home goal; the rest personalise copy ("room to switch careers at 35").
3. **Basics.** The three questions. "Next" always works.
4. **Your futures.** The river (§6), the "In control" count, milestone markers, one line: "Same you, a thousand different runs of luck."
5. **Make it more you.** The river stays on screen (top half on phones) while the five chip questions (§4.2.1) appear one at a time below it. Each tap morphs the river and shows the one-line note. A "That's me" button ends the step at any point. Personas skip this screen with answers already filled, and a small "About you" summary lets anyone change an answer later.
6. **Smallest step, biggest shift.** Ranked levers. Toggling one morphs the river and **lights up the rescued lines** while the rest dim; the headline animates ("Rescues 214 of your futures"). A short "Short-term and long-term together" explainer shows the cushion and long-term savings filling side by side. Cost of waiting below.
7. **What if…** (optional, skippable). Worry chips; each selected worry gives a card in the §4.7 pattern with its protection. Tapping a card highlights the affected paths and then the protected ones.
8. **Pick one to try.** The user picks a lever. Show:
   - a plain two-line plan;
   - "Add a monthly reminder": an `.ics` with `RRULE:FREQ=MONTHLY` on their next payday or the 1st;
   - for Not sure / match: a copyable HR message ("Hi, does our savings plan have employer matching, and how do I enrol?");
   - a three-item "make it automatic" checklist.
   Then the same 1–10 confidence question and a **9:16 summary card** (what they want room for, futures rescued, confidence before → after) with "Save image" and native share where available.

### 5.1 The monthly check-in (the return loop)

The commitment, the date and the starting result are saved locally. On a return visit, open on the check-in:

- "Did you do it this month?" Yes / Not yet / Changed my mind.
- Yes → the habit is locked in to the base plan, the streak grows, and an optional one-field update ("About how much have you saved now?") re-runs the futures from where they are. Show "Since you started: 612 → 655 futures in control" with the river morphing between the two.
- Not yet → kind copy ("No problem. Want a smaller version?"), offering the next-smaller lever.
- A "Demo: jump ahead 3 months" button (visible only with `?demo=1`) simulates three Yes check-ins so judges can see the loop in seconds. Label it clearly as a demo.

### 5.2 Path inspector

Tapping or hovering any line in the river opens that path's life: a small sparkline, its status, and a timeline of events written in plain words ("24: laid off for 4 months, the cushion covered it. 31: switched careers. 44: markets fell 28%. 58: work became optional."). A **"Without the habit"** toggle shows the same life, with the same luck, without the chosen habit. This is where the per-path comparison becomes personal; make it good. Keyboard: arrow keys step through representative paths (best, median, worst, and a few between). A "Show me another" button picks a random path in seeded order, so the mix of lives shown matches the real counts (no cherry-picking).

### 5.3 Assumptions panel

Reachable from every screen. Every constant and parameter with its source and date; the Cautious / Middle / Hopeful switch (re-runs everything); the ranking-stability result from §4.9; the life-stage defaults; the field, city, living-situation and debt tables from §4.2.1; and three honest limitations (§12).

### 5.4 User-test mode (for the team, off by default)

With `?test=1`, each completed session appends an anonymous record to `localStorage`: life stage, field group, confidence before and after, lever chosen, whether "Add a monthly reminder" was tapped, whether the HR message was copied. An "Export results (CSV)" button downloads them. No names or free text.

---

## 6. The river

- X: age, now to 70. Y: total savings in today's dollars, square-root scale.
- 1,000 thin low-opacity lines coloured by final status: deep teal (In control), soft green (Mostly there), warm sand (Tight), slate grey (Off track). **No red.** "Off track" lines draw beneath the others and dimmer. Status also appears in legend counts and line style on hover, never colour alone.
- Bold median line, shaded middle-50% band, milestone markers at 35, 45, 65.
- Lines draw in left to right over about 1.5 s on first view.
- **Rescue highlight:** on a lever toggle, each line morphs from old to new shape over about 600 ms (same path index), then rescued paths brighten and pulse once while the others fade to 30%. This is the signature moment; make it smooth on a projector. With reduced motion, cross-fade and outline the rescued lines instead.
- Device pixel ratio, resize and offscreen rendering handled for 60 fps.
- A visually hidden text summary updates on every change ("Automating $25 a month rescues 214 futures: 150 move to In control, 64 to Mostly there").

---

## 7. Voice and design

- Calm, warm, direct; about grade-8 reading level; Canadian spelling; tap-to-explain for any jargon.
- Talk about options and control: "room to move", "work becomes optional", "you decide", "rescued futures". Avoid "retirement" as a headline goal.
- Never use: "behind", "should have", "too late", "at risk", "danger", "doom", "recommended".
- Counts, not percentages.
- Typography-led, generous spacing, one accent colour, dark and light themes. Must not look like a bank calculator or a dashboard. The chip questions should feel like a quick conversation, not a form.
- Every changing number animates briefly so cause and effect are visible.

---

## 8. Sponsor touches

- Employer match always called "money your employer adds", with its yearly dollar value.
- "Not sure" → "Ask HR one question" ranks first among no-extra-cost levers, with the estimated value.
- The short-term + long-term explainer on the levers screen.
- Pitch framing for Canada Life: the check-in loop is exactly the "approachable steps, repeated" their research calls for, and it works for people before they ever have a group plan, which is the pipeline of their future members.

---

## 9. Build order and cut lines

**P0 (the demo works with only this):**
1. Types + fixture, engine with tests (§4.1–4.6, 4.8, 4.9).
2. Three-question fast start with life-stage defaults and personas.
3. River with morph and rescue highlight.
4. "Make it more you" chip questions with live morph (§4.2.1).
5. Levers screen with ranking.
6. Pick-one screen with monthly `.ics`, HR message, checklist.
7. Monthly check-in with the demo jump.

**P1 (the differentiators):**
8. Path inspector with the "Without the habit" toggle.
9. Worries with protection cards.
10. Confidence before/after, 9:16 summary card, user-test mode.
11. Assumptions panel with the three-set switch.

**P2 (only when P0 and P1 are polished):**
12. Gemini path stories (§10).
13. PWA install polish.

**Cut entirely:** any scrolling feed of futures, employer cohort page, mild/severe worry settings, free-text "ask about my futures" box.

**Schedule:** P0 done by the halfway mark. Feature freeze 8 hours before judging. After freeze: bugs, the user test (§11), demo rehearsal, backup video. After each priority level, run the tests and a manual pass at 375 px and 1920 px. A flawless P0+P1 beats a rough P2.

---

## 10. Gemini (P2, words only)

Uses, all through `/api/narrate`:

1. **Path stories:** turn a path's event list into a 2–3 sentence life story for the inspector.
2. **Worry cards:** rephrase the computed answer more warmly and specifically.

Rules:

- Send a compact JSON of facts (numbers, events, counts). No names, no identifiers, no free text from the user.
- System instruction forbids advice, product names, and any number not in the facts.
- **Validate every response:** extract all numbers; if any is not in the facts, discard and use the template. Also discard on timeout or error.
- Templates must be good on their own; the demo must convince with AI off.
- Visible "AI narration" toggle, off by default, with one line on what is sent. In the demo, the presenter turns it on on stage and points at the validation (show one discarded response in a dev overlay with `?debug=1`).

---

## 11. Evidence: the user test (team task during the event)

Before freeze, run the full flow with 8–10 attendees in `?test=1`. Export the CSV. In the pitch, report honestly with the sample size, for example "n=9: confidence 4.1 → 6.3 on average; 7 of 9 set a monthly reminder." The logged action (reminder or HR message) matters more than the slider. If results are weak, report them anyway and say what you'd change.

---

## 12. Risks and built-in answers

| Risk | Answer |
|---|---|
| "This is a retirement calculator" | Rescue highlight as the hero; per-path counterfactual ("without the habit") in the inspector; return loop |
| "It feels generic" | "Make it more you" chips that morph the river live; Maya vs Priya on stage |
| "Isn't this just another app fighting for screen time?" | No feed, no infinite scroll; 30 seconds a month after the first visit |
| A finance judge challenges the numbers | Three assumption sets, ranking-stability result, sources and dates, labelled illustrative parameters, tests, stated limitations |
| Doesn't work for students / gig workers | Life-stage defaults; no-employer levers by default; student persona leads the demo |
| It reads as financial advice | User picks, nothing "recommended", no products, disclaimer |
| The result is depressing | Opens on what they want room for; worries always paired with protection; off-track lines dimmed |
| One-shot tool | Monthly reminder + check-in + streak + progress morph |
| Confidence number isn't credible | Real attendees, sample size stated, actions logged |
| AI invents a number | Engine-only numbers, validation, templates |
| Wi-Fi fails | Offline core, PWA cache, local assets, personas |
| Demo varies between runs | Fixed seed; "new luck" button exists but isn't default |
| Scope overrun | §9 cut lines, freeze, pair split |

**Honest limitations (README, Assumptions panel):** (1) parameters are illustrative, not forecasts; (2) taxes, CPP and OAS are simplified; (3) one set of life events can't cover everyone (no partners, children, inheritances, or provinces other than Ontario for tax), and field-of-study effects are broad averages, not a prediction for any one person.

---

## 13. Deliverables

- The working app with `npm run dev`, `npm test`, `npm run build`.
- `README.md`: what it is, how to run, architecture, the full assumptions table with sources and dates, the stability result, and the limitations.
- `docs/PITCH.md`:
  - **2-minute demo script:**
    1. The sponsor's finding: dread leads to doomscrolling and fewer automatic contributions. "We didn't build another feed. It's 30 seconds a month." (15 s)
    2. Maya, 20, arts student in Toronto: tap persona, "room to travel and switch careers", her river (15 s).
    3. Switch to Priya, same age, health student in Halifax living with family: the river morphs. "Same age, same savings, different futures." (15 s)
    4. Back to Maya. Toggle "automate $25 a month": 200+ futures light up as rescued (25 s).
    5. "What if AI changes my job?": sized for her field, with its protection on the same card (20 s).
    6. Tap one line, read that life, flip "without the habit" (10 s).
    7. Pick it, add the monthly reminder, demo-jump three months: "612 → 655" (15 s).
    8. Real user-test result and what's next (5 s).
  - A map from each judging criterion and each line of the Canada Life brief to the feature that answers it.
  - Prepared answers: "Where do your return assumptions come from?", "What if I change the assumptions?" (point to the stability result), "Isn't this financial advice?", "What if it tells someone they're doomed?", "Why would Gen Z open this twice?", "How is this different from a retirement calculator?", "What about people without a workplace plan?", "Where do the field-of-study numbers come from?", "Isn't this just another app fighting for screen time?", "What does the AI do?".
  - Theme tie-in: the unknown future, made explorable, one month at a time.
- `docs/DEVPOST.md`: draft submission (inspiration, what it does, how we built it, including tools used, challenges, what we learned, what's next).

---

## 14. Done means

- [ ] All engine tests pass; the three personas give plausible, different results, each with a lever rescuing 50+ futures.
- [ ] Landing to first rescue under 45 s with a persona, under 2 minutes by hand including "Make it more you".
- [ ] Every chip answer morphs the river with a neutral one-line note; Maya and Priya look visibly different.
- [ ] Toggling any lever morphs the river and lights up the rescued lines without a visible stall.
- [ ] Every worry gives a sized answer with its protection on the same card.
- [ ] The inspector's "Without the habit" toggle shows the same life with the same luck.
- [ ] The monthly check-in works, including the demo jump.
- [ ] Whole flow works offline with no API key.
- [ ] Keyboard-only run-through works; reduced motion works; projector-legible.
- [ ] No red, no shaming copy, no product names, no "recommended", no percentages in headlines.
- [ ] Assumptions panel lists every constant with a source, the three sets, and the stability result.
- [ ] README, PITCH and DEVPOST are written.
- [ ] User test run and results recorded.

When finished, report what was built, what was cut and why, test results (including the stability result), and what the team must do by hand: verify the research figures against the Canada Life report, check the field-of-study salaries against Statistics Canada and the student-loan interest rules, check the Gemini model name, run the user test, record a backup demo video, check the event's AI-disclosure rules.
