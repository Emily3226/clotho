// Optional accounts: Google sign-in, with one private record per person.
// Firebase is only downloaded when a config is set.
import type { User } from 'firebase/auth';
import { create } from 'zustand';
import { FIREBASE_CONFIG } from '../firebaseConfig';
import { STEP, useStore } from '../store';
import { chooseProgress, parseProgress, type Progress } from './progress';

export const cloudEnabled = FIREBASE_CONFIG !== null;

interface Account {
  status: 'off' | 'loading' | 'out' | 'in';
  who: string | null;
  saved: boolean;
  // The account's saved progress has been read, so it is safe to write.
  ready: boolean;
  loadFailed: boolean;
  message: string | null;
}
export const useAccount = create<Account>(() => ({ status: cloudEnabled ? 'loading' : 'off', who: null, saved: false, ready: false, loadFailed: false, message: null }));

const SAVE_FAILED = 'Couldn’t save just now. We’ll try again at your next change.';

async function connect() {
  const [app, auth, db] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  const firebase = app.initializeApp(FIREBASE_CONFIG!);
  return { authApi: auth, dbApi: db, auth: auth.getAuth(firebase), db: db.getFirestore(firebase) };
}
let connection: ReturnType<typeof connect> | null = null;
const services = () => (connection ??= connect());

const localProgress = (): Progress => {
  const s = useStore.getState();
  return { inputs: s.inputs, room: s.room, confBefore: s.confBefore, commitment: s.commitment };
};

let stopSync: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let currentUid: string | null = null;
// Tapped sign-in just now, rather than coming back already signed in.
let askedToSignIn = false;

async function push(uid: string) {
  const p = localProgress();
  if (!p.commitment) return;
  try {
    const { db, dbApi } = await services();
    await dbApi.setDoc(dbApi.doc(db, 'users', uid), { v: 1, data: JSON.stringify(p), updatedAt: dbApi.serverTimestamp() });
    if (currentUid === uid) useAccount.setState({ saved: true, message: null });
  } catch {
    if (currentUid === uid) useAccount.setState({ saved: false, message: SAVE_FAILED });
  }
}

async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    if (currentUid) await push(currentUid);
  }
}

function startSync(uid: string) {
  stopSync?.();
  stopSync = useStore.subscribe((s, prev) => {
    // "Clear my data" also ends the session here, so
    // the next load doesn't quietly bring it all back.
    if (prev.commitment && !s.commitment) {
      if (timer) clearTimeout(timer);
      timer = null;
      void services().then(({ auth, authApi }) => authApi.signOut(auth));
      return;
    }
    if (s.commitment === prev.commitment && s.inputs === prev.inputs && s.room === prev.room && s.confBefore === prev.confBefore) return;
    if (!s.commitment) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void push(uid);
    }, 800);
  });
}

async function onUser(user: User | null) {
  stopSync?.();
  stopSync = null;
  currentUid = user?.uid ?? null;
  const asked = askedToSignIn && !!user;
  if (user) askedToSignIn = false;
  if (!user) {
    useAccount.setState({ status: 'out', who: null, saved: false, ready: false, loadFailed: false });
    return;
  }
  useAccount.setState({ status: 'in', who: user.email ?? user.displayName, ready: false, loadFailed: false, message: null });
  try {
    const { db, dbApi } = await services();
    const snap = await dbApi.getDoc(dbApi.doc(db, 'users', user.uid));
    if (currentUid !== user.uid) return;
    const cloud = snap.exists() ? parseProgress(snap.data().data) : null;
    if (chooseProgress(localProgress(), cloud) === 'cloud' && cloud) {
      const s = useStore.getState();
      // Someone already answering on this visit keeps what they've typed.
      const answers = asked || s.step === STEP.start ? { inputs: { ...s.inputs, ...cloud.inputs }, room: cloud.room as typeof s.room, confBefore: cloud.confBefore } : {};
      s.setState({ ...answers, commitment: cloud.commitment });
      if (asked) s.setStep(STEP.back);
      useAccount.setState({ saved: true, message: asked ? 'Welcome back. Your progress is restored.' : null });
    } else {
      await push(user.uid);
    }
    if (currentUid === user.uid) {
      startSync(user.uid);
      useAccount.setState({ ready: true });
    }
  } catch (e) {
    console.warn('Could not load saved progress:', code(e));
    // Never sync after a failed read: it could overwrite a longer run.
    if (currentUid === user.uid) useAccount.setState({ loadFailed: true, message: 'Couldn’t load your saved progress. Nothing was changed.' });
  }
}

export async function retryLoad() {
  const { auth } = await services();
  await onUser(auth.currentUser);
}

let started = false;
export function startCloud() {
  if (!cloudEnabled || started) return;
  started = true;
  void services()
    .then(({ auth, authApi }) => authApi.onAuthStateChanged(auth, (u) => void onUser(u)))
    .catch(() => useAccount.setState({ status: 'off' }));
}

const code = (e: unknown) => (e as { code?: string })?.code ?? '';
const cancelled = (e: unknown) => ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(code(e));
const SIGN_IN_ERRORS: Record<string, string> = {
  'auth/web-storage-unsupported': 'This browser window is blocking Google sign-in. Private windows often do. Try a normal window, or allow third-party cookies for this site.',
  'auth/network-request-failed': 'Couldn’t reach Google. Check your connection and try again.',
  'auth/unauthorized-domain': 'Sign-in isn’t set up for this address yet.',
};

export async function signIn() {
  askedToSignIn = true;
  useAccount.setState({ message: null });
  try {
    const { auth, authApi } = await services();
    const provider = new authApi.GoogleAuthProvider();
    try {
      await authApi.signInWithPopup(auth, provider);
    } catch (e) {
      if (code(e) === 'auth/popup-blocked') await authApi.signInWithRedirect(auth, provider);
      else throw e;
    }
  } catch (e) {
    askedToSignIn = false;
    if (cancelled(e)) return;
    console.warn('Sign-in failed:', code(e));
    useAccount.setState({ message: SIGN_IN_ERRORS[code(e)] ?? 'Couldn’t sign you in just now. Try again.' });
  }
}

// Saves first, then clears this visit, for shared computers.
export async function signOutHere() {
  try {
    await flush();
    stopSync?.();
    stopSync = null;
    const { auth, authApi } = await services();
    await authApi.signOut(auth);
    useStore.getState().clearAll();
  } catch {
    useAccount.setState({ message: 'Couldn’t sign out just now. Try again.' });
  }
}

export async function deleteAccount() {
  try {
    const { auth, authApi, db, dbApi } = await services();
    const user = auth.currentUser;
    if (!user) return;
    if (timer) clearTimeout(timer);
    timer = null;
    // Google asks the person to confirm it's them before anything is removed.
    await authApi.reauthenticateWithPopup(user, new authApi.GoogleAuthProvider());
    stopSync?.();
    stopSync = null;
    await dbApi.deleteDoc(dbApi.doc(db, 'users', user.uid));
    await authApi.deleteUser(user);
    useStore.getState().clearAll();
    useAccount.setState({ message: 'Your account and saved progress are deleted.' });
  } catch (e) {
    if (cancelled(e)) return;
    useAccount.setState({ message: 'Couldn’t delete your account just now. Try again.' });
    if (currentUid) startSync(currentUid);
  }
}
