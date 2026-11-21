import { hasLife } from '../engine/lifePlan';
import { useStore } from '../store';

const CL = 'https://www.canadalife.com';

// The end of the flow: where to go next, with the challenge's sponsor. Links
// are to Canada Life's own free public resources.
export function CanadaLifeNext() {
  const inputs = useStore((s) => s.inputs);
  const kids = hasLife(inputs.life) && inputs.life.kids > 0;
  const links = [
    { href: `${CL}/investing-saving/retirement/retirement-savings-calculator.html`, label: 'See what your contributions could become' },
    { href: `${CL}/investing-saving/retirement/impact-of-early-retirement-withdrawals-calculator.html`, label: 'See what an early withdrawal costs' },
    kids
      ? { href: `${CL}/blog/starting-a-family.html`, label: 'Read their guide to starting a family' }
      : { href: `${CL}/blog/managing-finances-starting-career.html`, label: 'Read their guide to starting your career' },
  ];
  return (
    <section className="card canada-life" aria-labelledby="cl-title">
      <p className="eyebrow">Your next step, with Canada Life</p>
      <h2 id="cl-title">You’ve picked your step. Here’s where to take it.</h2>
      <p>If your plan at work is with Canada Life, you can set this up in My Canada Life at Work. If it isn’t, these free tools still help:</p>
      <ul className="cl-links">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer">
              {l.label}
              <span className="sr-only"> (opens canadalife.com in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="hint">Clotho was built for Canada Life’s Future Me challenge at Hack Western. It isn’t a Canada Life product or financial advice.</p>
    </section>
  );
}
