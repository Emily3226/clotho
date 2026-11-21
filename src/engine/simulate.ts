import { A, marginalRate, stockShareAt, takeHome, wageGrowthAt } from './assumptions';
import { FAMILY_RENT_SHARE, GIG, MARKET_SETS, cityInfo, fieldInfo, fieldSalaryFor, homePriceFor, isStudent, minDownPayment } from './profile';
import { drawsFor, PER_PATH, STREAMS, S_BOND, S_COST_U, S_CRASH_U, S_CRASH_Z, S_JOB_U, S_SPELL, S_STOCK, S_WAGE } from './rng';
import { hasLife, LIFE, lifeCost, lifeEvents, lifestyleShare, lifeWork, normaliseLife } from './lifePlan';
import type { Inputs, Levers, PathEvent, PathResult, Scenario, SimOptions, Status, Summary } from './types';
import { SEV_INDEX, WORRY } from './worries';


function amortise(balance: number, rate: number, years: number): number {
  if (balance <= 0) return 0;
  if (rate <= 0) return balance / years;
  return (balance * rate) / (1 - Math.pow(1 + rate, -years));
}

export function homeGoalFor(inputs: Inputs, scenario: Scenario): { price: number; byAge: number } | null {
  if (inputs.home) {
    const price = inputs.home.type ? homePriceFor(inputs.city, inputs.home.type) : inputs.home.price;
    return { price, byAge: Math.max(inputs.home.byAge, inputs.age + 1) };
  }
  if (scenario.home) {
    return {
      price: inputs.city ? cityInfo(inputs.city).homePrice : WORRY.home.defaultPrice,
      byAge: Math.max(inputs.age + WORRY.home.defaultYears, WORRY.home.minAge),
    };
  }
  return null;
}

