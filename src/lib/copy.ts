import type { LeverRow, PathLite, WorryCard } from '../engine/analyse';
import { A } from '../engine/assumptions';
import { goalKind } from '../engine/goals';
import { STATUS_LABELS, type Goal, type Inputs, type LeverId, type PathEvent } from '../engine/types';
import { worryInfo } from '../engine/worries';
import { money, moneyRound, num } from './format';

export interface LeverCopy {
  title: string;
  doing: string;
  // Used in "<noun> rescues 214 of your futures".
  noun: string;
  explain: string;
}

export function leverCopy(id: LeverId, inputs: Inputs): LeverCopy {
  switch (id) {
    case 'match':
      return inputs.plan === 'unsure'
        ? {
            title: 'Ask HR one question',
            doing: 'Finding and taking your employer match',
            noun: 'Asking HR one question',
            explain: 'Many workplace plans come with matching: money your employer adds when you put some in.',
          }
        : {
            title: 'Take the full employer match',
            doing: 'Taking your full employer match',
            noun: 'Taking the full employer match',
            explain: 'Money your employer adds when you put some in. Unclaimed, it stays with them.',
          };
    case 'auto25':
    case 'auto50':
    case 'auto100': {
      const n = id.slice(4);
      return {
        title: `Automate $${n} a month`,
        doing: `Automating $${n} a month`,
        noun: `Automating $${n} a month`,
        explain: 'An automatic transfer to long-term savings, such as a TFSA, on payday. You set it once and it keeps going.',
      };
    }
    case 'raises':
      return {
        title: 'Save part of every raise',
        doing: 'Saving part of every raise',
        noun: 'Saving part of every raise',
        explain: 'Each time your pay grows 3% or more, one more point of it goes to savings, up to 5 points. Your take-home pay still goes up.',
      };
    case 'cushion':
      return {
        title: 'Build the cushion first',
        doing: 'Building your cushion first',
        noun: 'Building the cushion first',
        explain: `An extra $${A.cushionTopUp} a month, only until your cushion is full. It stops by itself.`,
      };
  }
}

export function leverCostLine(row: LeverRow): string {
  if (row.id === 'raises') return '$0 today, then 1 point of each raise';
  if (row.id === 'cushion') return `${money(row.costPerMonth)} a month, only while the cushion fills`;
  if (row.askHR) return `No extra cost to ask. The full match would take about ${money(row.costPerMonth)} a month`;
  if (row.id === 'match') return `About ${money(row.costPerMonth)} less take-home a month`;
  return `${money(row.costPerMonth)} a month`;
}

export function ageShift(delta: number | null): string {
  if (delta === null) return '';
  if (delta === 0) return 'Work-optional age: no change';
  const years = Math.abs(delta) === 1 ? '1 year' : `${Math.abs(delta)} years`;
  return delta < 0 ? `Work optional ${years} sooner` : `Work optional ${years} later`;
}

const EVENT_TEXT: Record<PathEvent['type'], (v?: number) => string> = {
  job: (v) => `out of work for ${v === 1 ? '1 month' : `${v} months`}`,
  dip: (v) => `a slow stretch of gig work for ${v} months`,
  fulltime: () => 'started full-time work',
  cushion: () => 'used the cushion',
  flex: () => 'drew on long-term savings',
  raid: () => 'had to dip into retirement savings',
  short: () => 'savings ran out for a while',
  crash: (v) => `markets fell ${v}%`,
  cost: () => 'a surprise cost landed',
  raise: (v) => `pay rose ${v}%`,
  cushionFull: () => 'the cushion was full',
  home: () => 'bought a home',
  goal: () => 'reached a goal',
  debtFree: () => 'student debt paid off',
  room: (v) => `${v} months of room to move saved`,
  optional: () => 'work became optional',
};

export interface TimelineRow {
  age: number;
  text: string;
  kind: 'good' | 'hard' | 'plain';
}

