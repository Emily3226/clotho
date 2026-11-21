import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SEED } from './config';
import type { Analysis } from './engine/analyse';
import { DEFAULT_INPUTS } from './engine/personas';
import { NO_LEVERS, type Inputs, type LeverId, type Levers, type Scenario, type Severity, type WorryId } from './engine/types';

export type Theme = 'auto' | 'light' | 'dark';
export const STEPS = ['Start', 'Check-in', 'Basics', 'Your futures', 'Your worries', 'What you control', 'Your one step'] as const;

interface Store {
  step: number;
  inputs: Inputs;
  worries: Scenario;
  activeWorry: WorryId | 'all' | null;
  levers: Levers;
  confBefore: number | null;
  confAfter: number | null;
  chosen: LeverId | null;
  seed: number;
  aiOn: boolean;
  theme: Theme;
  analysis: Analysis | null;
  computing: boolean;
  selectedPath: number | null;
  showAssumptions: boolean;

  setStep: (step: number) => void;
  setInputs: (patch: Partial<Inputs>) => void;
  toggleWorry: (id: WorryId) => void;
  setSeverity: (id: WorryId, severity: Severity) => void;
  setActiveWorry: (id: WorryId | 'all' | null) => void;
  setLevers: (patch: Partial<Levers>) => void;
  toggleLever: (id: LeverId) => void;
  set: (patch: Partial<Store>) => void;
  restart: () => void;
}

export const leverIsOn = (levers: Levers, id: LeverId): boolean =>
  id === 'match'
    ? levers.match
    : id === 'raises'
      ? levers.raises
      : id === 'cushion'
        ? levers.cushion
        : levers.auto === Number(id.slice(4));

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      step: 0,
      inputs: DEFAULT_INPUTS,
      worries: {},
      activeWorry: null,
      levers: NO_LEVERS,
      confBefore: null,
      confAfter: null,
      chosen: null,
      seed: DEFAULT_SEED,
      aiOn: false,
      theme: 'auto',
      analysis: null,
      computing: false,
      selectedPath: null,
      showAssumptions: false,

      setStep: (step) => {
        set({ step, selectedPath: null });
        window.scrollTo({ top: 0 });
      },
      setInputs: (patch) => set({ inputs: { ...get().inputs, ...patch } }),
      toggleWorry: (id) => {
        const worries = { ...get().worries };
        if (worries[id]) delete worries[id];
        else worries[id] = 'moderate';
        const active = get().activeWorry;
        const stillValid = active === 'all' ? Object.keys(worries).length > 1 : active ? !!worries[active] : true;
        set({ worries, activeWorry: stillValid ? active : null });
      },
      setSeverity: (id, severity) => set({ worries: { ...get().worries, [id]: severity } }),
      setActiveWorry: (activeWorry) => set({ activeWorry, selectedPath: null }),
      setLevers: (patch) => set({ levers: { ...get().levers, ...patch } }),
      toggleLever: (id) => {
        const l = get().levers;
        if (id === 'match') set({ levers: { ...l, match: !l.match } });
        else if (id === 'raises') set({ levers: { ...l, raises: !l.raises } });
        else if (id === 'cushion') set({ levers: { ...l, cushion: !l.cushion } });
        else {
          const amount = Number(id.slice(4)) as 25 | 50 | 100;
          set({ levers: { ...l, auto: l.auto === amount ? 0 : amount } });
        }
      },
      set: (patch) => set(patch),
      restart: () =>
        set({
          step: 0,
          inputs: DEFAULT_INPUTS,
          worries: {},
          activeWorry: null,
          levers: NO_LEVERS,
          confBefore: null,
          confAfter: null,
          chosen: null,
          seed: DEFAULT_SEED,
          selectedPath: null,
          analysis: null,
        }),
    }),
    {
      name: 'clotho:v1',
      partialize: (s) => ({
        inputs: s.inputs,
        worries: s.worries,
        confBefore: s.confBefore,
        theme: s.theme,
      }),
    },
  ),
);

export function currentScenario(worries: Scenario, active: WorryId | 'all' | null): Scenario {
  if (active === 'all') return worries;
  if (active && worries[active]) return { [active]: worries[active] };
  return {};
}
