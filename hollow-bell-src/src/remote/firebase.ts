// The Jetlag Hide and Seek Firebase project, shared with ../hide-and-seek-src and ../rangeringshatten.
// This game only uses hollowbell/<CODE> in the Realtime Database (rules: hide-and-seek-src/database.rules.json).
// The web key and app id come from .env.local locally and from the repo secrets in GitHub Actions.
// They end up in the published page, as intended: access is controlled by the database rules.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, type Database } from 'firebase/database';

const CONFIG = {
  databaseURL: 'https://jetlag-hide-and-seek-norway-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'jetlag-hide-and-seek-norway',
  authDomain: 'jetlag-hide-and-seek-norway.firebaseapp.com',
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) ?? '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) ?? '',
};

/** Firebase emulator for tests (`VITE_FIREBASE_EMULATOR=127.0.0.1:9000`): a demo project, never the real database. */
const EMULATOR = import.meta.env.VITE_FIREBASE_EMULATOR as string | undefined;
if (EMULATOR) Object.assign(CONFIG, { projectId: 'demo-hide-and-seek', apiKey: 'demo-key', appId: '', databaseURL: `http://${EMULATOR}?ns=demo-hide-and-seek-default-rtdb` });

export const ROOT = 'hollowbell';
export const CODE_LENGTH = 6;
// No 0/O or 1/I/L, which are easy to mix up. Must match the code pattern in the database rules.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(CODE_LENGTH)), (b) => ALPHABET[b % ALPHABET.length]).join('');
export const cleanCode = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
export const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const firebaseConfigured = () => !!CONFIG.apiKey;

let app: FirebaseApp | null = null;

/** Signs in anonymously (an invisible account per browser) and returns the database and uid. */
export async function connect(): Promise<{ db: Database; uid: string }> {
  const first = !app;
  app ??= initializeApp(CONFIG, 'hollow-bell');
  const auth = getAuth(app);
  const db = getDatabase(app);
  if (first && EMULATOR) {
    const [host, port] = EMULATOR.split(':');
    connectDatabaseEmulator(db, host, Number(port));
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  const cred = auth.currentUser ? { user: auth.currentUser } : await signInAnonymously(auth);
  return { db, uid: cred.user.uid };
}
