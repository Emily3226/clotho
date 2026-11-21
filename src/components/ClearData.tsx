import { useState } from 'react';
import { useStore } from '../store';

// Everything Clotho keeps is on this device. This removes all of it.
export function ClearData() {
  const clearAll = useStore((s) => s.clearAll);
  const tests = useStore((s) => s.testLog.length);
  const [asking, setAsking] = useState(false);
  return (
    <section className="clear-data">
      <h3>Your data</h3>
      <p className="note">Your answers stay on this device. Nothing is sent anywhere unless you turn on AI wording.</p>
      {asking ? (
        <>
          <p role="alert">
            This removes your answers, your step and your streak{tests > 0 ? `, and ${tests} saved user-test ${tests === 1 ? 'result' : 'results'}` : ''}. It can’t be undone.
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
