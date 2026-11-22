import { useState } from 'react';
import { useAccount } from '../lib/cloud';
import { useStore } from '../store';

// Clears this visit, plus any user-test results kept in this browser.
export function ClearData() {
  const clearAll = useStore((s) => s.clearAll);
  const tests = useStore((s) => s.testLog.length);
  const signedIn = useAccount((a) => a.status === 'in');
  const [asking, setAsking] = useState(false);
  return (
    <section className="clear-data">
      <h3>Your data</h3>
      <p className="note">{signedIn ? 'Your progress is saved in your account.' : 'Your answers aren’t saved after you leave.'}</p>
      {asking ? (
        <>
          <p role="alert">
            This removes your answers, your step and your streak{tests > 0 ? `, and ${tests} saved user-test ${tests === 1 ? 'result' : 'results'}` : ''} from this page.{signedIn ? ' Your account isn’t deleted. Use Delete my account at your check-in for that.' : ' It can’t be undone.'}
          </p>
          <div className="row">
            <button type="button" className="secondary" onClick={clearAll}>
              Yes, clear it
            </button>
            <button type="button" className="ghost" onClick={() => setAsking(false)}>
              Keep it
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="ghost" onClick={() => setAsking(true)}>
          Clear my data
        </button>
      )}
    </section>
  );
}
