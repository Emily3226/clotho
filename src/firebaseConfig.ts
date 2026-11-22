// The Firebase web config. It identifies the project and is not a secret:
// access is controlled by firestore.rules. While this is null, accounts are
// switched off and the app works on this device only.
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export const FIREBASE_CONFIG = null as FirebaseWebConfig | null;
