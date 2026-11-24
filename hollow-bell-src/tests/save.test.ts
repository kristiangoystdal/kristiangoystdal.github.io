import { describe, expect, it } from 'vitest';
import { migrate, parseSave, readSave, slotKey, writeSave, type KV } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { STORIES } from '../src/stories';

const fake = (): KV & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe('save', () => {
  const story = STORIES[0];
  it('round-trips a game under the hp-cyoa prefix', () => {
    const kv = fake();
    const s = newGame(story, { name: 'Ada', house: 'Hufflepuff' }, { wit: 2 }, 3);
    expect(writeSave(2, s, 'Title', kv)).toBe(true);
    expect([...kv.m.keys()]).toEqual(['hp-cyoa:v1:slot:2']);
    expect(readSave(2, kv)!.state).toEqual(s);
    expect(slotKey('auto')).toBe('hp-cyoa:v1:autosave');
  });
  it('rejects corrupt data', () => {
    expect(parseSave('{not json')).toBeNull();
    expect(parseSave('{"version":2}')).toBeNull();
    expect(migrate(null)).toBeNull();
    expect(migrate({ version: 1, state: { sceneId: 5 } })).toBeNull();
  });
  it('fills in fields that old saves lack', () => {
    const f = migrate({ version: 1, state: { storyId: 'x', sceneId: 'y', stats: {}, flags: {}, items: [], relations: {} } });
    expect(f!.state.counters).toEqual({});
    expect(f!.state.director).toBeNull();
  });
  it('survives storage that throws', () => {
    const bad: KV = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {},
    };
    const s = newGame(story, { name: 'A', house: 'H' }, {}, 1);
    expect(writeSave(1, s, '', bad)).toBe(false);
    expect(readSave(1, bad)).toBeNull();
  });
});
