# Devpost submission: Clotho

## Fields to paste

**Project name:** Clotho

**Elevator pitch:** See 1,000 versions of your financial future, test what worries you, and find the one small habit that helps most.

**Try it out:**
- https://emily3226.github.io/clotho/
- https://github.com/Emily3226/clotho

**Video demo:** [add link]

**Built with:** typescript, react, vite, canvas, web-workers, zustand, node.js, express, gemini, firebase, firebase-authentication, cloud-firestore, vitest, github-pages

**Prizes to enter:** Canada Life Future Me Challenge, MLH Best Use of Gemini, Most Adventurous

---

## Project story (paste into "About the project")

*You can't predict the future. You can stack the odds.*

## Inspiration

Canada Life's research on Gen Z and retirement describes a loop we recognized: worry about the world leads to doomscrolling, doomscrolling leads to helplessness, and helplessness leads to putting off the things that would help. Gen Z reported about 74 minutes of doomscrolling a day, and each extra hour was linked to a 4.4% lower chance of setting up automatic contributions.

The same research found that fear-based messages backfire. Talking about flexibility and control works better than pointing at a retirement date 40 years away.

Most financial calculators give you one number for one future. But the future is exactly what young people feel unsure about. So we asked: what if a tool took those fears seriously, showed how much each one could really change, and ended with one thing you could do today?

Hack Western's theme is "Discover the unknown." Clotho, named for the Fate who spins the thread of life, makes the unknown something you can explore.

## What it does

Clotho simulates 1,000 versions of your financial life from now to age 70. Each one has the same choices and different luck with jobs, pay, markets and surprise costs.

**Start with how you feel.** You rate how you feel about your financial future and pick what worries you, or type your own worry. A few quick questions cover your work, field, city and savings. You can also add what you want from life, like kids, helping family, time off, going back to school or a four-day week.

**See your river of futures.** A thousand lines flow across the screen with one plain headline, like *"185 of 1,000 futures in control today, 779 within reach with one habit."* "In control" means a future passes four checks: it handles bad years, has room to move at 35 and 45, and makes work optional by 65. Tap any line to read that life as a story, or press play and watch one unfold event by event.

**Size your worries.** AI changing your job, a recession, rising costs, housing, a rougher world, or public pensions not being there. Each worry runs against the same 1,000 lives, so you see how much it changes and which habit brings back the most.

**Find what helps most.** Habits are ranked by how many futures they rescue: automating a small amount, taking the employer match, building a cushion, or saving part of every raise. Switch one on and the same lives visibly move. Clotho also tests options that cost nothing extra each month, like asking for a raise, paying lower fees and reinvesting an RRSP refund, and points to the TFSA, FHSA, Home Buyers' Plan, Lifelong Learning Plan and RESP grant where they fit.

**Take one step.** You pick one habit and get exact steps, or a ready-to-send message to HR. You can add a reminder to Google, Apple or Outlook calendar, then answer the confidence question again to see what changed. The ending links to Canada Life's free public tools.

**Come back.** Optional Google sign-up saves your step and opens a 30-second monthly check-in with your streak and month-by-month progress. Without an account, none of your answers are saved after you leave.

Clotho is an educational tool. It isn't financial advice, a Canada Life product, or a recommendation of any product or provider.

## How we built it

- **Simulation engine:** strict TypeScript running in Web Workers. It models yearly pay, career moves, job loss, market crashes, inflation, a cash cushion, TFSA, FHSA, RRSP and workplace plans, employer matching, student debt, and emergency withdrawals.
- **Common random numbers:** each life draws all of its luck up front from a seeded generator. Life #412 gets the same layoffs and markets whether or not you turn on a habit, so every comparison is fair and each line can animate from its old shape to its new one.
- **The river:** a custom Canvas 2D visualization with draw-in, per-path morphing, hit testing, life playback and keyboard navigation.
- **Frontend:** React, Vite, Zustand and hand-written CSS, with light and dark themes, reduced-motion support and a phone layout.
- **Gemini, for words only:** when the Express server is running, Gemini can turn a life's events into a short story, warm up worry answers, and sort free-text answers into fixed categories. It never calculates anything. Every reply is checked, and anything containing a number the engine didn't compute is thrown away for a built-in template. The hosted demo is a static site, so it uses those templates and on-device keyword matching.
- **Accounts:** Firebase Authentication with Google, and one private Firestore record per person, protected by access rules. People can delete their account at any time.
- **Trust:** 162 automated tests cover determinism, fair comparisons, account limits, hand-calculated growth and the safety checks on AI text. Every assumption is listed in the app, with its source or a clear label when it is our own estimate.

## Challenges we ran into

- **Making hard results useful instead of scary.** Some honest results are tough. We use counts instead of percentages, avoid red and alarm language, and pair every worry with the habit that helps most.
- **Keeping comparisons fair.** If switching on a habit reshuffled everyone's luck, the before and after wouldn't be comparable. Drawing all randomness up front keeps the math fair and lets each line animate from its old shape to its new one.
- **Modelling real careers.** Pay doesn't rise smoothly. A first full-time job, a new employer or a career change can move it up or down. One bug treated the jump from student pay to a first salary as a raise and saved part of it automatically, which made a student saving $50 a month look far safer than someone already working. Testing across life stages caught it.
- **Keeping AI away from the numbers.** A language model will happily do arithmetic. In a financial tool that's a real risk, so every AI reply is checked, and a reply with any number the engine didn't compute is rejected.
- **Saving progress without overcollecting.** We wanted people to come back without forcing an account. Sign-up is optional, and the browser no longer keeps answers for people who don't sign up.

## Accomplishments that we're proud of

- Watching the same 1,000 lives move when one small habit is switched on.
- Turning a vague fear into a specific, sized answer with a next step.
- Building a model that reflects real life, including career changes, kids, caregiving and time away from work.
- Making every assumption visible and keeping the math out of AI's hands.
- Finishing the whole loop: worry, understanding, action and a monthly return.

## What we learned

- A range of outcomes can be more honest and more motivating than a single forecast.
- "185 of 1,000" is easier to picture than a percentage.
- Small modelling assumptions can change the whole story, so testing across different kinds of people matters as much as testing the code.
- In a financial product, the wording is part of the product. "Work becomes optional" starts a different conversation than "retirement."

## What's next for Clotho

- Test it with more Gen Z users and measure whether they actually take their step.
- Have an actuary review the assumptions.
- Pilot it inside a group benefits plan, with employers seeing only anonymous totals.
- Add partners, inheritances, moves between provinces and real plan rules for each employer.
- Bring the Gemini features to the hosted version.
