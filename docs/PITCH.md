# Clotho: pitch notes

## Two-minute demo script

Numbers below are what the app shows with the default seed and the Middle return setting. Open the app at `/?demo=1`. If you change a model setting, read the new numbers off the screen.

**0:00 The problem (15 s)**
"Canada Life found that dread about the future leads to doomscrolling, and every extra hour of scrolling goes with fewer people setting up automatic savings. We didn't build another feed. It's two minutes once, then thirty seconds a month."

**0:15 Maya, and her worry (15 s)**
Tap **Maya, 20**. "Maya is an arts student in Toronto, renting, with some student debt. We ask what worries her before anything else." Tap **AI changes my job**, then **Show my thousand futures**.

**0:30 Today, and what's within reach (20 s)**
"Every line is one version of her life: same choices, different luck. **599 of 1,000** are in control today, and **921 are within reach with one habit**." Point at the worry card: "Her worry, sized: if AI changes her job, she stays in control in **83** of her futures instead of **599**, and saving part of every raise brings that back up to **409**." Drag the dial from $40 to $150 a month: "**599 → 907**. Same luck, her choice." Tap **Back to $40**.

Tapping **Show** on the AI card puts that worry on the river and the headline at **83**; leave it for questions. **Why 599?** under the play button shows the working if a judge asks.

**0:50 Play one life (10 s)**
Tap **▶ Play one of your lives**. Let one life draw across the river with its events popping up. "This is the unknown, made explorable."

**1:00 One habit, the rescue (20 s)**
"What helps most?". Tap the **?** on **Save part of every raise**: "Each raise sends 1% more to savings, so it never feels like a cut." Switch on **Automate $25 a month**: "Twenty-five dollars a month rescues **114**, lit up, same luck." Switch it off and switch on **Save part of every raise**: "**+363** futures rescued, **599 → 921**, and it costs nothing today." Tap one lit line, flip **Without the habit**: "Same life, same luck, without the habit."

**1:20 Pick one, and come back (15 s)**
"Pick one to try". Pick **Save part of every raise**, show the **Do it now** steps, tap **I added the reminder**, move confidence up, "See my summary". Reload, tap **Check in**, then **Demo: jump ahead 3 months**: "She started at **599**. Keeping it up points to **924**, and she's kept it 3 months in a row."

**1:35 Proof and what's next (15 s)**
"We tested with **[n]** Gen Z [students]. Confidence went from **[x]** to **[y]** out of 10, and **[z] of [n]** took the step before leaving." (Fill in from the `?test=1` CSV.) "Next: a pilot inside a group plan."

**Optional, if there's time (10 s):** on Your futures, **Switch to Priya**: same age, health student in Halifax, living with family: **938**.

**Backup:** if anything misbehaves, reload; inputs are kept. Have the recorded demo video ready.

## Judging criteria → features

| Criterion | What answers it |
|---|---|
| Innovation & Creativity | The headline is the futures a habit rescues, lit up in the river, with the same life shown with and without it. Worries are sized and shown next to their protection. A monthly check-in turns a one-off visit into a habit loop. |
| Technical Complexity | A seeded Monte Carlo engine with common random numbers, three savings buckets, Canadian account limits, job loss, market regimes and emergency withdrawals; runs in a Web Worker at about 20 ms per 1,000 paths; Canvas river with per-path morphing; a narration layer that rejects any number the engine did not compute; a test suite covering determinism, monotonicity, limits and a hand-calculated check. |
| Completeness | The flow end to end plus the monthly check-in, four personas, monthly calendar file, HR message, 9:16 summary card, assumptions panel with three return settings, user-test mode with CSV export, dark and light themes. Works offline with no key. |
| Design | Typography-led, one accent colour, no red, counts instead of percentages, motion tied to cause and effect, usable at 375 px and on a projector, keyboard and reduced-motion support. |

## The Canada Life brief → features