export function simulate(
  inputs: Inputs,
  scenario: Scenario,
  levers: Levers,
  seed: number,
  opts: SimOptions = {},
): PathResult[] {
  const paths = opts.paths ?? A.paths;
  const detail = opts.detail ?? true;
  const calm = !!opts.calm;
  const draws = drawsFor(seed, paths);
  const age = inputs.age;
  const N = A.endAge - age;
  const mk = MARKET_SETS[opts.set ?? 'middle'];
  // Ordinary-year stock mean, re-centred so the long-run average stays at the
  // set's mean once the crash regime is included.
  const stockNormalMean = (mk.stockMean - mk.crashChance * A.crashMean) / (1 - mk.crashChance);
  const student = isStudent(inputs.stage);
  // A student still has to live: pay below the floor is topped up (family,
  // loans, bursaries), so entering less income never makes a future look
  // better by anchoring lifestyle at almost nothing.
  const income = student ? Math.max(inputs.income, A.studentSupportFloor) : inputs.income;
  const gig = inputs.stage === 'gig';
  const finishAge = student ? Math.max(age, inputs.finishAge) : age;
  const fullIncome = student ? fieldSalaryFor('first', inputs.field) : income;
  const field = fieldInfo(inputs.field);
  const city = cityInfo(inputs.city);
  const raiseSpent = city.raiseSpent;
  const moveOutAge = inputs.living === 'family' ? Math.max(age + 1, inputs.moveOutAge) : -1;
  const wageNoise = gig ? GIG.wageNoise : A.wageNoise;
  const aiK = field.aiStrength;
  const scale = (m: number) => 1 + (m - 1) * aiK;

  const sAi = scenario.ai ? SEV_INDEX[scenario.ai] : -1;
  const sRec = scenario.recession ? SEV_INDEX[scenario.recession] : -1;
  const sCost = scenario.costs ? SEV_INDEX[scenario.costs] : -1;
  const sHome = scenario.home ? SEV_INDEX[scenario.home] : -1;
  const sWorld = scenario.world ? SEV_INDEX[scenario.world] : -1;
  const sPen = scenario.pensions ? SEV_INDEX[scenario.pensions] : -1;

  const pensionFactor = sPen >= 0 ? WORRY.pensions.paid[sPen] : 1;
  const worldDrag = sWorld >= 0 ? WORRY.world.returns[sWorld] : 0;
  const worldChance = sWorld >= 0 ? WORRY.world.chance[sWorld] : 0;
  const homeGoal = homeGoalFor(inputs, scenario);
  const goals = (inputs.goals ?? []).map((g) => ({ ...g, byAge: Math.max(g.byAge, age + 1) }));
  const homeFaster = sHome >= 0 ? WORRY.home.faster[sHome] : 0;

  const planPct = inputs.plan === 'yes' ? inputs.employeePct / 100 : 0;
  const matchPct =
    inputs.plan === 'yes' ? inputs.matchPct / 100 : inputs.plan === 'unsure' ? A.defaultMatchPct / 100 : 0;
  const matchOn = levers.match && inputs.plan !== 'no';
  const empPct = matchOn ? Math.max(planPct, matchPct) : planPct;
  const matchExtra = empPct - planPct;
  const employerActive = inputs.plan === 'yes' || (inputs.plan === 'unsure' && matchOn);

  const nth0 = takeHome(income);
  const saving0 = Math.min(
    inputs.monthly * 12 + planPct * income * (1 - marginalRate(income)),
    0.6 * nth0,
  );
  const spend0 = nth0 - saving0;
  // The cushion is sized to the spending of the first year. For a student who
  // finishes school this year, that is already the full-time lifestyle.
  const spendStart = student && finishAge <= age ? spend0 + raiseSpent * Math.max(0, takeHome(fullIncome) - nth0) : spend0;
  const cushionShare = inputs.cushionMonths / 12;
  const debtRate = inputs.debt ? Math.max(0, inputs.debt.rate / 100 - A.inflationForDebt) : 0;
  const debtPay = inputs.debt ? amortise(inputs.debt.balance, debtRate, A.debtYears) : 0;

  const life = hasLife(inputs.life) ? normaliseLife(inputs.life, age) : null;

  const out: PathResult[] = new Array(paths);
  const ring = new Float64Array(5);

  for (let i = 0; i < paths; i++) {
    const base = i * PER_PATH;
    const events: PathEvent[] = [];
    const balances = detail ? new Float32Array(N + 1) : null;
    const crashYear = Math.min(WORRY.recession.window - 1, Math.floor(draws[base + PER_PATH - 1] * WORRY.recession.window));

    let trend = 1;
    let plainTrend = 1;
    let level = 1;
    // Steps up at work (a promotion, a better job).
    let boost = 1;
    // How far lifestyle has adjusted to pay or costs that differ from the plan.
    let trim = 0;
    let at65 = 0;
    let tfsaRoom = A.tfsaAnnual * Math.max(0, age - 18);
    let fhsaLife = 0;
    let spendBase = spend0;

    let cushion = Math.min(inputs.saved, cushionShare * spendStart);
    let rest = inputs.saved - cushion;
    let tfsa = Math.min(rest, tfsaRoom);
    tfsaRoom -= tfsa;
    rest -= tfsa;
    let taxable = rest;
    let fhsa = 0;
    let workplace = 0;

    let carry = 0;
    let raisePts = 0;
    let lastStepPay = 1;
    let prevNth = nth0;
    let prevGross = income;
    let prevYearIncome = income;
    let costFactor = 1;
    let debtBal = inputs.debt ? inputs.debt.balance : 0;
    // A student's loan payments start when school ends.
    let debtStarted = !student;
    let plainAtFinish = 1;

    let woAge: number | null = null;
    let judgedAge: number | null = null;
    let ratio65 = 0;
    let retired = false;
    let withdraw = 0;
    let lastSpend = spend0;
    let ringN = 0;
    let earnedSum = 0;
    let yearsWorked = 0;

    let shockProof = true;
    let room35 = false;
    let room45 = false;
    let bought = false;
    // Money spent on a home or a goal, grown as if it had stayed invested.
    // Counted back when judging the other milestones (see below).
    let parked = 0;
    // For "what if there's no 65": homes and goals at what they cost, and
    // what was actually spent on living so far.
    let paidFor = 0;
    let lived = 0;
    let atCut: PathResult['atCut'];
    const goalsReached = goals.map(() => false);
    let cushionFullSeen = cushion >= cushionShare * spendStart - 1 && cushionShare > 0 && inputs.saved > 0;

    const trace = opts.trace ? { cushion: [] as number[], plan: [] as number[], flex: [] as number[], target: [] as number[] } : undefined;
    let minTfsaRoom = tfsaRoom;
    let maxFhsaYear = 0;
    let maxRrspOver = 0;
    let minBalance = 0;
    let final = 0;

    for (let t = 0; t <= N; t++) {
      const a = age + t;
      const flex = tfsa + fhsa + taxable;
      const total = cushion + flex + workplace;
      // Room to move and the status are judged as if the home or goal had
      // not been paid for: those are counted on their own, so reaching one
      // never makes the rest of a future look worse.
      const judged = flex + parked;
      if (balances) balances[t] = total;
      final = total;
      if (trace) {
        trace.cushion.push(cushion);
        trace.plan.push(workplace);
        trace.flex.push(flex);
        trace.target.push(cushionShare * lastSpend);
      }

      if (a === A.retireAge) at65 = total;
      if (a === opts.cutAge) atCut = { yours: cushion + flex + paidFor + (1 - A.raidTax) * workplace, lived };
      if (a === 35) {
        room35 = cushion + judged >= (A.roomMonths35 / 12) * lastSpend - 1;
        if (detail && room35) events.push({ age: a, type: 'room', value: A.roomMonths35 });
      }
      if (a === 45) {
        room45 = cushion + judged >= (A.roomMonths45 / 12) * lastSpend - 1;
        if (detail && room45) events.push({ age: a, type: 'room', value: A.roomMonths45 });
      }

      if (a >= A.workOptionalFromAge && !retired) {
        let avgSpend = lastSpend;
        if (ringN > 0) {
          const n = Math.min(ringN, 5);
          let s = 0;
          for (let k = 0; k < n; k++) s += ring[k];
          avgSpend = s / n;
        }
        const cppYears = Math.min(1, (Math.max(0, age - A.careerStartAge) + yearsWorked) / A.cppFullYears);
        const avgInc = yearsWorked > 0 ? earnedSum / yearsWorked : income;
        const pens =
          (A.cppMaxMonthly * 12 * Math.min(1, avgInc / A.ympe) * cppYears + A.oasMonthly * 12) * pensionFactor;
        const bridge = a < A.retireAge ? pens * (A.retireAge - a) : 0;
        // Before 65, savings first have to stand in for the public pensions
        // until they start. Pensions only count as far as that gap is funded.
        const ratioOf = (assets: number): number => {
          const funded = bridge > 0 ? Math.min(1, assets / bridge) : 1;
          const usable = Math.max(0, assets - bridge);
          return (A.withdrawalRate * usable + pens * funded) / Math.max(1, avgSpend);
        };
        const reachable = flex + (1 - A.workplaceRetirementTax) * workplace;
        // The status is judged as if the home or goals had not been paid for
        // (they are counted on their own). The age work becomes optional is
        // only ever claimed on money this future actually still has.
        const ratio = ratioOf(reachable + parked);
        if (a === A.retireAge) ratio65 = ratio;
        if (ratio >= A.workOptionalShare && judgedAge === null) judgedAge = a;
        if (ratioOf(reachable) >= A.workOptionalShare && woAge === null) {
          woAge = a;
          if (detail) events.push({ age: a, type: 'optional' });
        }
        if (a >= A.retireAge && woAge !== null) {
          retired = true;
          withdraw = A.withdrawalRate * (flex + workplace);
        }
      }
      if (t === N) break;

      // Investment returns for the year.
      const o = base + t * STREAMS;
      let rs: number;
      let rb: number;
      if (calm) {
        rs = mk.stockMean;
        rb = mk.bondMean;
      } else {
        if (draws[o + S_CRASH_U] < mk.crashChance) {
          rs = Math.min(-0.05, Math.max(-0.6, A.crashMean + A.crashVol * draws[o + S_CRASH_Z]));
        } else {
          rs = Math.max(-0.6, stockNormalMean + mk.stockVol * draws[o + S_STOCK]);
        }
        rb = mk.bondMean + A.bondVol * draws[o + S_BOND];
        if (sRec >= 0 && t === crashYear) rs = Math.min(rs, WORRY.recession.crash[sRec]);
      }
      rs -= worldDrag;
      rb -= worldDrag;
      const w = stockShareAt(a);
      const r = w * rs + (1 - w) * rb - A.fees;
      cushion *= 1 + A.cushionReturn;
      tfsa *= 1 + r;
      parked *= 1 + r;
      fhsa *= 1 + r;
      workplace *= 1 + r;
      taxable *= 1 + r - A.taxableDrag;
      tfsaRoom += A.tfsaAnnual;
      if (detail && rs <= -0.2) events.push({ age: a, type: 'crash', value: Math.round(-rs * 100) });

      if (retired) {
        const pots = tfsa + fhsa + taxable + workplace;
        if (pots > 0) {
          const k = 1 - Math.min(pots, withdraw) / pots;
          tfsa *= k;
          fhsa *= k;
          taxable *= k;
          workplace *= k;
        }
        continue;
      }

      // Pay.
      if (t > 0) {
        const g = a - 1 < 30 ? field.growthTo30 : wageGrowthAt(a - 1);
        plainTrend *= 1 + g;
        trend *= 1 + g - (sAi >= 0 && t <= WORRY.ai.years ? WORRY.ai.wageDrag[sAi] * aiK : 0);
      }
      const inSchool = student && a < finishAge;
      if (student && a === finishAge) {
        plainAtFinish = plainTrend;
        debtStarted = true;
      }
      // Full-time pay starts at the field salary in today's dollars. Dividing
      // by the plain trend removes ordinary growth during school but keeps any
      // worry (such as AI) that has already pulled pay down by graduation.
      const payBase = boost * (inSchool ? income * trend : student ? (fullIncome * trend) / plainAtFinish : income * trend);
      const gross = payBase * level * (1 + (calm ? 0 : wageNoise * draws[o + S_WAGE]));
      const nth = takeHome(gross);
      // Lifestyle follows the expected career, not each year's luck: a layoff,
      // a pay cut or a slower career squeezes saving, not spending.
      const expectedPay = inSchool ? income * plainTrend : student ? (fullIncome * plainTrend) / plainAtFinish : income * plainTrend;
      const chosenPace = lifestyleShare(life, a);
      const expectedNth = takeHome(expectedPay * chosenPace);
      // Starting full-time work lifts lifestyle like a raise, even when it
      // happens this year (t = 0): otherwise spending stays at part-time level
      // for life and nearly all of the new pay is saved.
      const startsFullTime = student && a === finishAge;
      if (t > 0 || startsFullTime) spendBase += raiseSpent * (expectedNth - prevNth);
      prevNth = expectedNth;
      if (detail && startsFullTime) {
        events.push({ age: a, type: 'fulltime' });
      } else if (detail && t > 0 && gross / prevGross > 1.055) {
        events.push({ age: a, type: 'raise', value: Math.round((gross / prevGross - 1) * 100) });
      }
      prevGross = gross;

      if (sCost >= 0 && t >= 1 && t <= WORRY.costs.years) costFactor *= 1 + WORRY.costs.extra[sCost] * WORRY.costs.essentialsShare;
      // Rents follow home prices: housing, about 30% of spending, rises with them.
      if (sHome >= 0 && t >= 1 && t <= WORRY.costs.years) costFactor *= 1 + homeFaster * WORRY.home.housingShare;
      // Lifestyle adjusts, slowly, when life differs from the plan. If pay
      // stays lower (a layoff's lasting cut, a slower career) or costs run
      // higher, people trim; after a step up they spend more. It closes the
      // same share of the gap that a raise adds to spending, a bit each year.
      const planned = Math.max(0, expectedNth - spendBase);
      const room = takeHome(payBase * level * chosenPace) - spendBase * costFactor;
      trim += A.adaptSpeed * (raiseSpent * (planned - room) - trim);
      const want = Math.max(0, spendBase * costFactor - trim);
      // What income could not cover this year. The work-optional and room
      // targets are set by the lifestyle wanted, not by a squeezed year.
      const squeezed = Math.max(0, want - nth);
      let spend = Math.min(want, nth);
      const target = cushionShare * spend;

      // A plan dollar costs less than a dollar of take-home pay.
      const relief = empPct > 0 ? 1 - marginalRate(gross) : 1;
      const delayed = t < levers.delay;
      // Pay relative to today, for the save-a-raise habit.
      const pay = (payBase * level) / Math.max(1, income);
      if (delayed) {
        spend = nth;
        lastStepPay = pay;
      } else {
        if (levers.raises) {
          // One more point of pay saved at each raise of 3% or more.
          if (pay >= lastStepPay * (1 + A.raisesStep) * 0.9999 && raisePts < A.raisesCapPoints) {
            raisePts++;
            lastStepPay = pay;
          }
        }
        let extra = levers.auto * 12 + (matchExtra * relief + raisePts / 100) * gross;
        if (levers.cushion && cushion < target) extra += A.cushionTopUp * 12;
        if (extra > 0) spend = Math.max(spend - extra, Math.min(spend, 0.4 * nth));
      }

      // Job loss.
      let months = carry;
      carry = 0;
      let scar = false;
      let jobless: number = A.joblessIncomeShare;
      // A gig slow stretch is still work: loan payments carry on.
      let dip = false;
      if (!calm && months === 0 && !inSchool) {
        const aiHit = sAi >= 0 && a < WORRY.ai.untilAge;
        const recHit = sRec >= 0 && t >= crashYear && t < crashYear + WORRY.recession.jobYears;
        if (gig) {
          // Gig work: no layoffs, but a chance each year of a slow stretch.
          let p = GIG.dipChance;
          if (aiHit) p *= scale(WORRY.ai.jobMult[sAi]);
          if (recHit) p *= WORRY.recession.jobMult[sRec];
          if (draws[o + S_JOB_U] < Math.min(p, 0.9)) {
            months = GIG.dipMonths;
            jobless = GIG.dipIncomeShare;
            dip = true;
            if (detail) events.push({ age: a, type: 'dip', value: months });
          }
        } else {
          let p = a < A.jobLossAgeSplit ? A.jobLossYoung : A.jobLossLater;
          if (aiHit) p *= scale(WORRY.ai.jobMult[sAi]);
          if (recHit) p *= WORRY.recession.jobMult[sRec];
          if (draws[o + S_JOB_U] < Math.min(p, 0.9)) {
            months = Math.min(
              A.spellCapMonths,
              A.spellMedianMonths * Math.exp(A.spellSigma * draws[o + S_SPELL]) * (aiHit ? scale(WORRY.ai.spellMult[sAi]) : 1),
            );
            scar = true;
            if (detail) events.push({ age: a, type: 'job', value: Math.max(1, Math.round(months)) });
          }
        }
      }
      if (months > 12) {
        carry = months - 12;
        months = 12;
      }
      const share = (12 - months) / 12;
      // The life someone chose: time away, shorter weeks, and what it costs.
      const chosen = life ? lifeWork(life, a, gross, inputs.stage) : null;
      const workShare = chosen?.workShare ?? 1;
      const yearIncome = (gross * share + jobless * gross * (1 - share)) * workShare + (chosen?.benefit ?? 0);
      const th = months > 0 || (chosen && (workShare < 1 || chosen.benefit > 0)) ? takeHome(yearIncome) : nth;
      if (life && detail) for (const e of lifeEvents(life, a)) events.push({ age: a, ...e });

      // Student debt. In a year with time out of work (not a gig slow stretch), payments pause and the
      // balance waits (as under repayment assistance). Otherwise the payment
      // falls due and the balance only shrinks by what is paid: it comes out
      // of what would have been saved first, then out of spending (people
      // tighten their budget, up to a limit), and only what is left draws on
      // savings like any other cost.
      let debtDue = 0;
      if (debtBal > 0 && debtStarted && (months === 0 || dip)) {
        debtDue = Math.min(debtPay, debtBal * (1 + debtRate));
        debtBal = debtBal * (1 + debtRate) - debtDue;
        if (debtBal <= 1) {
          debtBal = 0;
          if (detail) events.push({ age: a + 1, type: 'debtFree' });
        }
      }

      let free = th - spend;
      let notSpent = 0;
      let lifeSpent = 0;
      // Living with family: the same lifestyle as renting, plus the rent not
      // paid, saved until moving out.
      if (a < moveOutAge) free += Math.min(city.moveOutCost, FAMILY_RENT_SHARE * th);
      // The saving entered is before loan payments, so the payment comes on top.
      if (debtDue > 0) {
        const fromSaving = Math.min(debtDue, Math.max(0, free));
        const trimmed = Math.min(debtDue - fromSaving, A.debtTrimShare * spend);
        free -= debtDue - trimmed;
        notSpent += trimmed;
      }
      if (life) {
        const c = lifeCost(life, a, yearIncome, inSchool);
        const budgeted = Math.min(LIFE.budgetShare * c, LIFE.trimShare * spend);
        free -= c - budgeted;
        // The chosen cost is lived; the part budgeted for replaces other spending.
        lifeSpent = c - budgeted;
      }
      if (worldChance > 0 && !calm && draws[o + S_COST_U] < worldChance) {
        free -= (WORRY.world.months / 12) * spend;
        if (detail) events.push({ age: a, type: 'cost' });
      }

      if (free > 0) {
        // Workplace plan first, then the cushion, then long-term savings.
        if (!delayed && empPct > 0) {
          let we = Math.min(empPct * gross * share * workShare, free / relief);
          let er = employerActive ? Math.min(we, matchPct * gross * share * workShare) : 0;
          const room = Math.min(A.rrspRate * prevYearIncome, A.rrspMax);
          if (we + er > room) {
            const k = room / (we + er);
            we *= k;
            er *= k;
          }
          if (we + er - room > maxRrspOver) maxRrspOver = we + er - room;
          workplace += we + er;
          free -= we * relief;
        }
        const toCushion = Math.min(free, Math.max(0, target - cushion));
        cushion += toCushion;
        free -= toCushion;
        if (homeGoal && !bought && fhsaLife < A.fhsaLifetime) {
          const x = Math.min(free, A.fhsaAnnual, A.fhsaLifetime - fhsaLife);
          fhsa += x;
          fhsaLife += x;
          free -= x;
          if (x > maxFhsaYear) maxFhsaYear = x;
        }
        const x = Math.min(free, tfsaRoom);
        tfsa += x;
        tfsaRoom -= x;
        taxable += free - x;
      } else if (free < -0.5) {
        let need = -free;
        const c = Math.min(cushion, need);
        cushion -= c;
        need -= c;
        if (detail && c > 50) events.push({ age: a, type: 'cushion' });
        if (need > 0.5) {
          const x = Math.min(taxable, need);
          taxable -= x;
          need -= x;
          const y = Math.min(tfsa, need);
          tfsa -= y;
          tfsaRoom += y;
          need -= y;
          const z = Math.min(fhsa, need);
          fhsa -= z;
          need -= z;
          if (detail && x + y + z > 50) events.push({ age: a, type: 'flex' });
        }
        // Planned time away is lived within what's there: it doesn't raid the
        // workplace plan or count as a shock. A layoff in the same year still does.
        const plannedAway = !!chosen?.away && months === 0;
        if (need > 0.5 && workplace > 0 && !plannedAway) {
          const g = Math.min(workplace, need / (1 - A.raidTax));
          workplace -= g;
          need -= g * (1 - A.raidTax);
          shockProof = false;
          if (detail) events.push({ age: a, type: 'raid' });
        }
        // Whatever savings couldn't cover wasn't spent, planned or not.
        if (need > 0.5) notSpent += need;
        if (need > 0.5 && !plannedAway) {
          shockProof = false;
          if (detail) events.push({ age: a, type: 'short' });
        }
      }

      if (!cushionFullSeen && target > 0 && cushion >= target - 1) {
        cushionFullSeen = true;
        if (detail) events.push({ age: a + 1, type: 'cushionFull' });
      }

      if (homeGoal && !bought && a + 1 <= homeGoal.byAge) {
        const price =
          homeGoal.price * (sHome >= 0 ? plainTrend * wageGrowthFactor(a) * Math.pow(1 + homeFaster, t + 1) : 1);
        const down = minDownPayment(price);
        if (fhsa + taxable + tfsa >= down) {
          let need = down;
          const x = Math.min(fhsa, need);
          fhsa -= x;
          need -= x;
          const y = Math.min(taxable, need);
          taxable -= y;
          need -= y;
          tfsa -= need;
          tfsaRoom += need;
          parked += down;
          paidFor += down;
          bought = true;
          if (detail) events.push({ age: a + 1, type: 'home' });
        }
      }

      // Goals: at the age chosen, paid from long-term savings you can reach
      // (not the cushion, which is for bad years), if there is enough.
      for (let k = 0; k < goals.length; k++) {
        const g = goals[k];
        if (goalsReached[k] || a + 1 !== g.byAge) continue;
        if (taxable + tfsa >= g.cost) {
          const y = Math.min(taxable, g.cost);
          taxable -= y;
          tfsa -= g.cost - y;
          tfsaRoom += g.cost - y;
          parked += g.cost;
          paidFor += g.cost;
          goalsReached[k] = true;
          if (detail) events.push({ age: a + 1, type: 'goal', value: k });
        }
      }

      lived += spend + lifeSpent - notSpent;
      if (tfsaRoom < minTfsaRoom) minTfsaRoom = tfsaRoom;
      const lowest = Math.min(cushion, tfsa, fhsa, taxable, workplace);
      if (lowest < minBalance) minBalance = lowest;

      // Trimming to get through does not lower the yardstick: it stays the
      // lifestyle that was planned. Spending more after good luck raises it,
      // because that higher lifestyle is the one to keep up.
      lastSpend = spend + squeezed + Math.max(0, trim);
      ring[ringN % 5] = lastSpend;
      ringN++;
      if (!inSchool) {
        earnedSum += yearIncome;
        yearsWorked++;
      }
      prevYearIncome = yearIncome;
      if (scar) level *= 1 - A.returnPayCut;
      // Good luck uses the far end of the same draw as job loss, so a path
      // keeps its luck in every scenario and with every habit.
      if (!calm && !inSchool && months === 0 && a < A.stepUpUntilAge && draws[o + S_JOB_U] > 1 - A.stepUpChance) {
        boost *= 1 + A.stepUpRaise;
      }
    }

    // The status is judged as if the home or goals were not paid for
    // (they are counted on their own). The "work optional by 65" tick says
    // what really happened in this life, so it always agrees with the story.
    const wo65 = judgedAge !== null && judgedAge <= A.retireAge;
    const reallyWo65 = woAge !== null && woAge <= A.retireAge;
    const homeMs = homeGoal ? bought : null;
    // The home goal is counted on its own, not in the status: missing a
    // date you picked should not hide everything else that went well.
    const misses = (shockProof ? 0 : 1) + (room35 ? 0 : 1) + (room45 ? 0 : 1);
    let status: Status;
    if (wo65) status = misses === 0 ? 0 : misses === 1 ? 1 : 2;
    else status = ratio65 >= A.workOptionalShare - A.tightGap ? 2 : 3;

    out[i] = {
      index: i,
      status,
      milestones: { shockProof, room35, room45, home: homeMs, workOptional65: reallyWo65, goals: goalsReached },
      workOptionalAge: woAge,
      ratio65,
      final,
      at65,
      atCut,
      balances,
      events,
      peakTfsaOver: Math.max(0, -minTfsaRoom),
      peakFhsaLifetime: fhsaLife,
      peakFhsaYear: maxFhsaYear,
      peakRrspOver: maxRrspOver,
      minBalance,
      trace,
    };
  }
  return out;
}

