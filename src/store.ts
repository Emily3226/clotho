import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SEED } from './config';
import type { Analysis } from './engine/analyse';
import { DEFAULT_INPUTS } from './engine/personas';
import { NO_LEVERS, type AssumptionSetId, type Inputs, type LeverId, type Levers, type Scenario, type WorryId } from './engine/types';

export type Theme = 'auto' | 'light' | 'dark';
export const STEPS = ['Start', 'About you', 'Your futures', 'What helps most', 'What if', 'Pick one'] as const;
export const STEP = { start: 0, about: 1, futures: 2, habits: 3, whatIf: 4, pick: 5, back: 6 } as const;

export const ROOM_FOR = [
  { id: 'travel', label: 'Travel' },
  { id: 'career', label: 'Switching careers' },
  { id: 'home', label: 'A home' },
  { id: 'time', label: 'Time off' },
  { id: 'family', label: 'Helping family' },
] as const;

// The habit someone picked, kept on this device for the monthly check-in.
export interface Commitment {
  lever: LeverId;
  startedISO: string;
  startInControl: number;
  startInputs: Inputs;
  streak: number;
  lastCheckISO: string | null;
}

// One anonymous record per finished session, only in user-test mode.
export interface TestRecord {
  at: string;
  stage: string;
  field: string;
  confBefore: number | null;
  confAfter: number | null;
  lever: string;
  reminder: boolean;
  hrCopied: boolean;
}

interface Note {
  label: string;
  before: number;
  // Said instead of the usual line when the count goes down.
  whyDown?: string;
}

interface Store {
  step: number;
  inputs: Inputs;
  room: string[];
  worries: Scenario;
  activeWorry: WorryId | 'all' | null;
  showAll: boolean;
  levers: Levers;
  confBefore: number | null;
  confAfter: number | null;
  chosen: LeverId | null;
  seed: number;
  set: AssumptionSetId;
  aiOn: boolean;
  theme: Theme;
  analysis: Analysis | null;
  computing: boolean;
  selectedPath: number | null;
  showAssumptions: boolean;
  personaId: string | null;
  incomeEdited: boolean;
  pendingNote: Note | null;
  note: string | null;
  // The first result after answering, so the dial can show "from 133 to 410".
  first: { monthly: number; inControl: number } | null;
  // A life being played back on the river.
  playing: number | null;
  commitment: Commitment | null;
  testLog: TestRecord[];
  reminderAdded: boolean;
  hrCopied: boolean;

  setStep: (step: number) => void;
  setInputs: (patch: Partial<Inputs>) => void;
  toggleRoom: (id: string) => void;
  toggleWorry: (id: WorryId) => void;
  setActiveWorry: (id: WorryId | 'all' | null) => void;
  toggleLever: (id: LeverId) => void;
  answer: (label: string, patch: Partial<Inputs>, whyDown?: string) => void;
  setState: (patch: Partial<Store>) => void;
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

export const anyLever = (l: Levers): boolean => l.match || l.raises || l.cushion || l.auto > 0;

export const leverOn = (levers: Levers, id: LeverId): Levers => {
  if (id === 'match') return { ...levers, match: true };
  if (id === 'raises') return { ...levers, raises: true };
  if (id === 'cushion') return { ...levers, cushion: true };
  return { ...levers, auto: Number(id.slice(4)) as 25 | 50 | 100 };
};

const fresh = {
  step: 0,
  inputs: DEFAULT_INPUTS,
  room: [] as string[],
  worries: {} as Scenario,
  activeWorry: null,
  showAll: false,
  levers: NO_LEVERS,
  confBefore: null,
  confAfter: null,
  chosen: null,
  seed: DEFAULT_SEED,
  selectedPath: null,
  analysis: null,
  personaId: null,
  incomeEdited: false,
  pendingNote: null,
  note: null,
  first: null,
  playing: null,
  reminderAdded: false,
  hrCopied: false,
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...fresh,
      set: 'middle',
      aiOn: false,
      theme: 'dark',
      computing: false,
      showAssumptions: false,
      commitment: null,
      testLog: [],

      setStep: (step) => {
        set({ step, selectedPath: null, note: null });
        window.scrollTo({ top: 0 });
      },
      setInputs: (patch) => set({ inputs: { ...get().inputs, ...patch } }),
      toggleRoom: (id) => {
        const room = get().room.includes(id) ? get().room.filter((r) => r !== id) : [...get().room, id];
        set({ room });
      },
      toggleWorry: (id) => {
        const worries = { ...get().worries };
        if (worries[id]) delete worries[id];
        else worries[id] = 'moderate';
        const active = get().activeWorry;
        const stillValid = active === 'all' ? Object.keys(worries).length > 1 && get().showAll : active ? !!worries[active] : true;
        set({ worries, activeWorry: stillValid ? active : null });
      },
      setActiveWorry: (activeWorry) => set({ activeWorry, selectedPath: null }),
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
      // A "Make it more you" answer: change the inputs and remember the count
      // before, so the screen can say what changed.
      answer: (label, patch, whyDown) => {
        const before = get().analysis?.summary.counts[0];
        set({
          inputs: { ...get().inputs, ...patch },
          pendingNote: before === undefined ? null : { label, before, whyDown },
          first: null,
          note: null,
        });
      },
      setState: (patch) => set(patch),
      restart: () => set({ ...fresh }),
    }),
    {
      name: 'clotho:v2',
      // v1: dark became the default, so a saved 'auto' from before moves to dark.
      version: 1,
      migrate: (old, from) => {
        const s = (old ?? {}) as Partial<Store>;
        return (from < 1 && (!s.theme || s.theme === 'auto') ? { ...s, theme: 'dark' } : s) as Store;
      },
      partialize: (s) => ({
        inputs: s.inputs,
        room: s.room,
        confBefore: s.confBefore,
        theme: s.theme,
        set: s.set,
        commitment: s.commitment,
        testLog: s.testLog,
      }),
    },
  ),
);

export function currentScenario(worries: Scenario, active: WorryId | 'all' | null): Scenario {
  if (active === 'all') return worries;
  if (active && worries[active]) return { [active]: worries[active] };
  return {};
}

export const params = (): URLSearchParams => new URLSearchParams(window.location.search);
export const demoMode = (): boolean => params().get('demo') === '1';
export const testMode = (): boolean => params().get('test') === '1';
export const debugMode = (): boolean => params().get('debug') === '1';
