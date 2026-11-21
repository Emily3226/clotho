/// <reference lib="webworker" />
import { persona } from './personas';
import { simulate } from './simulate';
import { NO_LEVERS } from './types';

// The landing page's small river, worked out off the main thread so the page
// can paint and animate without a stall.
const inputs = persona('maya').inputs;
const paths = simulate(inputs, {}, NO_LEVERS, 2026, { paths: 200 });
const years = 70 - inputs.age;
const balances = new Float32Array(paths.length * (years + 1));
const statuses = new Uint8Array(paths.length);
paths.forEach((p, i) => {
  balances.set(p.balances!, i * (years + 1));
  statuses[i] = p.status;
});
(self as unknown as Worker).postMessage({ years, balances, statuses }, [balances.buffer, statuses.buffer]);