function wageGrowthFactor(age: number): number {
  return 1 + wageGrowthAt(age);
}

export function summarise(paths: PathResult[]): Summary {
  const counts: [number, number, number, number] = [0, 0, 0, 0];
  const ms = { shockProof: 0, room35: 0, room45: 0, home: 0, workOptional65: 0 };
  let hasHome = false;
  const goals = (paths[0]?.milestones.goals ?? []).map(() => 0);
  const ages: number[] = [];
  for (const p of paths) {
    counts[p.status]++;
    if (p.milestones.shockProof) ms.shockProof++;
    if (p.milestones.room35) ms.room35++;
    if (p.milestones.room45) ms.room45++;
    if (p.milestones.home !== null) {
      hasHome = true;
      if (p.milestones.home) ms.home++;
    }
    if (p.milestones.workOptional65) ms.workOptional65++;
    p.milestones.goals.forEach((ok, k) => {
      if (ok) goals[k]++;
    });
    ages.push(p.workOptionalAge ?? Infinity);
  }
  ages.sort((x, y) => x - y);
  const med = ages[Math.floor((ages.length - 1) / 2)];
  return {
    counts,
    medianWorkOptionalAge: Number.isFinite(med) ? med : null,
    milestoneCounts: { ...ms, home: hasHome ? ms.home : null, goals },
  };
}
