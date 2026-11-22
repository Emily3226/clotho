import { useEffect } from 'react';
import { AssumptionsPanel } from './components/AssumptionsPanel';
import { ErrorNote } from './components/ErrorBoundary';
import { APP_NAME } from './config';
import { Explore } from './screens/Explore';
import { About, Landing } from './screens/Intro';
import { Return } from './screens/Return';
import { StepScreen } from './screens/StepScreen';
import { STEP, STEPS, useStore, type Theme } from './store';
import { useEngine } from './useEngine';

const NEXT_THEME: Record<Theme, Theme> = { dark: 'light', light: 'auto', auto: 'dark' };
const THEME_LABEL: Record<Theme, string> = { auto: 'Auto', dark: 'Dark', light: 'Light' };

export function App() {
  useEngine();
  const step = useStore((s) => s.step);
  const setStep = useStore((s) => s.setStep);
  const theme = useStore((s) => s.theme);
  const setState = useStore((s) => s.setState);
  const engineError = useStore((s) => s.engineError);

  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.title = `${APP_NAME} · ${step === STEP.back ? 'Check-in' : STEPS[step]}`;
  }, [step]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="top">
        <a className="brand" href="#/" onClick={() => setStep(STEP.start)}>
          {APP_NAME}
        </a>
        {step > 0 && step < STEP.back && (
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
          <button type="button" className="ghost" onClick={() => setState({ showAssumptions: true })}>
            Assumptions
          </button>
          <button type="button" className="ghost" onClick={() => setState({ theme: NEXT_THEME[theme] })} aria-label={`Colour theme: ${THEME_LABEL[theme]}. Change theme.`}>
            {THEME_LABEL[theme]}
          </button>
        </div>
      </header>

      <main id="main">
        {engineError && step >= STEP.futures ? (
          <ErrorNote />
        ) : step === STEP.start ? (
          <Landing />
        ) : step === STEP.about ? (
          <About />
        ) : step <= STEP.habits ? (
          <Explore />
        ) : step === STEP.pick ? (
          <StepScreen />
        ) : (
          <Return />
        )}
      </main>

      <footer className="foot">
        <p>For educational purposes, not financial advice.</p>
      </footer>
      <AssumptionsPanel />
    </>
  );
}
