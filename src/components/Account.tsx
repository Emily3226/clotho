import { useState } from 'react';
import { deleteAccount, signIn, signOutHere, useAccount } from '../lib/cloud';
import { monthLabel } from '../lib/progress';
import { money, num } from '../lib/format';
import type { Commitment } from '../store';

const WHAT_WE_SAVE = 'Saves your answers, your step and your monthly check-ins to a private account. Optional, and you can delete it any time.';

function Message() {
  const message = useAccount((a) => a.message);
  return (
    <p className="hint" aria-live="polite">
      {message}
    </p>
  );
}

// Beside the calendar buttons.
export function SaveProgressButton() {
  const status = useAccount((a) => a.status);
  const saved = useAccount((a) => a.saved);
  if (status === 'in') return <span className="account-state">{saved ? 'Saved to your account' : 'Signed in'}</span>;
  if (status !== 'out') return null;
  return (
    <button type="button" className="secondary" onClick={() => void signIn()}>
      Sign up to save progress
    </button>
  );
}

export function SaveProgressNote() {
  const status = useAccount((a) => a.status);
  if (status === 'off' || status === 'loading') return null;
  return (
    <>
      {status === 'out' && <p className="hint">Sign up with Google to check in from any device. {WHAT_WE_SAVE}</p>}
      <Message />
    </>
  );
}

// For someone coming back on a new device.
export function SignInLink() {
  const status = useAccount((a) => a.status);
  if (status === 'off' || status === 'loading') return null;
  return (
    <div className="account-link">
      {status === 'out' && (
        <p className="hint">
          Already signed up?{' '}
          <button type="button" className="link" onClick={() => void signIn()}>
            Sign in to check in
          </button>
        </p>
      )}
      <Message />
    </div>
  );
}

export function AccountPanel() {
  const status = useAccount((a) => a.status);
  const who = useAccount((a) => a.who);
  const [confirming, setConfirming] = useState(false);
  if (status === 'off' || status === 'loading') return null;
  if (status === 'out') {
    return (
      <div className="card account-panel">
        <p>
          <b>Keep your progress.</b> Right now it’s only in this browser.
        </p>
        <button type="button" className="secondary" onClick={() => void signIn()}>
          Sign up with Google
        </button>
        <p className="hint">{WHAT_WE_SAVE}</p>
        <Message />
      </div>
    );
  }
  return (
    <div className="card account-panel">
      <p>
        Signed in as <b>{who}</b>
      </p>
      <div className="row">
        <button type="button" className="ghost" onClick={() => void signOutHere()}>
          Sign out
        </button>
        {confirming ? (
          <>
            <button type="button" className="secondary" onClick={() => void deleteAccount()}>
              Yes, delete everything
            </button>
            <button type="button" className="ghost" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" className="ghost" onClick={() => setConfirming(true)}>
            Delete my account
          </button>
        )}
      </div>
      <p className="hint">Signing out also clears this device. Your progress stays in your account.</p>
      <Message />
    </div>
  );
}

export function MonthlyProgress({ commitment }: { commitment: Commitment }) {
  const months = [...(commitment.months ?? [])].reverse();
  const started = commitment.startedISO.slice(0, 7);
  return (
    <section className="months" aria-labelledby="months-title">
      <h2 className="small-head" id="months-title">
        Your months
      </h2>
      <ol>
        {months.map((m) => (
          <li key={m.month}>
            <b>{monthLabel(m.month)}</b>
            <span>
              Kept it · points to {num(m.pointsTo)} · {money(m.saved)} saved
            </span>
          </li>
        ))}
        <li>
          <b>{monthLabel(started)}</b>
          <span>Started at {num(commitment.startInControl)} of 1,000</span>
        </li>
      </ol>
    </section>
  );
}
