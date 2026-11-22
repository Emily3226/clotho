import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERSONAS } from '../engine/personas';
import type { Commitment } from '../store';

// One shared "server" and a fresh app per device, using the real sync code.
const server = new Map<string, Record<string, unknown>>();
const inputs = PERSONAS[0].inputs;
const commitment: Commitment = { lever: 'auto25', startedISO: '2026-11-21T12:00:00.000Z', startInControl: 518, startInputs: inputs, streak: 1, lastCheckISO: '2026-11-21T12:00:00.000Z' };
let failReads = false;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function device(opts: { storage?: Map<string, string>; signedIn?: boolean } = {}) {
  vi.resetModules();
  const saved = opts.storage ?? new Map<string, string>();
  const localStorage = { getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => void saved.set(k, v), removeItem: (k: string) => void saved.delete(k) };
  vi.stubGlobal('window', { scrollTo: () => {}, localStorage });
  vi.stubGlobal('localStorage', localStorage);
  let listener: ((u: unknown) => void) | null = null;
  const auth = { currentUser: null as unknown };
  const user = { uid: 'person-1', email: 'person@example.com', displayName: 'Person' };
  if (opts.signedIn) auth.currentUser = user;
  vi.doMock('../firebaseConfig', () => ({ FIREBASE_CONFIG: { apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a' } }));
  vi.doMock('firebase/app', () => ({ initializeApp: () => ({}) }));
  vi.doMock('firebase/auth', () => ({
    getAuth: () => auth,
    GoogleAuthProvider: class {},
    onAuthStateChanged: (_: unknown, fn: (u: unknown) => void) => {
      listener = fn;
      fn(auth.currentUser);
      return () => {};
    },
    signInWithPopup: async () => {
      auth.currentUser = user;
      listener?.(user);
    },
    signOut: async () => {
      auth.currentUser = null;
      listener?.(null);
    },
  }));
  vi.doMock('firebase/firestore', () => ({
    getFirestore: () => ({}),
    doc: (_: unknown, c: string, id: string) => `${c}/${id}`,
    serverTimestamp: () => 'now',
    setDoc: async (ref: string, value: Record<string, unknown>) => void server.set(ref, value),
    getDoc: async (ref: string) => {
      if (failReads) throw Object.assign(new Error('offline'), { code: 'unavailable' });
      return { exists: () => server.has(ref), data: () => server.get(ref) };
    },
  }));
  const cloud = await import('./cloud');
  const { useStore } = await import('../store');
  if (!opts.storage) useStore.setState({ commitment: null, step: 0 });
  cloud.startCloud();
  await wait(20);
  return { cloud, useStore };
}

describe('accounts across two devices', () => {
  beforeEach(() => server.clear());

  it('restores progress saved after signing up mid-flow', async () => {
    const a = await device();
    await a.cloud.signIn();
    await wait(20);
    a.useStore.setState({ commitment });
    await wait(900);
    expect(server.has('users/person-1')).toBe(true);

    const b = await device();
    expect(b.useStore.getState().commitment).toBeNull();
    await b.cloud.signIn();
    await wait(20);
    expect(b.useStore.getState().commitment?.lever).toBe('auto25');
    expect(b.useStore.getState().step).toBe(5);
    expect(b.cloud.useAccount.getState().ready).toBe(true);
  });

  it('keeps the check-in when signing up after getting results', async () => {
    const storage = new Map<string, string>();
    const first = await device({ storage });
    first.useStore.setState({ commitment });
    await wait(900);
    expect(server.size).toBe(0);

    await first.cloud.signIn();
    await wait(20);
    expect(first.useStore.getState().commitment?.lever).toBe('auto25');
    expect(first.cloud.useAccount.getState()).toMatchObject({ status: 'in', ready: true, saved: true });
    expect(server.has('users/person-1')).toBe(true);

    // Later, in the same browser: still signed in, on the home page.
    const later = await device({ storage, signedIn: true });
    await wait(20);
    expect(later.useStore.getState().commitment?.lever).toBe('auto25');
    expect(later.useStore.getState().step).toBe(0);
    expect(later.cloud.useAccount.getState().ready).toBe(true);

    // Later, on another device.
    const other = await device();
    expect(other.useStore.getState().commitment).toBeNull();
    await other.cloud.signIn();
    await wait(20);
    expect(other.useStore.getState().commitment?.lever).toBe('auto25');
    expect(other.useStore.getState().step).toBe(5);
  });

  it('never overwrites an account after a failed read', async () => {
    server.set('users/person-1', { v: 1, data: JSON.stringify({ inputs, room: [], confBefore: 5, commitment: { ...commitment, streak: 6 } }) });
    const before = server.get('users/person-1');
    failReads = true;
    const b = await device();
    b.useStore.setState({ commitment: { ...commitment, streak: 0 } });
    await b.cloud.signIn();
    await wait(20);
    b.useStore.setState({ commitment: { ...commitment, streak: 1 } });
    await wait(900);
    failReads = false;
    expect(b.cloud.useAccount.getState().loadFailed).toBe(true);
    expect(server.get('users/person-1')).toBe(before);
  });
});
