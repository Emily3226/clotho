export const num = (n: number): string => Math.round(n).toLocaleString('en-CA');
export const money = (n: number): string => `$${num(n)}`;

export function moneyShort(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n)}`;
}

// Rounds to a figure that reads naturally in a sentence.
export function moneyRound(n: number): string {
  if (n >= 1e6) return `$${(Math.round(n / 1e4) / 100).toFixed(2).replace(/0$/, '').replace(/\.0$/, '')} million`;
  if (n >= 10000) return money(Math.round(n / 1000) * 1000);
  return money(Math.round(n / 100) * 100);
}

export const plural = (n: number, one: string, many = `${one}s`): string => `${num(n)} ${n === 1 ? one : many}`;

export function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
