// Alt som snakker med Firebase. Et rom ligger i rangeringshatten/<KODE>:
//   host      uid-en til Mac-en som laget rommet (bare den kan endre state)
//   created   når rommet ble laget
//   state     JSON: fase, runde, kategorier, felles liste og ferdige lister
//   players   <uid>: JSON { name, at }      (hver telefon skriver bare sin egen)
//   rankings  r<runde>/<uid>: JSON [rekkefølge]  (hver telefon skriver bare sin egen)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getDatabase, connectDatabaseEmulator, ref, get, set, update, remove, onValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';

const ROOT = 'rangeringshatten';
// Uten 0/O og 1/I/L, som er lette å forveksle når koden leses opp fra TV-en.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;
export const cleanCode = (t) => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
export const validCode = (t) => new RegExp('^[' + ALPHABET + ']{' + CODE_LENGTH + '}$').test(t);
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(CODE_LENGTH)), (b) => ALPHABET[b % ALPHABET.length]).join('');

const TIMEOUT = 12000;
const withTimeout = (p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('Fikk ikke kontakt med databasen. Sjekk nettet og prøv igjen.')), TIMEOUT))]);

let db = null;
let uid = null;

/** Kobler til og logger inn anonymt. ?emu i adressen bruker Firebase-emulatoren (for testene). */
export async function connect() {
  if (uid) return uid;
  const emu = new URLSearchParams(location.search).has('emu');
  const cfg = emu
    ? { apiKey: 'demo-key', projectId: 'demo-hide-and-seek', databaseURL: 'http://127.0.0.1:9000?ns=demo-hide-and-seek-default-rtdb' }
    : Object.fromEntries(Object.entries(RH.FIREBASE).filter(([, v]) => !String(v).startsWith('__')));
  if (!cfg.apiKey) throw new Error('Firebase-nøkkelen mangler. Den settes inn når siden publiseres, så åpne den publiserte siden.');
  const app = initializeApp(cfg);
  db = getDatabase(app);
  const auth = getAuth(app);
  if (emu) {
    connectDatabaseEmulator(db, '127.0.0.1', 9000);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  await withTimeout(auth.authStateReady());
  uid = auth.currentUser ? auth.currentUser.uid : (await withTimeout(signInAnonymously(auth))).user.uid;
  return uid;
}

const room = (code, ...path) => ref(db, [ROOT, code, ...path].join('/'));

/** Lager et nytt rom med en ledig kode. */
export async function createRoom(state) {
  for (let i = 0; i < 8; i++) {
    const code = newCode();
    const taken = await withTimeout(get(room(code, 'host')));
    if (taken.exists()) continue;
    await withTimeout(set(room(code), { host: uid, created: serverTimestamp(), state: JSON.stringify(state) }));
    return code;
  }
  throw new Error('Fant ingen ledig kode. Prøv igjen.');
}

/** Uid-en til verten, eller null om rommet ikke finnes. */
export async function roomHost(code) {
  const snap = await withTimeout(get(room(code, 'host')));
  return snap.exists() ? snap.val() : null;
}

/** Følger hele rommet. cb får rommet (eller null når det er borte). Returnerer en funksjon som stopper. */
export function watch(code, cb) {
  return onValue(room(code), (snap) => cb(snap.val()), () => cb(null));
}

export const writeState = (code, state) => withTimeout(set(room(code, 'state'), JSON.stringify(state)));
export const writePlayer = (code, player) => withTimeout(set(room(code, 'players', uid), JSON.stringify(player)));
export const kickPlayer = (code, who) => withTimeout(remove(room(code, 'players', who)));
export const writeRanking = (code, round, order) => withTimeout(set(room(code, 'rankings', 'r' + round, uid), order ? JSON.stringify(order) : null));
/** Verten fjerner listene for en runde (når kategorien byttes eller spillet starter på nytt). */
export const clearRankings = (code, rounds) => withTimeout(update(room(code, 'rankings'), Object.fromEntries(rounds.map((r) => ['r' + r, null]))));
export const clearAllRankings = (code) => withTimeout(remove(room(code, 'rankings')));
export const deleteRoom = (code) => withTimeout(remove(room(code)));
