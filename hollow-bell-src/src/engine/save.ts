// localStorage saves. All keys share the hp-cyoa: prefix because every page on the github.io origin
// shares one localStorage. Every call is wrapped so a blocked or full storage never crashes the game.
import type { GameState } from './types';

export const PREFIX = 'hp-cyoa:v1:';
export const SLOTS = [1, 2, 3] as const;
export type SlotId = (typeof SLOTS)[number] | 'auto';

export type SaveFile = { version: 1; savedAt: number; storyId: string; sceneTitle: string; state: GameState };

/** Minimal Storage so tests can pass a Map-backed fake. */
export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): KV | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const slotKey = (slot: SlotId) => PREFIX + (slot === 'auto' ? 'autosave' : `slot:${slot}`);

/** Upgrades older save formats. Returns null for anything that is not a usable save. */
export function migrate(raw: unknown): SaveFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SaveFile> & { state?: Partial<GameState> };
  if (r.version !== 1 || !r.state || typeof r.state.sceneId !== 'string' || typeof r.state.storyId !== 'string') return null;
  const st = r.state as GameState;
  // Fields added after the first save format get defaults here.
  st.counters ??= {};
  st.bonds ??= {};
  st.seen ??= [];
  st.history ??= [];
  st.draws ??= 0;
  st.loops ??= 0;
  st.director ??= null;
  return { version: 1, savedAt: r.savedAt ?? 0, storyId: st.storyId, sceneTitle: r.sceneTitle ?? '', state: st };
}

export function parseSave(text: string): SaveFile | null {
  try {
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
}

export function writeSave(slot: SlotId, state: GameState, sceneTitle: string, store = defaultStore()): boolean {
  if (!store) return false;
  const file: SaveFile = { version: 1, savedAt: Date.now(), storyId: state.storyId, sceneTitle, state };
  try {
    store.setItem(slotKey(slot), JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export function readSave(slot: SlotId, store = defaultStore()): SaveFile | null {
  try {
    const t = store?.getItem(slotKey(slot));
    return t ? parseSave(t) : null;
  } catch {
    return null;
  }
}

export function deleteSave(slot: SlotId, store = defaultStore()) {
  try {
    store?.removeItem(slotKey(slot));
  } catch {
    /* ignore */
  }
}

export function storageWorks(store = defaultStore()): boolean {
  try {
    if (!store) return false;
    store.setItem(PREFIX + 'probe', '1');
    store.removeItem(PREFIX + 'probe');
    return true;
  } catch {
    return false;
  }
}

/** Small JSON values (settings, meta progress) under the same prefix. */
export function readJSON<T>(key: string, fallback: T, store = defaultStore()): T {
  try {
    const t = store?.getItem(PREFIX + key);
    return t ? { ...fallback, ...JSON.parse(t) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, store = defaultStore()) {
  try {
    store?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
