import { useState } from 'react';
import { ChipGroup, Field, Segmented } from './bits';
import { persona } from '../engine/personas';
import {
  CITIES,
  DEBT_CHIPS,
  FIELDS,
  FINISH_CHIPS,
  HOME_TYPES,
  HOME_WHEN,
  LIVING,
  STAGES,
  fieldSalaryFor,
  isStudent,
  homePriceFor,
  inputsForStage,
  minDownPayment,
} from '../engine/profile';
import { GOAL_WHEN, MAX_GOALS, goalKind, matchGoal, newGoal } from '../engine/goals';
import type { Goal, HomeType, Inputs, Stage } from '../engine/types';
import { classifyGoal } from '../narrate/client';
import { money } from '../lib/format';
import { ROOM_FOR, useStore } from '../store';

// Every question, mostly as taps. Used on its own screen before the results,
// and again beside the river so answers can be changed and the river moves.
export function AboutYou({ live = false }: { live?: boolean }) {
  const inputs = useStore((s) => s.inputs);
  const room = useStore((s) => s.room);
  const incomeEdited = useStore((s) => s.incomeEdited);
  const setState = useStore((s) => s.setState);
  const answerLive = useStore((s) => s.answer);

  // Before the results, just change the inputs. Beside the river, say what changed.
  const answer = (label: string, patch: Partial<Inputs>, whyDown?: string) =>
    live ? answerLive(label, patch, whyDown) : setState({ inputs: { ...useStore.getState().inputs, ...patch } });

  const setStage = (stage: Stage, label: string) => {
    const next = inputsForStage(stage, inputs.age, inputs);
    setState({ incomeEdited: false });
    answer(label, next);
  };
  const pickField = (field: Inputs['field'], label: string) => {
    const patch: Partial<Inputs> = { field };
    if ((inputs.stage === 'first' || inputs.stage === 'full') && !incomeEdited) {
      const income = fieldSalaryFor(inputs.stage, field);
      patch.income = income;
      patch.monthly = Math.round((inputs.monthly * income) / Math.max(1, inputs.income) / 5) * 5;
    }
    const before = isStudent(inputs.stage) ? fieldSalaryFor('first', inputs.field) : inputs.income;
    const after = isStudent(inputs.stage) ? fieldSalaryFor('first', field) : (patch.income ?? inputs.income);
    answer(label, patch, after > before ? 'Higher pay, but CPP and OAS cover less of it, so that lifestyle takes more saving.' : undefined);
  };
  const toggleRoom = (id: string) => {
    const on = !room.includes(id);
    setState({ room: on ? [...room, id] : room.filter((r) => r !== id) });
    if (id === 'home') answer(on ? 'Room for a home' : 'No home goal', { home: on ? { price: 0, byAge: Math.max(35, inputs.age + 3), type: 'condo' } : null });
  };
  const home = inputs.home;
  const homeType = home?.type ?? null;
  const price = home ? (home.type ? homePriceFor(inputs.city, home.type) : home.price) : 0;
  const debtValue = !inputs.debt ? 'none' : inputs.debt.balance >= 25000 ? 'lots' : 'some';
  // Match the years left to the nearest chip: this year, next year, 2–3 years, 4+.
  const left = Math.max(0, inputs.finishAge - inputs.age);
  const finishValue = left <= 1 ? left : left <= 3 ? 3 : 4;
  const homeWhen = home ? (HOME_WHEN.find((w) => w.age === home.byAge)?.age ?? null) : null;

  return (
    <div className="about">
      <div className="fields two">
        <Field
          id="age"
          label="Age"
          value={inputs.age}
          min={18}
          max={35}
          step={1}
          onChange={(v) => {
            const age = Math.min(35, Math.max(18, Math.round(v)));
            setState({ inputs: { ...inputs, age, finishAge: Math.max(age, inputs.finishAge), moveOutAge: Math.max(age + 1, inputs.moveOutAge) } });
          }}
        />
        <Field id="monthly" label="You could set aside" value={inputs.monthly} min={0} max={1000} step={5} prefix="$" suffix="a month" hint="Before any student loan payments." onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, monthly: v } })} />
      </div>

      <ChipGroup legend="Right now" selected={(v) => v === inputs.stage} options={STAGES.map((s) => ({ value: s.id, label: s.label }))} onPick={setStage} />
      <ChipGroup legend={isStudent(inputs.stage) ? 'Studying' : 'Field'} selected={(v) => v === inputs.field} options={FIELDS.map((f) => ({ value: f.id, label: f.label }))} onPick={(v, l) => pickField(v, l)} />
      <ChipGroup legend="Where" selected={(v) => v === inputs.city} options={CITIES.map((c) => ({ value: c.id, label: c.label }))} onPick={(v, l) => answer(l, { city: v })} />

      <details className="drawer">
        <summary>More (optional)</summary>
        <div className="fields">
          {isStudent(inputs.stage) && (
            <ChipGroup legend="Finishing school" selected={(v) => v === finishValue} options={FINISH_CHIPS.map((f) => ({ value: f.years, label: f.label }))} onPick={(v, l) => answer(`Finishing ${l.toLowerCase()}`, { finishAge: inputs.age + v })} />
          )}
          <ChipGroup legend="You want room for" options={ROOM_FOR.map((r) => ({ value: r.id, label: r.label }))} selected={(v) => room.includes(v)} onPick={(v) => toggleRoom(v)} />
          {home && (
            <div className="home-q">
              <ChipGroup<HomeType>             legend="What kind of home?"
                selected={(v) => v === homeType}
                options={HOME_TYPES.map((h) => ({ value: h.id, label: h.label }))}
                onPick={(v, l) => answer(`A ${l.toLowerCase()}`, { home: { ...home, type: v } })}
              />
              <ChipGroup legend="When?" selected={(v) => v === homeWhen} options={HOME_WHEN.map((w) => ({ value: w.age, label: w.label }))} onPick={(v, l) => answer(`Home ${l.toLowerCase()}`, { home: { ...home, byAge: Math.max(v, inputs.age + 1) } })} />
              {price > 0 && (
                <p className="hint">
                  ~{money(price)} · {money(minDownPayment(price))} down
                </p>
              )}
            </div>
          )}
          <ChipGroup
            legend="Living"
            selected={(v) => v === inputs.living}
            options={LIVING.map((l) => ({ value: l.id, label: l.label }))}
            onPick={(v, l) => answer(l, { living: v, ...(v === 'family' ? { moveOutAge: Math.max(inputs.age + 1, inputs.moveOutAge) } : {}) })}
          />
          <ChipGroup
            legend="Student debt"
            selected={(v) => v === debtValue}
            options={DEBT_CHIPS.map((d) => ({ value: d.id, label: d.label }))}
            onPick={(v, l) => {
              const chip = DEBT_CHIPS.find((d) => d.id === v)!;
              answer(`Debt: ${l.toLowerCase()}`, { debt: chip.balance ? { balance: chip.balance, rate: 5 } : null });
            }}
          />
          <GoalsEditor answer={answer} />
          <Field
            id="income"
            label={isStudent(inputs.stage) ? 'Income now (part-time is fine)' : 'Income before tax'}
            value={inputs.income}
            min={0}
            max={200000}
            step={1000}
            prefix="$"
            onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, income: v }, incomeEdited: true })}
          />
          <Field id="saved" label="Saved so far" value={inputs.saved} min={0} max={100000} step={500} prefix="$" onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, saved: v } })} />
          {!isStudent(inputs.stage) && (
            <fieldset className="q">
              <legend>Savings plan with matching at work?</legend>
              <Segmented
                label="Workplace savings plan"
                value={inputs.plan}
                onChange={(plan) => setState({ inputs: { ...useStore.getState().inputs, plan } })}
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                  { value: 'unsure', label: 'Not sure' },
                ]}
              />
            </fieldset>
          )}
          {inputs.plan === 'yes' && !isStudent(inputs.stage) && (
            <div className="fields two">
              <Field id="emp" label="You put in" value={inputs.employeePct} min={0} max={15} step={0.5} suffix="%" onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, employeePct: Math.min(30, v) } })} />
              <Field id="match" label="Employer matches up to" value={inputs.matchPct} min={0} max={10} step={0.5} suffix="%" onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, matchPct: Math.min(20, v) } })} />
            </div>
          )}
          {home && (
            <Field
              id="price"
              label="Home price, if you know it"
              value={price}
              min={150000}
              max={2000000}
              step={10000}
              prefix="$"
              onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, home: { price: v, byAge: home.byAge } } })}
            />
          )}
        </div>
      </details>
    </div>
  );
}

