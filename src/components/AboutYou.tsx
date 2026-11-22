import { useState } from 'react';
import { ChipGroup, Field, Segmented } from './bits';
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
import { matchCity, matchField, matchLiving, matchStage } from '../engine/concerns';
import type { City, FieldId, Goal, HomeType, Inputs, Living, Stage } from '../engine/types';
import { classifyGoal } from '../narrate/client';
import { money } from '../lib/format';
import { STEP, useStore } from '../store';
import { MAX_AGE } from '../engine/assumptions';
import { LifeChoices } from './LifeChoices';
import { OtherAnswer } from './OtherAnswer';

// Every question, mostly as taps. Used on its own screen before the results,
// and again beside the river so answers can be changed and the river moves.
export function AboutYou({ live = false }: { live?: boolean }) {
  const inputs = useStore((s) => s.inputs);
  const room = useStore((s) => s.room);
  const incomeEdited = useStore((s) => s.incomeEdited);
  const setState = useStore((s) => s.setState);
  const answerLive = useStore((s) => s.answer);
  const setStep = useStore((s) => s.setStep);

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
  const others = useStore((s) => s.others);
  const setOther = (key: 'stage' | 'city' | 'living', text: string | undefined) => {
    const next = { ...useStore.getState().others };
    if (text === undefined) delete next[key];
    else next[key] = text;
    setState({ others: next });
  };
  const pickLiving = (v: Living, label: string) =>
    answer(label, { living: v, ...(v === 'family' ? { moveOutAge: Math.max(inputs.age + 1, inputs.moveOutAge) } : {}) });
  const home = inputs.home;
  const homeType = home?.type ?? null;
  const price = home ? (home.type ? homePriceFor(inputs.city, home.type) : home.price) : 0;
  const fieldOther = useStore((s) => s.fieldOther);
  const chipDebt = DEBT_CHIPS.find((d) => d.balance > 0 && d.balance === inputs.debt?.balance);
  // "Other amount" stays open while the amount is being changed.
  const [debtOther, setDebtOther] = useState(!!inputs.debt && !chipDebt);
  const debtValue = !inputs.debt ? 'none' : debtOther || !chipDebt ? 'other' : chipDebt.id;
  // Match the years left to the nearest chip: this year, next year, 2–3 years, 4+.
  const left = Math.max(0, inputs.finishAge - inputs.age);
  const finishValue = left <= 1 ? left : left <= 3 ? 3 : 4;
  const homeWhen = home ? (HOME_WHEN.find((w) => w.age === home.byAge)?.age ?? null) : null;

  // Past 30 the stage's starting savings say little, so ask up front.
  const older = inputs.age >= 30;
  const savedField = (
    <Field
      id="saved"
      label="Saved so far"
      value={inputs.saved}
      min={0}
      max={older ? 1000000 : 100000}
      step={older ? 5000 : 500}
      prefix="$"
      hint={older ? 'Everything you could use: savings, TFSA, RRSP and workplace plan.' : undefined}
      onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, saved: v } })}
    />
  );
  return (
    <div className="about">
      <div className="fields two">
        <Field
          id="age"
          label="Age"
          value={inputs.age}
          min={18}
          max={MAX_AGE}
          step={1}
          onChange={(v) => {
            const age = Math.min(MAX_AGE, Math.max(18, Math.round(v)));
            setState({ inputs: { ...inputs, age, finishAge: Math.max(age, inputs.finishAge), moveOutAge: Math.max(age + 1, inputs.moveOutAge) } });
          }}
        />
        <Field id="monthly" label="You could set aside" value={inputs.monthly} min={0} max={1000} step={5} prefix="$" suffix="a month" hint={inputs.debt ? 'Include what goes to student loans.' : undefined} onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, monthly: v } })} />
      </div>
      {older && savedField}

      <ChipGroup<Stage | 'other'>
        legend="Right now"
        selected={(v) => (v === 'other' ? others.stage !== undefined : others.stage === undefined && v === inputs.stage)}
        options={[...STAGES.map((s) => ({ value: s.id as Stage | 'other', label: s.label })), { value: 'other', label: 'Other' }]}
        onPick={(v, l) => {
          if (v === 'other') return setOther('stage', others.stage ?? '');
          setOther('stage', undefined);
          setStage(v, l);
        }}
      />
      {others.stage !== undefined && (
        <OtherAnswer<Stage>
          id="other-stage"
          label="What’s your situation?"
          placeholder="Apprentice, between jobs, on leave…"
          type="stage"
          text={others.stage}
          current={others.stage ? inputs.stage : null}
          options={STAGES.map((s) => ({ value: s.id, label: s.label }))}
          match={matchStage}
          onUse={(text, v) => {
            setOther('stage', text);
            if (v) setStage(v, text);
          }}
        />
      )}
      <ChipGroup<FieldId | 'other'>
        legend={isStudent(inputs.stage) ? 'Studying' : 'Field'}
        selected={(v) => (v === 'other' ? fieldOther !== null : fieldOther === null && v === inputs.field)}
        options={[...FIELDS.map((f) => ({ value: f.id as FieldId | 'other', label: f.label })), { value: 'other', label: 'Other' }]}
        onPick={(v, l) => {
          // Until a field is typed, use the middle figure rather than the last chip.
          if (v === 'other') {
            setState({ fieldOther: fieldOther ?? '' });
            if (fieldOther === null && inputs.field !== 'unsure') pickField('unsure', 'Other field');
            return;
          }
          setState({ fieldOther: null });
          pickField(v, l);
        }}
      />
      {fieldOther !== null && (
        <OtherAnswer<FieldId>
          id="field-text"
          label="What field?"
          placeholder="Nursing, film, plumbing…"
          type="field"
          text={fieldOther}
          current={fieldOther && inputs.field !== 'unsure' ? inputs.field : null}
          options={FIELDS.filter((f) => f.id !== 'unsure').map((f) => ({ value: f.id, label: f.label }))}
          match={matchField}
          describe={(v) => {
            const f = FIELDS.find((x) => x.id === v)!;
            return `Closest we have pay figures for: ${f.label}, about ${money(f.salary)} to start.`;
          }}
          onUse={(text, field) => {
            setState({ fieldOther: text });
            pickField(field ?? 'unsure', text);
          }}
        />
      )}
      <ChipGroup<City | 'other'>
        legend="Where"
        selected={(v) => (v === 'other' ? others.city !== undefined : others.city === undefined && v === inputs.city)}
        options={[...CITIES.map((c) => ({ value: c.id as City | 'other', label: c.label })), { value: 'other', label: 'Other' }]}
        onPick={(v, l) => {
          if (v === 'other') return setOther('city', others.city ?? '');
          setOther('city', undefined);
          answer(l, { city: v });
        }}
      />
      {others.city !== undefined && (
        <OtherAnswer<City>
          id="other-city"
          label="Where do you live?"
          placeholder="Your city or town"
          type="city"
          text={others.city}
          current={others.city && inputs.city ? inputs.city : null}
          options={CITIES.map((c) => ({ value: c.id, label: c.label }))}
          match={matchCity}
          describe={(v) => `We’ll use costs for: ${CITIES.find((c) => c.id === v)!.label}.`}
          onUse={(text, v) => {
            setOther('city', text);
            answer(text, v ? { city: v } : { city: null });
          }}
        />
      )}

      {live ? (
        <p className="hint">
          <button type="button" className="link" onClick={() => setStep(STEP.about)}>
            Kids, home, debt and more
          </button>
        </p>
      ) : (
      <details className="drawer">
        <summary>Kids, home, debt and more (optional)</summary>
        <div className="fields">
      <LifeChoices answer={answer} homeOn={!!home} onHome={() => toggleRoom('home')} />
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
      <GoalsEditor answer={answer} />
          {isStudent(inputs.stage) && (
            <ChipGroup legend="Finishing school" selected={(v) => v === finishValue} options={FINISH_CHIPS.map((f) => ({ value: f.years, label: f.label }))} onPick={(v, l) => answer(`Finishing ${l.toLowerCase()}`, { finishAge: inputs.age + v })} />
          )}
          <ChipGroup<Living | 'other'>
            legend="Living"
            selected={(v) => (v === 'other' ? others.living !== undefined : others.living === undefined && v === inputs.living)}
            options={[...LIVING.map((l) => ({ value: l.id as Living | 'other', label: l.label })), { value: 'other', label: 'Other' }]}
            onPick={(v, l) => {
              if (v === 'other') return setOther('living', others.living ?? '');
              setOther('living', undefined);
              pickLiving(v, l);
            }}
          />
          {others.living !== undefined && (
            <OtherAnswer<Living>
              id="other-living"
              label="What’s your living situation?"
              placeholder="With roommates, in residence…"
              type="living"
              text={others.living}
              current={others.living && inputs.living ? inputs.living : null}
              options={LIVING.map((l) => ({ value: l.id, label: l.label }))}
              match={matchLiving}
              onUse={(text, v) => {
                setOther('living', text);
                if (v) pickLiving(v, text);
                else answer(text, { living: null });
              }}
            />
          )}
          <ChipGroup
            legend="Student debt"
            selected={(v) => v === debtValue}
            options={[...DEBT_CHIPS.map((d) => ({ value: d.id as string, label: d.label as string })), { value: 'other', label: 'Other amount' }]}
            onPick={(v, l) => {
              if (v === 'other') {
                setDebtOther(true);
                if (!inputs.debt) answer('Debt: other amount', { debt: { balance: 25000, rate: 5 } });
                return;
              }
              setDebtOther(false);
              const chip = DEBT_CHIPS.find((d) => d.id === v)!;
              answer(`Debt: ${l.toLowerCase()}`, { debt: chip.balance ? { balance: chip.balance, rate: 5 } : null });
            }}
          />
          {debtValue === 'other' && inputs.debt && (
            <Field
              id="debt-amount"
              label="About how much student debt?"
              value={inputs.debt.balance}
              // At least $500, so the field never vanishes mid-drag; "None" clears the debt.
              min={500}
              max={150000}
              step={500}
              prefix="$"
              onChange={(v) => answer(`Debt: ${money(v)}`, { debt: { balance: Math.round(v), rate: inputs.debt?.rate ?? 5 } })}
            />
          )}
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
          {!older && savedField}
          {!isStudent(inputs.stage) && (
            <fieldset className="q">
              <legend>Does your job add money when you save?</legend>
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
              <Field id="emp" label="You save from each paycheque" value={inputs.employeePct} min={0} max={15} step={0.5} suffix="% of pay" onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, employeePct: Math.min(30, v) } })} />
              <Field id="match" label="Your employer adds, up to" value={inputs.matchPct} min={0} max={10} step={0.5} suffix="% of pay" onChange={(v) => setState({ inputs: { ...useStore.getState().inputs, matchPct: Math.min(20, v) } })} />
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
      )}
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
