// Seeded random numbers, drawn up front per path so that path i has the same
// luck in every scenario and with every lever (common random numbers).

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFor(seed: number, index: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(index + 1, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

export const MAX_YEARS = 52; // 18 to 70
export const STREAMS = 8;
export const S_STOCK = 0; // normal
export const S_CRASH_U = 1; // uniform
export const S_CRASH_Z = 2; // normal
export const S_BOND = 3; // normal
export const S_WAGE = 4; // normal
export const S_JOB_U = 5; // uniform
export const S_SPELL = 6; // normal
export const S_COST_U = 7; // uniform
export const PER_PATH = MAX_YEARS * STREAMS + 1; // + one uniform for the recession year

function normal(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const cache = new Map<string, Float64Array>();

export function drawsFor(seed: number, paths: number): Float64Array {
  const key = `${seed}:${paths}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = new Float64Array(paths * PER_PATH);
  for (let i = 0; i < paths; i++) {
    const rng = mulberry32(seedFor(seed, i));
    let o = i * PER_PATH;
    for (let y = 0; y < MAX_YEARS; y++) {
      out[o++] = normal(rng);
      out[o++] = rng();
      out[o++] = normal(rng);
      out[o++] = normal(rng);
      out[o++] = normal(rng);
      out[o++] = rng();
      out[o++] = normal(rng);
      out[o++] = rng();
    }
    out[o] = rng();
  }
  if (cache.size > 4) cache.clear();
  cache.set(key, out);
  return out;
}
