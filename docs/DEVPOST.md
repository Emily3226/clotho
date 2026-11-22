# Clotho

*You can't predict the future. You can stack the odds.*

## Inspiration

Canada Life's research on young workers describes a loop: dread about the world leads to doomscrolling, doomscrolling leads to helplessness, and helplessness means not enrolling, not automating, and leaving the employer match unclaimed. The same research says that scaring people makes it worse, and that talking about flexibility and control works better than pointing at a distant retirement date.

So we asked a different question. What if a tool took those fears seriously instead of waving them away, and answered each one with a number and a small thing you can do about it?

## What it does

Clotho shows you a thousand simulated versions of your own financial life, from now to 70. Same choices, different luck with jobs and markets.

- **The river.** A thousand lines, a middle line, and one headline: "518 of 1,000 futures in control today, 878 within reach with one habit." **Why 518?** opens the working behind it. Tap any line to read that life as a story.
- **Your worries, sized.** Pick what's on your mind: AI and your job, a recession, rising costs, housing, a rougher world, public pensions. Each is run against the same thousand lives: how many stay in control with it and without it, what the middle future has saved at 65, and which habit brings the most back.
- **What you control.** Habits ranked by how many futures they rescue: take the full employer match, add an automatic $25, save a little of every raise, build the cushion first. Switch one on and the river moves, line by line.
- **Keep yours reachable.** For anyone with a workplace plan, Clotho tests the design Canada Life announced in October: your own contributions in a TFSA, the employer match kept for retirement. It shows how many fewer futures have to raid retirement savings, and what that costs at 65.
- **One step.** You pick one. **Do it now** gives its exact steps, or an email to HR ready to send, then asks "Did you do it?". Then an optional payday nudge: one tap adds a monthly reminder to their own calendar (Google, Apple or Outlook). No sign-up, and nothing is sent to us. Then the same confidence question you answered at the start, so you can see what changed.

It runs fully in the browser, with no account, and needs no network unless AI wording is switched on. It is an educational tool and recommends no product, fund or provider.

## How we built it

- **Engine:** pure TypeScript in a Web Worker. 1,000 paths with yearly steps, three buckets (cushion, reachable long-term savings, workplace plan with employer match), TFSA, FHSA and RRSP limits, job loss, market crash regimes, and emergency withdrawals from retirement savings.
- **Common random numbers:** every path draws its luck up front from a generator seeded with the path number, so path 412 has the same layoffs and the same markets whether or not you take the match. That makes the comparison honest and lets the river morph per path.
- **River:** Canvas 2D, layered, with draw-in, 600 ms per-path morphing, hit testing and keyboard stepping.
- **App:** Vite, React, a small Zustand store, hand-written CSS with light and dark themes.
- **Gemini:** optional, for words only: path stories, warmer worry answers, and sorting goals typed in your own words. Every reply is validated and thrown away if it contains a number the engine did not compute.
- **Tests:** determinism, common random numbers, monotonicity, account limits, a hand-calculated compound-growth check, worry severity ordering, performance.

## Challenges we ran into

- **Making a hard picture useful instead of frightening.** Our first version of "everything keeps getting more expensive" left almost no futures standing for a low saver. The fix was not to hide it but to make the what-if explicit and adjustable, and to always pair it with the habit that moves it.
- **Fair comparisons.** Without shared luck across variants, switching on a habit reshuffled the whole picture. Drawing all randomness up front fixed both the maths and the animation.
- **Keeping the model out of the numbers.** A language model will happily do arithmetic. We made that impossible to ship: no number reaches the screen unless the engine produced it.
- **Ranking habits honestly.** Our first ranking put a free step first even when another habit rescued far more, so two parts of the screen disagreed. Now the headline, the list and the "does it still hold" card all name the habit that rescues the most.

## Accomplishments we're proud of

- The river morph: the same thousand lives visibly shifting when one habit is switched on.
- A worry gets an answer in three numbers, in one sentence.
- Every assumption is one tap away, with its source and date.
- No red anywhere, and no percentages in headlines.

## What we learned

- People don't need a forecast. They need to see the range, and where their own choices sit inside it.
- "518 of 1,000" lands in a way "52%" never does.
- Framing matters as much as modelling. "Work becomes optional" starts a different conversation than "retirement".

## What's next

- A pilot inside a real group plan, with the sponsor view showing totals only.
- More lives: partners, children, moving between provinces.
- Verified parameters reviewed by an actuary, and real plan rules per employer.
- A ten-second yearly check-in at raise time: "what's my one step now?"

## Built with

TypeScript, React, Vite, Canvas 2D, Web Workers, Zustand, Vitest, Express, Gemini API.
