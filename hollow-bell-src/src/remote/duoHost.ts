// The PC side of a two-player room: each phone claims a seat (Ingerid or Kristian), sends its setup
// (house and qualities), and later its own choices. The PC publishes what each phone should show.
import { onDisconnect, onValue, ref, remove, set, update, type Unsubscribe } from 'firebase/database';
import qrcode from 'qrcode-generator';
import type { PlayerId } from '../engine/duo';
import { connect, firebaseConfigured, newCode, ROOT } from './firebase';

export type DuoPhoneChoice = { id: string; n: number; label: string; locked: boolean; lockedHint: string | null };

/** What one phone shows. */
export type DuoPhoneView = {
  name: string;
  /** It is this player's turn to choose. */
  turn: boolean;
  choices: DuoPhoneChoice[];
  /** Whose turn it is, when it is not this player's. */
  waitingFor: string | null;
  /** A private hint about what this player's last choice will lead to. */
  ripple: string | null;
};

export type DuoRoomView = {
  rev: number;
  mode: 'duo';
  screen: 'lobby' | 'play' | 'end';
  title: string;
  canAdvance: boolean;
  houses: string[];
  bonusPoints: number;
  players: Record<PlayerId, DuoPhoneView>;
  ending: { title: string; kind: string } | null;
};

export type DuoSetupInput = { house: string; bonus: Record<string, number>; look?: Record<string, string> };
export type DuoRoomEvents = {
  seats: (seats: Partial<Record<PlayerId, boolean>>) => void;
  setup: (player: PlayerId, setup: DuoSetupInput) => void;
  input: (player: PlayerId, input: { choiceId: string; rev: number }) => void;
};

export type DuoRoom = {
  code: string;
  url: string;
  qrSvg: string;
  publish: (v: DuoRoomView) => void;
  close: () => Promise<void>;
};

export const duoRoomAvailable = firebaseConfigured;

export async function createDuoRoom(events: DuoRoomEvents): Promise<DuoRoom> {
  const { db, uid } = await connect();
  const code = newCode();
  const path = `${ROOT}/${code}`;
  const room = ref(db, path);
  await set(room, { host: uid, created: Date.now(), state: JSON.stringify({ rev: 0, mode: 'duo', screen: 'lobby' }) });
  await onDisconnect(room).remove();

  const unsubs: Unsubscribe[] = [];
  unsubs.push(
    onValue(ref(db, `${path}/players`), (snap) => {
      const v = (snap.val() ?? {}) as Partial<Record<PlayerId, string>>;
      events.seats({ ingerid: !!v.ingerid, kristian: !!v.kristian });
    }),
  );
  for (const p of ['ingerid', 'kristian'] as PlayerId[]) {
    unsubs.push(
      onValue(ref(db, `${path}/setup/${p}`), (snap) => {
        const t = snap.val() as string | null;
        if (!t) return;
        try {
          events.setup(p, JSON.parse(t));
        } catch {
          /* ignore malformed setup */
        }
      }),
    );
    let lastAt = -1;
    unsubs.push(
      onValue(ref(db, `${path}/inputs/${p}`), (snap) => {
        const v = snap.val() as { choiceId: string; rev: number; at: number } | null;
        if (!v || v.at === lastAt) return;
        lastAt = v.at;
        events.input(p, v);
      }),
    );
  }

  const url = new URL('remote.html?room=' + code, location.href).href;
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();

  // only the newest view matters; skip ones replaced while a write was in flight
  let pending: DuoRoomView | null = null;
  let writing = false;
  const flush = async () => {
    if (writing || !pending) return;
    writing = true;
    const v = pending;
    pending = null;
    try {
      await update(room, { state: JSON.stringify(v) });
    } catch (e) {
      console.warn('duo publish failed', e);
    }
    writing = false;
    void flush();
  };

  return {
    code,
    url,
    qrSvg: qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true }),
    publish: (v) => {
      pending = v;
      void flush();
    },
    close: async () => {
      unsubs.forEach((u) => u());
      await onDisconnect(room).cancel();
      await remove(room).catch(() => {});
    },
  };
}
