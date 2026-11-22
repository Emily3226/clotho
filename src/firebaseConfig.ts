// The Firebase web config. It identifies the project and is not a secret:
// access is controlled by firestore.rules. While this is null, accounts are
// switched off and the app works on this device only.
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCKRCCiUm8eEbpIGh_H6WBkgpcfH54Lz28',
  authDomain: 'clotho-b1e7e.firebaseapp.com',
  projectId: 'clotho-b1e7e',
  appId: '1:25186574213:web:034f0f9598e8f712e3eeec',
} as FirebaseWebConfig | null;
