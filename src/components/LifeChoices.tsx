import { ChipGroup, Field } from './bits';
import { EMPTY_LIFE, lifeCost, normaliseLife, type LifePlan, type Raising } from '../engine/lifePlan';
import type { Inputs } from '../engine/types';
import { money } from '../lib/format';
import { useStore } from '../store';

const ROOM_IDS = ['kids', 'family', 'travel', 'time', 'career'];

function roomFor(p: LifePlan, room: string[]): string[] {
  const kept = room.filter((r) => !ROOM_IDS.includes(r));
  if (p.kids > 0) kept.push('kids');
  if (p.familyMonthly > 0 || p.care) kept.push('family');
  if (p.travelYearly > 0) kept.push('travel');
  if (p.breakMonths > 0 || p.fourDay) kept.push('time');
  if (p.schoolYears > 0) kept.push('career');
  return kept;
}

// Ages still ahead, always including the one currently chosen.
const agesFrom = (list: number[], age: number, current: number): { value: number; label: string }[] =>
  [...new Set([...list.filter((a) => a > age), current])].sort((a, b) => a - b).map((a) => ({ value: a, label: `Age ${a}` }));

interface Props {
  answer: (label: string, patch: Partial<Inputs>) => void;
  homeOn: boolean;
  onHome: () => void;
}

