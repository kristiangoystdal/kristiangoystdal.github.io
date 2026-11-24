// The PC side of the phone remote. Opens a room, publishes what the phone should show, and passes
// the phone's taps back to the game. The game works the same with or without it.
import { onDisconnect, onValue, ref, remove, set, update, type Unsubscribe } from 'firebase/database';
import qrcode from 'qrcode-generator';
import { connect, firebaseConfigured, newCode, ROOT } from './firebase';

export type RemoteChoice = { id: string; n: number; label: string; locked: boolean; lockedHint: string | null };
export type RemoteView = {
  rev: number;
  screen: string;
  title: string;
  choices: RemoteChoice[];
  canAdvance: boolean;
  ending: { id: string; title: string; kind: string } | null;
};
export type RemoteInput = { choiceId: string; rev: number; from: string; at: number };

export type Remote = {
  code: string;
  url: string;
  qrSvg: string;
  publish: (v: RemoteView) => Promise<void>;
  close: () => Promise<void>;
};

export const remoteAvailable = firebaseConfigured;

export async function createRemote(onInput: (i: RemoteInput) => void): Promise<Remote> {
  const { db, uid } = await connect();
  const code = newCode();
  const room = ref(db, `${ROOT}/${code}`);
  await set(room, { host: uid, created: Date.now(), state: JSON.stringify({ rev: 0, screen: 'title' }) });
  await onDisconnect(room).remove();
  let lastRev = -1;
  const unsub: Unsubscribe = onValue(ref(db, `${ROOT}/${code}/input`), (snap) => {
    const v = snap.val() as RemoteInput | null;
    if (!v || v.at === lastRev) return;
    lastRev = v.at;
    onInput(v);
  });
  const url = new URL('remote.html?room=' + code, location.href).href;
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  let pending: RemoteView | null = null;
  let writing = false;
  const flush = async () => {
    // only the newest view matters; skip ones that were replaced while a write was in flight
    if (writing || !pending) return;
    writing = true;
    const v = pending;
    pending = null;
    try {
      await update(room, { state: JSON.stringify(v) });
    } catch (e) {
      console.warn('remote publish failed', e);
    }
    writing = false;
    void flush();
  };
  return {
    code,
    url,
    qrSvg: qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true }),
    publish: async (v) => {
      pending = v;
      await flush();
    },
    close: async () => {
      unsub();
      await onDisconnect(room).cancel();
      await remove(room).catch(() => {});
    },
  };
}
