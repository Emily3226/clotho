import type { PathLite } from '../engine/analyse';
import type { EventType } from '../engine/types';
import { num } from './format';

interface Topic {
  type: EventType;
  match: RegExp;
  phrase: string;
}

const TOPICS: Topic[] = [
  { type: 'raid', match: /dip|raid|withdraw|rrsp|retirement savings/i, phrase: 'you have to dip into retirement savings' },
  { type: 'job', match: /job|laid|layoff|fired|unemploy|out of work/i, phrase: 'you are out of work' },
  { type: 'crash', match: /crash|market|recession|stocks?|downturn/i, phrase: 'markets fall 20% or more' },
  { type: 'home', match: /home|house|condo/i, phrase: 'you buy a home' },
  { type: 'cushion', match: /cushion|emergency/i, phrase: 'you use the cushion' },
  { type: 'cost', match: /surprise|cost|bill/i, phrase: 'a surprise cost lands' },
  { type: 'optional', match: /retire|optional|stop working|freedom/i, phrase: 'work becomes optional' },
];

export interface AskResult {
  text: string;
  facts: Record<string, unknown> | null;
}

export const ASK_HINT = 'Try: “What happens if I lose my job at 30?”';

// Answers a question only from the computed futures. No model is involved.
export function ask(question: string, paths: PathLite[]): AskResult {
  const topic = TOPICS.find((t) => t.match.test(question));
  if (!topic) {
    return {
      text: `I can answer from your futures about job loss, market falls, surprise costs, the cushion, dipping into retirement savings, buying a home, or when work becomes optional. ${ASK_HINT}`,
      facts: null,
    };
  }
  const ageMatch = question.match(/\b(1[89]|[2-6]\d|70)\b/);
  const age = ageMatch ? Number(ageMatch[1]) : null;
  const hit = paths.filter((p) => p.events.some((e) => e.type === topic.type && (age === null || Math.abs(e.age - age) <= 1)));
  const n = hit.length;
  const when = age === null ? 'at some point' : `around ${age}`;
  if (n === 0) {
    return {
      text: `In none of your 1,000 futures ${topic.phrase.replace('you are', 'are you').replace('you have', 'do you have')} ${when}.`,
      facts: { totalFutures: 1000, matchingFutures: 0, aroundAge: age },
    };
  }
  const ok = hit.filter((p) => p.status <= 1).length;
  const optional = hit.filter((p) => p.workOptionalAge !== null).length;
  const ages = hit.map((p) => p.workOptionalAge ?? 99).sort((a, b) => a - b);
  const median = ages[Math.floor((ages.length - 1) / 2)];
  const facts = {
    totalFutures: 1000,
    matchingFutures: n,
    aroundAge: age,
    whatHappens: topic.phrase,
    ofThoseInControlOrMostlyThere: ok,
    ofThoseWorkOptionalBy70: optional,
    medianWorkOptionalAge: median < 99 ? median : null,
  };
  if (topic.type === 'optional') {
    return {
      text: `Work becomes optional ${when} in ${num(n)} of your 1,000 futures. ${num(ok)} of those end up in control or mostly there.`,
      facts,
    };
  }
  const tail =
    median < 99
      ? ` In ${num(optional)}, work still becomes optional by 70, most often around ${median}.`
      : ` In ${num(optional)}, work still becomes optional by 70.`;
  return {
    text: `In ${num(n)} of your 1,000 futures, ${topic.phrase} ${when}. ${num(ok)} of those still end up in control or mostly there.${tail}`,
    facts,
  };
}
