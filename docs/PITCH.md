# Clotho: pitch notes

## Two-minute demo script

Numbers below are what the app shows for Maya with the default seed. Rehearse with the app open; if you change a model setting, read the new numbers off the screen.

**0:00 The problem, in the sponsor's words (15 s)**
"Canada Life's own research says young workers feel so much dread about the future that they stop planning for it, and that scaring them makes it worse. So we built something that doesn't predict the future and doesn't scare anyone. You can't predict the future. You can stack the odds."

**0:15 Maya's river (20 s)**
Tap **Maya, 22**. Leave confidence where it is, tap "AI changes my job", Next, Next.
"This is Maya: first job, fifty-two thousand, nothing saved, employer match unclaimed. Every line is one version of her life, same choices, different luck with jobs and markets. She stays in control in **705 of her 1,000 futures**." Tap one line. "Each one is a life you can read: out of work at 27, cushion carried it, work optional at 63."

**0:35 Her worry, sized (25 s)**
Next. "Maya is worried AI changes her job. We don't argue with that. We size it. If it happens, **621** of her thousand futures get harder. In **288** of those, work still becomes optional. And one habit lifts **570** of them back up." Tap "Show in the river" and let the affected lines light up.

**1:00 One lever, the river moves (25 s)**
Clear the worry. Next. "Here is what she controls, ranked by how much it moves per dollar." Switch on **Take the full employer match**. "Fifty-seven dollars a paycheque, and her employer adds two thousand and eighty a year. Watch: same thousand lives, same luck, **705 becomes 803**, and work becomes optional six years sooner." Add **+$50 a paycheque**: "880."

**1:25 Her one step, and confidence (20 s)**
Next. "She doesn't get a list. She picks one step, gets a two-line plan, a calendar reminder for payday, and the exact message to send HR." Move the confidence slider up, "See my summary". "Confidence before and after, futures before and after. That's uncertainty into confidence, with a number."

**1:45 What's next (15 s)**
"Everything ran in the browser, offline, with a fixed seed. Every assumption is one tap away with its source. Next: a pilot inside a real group plan, where the sponsor sees only totals: who found their match, and what people are worried about." Open `#/employer` if there is time.

**Backup:** if anything misbehaves, reload; inputs are kept. Have the recorded demo video ready.

## Judging criteria → features

| Criterion | What answers it |
|---|---|
| Innovation & Creativity | Worries are sized, not dismissed: each fear is run against the same 1,000 lives and comes back as a count plus the habit that protects most. The river morphs path by path because every path keeps its luck across variants. |
| Technical Complexity | A seeded Monte Carlo engine with common random numbers, three savings buckets, Canadian account limits, job loss, market regimes and emergency withdrawals; runs in a Web Worker at about 10 ms per 1,000 paths; Canvas river with per-path morphing; a narration layer that rejects any number the engine did not compute; a test suite covering determinism, monotonicity, limits and a hand-calculated check. |
| Completeness | Seven screens end to end, three personas, calendar file, HR message, summary image, assumptions panel, employer page, dark and light themes. Works offline with no key. |
| Design | Typography-led, one accent colour, no red, counts instead of percentages, motion tied to cause and effect, usable at 375 px and on a projector, keyboard and reduced-motion support. |

## The Canada Life brief → features

| Line in the brief | Feature |
|---|---|
| "struggling to engage with long-term financial planning due to uncertainty about the world ahead" | The check-in asks what is on your mind first; the worries screen tests exactly those things. |
| "helps Gen Z take meaningful action" | The last screen is one step, with a reminder for the next payday and a message ready to send to HR. |
| "motivation" | "705 → 803": the effect of one habit on your own futures, shown as it happens. |
| "visualization" | The river: 1,000 lives, a middle line, milestones at 35, 45 and 65. |
| "behavioral nudges" | The three behaviours the research measured: joining the plan, taking the match, automatic contributions. One step only; "make it automatic" checklist. |
| "education" | Tap-to-explain terms, the short-term and long-term explainer, the Assumptions panel. |
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
It can't say that. The headline is a count of futures in control, the palette has no red, and the ranked habits always show the smallest step that helps. When the picture is hard, the screen answers with what moves it. The hard case ("everything at once") is there if you ask for it.

**Why would Gen Z open this twice?**
Because the inputs change: a raise, a new job, a new worry in the news. The second visit takes ten seconds because the inputs are remembered, and the question is always "what's my one step now?". Inside a workplace plan, the natural moments are onboarding, raise season and enrolment windows.

**How is this different from a retirement calculator?**
A calculator gives one number for one future at 65. This gives a thousand futures, measures flexibility at 35 and 45 as well as 65, tests the person's own fears against them, and ends with one action rather than a number.

**What does the AI do?**
Words only. Gemini turns a path's events into a short story, rephrases a worry's answer, and answers questions from computed facts. It never produces a number: every reply is checked, and if it contains a number the engine did not compute, it is thrown away and the built-in wording is shown. It is off by default and the demo works without it.

**Are the research figures right?**
We quote the Canada Life and Deloitte findings as reported in trade press. Verify each figure against the full report before saying it on stage.

## Theme tie-in: discover the unknown

The future is the unknown everyone has and nobody can visit. Clotho makes it explorable: a thousand versions of it, each one readable, each one moved by a choice made today. Named for the Fate who spins the thread of life.