| Line in the brief | Feature |
|---|---|
| "struggling to engage with long-term financial planning due to uncertainty about the world ahead" | The first question after confidence is "What worries you most?". The first result answers it: each worry is sized on a card, next to the habit that protects the most. |
| "helps Gen Z take meaningful action" | One step, a monthly reminder, a message ready for HR, and a monthly check-in that shows progress. |
| "motivation" | The first headline: "599 in control today, 921 within reach with one habit". Then "+363 futures rescued", and at the check-in "You started at 599. Keeping it up points to 924", with a streak. |
| "visualization" | The river: 1,000 lives, a middle line, milestones at 35, 45 and 65. |
| "behavioral nudges" | The three behaviours the research measured: joining the plan, taking the match, automatic contributions. One step only, with its exact steps under **Do it now** and "Did you do it?". |
| "education" | A "?" on every habit (what a TFSA is, how matching works), a plain sentence under every result number, the short-term and long-term explainer, the Assumptions panel. |
| "turns uncertainty into confidence" | Confidence is asked before and after, and shown side by side. |
| "the future is still worth planning for" | A worry is never the end of the story: with AI changing her job, Maya stays in control in 83 futures, and one habit brings that back to 409. The all-at-once case stays hard for low savers, and we show it rather than hide it. |
| Research: fear-based messaging backfires | No red, no alarms, no shaming words. The worst case is offered, never forced. |
| Research: flexibility and control beat a distant retirement date | Milestones are "got through bad years", room to move at 35 and 45, and "work becomes optional". |
| Research: short-term and long-term saving together | Cushion and workplace plan fill side by side; raiding retirement savings in a bad year is modelled and the cushion habit addresses it. **Keep yours reachable?** tests Canada Life's own design: your contributions within reach, the match kept for retirement. |

## Canada Life's message checklist → Clotho

Canada Life's *Gen Z workplace savings communications guide* (Gen Z Workplace Savings Toolkit, August 2026) ends with a 10-item checklist that employers should run every Gen Z savings message through. We ran Clotho through it.

| Their checklist item | Where Clotho does it |
|---|---|
| Acknowledge uncertainty in a realistic, authentic way. | The first question is "What worries you most?", and that worry is tested on the same 1,000 lives, not waved away. |
| Avoid fear-based, apocalyptic or manipulative language. | A count ("599 of 1,000"), never a warning. No red, no alarms. The worst case is there if you ask, never forced. |
| Frame saving as control, flexibility or resilience. | Checks at 35 and 45, not only 65, and "What if there's no 65?" shows what is yours to use at 35, 40 or 50. |
| Connect to an immediate moment or decision. | **Yes.** The student who finishes this year, the first full-time job, a home or goal they named, and the monthly check-in, which asks "Got a raise or bonus since last time?". A raise offers to save part of it (and of every raise after), with the futures it rescues; a bonus asks how much to put aside and adds it once. |
| Give one clear next step. | "Pick one to try" ends on a single "Do it now" step. |
| Make the action feel small enough to start now. | Automate $25 a month; saving part of every raise costs nothing today. |
| Explain the benefit in plain language. | "+363 futures rescued", with a plain sentence under every number and a "?" on every habit. |
| Avoid judgment about choices or priorities. | "Not yet" at the check-in gets "No problem. Life gets busy." and a smaller version, not guilt. |
| Use trusted channels; make reliable information easy to find. | **Partly.** Every assumption in one panel with its source. The trusted channel is the workplace plan itself, which is the pilot we want. |
| Support action, not just awareness. | A monthly reminder, a ready message for HR, and a check-in that tracks whether they did it. |

Why it matters: Canada Life's 2024 claims data shows Gen Z withdrawing from RRSPs 12% more than Gen Y and 42% more than Gen X at the same age. Starting to save is half the problem; keeping it invested is the other half. Clotho models an emergency withdrawal from the workplace plan (30% lost to tax, the room gone) and the cushion habit is there to make it less likely.

## Hard questions

**Where does the headline number come from?**
Tap **Why 599?** under the play button. Each future gets four checks (bad years, 6 months saved by 35, a year by 45, work optional by 65); in control means all four. For Maya, 401 miss at least one: 334 because work isn't optional by 65, 102 on the 35 check, 91 on a bad year, 19 on the 45 check. It is counted from the same 1,000 lives on screen, not a score.

