import { useEffect, useRef } from 'react';
import { persona } from '../engine/personas';
import { simulate } from '../engine/simulate';
import { NO_LEVERS } from '../engine/types';
import { reducedMotion } from '../lib/format';

const STATUS_VARS = ['--s0', '--s1', '--s2', '--s3'];
const DRAW_MS = 2400;

// A small, real river on the first screen: 200 of Maya's lives, drawn in from
// left to right, so the idea is visible before any question is asked.
export function LandingRiver() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = wrap.current!;
    const c = canvas.current!;
    const inputs = persona('maya').inputs;
    const paths = simulate(inputs, {}, NO_LEVERS, 2026, { paths: 200 });
    const years = 70 - inputs.age;
    const peaks = paths.map((p) => Math.max(...p.balances!)).sort((x, y) => x - y);
    const ymax = peaks[Math.floor(peaks.length * 0.95)] * 1.05;
    let raf = 0;
    const start = performance.now() - (reducedMotion() ? DRAW_MS : 0);

    const draw = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (c.width !== Math.round(w * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const css = getComputedStyle(el);
      const p = Math.min(1, (performance.now() - start) / DRAW_MS);
      const e = 1 - Math.pow(1 - p, 3);
      const X = (t: number) => (t / years) * w;
      const Y = (v: number) => h - 4 - Math.sqrt(Math.max(v, 0) / ymax) * (h - 8);
      const upto = e * years;
      for (let s = 3; s >= 0; s--) {
        ctx.strokeStyle = css.getPropertyValue(STATUS_VARS[s]).trim();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const path of paths) {
          if (path.status !== s) continue;
          const b = path.balances!;
          ctx.moveTo(X(0), Y(b[0]));
          for (let t = 1; t <= Math.floor(upto); t++) ctx.lineTo(X(t), Y(b[t]));
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (p < 1) raf = requestAnimationFrame(draw);
    };
    draw();
    const ro = new ResizeObserver(() => {
      if (performance.now() - start >= DRAW_MS) draw();
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className="landing-river" role="img" aria-label="A preview: 200 of one student's possible lives, drawn as lines of savings from age 20 to 70.">
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
