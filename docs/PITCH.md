# Clotho: pitch notes

## Two-minute demo script

Numbers below are what the app shows with the default seed and the Middle return setting. Open the app at `/?demo=1`. If you change a model setting, read the new numbers off the screen.

**0:00 The problem (15 s)**
"Canada Life found that dread about the future leads to doomscrolling, and every extra hour of scrolling goes with fewer people setting up automatic savings. We didn't build another feed. It's two minutes once, then thirty seconds a month."

**0:15 Maya, and her worry (15 s)**
Tap **Maya, 20**. "Maya is an arts student in Toronto, renting, with some student debt. We ask what worries her before anything else." Tap **AI changes my job**, then **Show my thousand futures**.

**0:30 Today, and what's within reach (20 s)**
"Every line is one version of her life: same choices, different luck. **378 of 1,000** are in control today, and **794 are within reach with one habit**." Point at the worry card: "Her worry, sized: if AI changes her job, **924** of her futures get harder, and saving part of every raise protects **802** of them." Drag the dial from $40 to $150 a month: "**378 → 676**. Same luck, her choice." Tap **Back to $40**.

Don't tap **Show** on the AI card on stage: for Maya it puts the headline at 0 in control.

**0:50 Play one life (10 s)**
Tap **▶ Play one of your lives**. Let one life draw across the river with its events popping up. "This is the unknown, made explorable."

**1:00 One habit, the rescue (20 s)**
"What helps most?". Tap the **?** on **Save part of every raise**: "Each raise sends 1% more to savings, so it never feels like a cut." Switch on **Automate $25 a month**: "Twenty-five dollars a month rescues **73**, lit up, same luck." Switch it off and switch on **Save part of every raise**: "**+465** futures rescued, **378 → 794**, and it costs nothing today." Tap one lit line, flip **Without the habit**: "Same life, same luck, without the habit."

**1:20 Pick one, and come back (15 s)**
"Pick one to try". Pick the habit, "Add a monthly reminder", move confidence up, "See my summary". Reload, tap **Check in**, then **Demo: jump ahead 3 months**: "She started at **378**. Keeping it up points to **795**, and she's kept it 3 months in a row."

**1:35 Proof and what's next (15 s)**
"We tested with **[n]** Gen Z [students]. Confidence went from **[x]** to **[y]** out of 10, and **[z] of [n]** set a reminder." (Fill in from the `?test=1` CSV.) "Next: a pilot inside a group plan."

**Optional, if there's time (10 s):** on Your futures, **Switch to Priya**: same age, health student in Halifax, living with family: **869**.

**Backup:** if anything misbehaves, reload; inputs are kept. Have the recorded demo video ready.

## Judging criteria → features

| Criterion | What answers it |
|---|---|
| Innovation & Creativity | The headline is the futures a habit rescues, lit up in the river, with the same life shown with and without it. Worries are sized and shown next to their protection. A monthly check-in turns a one-off visit into a habit loop. |
| Technical Complexity | A seeded Monte Carlo engine with common random numbers, three savings buckets, Canadian account limits, job loss, market regimes and emergency withdrawals; runs in a Web Worker at about 10 ms per 1,000 paths; Canvas river with per-path morphing; a narration layer that rejects any number the engine did not compute; a test suite covering determinism, monotonicity, limits and a hand-calculated check. |
| Completeness | The flow end to end plus the monthly check-in, four personas, monthly calendar file, HR message, 9:16 summary card, assumptions panel with three return settings, user-test mode with CSV export, dark and light themes. Works offline with no key. |
| Design | Typography-led, one accent colour, no red, counts instead of percentages, motion tied to cause and effect, usable at 375 px and on a projector, keyboard and reduced-motion support. |

## The Canada Life brief → features

| Line in the brief | Feature |
|---|---|
| "struggling to engage with long-term financial planning due to uncertainty about the world ahead" | The first question after confidence is "What worries you most?". The first result answers it: each worry is sized on a card, next to the habit that protects the most. |
| "helps Gen Z take meaningful action" | One step, a monthly reminder, a message ready for HR, and a monthly check-in that shows progress. |
| "motivation" | The first headline: "378 in control today, 794 within reach with one habit". Then "+465 futures rescued", and at the check-in "You started at 378. Keeping it up points to 795", with a streak. |
| "visualization" | The river: 1,000 lives, a middle line, milestones at 35, 45 and 65. |
| "behavioral nudges" | The three behaviours the research measured: joining the plan, taking the match, automatic contributions. One step only; "make it automatic" checklist. |
| "education" | A "?" on every habit (what a TFSA is, how matching works), a plain sentence under every result number, the short-term and long-term explainer, the Assumptions panel. |
| "turns uncertainty into confidence" | Confidence is asked before and after, and shown side by side. |
| "the future is still worth planning for" | Even in "everything at once", a small habit moves hundreds of futures. |
| Research: fear-based messaging backfires | No red, no alarms, no shaming words. The worst case is offered, never forced. |
| Research: flexibility and control beat a distant retirement date | Milestones are shock-proof, room to move at 35 and 45, and "work becomes optional". |
| Research: short-term and long-term saving together | Cushion and workplace plan fill side by side; raiding retirement savings in a bad year is modelled and the cushion habit addresses it. |

## Hard questions

**Where do your return assumptions come from?**
They are labelled illustrative, and they are conservative: 5% real for stocks with 17% volatility and a crash regime, 1% real for bonds, 0.75% fees, a glide path from 80/20 to 40/60. They sit in the range of the FP Canada projection guidelines. Every one is in the Assumptions panel with its source and date, and the published limits (TFSA, FHSA, RRSP, CPP, OAS) link to government pages. Change a number in one file and the whole tool follows.

**Isn't this financial advice?**
No. It never names a product, fund or provider, and it never says what to buy. It shows scenarios and trade-offs for habits: join the plan, take the match, automate. The disclaimer is in the footer and in the Assumptions panel.

**What if it tells someone they're doomed?**
It can't say that. The first number is always today's, shown with what one habit puts within reach. Worries open as cards and only change the headline if you tap Show. The headline is a count of futures in control, the palette has no red, and the ranked habits always show the smallest step that helps. When the picture is hard, the screen answers with what moves it. The hard case ("everything at once") is there if you ask for it.

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
