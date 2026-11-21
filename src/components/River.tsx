import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Analysis } from '../engine/analyse';
import { STATUS_LABELS } from '../engine/types';
import { timeline } from '../lib/copy';
import { moneyRound, moneyShort, num, reducedMotion } from '../lib/format';
import { useStore } from '../store';

interface Frame {
  bal: Float32Array;
  p25: Float32Array;
  p50: Float32Array;
  p75: Float32Array;
  ymax: number;
  statuses: Uint8Array;
  years: number;
  startAge: number;
  n: number;
}

const M = { left: 44, right: 10, top: 20, bottom: 26 };
const DRAW_MS = 1500;
const MORPH_MS = 600;
const DASHES: number[][] = [[], [9, 4], [3, 4], [1, 5]];
const STATUS_VARS = ['--s0', '--s1', '--s2', '--s3'];
const Y_TICKS = [10e3, 25e3, 50e3, 100e3, 250e3, 500e3, 1e6, 2e6, 3e6, 5e6, 10e6, 20e6];
const MILESTONE_AGES = [35, 45, 65];
const PLAY_MS = 7000;

function frameOf(a: Analysis): Frame {
  const w = a.years + 1;
  const n = a.statuses.length;
  const peaks = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let t = 0; t < w; t++) m = Math.max(m, a.balances[i * w + t]);
    peaks[i] = m;
  }
  peaks.sort();
  const ymax = Math.max(20000, peaks[Math.floor(n * 0.96)] * 1.05);
  return { bal: a.balances, p25: a.band.p25, p50: a.band.p50, p75: a.band.p75, ymax, statuses: a.statuses, years: a.years, startAge: a.startAge, n };
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function lerpArr(a: Float32Array, b: Float32Array, e: number): Float32Array {
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = a[i] + (b[i] - a[i]) * e;
  return out;
}

interface Props {
  analysis: Analysis | null;
  mask: Uint8Array | null;
  selected: number | null;
  onSelect: (index: number | null) => void;
  // A life to play back, drawn year by year with its events shown as it goes.
  playing?: number | null;
  onPlayDone?: (index: number) => void;
}