const GOOD: PathEvent['type'][] = ['fulltime', 'raise', 'cushionFull', 'home', 'goal', 'debtFree', 'room', 'optional'];
const HARD: PathEvent['type'][] = ['job', 'dip', 'raid', 'short', 'crash', 'cost'];

// Goals are shown in the person's own words on screen. Narration gets only
// the kind of goal ("a big trip"), never what they typed.
const goalText = (e: PathEvent, goals: Goal[], own: boolean): string => {
  const g = goals[e.value ?? -1];
  if (!g) return EVENT_TEXT.goal();
  return own ? `${g.label}: done` : `paid for ${goalKind(g.kind).name}`;
};

export function timeline(events: PathEvent[], goals: Goal[] = []): TimelineRow[] {
  const byAge = new Map<number, PathEvent[]>();
  for (const e of events) byAge.set(e.age, [...(byAge.get(e.age) ?? []), e]);
  return [...byAge.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([age, list]) => {
      const text = list.map((e) => (e.type === 'goal' ? goalText(e, goals, true) : EVENT_TEXT[e.type](e.value))).join(', ');
      const kind = list.some((e) => HARD.includes(e.type)) ? 'hard' : list.some((e) => GOOD.includes(e.type)) ? 'good' : 'plain';
      return { age, text: text.charAt(0).toUpperCase() + text.slice(1) + '.', kind };
    });
}

// Facts sent for narration, and the numbers a narrated story may use.
export function pathFacts(p: PathLite, goals: Goal[] = []) {
  return {
    status: STATUS_LABELS[p.status],
    savedAt70: Math.round(p.final / 1000) * 1000,
    savedAtAge: 70,
    workOptionalAge: p.workOptionalAge,
    timesOutOfWork: p.events.filter((e) => e.type === 'job').length,
    laterTimesOutOfWork: Math.max(0, p.events.filter((e) => e.type === 'job').length - 1),
    events: p.events.map((e) => ({ age: e.age, what: e.type === 'goal' ? goalText(e, goals, false) : EVENT_TEXT[e.type](e.value) })),
  };
}

export function story(p: PathLite): string {
  const jobs = p.events.filter((e) => e.type === 'job');
  const parts: string[] = [];
  if (jobs.length) {
    const j = jobs[0];
    const same = p.events.filter((e) => e.age === j.age);
    const how = same.some((e) => e.type === 'raid')
      ? 'and had to dip into retirement savings'
      : same.some((e) => e.type === 'flex')
        ? 'and leaned on long-term savings'
        : same.some((e) => e.type === 'cushion')
          ? 'and the cushion carried it'
          : same.some((e) => e.type === 'short')
            ? 'and money was tight for a while'
            : 'and got through on income alone';
    const more = jobs.length > 1 ? ` It happened ${jobs.length === 2 ? 'once more' : `${jobs.length - 1} more times`} later on.` : '';
    parts.push(`At ${j.age}, this version of you was out of work for ${j.value === 1 ? '1 month' : `${j.value} months`} ${how}.${more}`);
  } else {
    parts.push('This version of you never lost a job.');
  }
  const crashes = p.events.filter((e) => e.type === 'crash');
  if (crashes.length) {
    const worst = crashes.reduce((a, b) => ((b.value ?? 0) > (a.value ?? 0) ? b : a));
    parts.push(`Markets fell ${worst.value}% at ${worst.age}, and the plan kept going.`);
  }
  const home = p.events.find((e) => e.type === 'home');
  const saved = moneyRound(Math.round(p.final / 1000) * 1000);
  const homeBit = home ? ` after buying a home at ${home.age}` : '';
  if (p.workOptionalAge !== null) {
    parts.push(`Work became optional at ${p.workOptionalAge}${homeBit}, with about ${saved} saved at 70.`);
  } else {
    parts.push(`Work was not yet optional at 70${homeBit}, with about ${saved} saved.`);
  }
  return parts.join(' ');
}

