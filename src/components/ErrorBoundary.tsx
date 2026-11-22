import { Component, type ReactNode } from 'react';
import { STORE_KEY } from '../store';

export function ErrorNote({ onClear }: { onClear?: () => void }) {
  return (
    <section className="narrow error-note" role="alert">
      <h1 className="h-question">That didn’t load.</h1>
      <p className="lede">Reloading usually fixes it. If you signed up, your progress is safe in your account.</p>
      <div className="row">
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          Reload
        </button>
        {onClear && (
          <button type="button" className="ghost" onClick={onClear}>
            Reset and reload
          </button>
        )}
      </div>
    </section>
  );
}

// If a screen ever crashes, show a way out instead of a blank page.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  private clear = () => {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      // Storage may be blocked; reloading is still the best next step.
    }
    window.location.reload();
  };

  render() {
    return this.state.failed ? <ErrorNote onClear={this.clear} /> : this.props.children;
  }
}
