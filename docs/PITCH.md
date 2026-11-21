# Clotho: pitch notes

## Two-minute demo script

Numbers below are what the app shows with the default seed and the Middle return setting. Open the app at `/?demo=1`. If you change a model setting, read the new numbers off the screen.

**0:00 The problem (15 s)**
"Canada Life found that dread about the future leads to doomscrolling, and every extra hour of scrolling goes with fewer people setting up automatic savings. We didn't build another feed. It's two minutes once, then thirty seconds a month."

**0:15 Maya, and the dial (20 s)**
Tap **Maya, 20**. "Maya is an arts student in Toronto, renting, with some student debt. Every line is one version of her life, same choices, different luck. She's in control in **599 of 1,000**." Drag the dial from $40 to $150 a month: "**599 → 907**. Same luck, her choice." Tap **Back to $40**.

**0:35 Play one life (10 s)**
Tap **▶ Play one of your lives**. Let one life draw across the river with its events popping up. "This is the unknown, made explorable."

**0:45 One habit, the rescue (20 s)**
"What helps most?". Switch on **Automate $25 a month**. "Twenty-five dollars a month. Watch which of her futures it rescues: **114**, lit up, same luck." Then switch it off and switch on **Save part of every raise**: "**363** rescued, and it costs nothing today." Tap one lit line, flip **Without the habit**: "Same life, same luck, without the habit."

**1:05 Same age, different futures (optional, 10 s)**
Back on the futures screen, **Switch to Priya**: same age, health student in Halifax, living with family: **938**.

**1:15 A worry, with its protection (15 s)**
"What if…", tap **AI changes my job**. "Her field gets a stronger what-if. It's sized, and the protection is on the same card: she stays in control in **127** instead of **599**, and saving part of every raise brings that back up to **462**."

**1:30 Pick one, and come back (15 s)**
"Pick one to try". Pick the habit, "Add a monthly reminder", move confidence up, "See my summary". Reload, tap **Check in**, then **Demo: jump ahead 3 months**: "She started at **599**. Keeping it up points to **924**, and she's kept it 3 months in a row."

**1:45 Proof and what's next (15 s)**
Read the user-test result (n and the share who set a reminder). "Next: a pilot inside a group plan."

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
| "struggling to engage with long-term financial planning due to uncertainty about the world ahead" | The check-in asks what you want room for; the "What if" screen tests the worries, each next to what protects against it. |
| "helps Gen Z take meaningful action" | One step, a monthly reminder, a message ready for HR, and a monthly check-in that shows progress. |
| "motivation" | "Rescues 363 of your futures", and at the check-in "You started at 599. Keeping it up points to 924", with a streak. |
| "visualization" | The river: 1,000 lives, a middle line, milestones at 35, 45 and 65. |
| "behavioral nudges" | The three behaviours the research measured: joining the plan, taking the match, automatic contributions. One step only; "make it automatic" checklist. |
| "education" | Tap-to-explain terms, the short-term and long-term explainer, the Assumptions panel. |
| "turns uncertainty into confidence" | Confidence is asked before and after, and shown side by side. |
| "the future is still worth planning for" | Even in "everything at once", a small habit moves hundreds of futures. |
| Research: fear-based messaging backfires | No red, no alarms, no shaming words. The worst case is offered, never forced. |
| Research: flexibility and control beat a distant retirement date | Milestones are shock-proof, room to move at 35 and 45, and "work becomes optional". |
| Research: short-term and long-term saving together | Cushion and workplace plan fill side by side; raiding retirement savings in a bad year is modelled and the cushion habit addresses it. |

## Hard questions

**Where does the headline number come from?**
Tap **Why 599?** under the play button. Each future gets four checks (bad years, 6 months saved by 35, a year by 45, work optional by 65); in control means all four. For Maya, 401 miss at least one: 334 because work isn't optional by 65, 102 on the 35 check, 91 on a bad year, 19 on the 45 check. It is counted from the same 1,000 lives on screen, not a score.

**Where do your return assumptions come from?**
They are labelled illustrative, and they are conservative: 5% real for stocks with 17% volatility and a crash regime, 1% real for bonds, 0.75% fees, a glide path from 80/20 to 40/60. They sit in the range of the FP Canada projection guidelines. Every one is in the Assumptions panel with its source and date, and the published limits (TFSA, FHSA, RRSP, CPP, OAS) link to government pages. Change a number in one file and the whole tool follows.

**Isn't this financial advice?**
No. It never names a product, fund or provider, and it never says what to buy. It shows scenarios and trade-offs for habits: join the plan, take the match, automate. The disclaimer is in the footer and in the Assumptions panel.

**What if it tells someone they're doomed?**
It can't say that. The headline is a count of futures in control, the palette has no red, and the ranked habits always show the smallest step that helps. When the picture is hard, the screen answers with what moves it. The hard case ("everything at once") is there if you ask for it.

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
