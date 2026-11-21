import { useEffect, useRef, useState, type ReactNode } from 'react';
import { num, reducedMotion } from '../lib/format';

// A number that visibly moves from its old value to its new one.
export function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || reducedMotion()) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const x = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - x, 3);
      const v = Math.round(start + (value - start) * e);
      from.current = v;
      setShown(v);
      if (x < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="num">{num(shown)}</span>;
}

interface FieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
  onChange: (value: number) => void;
}

// A slider with typed entry. Typed values may go past the slider's range.
export function Field({ id, label, value, min, max, step, prefix, suffix, hint, onChange }: FieldProps) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);
  return (
    <div className="field">
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        <span className="field-entry">
          {prefix && <span aria-hidden="true">{prefix}</span>}
          <input
            id={id}
            inputMode="numeric"
            value={text}
            aria-describedby={hint ? `${id}-hint` : undefined}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d.]/g, '');
              setText(raw);
              const n = Number(raw);
              if (raw !== '' && Number.isFinite(n)) onChange(Math.max(min, n));
            }}
            onFocus={() => {
              focused.current = true;
            }}
            onBlur={() => {
              focused.current = false;
              setText(String(value));
            }}
            style={{ width: `${Math.max(3, text.length + 1)}ch` }}
          />
          {suffix && <span aria-hidden="true">{suffix}</span>}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={Math.min(max, value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Tap-to-explain for any term that is not plain language.
export function Term({ children, explain }: { children: ReactNode; explain: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="term">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {children}
      </button>
      {open && <span className="term-note" role="note">{explain}</span>}
    </span>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}