**What if someone saves nothing?**
Drag the dial to $0: Maya is in control in **0** of 1,000. Keeping part of a raise takes a saving habit, so someone setting nothing aside spends every raise. Automating $25 a month takes her to about **500**. That jump is an assumption and we say so: the usual share of a raise (15% to 25% by city) is reached once regular saving is 2% of take-home pay, and it is listed in the Assumptions panel as one the results are very sensitive to.

**How does this fit what Canada Life is already doing?**
In October 2026 Canada Life announced plan options where your own contributions can go to shorter-term savings while the employer match stays set aside for retirement. Its claims data shows Gen Z withdrawing from RRSPs 12% more often than millennials and 42% more often than Gen X at the same age. Open **Keep yours reachable?** on What helps most for **Jordan** with the AI worry: in control in **714** futures instead of **694**, **29** dip into retirement savings instead of **60**, and the trade is about **$573,000** at 65 after tax instead of **$610,000**. With no worry on, Jordan's count goes the other way (971 to 954) and the card says so: it is a trade, not a free win.

**Where do your return assumptions come from?**
They are labelled illustrative, and they are conservative: 5% real for stocks with 17% volatility and a crash regime, 1% real for bonds, 0.75% fees, a glide path from 80/20 to 40/60. They sit in the range of the FP Canada projection guidelines. Every one is in the Assumptions panel with its source and date, and the published limits (TFSA, FHSA, RRSP, CPP, OAS) link to government pages. Change a number in one file and the whole tool follows.

**Isn't this financial advice?**
No. It recommends no product, fund or provider, and it never says what to buy. The one company named is Canada Life, in a note telling people whose plan is already there where to find it. It shows scenarios and trade-offs for habits: join the plan, take the match, automate. The disclaimer is in the footer and in the Assumptions panel.

**What if it tells someone they're doomed?**
It can't say that. The first number is always today's, shown with what one habit puts within reach. Worries open as cards and only change the headline if you tap Show. The ranked habits always show the step that rescues the most. When the picture is hard, the screen answers with what moves it. The hard case ("everything at once") is there if you ask for it.

**Why would Gen Z open this twice?**
The monthly reminder brings them back to a 30-second check-in: "Did you do it?", a streak, and the river moving from where they started. "Not yet" offers a smaller version instead of guilt. Inside a workplace plan, onboarding, raise season and enrolment windows are natural moments too.

**What if I change the assumptions?**
Open Assumptions and switch between Cautious, Middle and Hopeful. The counts move; the top-ranked habit does not, for any of the four personas. A test records that (`src/engine/stability.json`), and we would show it honestly if it changed.

**What about people without a workplace plan?**
The default habits need no employer: automate a monthly amount, build a cushion, save part of every raise. The employer match only appears when someone has a plan or isn't sure.

**Where do the field-of-study numbers come from?**
Statistics Canada Table 37-10-0284-01: median employment income two years after graduation, bachelor's graduates, class of 2022. They are medians across many programs, not salary offers. Growth by field and the AI multipliers are labelled illustrative.

**Isn't this just another app fighting for screen time?**
No feed and no infinite scroll. Two minutes the first time, then 30 seconds a month.

**How is this different from a retirement calculator?**
A calculator gives one number for one future at 65. This gives a thousand futures, measures flexibility at 35 and 45 as well as 65, tests the person's own fears against them, and ends with one action rather than a number.

**What does the AI do?**
Words only. Gemini turns a path's events into a short story and rephrases a worry's answer. It never produces a number: every reply is checked, and if it contains a number the engine did not compute, it is thrown away and the built-in wording is shown. It is off by default and the demo works without it.

**Are the research figures right?**
We quote the Canada Life and Deloitte findings as reported in trade press. Verify each figure against the full report before saying it on stage.

## Theme tie-in: discover the unknown

The future is the unknown everyone has and nobody can visit. Clotho makes it explorable: a thousand versions of it, each one readable, each one moved by a choice made today. Named for the Fate who spins the thread of life.