export function River({ analysis, mask, selected, onSelect, playing = null, onPlayDone }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const baseCanvas = useRef<HTMLCanvasElement>(null);
  const overCanvas = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const anim = useRef<{ from: Frame | null; to: Frame | null; start: number; dur: number; mode: 'draw' | 'morph' | 'none'; raf: number }>({
    from: null,
    to: null,
    start: 0,
    dur: 0,
    mode: 'none',
    raf: 0,
  });
  const maskRef = useRef<Uint8Array | null>(mask);
  const hoverRef = useRef<number | null>(null);
  const selectedRef = useRef<number | null>(selected);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const playRef = useRef<{ index: number; start: number; raf: number } | null>(null);
  const [caption, setCaption] = useState<{ age: number; text: string; kind: string; x: number; y: number } | null>(null);
  // Labels come from the goals this analysis was run with, not today's list.
  const goals = analysis?.goals ?? [];
  const theme = useStore((s) => s.theme);
  const repPos = useRef(3);

  const progress = () => {
    const a = anim.current;
    if (a.mode === 'none' || a.dur === 0) return 1;
    return Math.min(1, (performance.now() - a.start) / a.dur);
  };

  const draw = useCallback(() => {
    const canvas = baseCanvas.current;
    const el = wrap.current;
    const a = anim.current;
    if (!canvas || !el || !a.to) return;
    const { w, h, dpr } = size.current;
    if (w === 0) return;
    const ctx = canvas.getContext('2d')!;
    const css = getComputedStyle(el);
    const colour = (v: string) => css.getPropertyValue(v).trim();
    const raw = progress();
    const e = ease(raw);
    const to = a.to;
    const from = a.mode === 'morph' && a.from ? a.from : null;
    const ymax = from ? from.ymax + (to.ymax - from.ymax) * e : to.ymax;
    const plotW = w - M.left - M.right;
    const plotH = h - M.top - M.bottom;
    const cols = to.years + 1;
    const X = (t: number) => M.left + (t / to.years) * plotW;
    const Y = (v: number) => M.top + plotH - Math.sqrt(Math.max(v, 0) / ymax) * plotH;
    const val = (arrTo: Float32Array, arrFrom: Float32Array | undefined, k: number) =>
      arrFrom ? arrFrom[k] + (arrTo[k] - arrFrom[k]) * e : arrTo[k];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const big = w > 900;
    const fontPx = big ? 13 : 11;
    ctx.font = `${fontPx}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';

    // Grid and axes.
    ctx.strokeStyle = colour('--line');
    ctx.fillStyle = colour('--muted');
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    let lastY = M.top + plotH;
    for (const tick of Y_TICKS) {
      if (tick > ymax) break;
      const y = Y(tick);
      if (lastY - y < 26) continue;
      lastY = y;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(M.left, y);
      ctx.lineTo(w - M.right, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(moneyShort(tick), M.left - 6, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const stepAge = plotW < 420 ? 10 : 5;
    for (let age = Math.ceil(to.startAge / stepAge) * stepAge; age <= to.startAge + to.years; age += stepAge) {
      if (MILESTONE_AGES.includes(age)) continue;
      ctx.fillText(String(age), X(age - to.startAge), M.top + plotH + 8);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(M.left, 0, a.mode === 'draw' ? plotW * e : plotW + 2, h);
    ctx.clip();

    // The thousand lines.
    const m = maskRef.current;
    const baseAlpha = colour('--river-alpha') ? Number(colour('--river-alpha')) : 0.11;
    const fb = from?.bal;
    for (let pass = 0; pass < (m ? 2 : 1); pass++) {
      for (let s = 3; s >= 0; s--) {
        ctx.strokeStyle = colour(STATUS_VARS[s]);
        ctx.globalAlpha = m ? (pass === 0 ? baseAlpha * 0.3 : 0.32) : baseAlpha;
        ctx.lineWidth = (m && pass === 1 ? 1.3 : 1) * (big ? 1.3 : 1);
        let batch = 0;
        ctx.beginPath();
        for (let i = 0; i < to.n; i++) {
          if (to.statuses[i] !== s) continue;
          if (m && (m[i] === 1) !== (pass === 1)) continue;
          const o = i * cols;
          ctx.moveTo(X(0), Y(val(to.bal, fb, o)));
          for (let t = 1; t < cols; t++) ctx.lineTo(X(t), Y(val(to.bal, fb, o + t)));
          if (++batch === 6) {
            ctx.stroke();
            ctx.beginPath();
            batch = 0;
          }
        }
        if (batch) ctx.stroke();
      }
    }

    // Middle half of futures, and the median.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = colour('--accent');
    ctx.beginPath();
    for (let t = 0; t < cols; t++) ctx.lineTo(X(t), Y(val(to.p75, from?.p75, t)));
    for (let t = cols - 1; t >= 0; t--) ctx.lineTo(X(t), Y(val(to.p25, from?.p25, t)));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    for (const [style, width] of [[colour('--surface'), 5], [colour('--ink'), 2.4]] as const) {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let t = 0; t < cols; t++) ctx.lineTo(X(t), Y(val(to.p50, from?.p50, t)));
      ctx.stroke();
    }
    ctx.restore();

    // Milestone markers.
    ctx.textAlign = 'center';
    ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
    for (const age of MILESTONE_AGES) {
      if (age < to.startAge) continue;
      const x = X(age - to.startAge);
      ctx.strokeStyle = colour('--accent');
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, M.top - 4);
      ctx.lineTo(x, M.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = colour('--accent');
      ctx.beginPath();
      ctx.moveTo(x, M.top - 12);
      ctx.lineTo(x + 4, M.top - 8);
      ctx.lineTo(x, M.top - 4);
      ctx.lineTo(x - 4, M.top - 8);
      ctx.closePath();
      ctx.fill();
      ctx.textBaseline = 'top';
      ctx.fillText(String(age), x, M.top + plotH + 8);
    }
  }, []);

  const drawOverlay = useCallback(() => {
    const canvas = overCanvas.current;
    const el = wrap.current;
    const to = anim.current.to;
    if (!canvas || !el) return;
    const { w, h, dpr } = size.current;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!to || w === 0) return;
    const css = getComputedStyle(el);
    const plotW = w - M.left - M.right;
    const plotH = h - M.top - M.bottom;
    const cols = to.years + 1;
    const X = (t: number) => M.left + (t / to.years) * plotW;
    const Y = (v: number) => M.top + plotH - Math.sqrt(Math.max(v, 0) / to.ymax) * plotH;
    const stroke = (i: number, width: number, alpha: number) => {
      const s = to.statuses[i];
      ctx.globalAlpha = alpha;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = css.getPropertyValue('--surface').trim();
      ctx.lineWidth = width + 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let t = 0; t < cols; t++) ctx.lineTo(X(t), Y(to.bal[i * cols + t]));
      ctx.stroke();
      ctx.strokeStyle = css.getPropertyValue(STATUS_VARS[s]).trim();
      ctx.lineWidth = width;
      ctx.setLineDash(DASHES[s]);
      ctx.beginPath();
      for (let t = 0; t < cols; t++) ctx.lineTo(X(t), Y(to.bal[i * cols + t]));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    };
    const play = playRef.current;
    if (play && play.index < to.n) {
      const p = Math.min(1, (performance.now() - play.start) / PLAY_MS);
      const upto = p * to.years;
      const s = to.statuses[play.index];
      const pt = (t: number) => {
        const t0 = Math.floor(t);
        const t1 = Math.min(to.years, t0 + 1);
        const f = t - t0;
        const v = to.bal[play.index * cols + t0] * (1 - f) + to.bal[play.index * cols + t1] * f;
        return [M.left + (t / to.years) * plotW, Y(v)] as const;
      };
      ctx.lineJoin = 'round';
      for (const [style, width] of [[css.getPropertyValue('--surface').trim(), 6], [css.getPropertyValue(STATUS_VARS[s]).trim(), 3.5]] as const) {
        ctx.strokeStyle = style;
        ctx.lineWidth = width;
        ctx.beginPath();
        for (let t = 0; t <= Math.floor(upto); t++) ctx.lineTo(...pt(t));
        ctx.lineTo(...pt(upto));
        ctx.stroke();
      }
      const [hx, hy] = pt(upto);
      ctx.fillStyle = css.getPropertyValue('--ink').trim();
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const hov = hoverRef.current;
    const sel = selectedRef.current;
    if (hov !== null && hov !== sel && hov < to.n) stroke(hov, 2.2, 0.9);
    if (sel !== null && sel < to.n) stroke(sel, 3, 1);
  }, []);

  // Play one life: draw it across the river and show each event as it is reached.
  useEffect(() => {
    if (playing === null || !analysis) {
      playRef.current = null;
      setCaption(null);
      return;
    }
    const rows = timeline(analysis.paths[playing].events, goals);
    const start = performance.now() - (reducedMotion() ? PLAY_MS : 0);
    playRef.current = { index: playing, start, raf: 0 };
    let shown = -1;
    let done = 0;
    const step = () => {
      const pr = playRef.current;
      if (!pr) return;
      drawOverlay();
      const p = Math.min(1, (performance.now() - pr.start) / PLAY_MS);
      const age = analysis.startAge + p * analysis.years;
      let k = -1;
      for (let j = 0; j < rows.length; j++) if (rows[j].age <= age) k = j;
      if (k !== shown && k >= 0) {
        shown = k;
        const { w, h } = size.current;
        const plotW = w - M.left - M.right;
        const plotH = h - M.top - M.bottom;
        const t = Math.min(analysis.years, rows[k].age - analysis.startAge);
        const ymax = anim.current.to?.ymax ?? 1;
        const v = analysis.balances[playing * (analysis.years + 1) + t];
        setCaption({
          age: rows[k].age,
          text: rows[k].text,
          kind: rows[k].kind,
          x: M.left + (t / analysis.years) * plotW,
          y: M.top + plotH - Math.sqrt(Math.max(v, 0) / ymax) * plotH,
        });
      }
      if (p < 1) pr.raf = requestAnimationFrame(step);
      else {
        playRef.current = null;
        done = window.setTimeout(() => {
          setCaption(null);
          onPlayDone?.(playing);
        }, 900);
      }
    };
    step();
    return () => {
      // Leaving mid-play must not select a life afterwards.
      clearTimeout(done);
      if (playRef.current) cancelAnimationFrame(playRef.current.raf);
      playRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, analysis]);

  const tick = useCallback(() => {
    draw();
    if (progress() < 1) anim.current.raf = requestAnimationFrame(tick);
    else {
      anim.current.mode = 'none';
      anim.current.from = null;
      drawOverlay();
    }
  }, [draw, drawOverlay]);

  // New data: draw in the first time, morph each path after that.
  useEffect(() => {
    if (!analysis) return;
    const a = anim.current;
    const next = frameOf(analysis);
    cancelAnimationFrame(a.raf);
    const prev = a.to;
    const compatible = prev && prev.n === next.n && prev.years === next.years;
    if (reducedMotion()) {
      a.mode = 'none';
      a.from = null;
      baseCanvas.current?.animate?.([{ opacity: 0.35 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
    } else if (compatible && prev) {
      const e = a.mode === 'morph' && a.from ? ease(progress()) : 1;
      const cur: Frame =
        e < 1 && a.from
          ? {
              ...prev,
              bal: lerpArr(a.from.bal, prev.bal, e),
              p25: lerpArr(a.from.p25, prev.p25, e),
              p50: lerpArr(a.from.p50, prev.p50, e),
              p75: lerpArr(a.from.p75, prev.p75, e),
              ymax: a.from.ymax + (prev.ymax - a.from.ymax) * e,
            }
          : prev;
      a.from = cur;
      a.mode = 'morph';
      a.dur = MORPH_MS;
    } else {
      a.from = null;
      a.mode = 'draw';
      a.dur = DRAW_MS;
    }
    a.to = next;
    a.start = performance.now();
    const ctx = overCanvas.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, 1e5, 1e5);
    tick();
    return () => cancelAnimationFrame(a.raf);
  }, [analysis, tick]);

  useEffect(() => {
    maskRef.current = mask;
    if (anim.current.mode === 'none') draw();
  }, [mask, draw]);

  useEffect(() => {
    selectedRef.current = selected;
    drawOverlay();
  }, [selected, drawOverlay]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      draw();
      drawOverlay();
    });
    return () => cancelAnimationFrame(id);
  }, [theme, draw, drawOverlay]);

  useEffect(() => {
    const el = wrap.current!;
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.current = { w, h, dpr };
      for (const c of [baseCanvas.current!, overCanvas.current!]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      draw();
      drawOverlay();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', resize);
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', resize);
    };
  }, [draw, drawOverlay]);

  const nearest = (clientX: number, clientY: number): { index: number; x: number; y: number } | null => {
    const to = anim.current.to;
    const el = wrap.current;
    if (!to || !el) return null;
    const rect = el.getBoundingClientRect();
    const { w, h } = size.current;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const plotW = w - M.left - M.right;
    const plotH = h - M.top - M.bottom;
    const t = Math.max(0, Math.min(to.years, Math.round(((px - M.left) / plotW) * to.years)));
    const cols = to.years + 1;
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < to.n; i++) {
      const y = M.top + plotH - Math.sqrt(Math.min(to.bal[i * cols + t], to.ymax * 1.06) / to.ymax) * plotH;
      const d = Math.abs(y - py);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best < 0 ? null : { index: best, x: px, y: py };
  };

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const hit = nearest(e.clientX, e.clientY);
    hoverRef.current = hit?.index ?? null;
    setHover(hit);
    drawOverlay();
  };
  const onLeave = () => {
    hoverRef.current = null;
    setHover(null);
    drawOverlay();
  };
  const onClick = (e: React.MouseEvent) => {
    const hit = nearest(e.clientX, e.clientY);
    if (hit) onSelect(hit.index === selected ? null : hit.index);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!analysis) return;
    const reps = analysis.reps;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') repPos.current = Math.min(reps.length - 1, repPos.current + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') repPos.current = Math.max(0, repPos.current - 1);
    else if (e.key === 'Escape') return onSelect(null);
    else if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onSelect(reps[repPos.current]);
  };

  const summary = useMemo(() => {
    if (!analysis) return 'Working out your thousand futures.';
    const c = analysis.summary.counts;
    const at = (arr: Float32Array) => moneyRound(arr[Math.min(analysis.years, Math.max(0, 65 - analysis.startAge))]);
    return `Of your 1,000 futures: ${num(c[0])} in control, ${num(c[1])} mostly there, ${num(c[2])} tight, ${num(c[3])} off track. At 65, the middle future has about ${at(analysis.band.p50)} saved, and half of all futures fall between ${at(analysis.band.p25)} and ${at(analysis.band.p75)}.`;
  }, [analysis]);

  const tip = hover && analysis ? analysis.paths[hover.index] : null;

  return (
    <div
      ref={wrap}
      className="river"
      tabIndex={0}
      role="group"
      aria-label="River of your 1,000 futures. Savings by age, from now to 70. Use the arrow keys to step through representative futures, from the leanest to the fullest."
      onKeyDown={onKey}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
    >
      <canvas ref={baseCanvas} aria-hidden="true" />
      <canvas ref={overCanvas} aria-hidden="true" />
      {!analysis && <p className="river-wait">Spinning a thousand futures…</p>}
      {caption && (
        <div
          className={`river-caption ${caption.kind}`}
          style={{ left: Math.min(Math.max(caption.x, 110), size.current.w - 110), top: Math.max(caption.y - 18, 30) }}
          aria-live="polite"
        >
          <b>{caption.age}</b> {caption.text}
        </div>
      )}
      {tip && hover && !caption && (
        <div
          className="river-tip"
          style={{ left: Math.min(Math.max(hover.x, 90), size.current.w - 90), top: Math.max(hover.y - 14, 34) }}
        >
          Future {hover.index + 1} · {STATUS_LABELS[tip.status as 0 | 1 | 2 | 3]}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>
    </div>
  );
}