// What someone wants out of life. Each is a choice, and none is assumed.
export function LifeChoices({ answer, homeOn, onHome }: Props) {
  const inputs = useStore((s) => s.inputs);
  const room = useStore((s) => s.room);
  const setState = useStore((s) => s.setState);
  const stored = inputs.life ?? EMPTY_LIFE;
  const plan = normaliseLife(stored, inputs.age);

  const update = (label: string, patch: Partial<LifePlan>) => {
    const life = { ...stored, ...patch };
    setState({ room: roomFor(life, room) });
    answer(label, { life });
  };

  const toggles: { id: string; label: string; on: boolean; flip: () => void }[] = [
    { id: 'kids', label: 'Kids', on: plan.kids > 0, flip: () => update(plan.kids > 0 ? 'No kids' : 'One child', { kids: plan.kids > 0 ? 0 : 1 }) },
    { id: 'home', label: 'A home', on: homeOn, flip: onHome },
    { id: 'family', label: 'Helping family with money', on: plan.familyMonthly > 0, flip: () => update('Helping family', { familyMonthly: plan.familyMonthly > 0 ? 0 : 250 }) },
    { id: 'care', label: 'Caring for a parent', on: plan.care, flip: () => update('Caring for a parent', { care: !plan.care }) },
    { id: 'travel', label: 'Travel', on: plan.travelYearly > 0, flip: () => update('Travel', { travelYearly: plan.travelYearly > 0 ? 0 : 3000 }) },
    { id: 'break', label: 'Time off', on: plan.breakMonths > 0, flip: () => update('Time off', { breakMonths: plan.breakMonths > 0 ? 0 : 6 }) },
    { id: 'school', label: 'Back to school', on: plan.schoolYears > 0, flip: () => update('Back to school', { schoolYears: plan.schoolYears > 0 ? 0 : 1 }) },
    { id: 'fourDay', label: 'A four-day week', on: plan.fourDay, flip: () => update('A four-day week', { fourDay: !plan.fourDay }) },
  ];

  const kidYear = plan.kids > 0 ? lifeCost({ ...plan, familyMonthly: 0, travelYearly: 0, care: false, schoolYears: 0 }, plan.firstKidAge, inputs.income) : 0;

  return (
    <section className="life" aria-labelledby="life-title">
      <h2 className="q-label" id="life-title">
        What do you want in life?
      </h2>
      <p className="hint">Pick anything that’s true for you. None is a fine answer.</p>
      <ChipGroup legend="Life choices" label="" selected={(v) => toggles.find((t) => t.id === v)!.on} options={toggles.map((t) => ({ value: t.id, label: t.label }))} onPick={(v) => toggles.find((t) => t.id === v)!.flip()} />

      {plan.kids > 0 && (
        <div className="home-q">
          <ChipGroup legend="How many kids?" selected={(v) => v === plan.kids} options={[0, 1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))} onPick={(v) => update(v === 0 ? 'No kids' : `${v} ${v === 1 ? 'child' : 'kids'}`, { kids: v })} />
          <ChipGroup legend="When would you have your first?" selected={(v) => v === plan.firstKidAge} options={agesFrom([25, 28, 30, 32, 35, 38, 40], inputs.age, plan.firstKidAge)} onPick={(v) => update(`First child at ${v}`, { firstKidAge: v })} />
          <ChipGroup<Raising> legend="Raising them" selected={(v) => v === plan.raising} options={[{ value: 'partner', label: 'With a partner' }, { value: 'solo', label: 'On my own' }]} onPick={(v, l) => update(l, { raising: v })} />
          <ChipGroup legend="Time off for each child" selected={(v) => v === plan.leaveMonths} options={[0, 6, 12].map((m) => ({ value: m, label: m ? `${m} months` : 'None' }))} onPick={(v, l) => update(`Leave: ${l.toLowerCase()}`, { leaveMonths: v })} />
          <p className="hint">About {money(Math.round(kidYear / 100) * 100)} a year to you for the first child, after the Canada Child Benefit.</p>
        </div>
      )}
      {plan.familyMonthly > 0 && (
        <div className="home-q">
          <Field id="life-family" label="Helping family" value={plan.familyMonthly} min={0} max={1500} step={25} prefix="$" suffix="a month" onChange={(v) => update('Helping family', { familyMonthly: Math.round(v) })} />
          <ChipGroup legend="When would you start helping?" selected={(v) => v === plan.familyFromAge} options={agesFrom([25, 30, 35, 40, 50], inputs.age, plan.familyFromAge)} onPick={(v) => update(`Helping family from ${v}`, { familyFromAge: v })} />
        </div>
      )}
      {plan.care && (
        <div className="home-q">
          <ChipGroup legend="When might that start?" selected={(v) => v === plan.careAge} options={agesFrom([40, 45, 50, 55], inputs.age, plan.careAge)} onPick={(v) => update(`Caring for a parent from ${v}`, { careAge: v })} />
          <p className="hint">Five years, working about four days a week.</p>
        </div>
      )}
      {plan.travelYearly > 0 && (
        <div className="home-q">
          <Field id="life-travel" label="Travel" value={plan.travelYearly} min={0} max={15000} step={250} prefix="$" suffix="a year" onChange={(v) => update('Travel', { travelYearly: Math.round(v) })} />
        </div>
      )}
      {plan.breakMonths > 0 && (
        <div className="home-q">
          <ChipGroup legend="How long off?" selected={(v) => v === plan.breakMonths} options={[3, 6, 12].map((m) => ({ value: m, label: `${m} months` }))} onPick={(v, l) => update(`Time off: ${l}`, { breakMonths: v })} />
          <ChipGroup legend="When would you take it?" selected={(v) => v === plan.breakAge} options={agesFrom([25, 30, 35, 40, 50], inputs.age, plan.breakAge)} onPick={(v) => update(`Time off at ${v}`, { breakAge: v })} />
        </div>
      )}
      {plan.schoolYears > 0 && (
        <div className="home-q">
          <ChipGroup legend="How long in school?" selected={(v) => v === plan.schoolYears} options={[1, 2, 4].map((y) => ({ value: y, label: y === 1 ? '1 year' : `${y} years` }))} onPick={(v, l) => update(`School: ${l}`, { schoolYears: v })} />
          <ChipGroup legend="When would you go back?" selected={(v) => v === plan.schoolAge} options={agesFrom([25, 28, 30, 35, 40], inputs.age, plan.schoolAge)} onPick={(v) => update(`School at ${v}`, { schoolAge: v })} />
        </div>
      )}
      {plan.fourDay && (
        <div className="home-q">
          <ChipGroup legend="When would you switch?" selected={(v) => v === plan.fourDayAge} options={agesFrom([30, 35, 40, 50], inputs.age, plan.fourDayAge)} onPick={(v) => update(`Four-day week from ${v}`, { fourDayAge: v })} />
          <p className="hint">Four-fifths of the pay, with a lifestyle that shifts part of the way to match.</p>
        </div>
      )}
    </section>
  );
}