export function worryTitle(id: WorryCard['id']): string {
  return id === 'all' ? 'Everything at once' : worryInfo(id).label;
}

export interface WorryAnswer {
  parts: (string | { strong: string })[];
  plain: string;
  facts: Record<string, unknown>;
}

export function worryAnswer(card: WorryCard, inputs: Inputs): WorryAnswer {
  const clause = card.id === 'all' ? 'If all of it happens at once' : worryInfo(card.id).ifClause;
  const parts: WorryAnswer['parts'] = [];
  const drop = card.baseInControl - card.inControl;
  const less = card.baseMiddleAt65 - card.middleAt65;
  if (card.affected === 0 || (drop <= 0 && less <= 0)) {
    parts.push(`${clause}, none of your 1,000 futures change. Your plan already covers this one.`);
  } else {
    // Sized by how far it moves things, not by a pass or fail.
    if (drop > 0) parts.push(`${clause}, you stay in control in `, { strong: num(card.inControl) }, ' of your 1,000 futures instead of ', { strong: num(card.baseInControl) }, '.');
    else parts.push(`${clause}, you stay in control in just as many futures, `, { strong: num(card.inControl) }, ' of 1,000.');
    if (less > 0) parts.push(' The middle one has about ', { strong: money(card.middleAt65) }, ' saved at 65 instead of ', { strong: money(card.baseMiddleAt65) }, '.');
    if (card.best && card.best.inControl > card.inControl) {
      const noun = leverCopy(card.best.lever, inputs).noun;
      parts.push(
        card.best.inControl >= card.baseInControl ? ` ${noun} takes it to ` : ` ${noun} brings it back up to `,
        { strong: num(card.best.inControl) },
        card.best.inControl > card.baseInControl ? ', more than before the worry.' : '.',
      );
    }
  }
  return {
    parts,
    plain: parts.map((p) => (typeof p === 'string' ? p : p.strong)).join(''),
    facts: {
      worry: worryTitle(card.id),
      totalFutures: 1000,
      futuresInControlWithoutTheWorry: card.baseInControl,
      futuresInControlWithTheWorry: card.inControl,
      middleFutureSavedAtAge: 65,
      middleFutureSavedWithoutTheWorry: card.baseMiddleAt65,
      middleFutureSavedWithTheWorry: card.middleAt65,
      bestHabit: card.best ? leverCopy(card.best.lever, inputs).noun : null,
      futuresInControlWithTheWorryAndBestHabit: card.best?.inControl ?? card.inControl,
    },
  };
}

export function planLines(id: LeverId, inputs: Inputs, yearlyMatch: number): [string, string] {
  switch (id) {
    case 'match':
      return inputs.plan === 'unsure'
        ? [
            'Send HR one message today and ask whether your savings plan has employer matching.',
            `If it does, sign up for the full match. That could be about ${money(yearlyMatch)} a year your employer adds.`,
          ]
        : [
            `Raise your plan contribution to ${inputs.matchPct}% of pay, so you get the whole match.`,
            `Your employer then adds about ${money(yearlyMatch)} a year. You set it once with HR or in your plan account.`,
          ];
    case 'auto25':
    case 'auto50':
    case 'auto100':
      return [
        `Set up an automatic monthly transfer of $${id.slice(4)} to long-term savings, on the day your pay arrives.`,
        'It moves before you see it, so there is nothing to remember.',
      ];
    case 'raises':
      return [
        'At your next raise, send one point of it to savings before it reaches your account.',
        'Your take-home pay still goes up. Repeat at each raise.',
      ];
    case 'cushion':
      return [
        `Send $${A.cushionTopUp} a month to a separate savings account until it holds ${inputs.cushionMonths} months of spending.`,
        'Then stop, or point the same amount at long-term savings. You decide.',
      ];
  }
}

export const HR_MESSAGE = 'Hi, does our savings plan have employer matching, and how do I enrol?';
