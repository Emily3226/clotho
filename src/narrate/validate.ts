// Shared by the browser and the narration server.
// A narrated sentence is only accepted if every number in it was computed by
// the simulation. Anything else is discarded and the template is used.

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

export function numbersIn(text: string): number[] {
  return (text.match(NUMBER) ?? []).map((m) => Number(m.replace(/,/g, ''))).filter((n) => Number.isFinite(n));
}

export function factNumbers(facts: unknown, into = new Set<number>()): Set<number> {
  if (typeof facts === 'number' && Number.isFinite(facts)) {
    into.add(facts);
    into.add(Math.round(facts));
    if (facts >= 1000 && facts % 1000 === 0) into.add(facts / 1000); // "$640k"
    if (facts >= 1e6) into.add(Math.round(facts / 1e4) / 100); // "1.25 million"
    if (facts >= 1e6) into.add(Math.round(facts / 1e5) / 10);
  } else if (typeof facts === 'string') {
    for (const n of numbersIn(facts)) into.add(n);
  } else if (Array.isArray(facts)) {
    for (const f of facts) factNumbers(f, into);
  } else if (facts && typeof facts === 'object') {
    for (const f of Object.values(facts)) factNumbers(f, into);
  }
  return into;
}

const BANNED = /\b(behind|should have|too late|at risk|danger|doom|invest in|buy|fund|etf|stock pick)\b/i;

export function validateNarration(text: string, facts: unknown, question = ''): boolean {
  if (!text || text.length > 700) return false;
  if (BANNED.test(text)) return false;
  const allowed = factNumbers(facts);
  for (const n of numbersIn(question)) allowed.add(n);
  return numbersIn(text).every((n) => allowed.has(n));
}
