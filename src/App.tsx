import { useEffect, useState } from 'react';
import { AssumptionsPanel } from './components/AssumptionsPanel';
import { APP_NAME, DISCLAIMER } from './config';
import { Employer } from './screens/Employer';
import { Explore } from './screens/Explore';
import { Basics, CheckIn, Landing } from './screens/Intro';
import { StepScreen } from './screens/StepScreen';
import { STEPS, useStore, type Theme } from './store';
import { useEngine } from './useEngine';

const isEmployer = () => window.location.hash.startsWith('#/employer') || window.location.pathname.replace(/\/$/, '').endsWith('/employer');
const NEXT_THEME: Record<Theme, Theme> = { auto: 'dark', dark: 'light', light: 'auto' };
const THEME_LABEL: Record<Theme, string> = { auto: 'Auto', dark: 'Dark', light: 'Light' };

export function App() {
  useEngine();
  const step = useStore((s) => s.step);
  const setStep = useStore((s) => s.setStep);
  const theme = useStore((s) => s.theme);
  const set = useStore((s) => s.set);
  const [employer, setEmployer] = useState(isEmployer());

  useEffect(() => {
    const on = () => setEmployer(isEmployer());
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);

  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.title = employer ? `${APP_NAME} for plan sponsors` : `${APP_NAME} · ${STEPS[step]}`;
  }, [employer, step]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="top">
        <a
          className="brand"
          href="#/"
          onClick={() => {
            if (!employer) setStep(0);
          }}
        >
          {APP_NAME}
        </a>
        {!employer && step > 0 && (
          <nav className="steps" aria-label="Progress">
            <ol>
              {STEPS.slice(1).map((label, i) => {
                const n = i + 1;
                return (
                  <li key={label}>
                    <button type="button" aria-current={n === step ? 'step' : undefined} disabled={n > step} onClick={() => setStep(n)} title={label}>
                      <span className="sr-only">
                        Step {n} of {STEPS.length - 1}: {label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <div className="top-actions">
          <button type="button" className="ghost" onClick={() => set({ showAssumptions: true })}>
            Assumptions
          </button>
          <button type="button" className="ghost" onClick={() => set({ theme: NEXT_THEME[theme] })} aria-label={`Colour theme: ${THEME_LABEL[theme]}. Change theme.`}>
            {THEME_LABEL[theme]}
          </button>
        </div>
      </header>

      <main id="main">
        {employer ? (
          <Employer />
        ) : step === 0 ? (
          <Landing />
        ) : step === 1 ? (
          <CheckIn />
        ) : step === 2 ? (
          <Basics />
        ) : step <= 5 ? (
          <Explore />
        ) : (
          <StepScreen />
        )}
      </main>

      <footer className="foot">
        <p>{DISCLAIMER} All amounts are in today’s dollars.</p>
        <p>
          <button type="button" className="link" onClick={() => set({ showAssumptions: true })}>
            Assumptions and sources
          </button>
          {' · '}
          {employer ? <a href="#/">For individuals</a> : <a href="#/employer">For plan sponsors</a>}
        </p>
      </footer>
      <AssumptionsPanel />
    </>
  );
}