// Anything else, in the person's own words. Typing a goal asks two follow-up
// questions: about how much, and when. A typical amount is suggested from the
// app's own table; a language model may only help pick which kind it is.
function GoalsEditor({ answer }: { answer: (label: string, patch: Partial<Inputs>) => void }) {
  const inputs = useStore((s) => s.inputs);
  const aiOn = useStore((s) => s.aiOn);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const goals = inputs.goals ?? [];

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || goals.length >= MAX_GOALS) return;
    setBusy(true);
    let kind = matchGoal(t);
    if (kind === 'other' && aiOn) kind = (await classifyGoal(t)) ?? 'other';
    setBusy(false);
    setText('');
    answer(`Room for ${t}`, { goals: [...goals, newGoal(t, kind, inputs.age)] });
  };
  const update = (id: string, patch: Partial<Goal>, label: string) =>
    answer(label, { goals: goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const remove = (id: string) => answer('Goal removed', { goals: goals.filter((g) => g.id !== id) });

  return (
    <div className="goals">
      {goals.map((g) => {
        const kind = goalKind(g.kind);
        const years = g.byAge - inputs.age;
        return (
          <div className="home-q goal" key={g.id}>
            <div className="goal-head">
              <b>{g.label}</b>
              <button type="button" className="link" onClick={() => remove(g.id)} aria-label={`Remove ${g.label}`}>
                Remove
              </button>
            </div>
            <Field
              id={`cost-${g.id}`}
              label="Cost"
              value={g.cost}
              min={500}
              max={100000}
              step={500}
              prefix="$"
              hint={kind.typical ? `Typical: ~${money(kind.typical)}` : undefined}
              onChange={(v) => update(g.id, { cost: Math.max(0, Math.round(v)) }, `${g.label} at ${money(v)}`)}
            />
            <ChipGroup
              legend="When?"
              selected={(v) => v === years}
              options={GOAL_WHEN.map((w) => ({ value: w.years, label: w.label }))}
              onPick={(v, l) => update(g.id, { byAge: inputs.age + v }, `${g.label} ${l.toLowerCase()}`)}
            />
            <p className="hint">
              ≈ <b>{money(Math.ceil(g.cost / Math.max(1, years * 12) / 5) * 5)}/mo</b> for {years === 1 ? '1 year' : `${years} years`}
            </p>
          </div>
        );
      })}
      {goals.length < MAX_GOALS && (
        <form className="goal-add" onSubmit={add}>
          <label className="q-label" htmlFor="goal-text">
            Anything else?
          </label>
          <div className="goal-row">
            <input
              id="goal-text"
              value={text}
              maxLength={60}
              autoComplete="off"
              placeholder="A trip to Japan, a car, grad school…"
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="secondary" disabled={!text.trim() || busy}>
              {busy ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// On stage: the same age and savings, a different life.
export function CompareCard() {
  const personaId = useStore((s) => s.personaId);
  const answer = useStore((s) => s.answer);
  const setState = useStore((s) => s.setState);
  const other = personaId === 'maya' ? persona('priya') : personaId === 'priya' ? persona('maya') : null;
  if (!other) return null;
  const first = other.name.split(',')[0];
  return (
    <div className="card compare">
      <p>
        <b>Same age, different life.</b>
      </p>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          answer(`Switched to ${first}`, other.inputs);
          setState({ personaId: other.id, room: other.room });
        }}
      >
        Switch to {first}
      </button>
    </div>
  );
}
