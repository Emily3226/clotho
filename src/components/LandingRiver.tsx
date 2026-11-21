import { useEffect, useRef } from 'react';
import { reducedMotion } from '../lib/format';

const STATUS_VARS = ['--s0', '--s1', '--s2', '--s3'];
const DRAW_MS = 2400;

interface RiverData {
  years: number;
  balances: Float32Array;
  statuses: Uint8Array;
}

// A small, real river on the first screen: 200 of Maya's lives, revealed from
// left to right. The lines are drawn once to an offscreen canvas and each
// frame only moves the reveal, so the animation stays smooth.
export function LandingRiver() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current!;
    const c = canvas.current!;
    const off = document.createElement('canvas');
    let data: RiverData | null = null;
    let raf = 0;
    let start = 0;

    // Draws every line once, at the current size and theme.
    const paint = () => {
      if (!data) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = off.width = Math.round(w * dpr);
      c.height = off.height = Math.round(h * dpr);
      const ctx = off.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = getComputedStyle(el);
      const { years, balances, statuses } = data;
      const n = statuses.length;
      const cols = years + 1;
      const peaks = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let m = 0;
        for (let t = 0; t < cols; t++) m = Math.max(m, balances[i * cols + t]);
        peaks[i] = m;
      }
      peaks.sort();
      const ymax = Math.max(1, peaks[Math.floor(n * 0.95)] * 1.05);
      const X = (t: number) => (t / years) * w;
      const Y = (v: number) => h - 4 - Math.sqrt(Math.max(v, 0) / ymax) * (h - 8);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.2;
      for (let s = 3; s >= 0; s--) {
        ctx.strokeStyle = css.getPropertyValue(STATUS_VARS[s]).trim();
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (statuses[i] !== s) continue;
          ctx.moveTo(X(0), Y(balances[i * cols]));
          for (let t = 1; t < cols; t++) ctx.lineTo(X(t), Y(balances[i * cols + t]));
        }
        ctx.stroke();
      }
    };

    const reveal = (share: number) => {
      const ctx = c.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      const px = Math.max(1, Math.round(c.width * share));
      ctx.drawImage(off, 0, 0, px, c.height, 0, 0, px, c.height);
    };

    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / DRAW_MS);
      reveal(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(frame);
    };

    const worker = new Worker(new URL('../engine/landingRiver.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<RiverData>) => {
      data = e.data;
      worker.terminate();
      paint();
      if (reducedMotion()) return reveal(1);
      start = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(() => {
      if (!data || Math.round(el.clientWidth * Math.min(window.devicePixelRatio || 1, 2)) === c.width) return;
      paint();
      if (performance.now() - start >= DRAW_MS || reducedMotion()) reveal(1);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      worker.terminate();
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className="landing-river" role="img" aria-label="A preview: 200 of one student's possible lives, drawn as lines of savings from age 20 to 70.">
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
