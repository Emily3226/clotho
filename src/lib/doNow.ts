// "Do it now": the exact steps for the habit someone picked, and what they
// say they did. Plain words, and no bank, product or provider in the steps.
import { A } from '../engine/assumptions';
import type { Inputs, LeverId } from '../engine/types';

export type Outcome = 'done' | 'sent' | 'notyet';

export interface DoNow {
  // Bank: a recurring transfer. HR: a message. Raise: can't happen today.
  kind: 'bank' | 'hr' | 'plan' | 'raise';
  steps: string[];
  // The outcomes offered, in order. "I sent it" only when there's a message.
  outcomes: Outcome[];
}

export const HR_SUBJECT = 'Question about our workplace savings plan';

export function doNow(id: LeverId, inputs: Inputs): DoNow {
  switch (id) {
    case 'plus1':
      return {
        kind: 'plan',
        steps:
          inputs.employeePct === 0
            ? [
                'Sign in to your workplace plan account, or ask HR how to enrol.',
                'Join the plan and set what you put in to 1% of your pay.',
                'Save it. It starts with your next paycheque, and you can raise it any time.',
              ]
            : [
                'Sign in to your workplace plan account, or ask HR if you don’t have one.',
                `Find your contribution and raise it from ${inputs.employeePct}% to ${inputs.employeePct + 1}% of your pay.`,
                'Save it. It starts with your next paycheque.',
              ],
        outcomes: ['done', 'notyet'],
      };
    case 'auto25':
    case 'auto50':
    case 'auto100':
      return {
        kind: 'bank',
        steps: [
          'Open your banking app and start a new recurring transfer.',
          `Set it to $${id.slice(4)} a month, into long-term savings. A TFSA works well: growth there isn’t taxed.`,
          'Pick the day your pay arrives, and save it.',
        ],
        outcomes: ['done', 'notyet'],
      };
    case 'cushion':
      return {
        kind: 'bank',
        steps: [
          'Open your banking app and start a new recurring transfer.',
          `Set it to $${A.cushionTopUp} a month, into a separate savings account you don’t spend from.`,
          `Pick the day your pay arrives. Stop it once the account holds ${inputs.cushionMonths} months of spending.`,
        ],
        outcomes: ['done', 'notyet'],
      };
    case 'match':
      return inputs.plan === 'unsure'
        ? {
            kind: 'hr',
            steps: ['Send HR the message below. It takes a minute.', 'If your plan has matching, ask to sign up for the full match.'],
            outcomes: ['sent', 'done', 'notyet'],
          }
        : {
            kind: 'hr',
            steps: [
              `Ask HR or your plan administrator to raise what you put in to ${inputs.matchPct}% of your pay.`,
              'That is the most your employer matches, so you get all of it.',
            ],
            outcomes: ['sent', 'done', 'notyet'],
          };
    case 'raises':
      return {
        kind: 'raise',
        steps: [
          'This one starts at your next raise, so it can’t be done today.',
          'Add a reminder for when your next raise or review is likely.',
          'When it comes, send 1% of your pay to savings before it reaches your account.',
        ],
        outcomes: ['done', 'notyet'],
      };
  }
}

export function outcomeLabel(o: Outcome, kind: DoNow['kind']): string {
  if (o === 'sent') return 'I sent it';
  if (o === 'notyet') return 'Not yet';
  return kind === 'raise' ? 'I added the reminder' : 'I set it up';
}

// Said after "My one step" on the summary.
export function outcomeSuffix(o: Outcome | null | undefined): string {
  return o === 'done' ? ' · set up today' : o === 'sent' ? ' · message sent today' : '';
}

export function hrMailto(message: string): string {
  return `mailto:?subject=${encodeURIComponent(HR_SUBJECT)}&body=${encodeURIComponent(message)}`;
}

// For people whose plan is with Canada Life. Taken from Canada Life's own
// member guides: the online service is "My Canada Life at Work", it has a
// Contributions page, and payroll changes go through the employer.
export const CANADA_LIFE_NOTE =
  'If your workplace plan is with Canada Life, you can see it in My Canada Life at Work, under Contributions. Changes to what comes off your pay usually go through HR.';

export const NO_PLAN_NOTE = 'No savings plan at work? Ask your employer whether they offer one. Many match what you put in.';

export const yearFromToday = (from = new Date()): string => {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// The user-test CSV. Rows saved before "outcome" existed export with it blank.
export const CSV_HEAD = 'at,stage,field,confBefore,confAfter,lever,reminder,hrCopied,outcome';

export interface CsvRecord {
  at: string;
  stage: string;
  field: string;
  confBefore: number | null;
  confAfter: number | null;
  lever: string;
  reminder: boolean;
  hrCopied: boolean;
  outcome?: Outcome | null;
}

export function csvRow(r: CsvRecord): string {
  return [r.at, r.stage, r.field, r.confBefore ?? '', r.confAfter ?? '', r.lever, r.reminder, r.hrCopied, r.outcome ?? ''].join(',');
}

export function testCsv(records: CsvRecord[]): string {
  return [CSV_HEAD, ...records.map(csvRow)].join('\n') + '\n';
}

export interface TestSummary {
  people: number;
  // Average out of 10, for people who answered both times.
  confBefore: number | null;
  confAfter: number | null;
  // Said they set it up, sent the message, or added the reminder for a raise.
  tookStep: number;
  // Of those, the ones who only added a reminder for their next raise.
  reminderOnly: number;
}

export function testSummary(records: CsvRecord[]): TestSummary {
  const both = records.filter((r) => r.confBefore !== null && r.confAfter !== null);
  const avg = (v: number[]) => (v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null);
  const took = records.filter((r) => r.outcome === 'done' || r.outcome === 'sent');
  return {
    people: records.length,
    confBefore: avg(both.map((r) => r.confBefore!)),
    confAfter: avg(both.map((r) => r.confAfter!)),
    tookStep: took.length,
    reminderOnly: took.filter((r) => r.lever === 'raises').length,
  };
}
