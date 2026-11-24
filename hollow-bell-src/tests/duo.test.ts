import { describe, expect, it } from 'vitest';
import {
  choosers,
  duoChoices,
  duoReady,
  duoText,
  evalDuo,
  newDuoGame,
  PLAYER_IDS,
  resolveDuo,
  runDuoBot,
  submitDuo,
  type DuoStory,
} from '../src/engine/duo';
import mirror from '../src/stories/mirror.json';

const story = mirror as unknown as DuoStory;
const setup = { ingerid: { house: 'Ravenclaw', bonus: { wit: 6 } }, kristian: { house: 'Gryffindor', bonus: { courage: 6 } } };

let seed = 99;
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

describe('duo engine', () => {
  it('starts with both players, their own stats and names in the text', () => {
    const s = newDuoGame(story, setup, 1);
    expect(s.players.ingerid.stats.wit).toBe(8);
    expect(s.players.kristian.stats.courage).toBe(8);
    expect(duoText(story.scenes[s.sceneId], s).some((p) => p.text.includes('Ingerid'))).toBe(true);
  });
  it('waits until the player whose turn it is has chosen, then moves on', () => {
    let s = newDuoGame(story, setup, 1);
    const who = choosers(story, s);
    expect(who.length).toBe(1);
    expect(duoReady(story, s)).toBe(false);
    s = submitDuo(story, s, who[0], duoChoices(story, s, who[0])[0].index);
    expect(duoReady(story, s)).toBe(true);
    const r = resolveDuo(story, s);
    expect(r.state.sceneId).not.toBe(s.sceneId);
    expect(r.state.history[0].picks[who[0]]).toBeDefined();
  });
  it('refuses a choice from the player who is waiting', () => {
    const s = newDuoGame(story, setup, 1);
    const waiting = PLAYER_IDS.find((p) => !choosers(story, s).includes(p))!;
    expect(() => submitDuo(story, s, waiting, 0)).toThrow();
  });
  it('evaluates conditions on one player', () => {
    const s = newDuoGame(story, setup, 1);
    expect(evalDuo({ player: 'ingerid', stat: 'wit', gte: 8 }, s)).toBe(true);
    expect(evalDuo({ player: 'kristian', stat: 'wit', gte: 8 }, s)).toBe(false);
    expect(evalDuo({ player: 'kristian', item: 'scarf' }, s)).toBe(false);
  });
});

describe('two-player story', () => {
  it('is well formed: every way on exists, ends with a default, and players take turns', () => {
    const problems: string[] = [];
    const setFlags = new Set<string>();
    const usedFlags = new Set<string>();
    const walk = (c: unknown, into: Set<string>) => {
      if (!c || typeof c !== 'object') return;
      const o = c as Record<string, unknown>;
      if (typeof o.flag === 'string' && !('set' in o)) into.add(o.flag);
      for (const v of Object.values(o)) if (typeof v === 'object') walk(v, into);
    };
    const collectSet = (effs: unknown[] | undefined) => (effs ?? []).forEach((e) => { const o = e as Record<string, unknown>; if (typeof o.flag === 'string' && o.set) setFlags.add(o.flag); });
    for (const sc of Object.values(story.scenes)) {
      collectSet(sc.onEnter);
      for (const p of PLAYER_IDS) for (const ch of sc.choices?.[p] ?? []) {
        collectSet(ch.effects); collectSet(ch.check?.success); collectSet(ch.check?.fail);
        walk(ch.requires, usedFlags);
      }
      (sc.text ?? []).forEach((t) => typeof t !== 'string' && walk(t.if, usedFlags));
      (sc.next ?? []).forEach((n) => walk(n.if, usedFlags));
      if (sc.ending) continue;
      const nx = sc.next ?? [];
      if (!nx.length || nx[nx.length - 1].if) problems.push(`${sc.id}: needs a default way on`);
      for (const n of nx) if (!story.scenes[n.to]) problems.push(`${sc.id}: missing scene ${n.to}`);
      const choosing = PLAYER_IDS.filter((p) => (sc.choices?.[p] ?? []).length);
      if (choosing.length > 1) problems.push(`${sc.id}: both players choose at once`);
    }
    for (const fl of usedFlags) if (!setFlags.has(fl)) problems.push(`flag used but never set: ${fl}`);
    expect(problems).toEqual([]);
  });
  it('3000 random games all end, and reach every scene and every ending', () => {
    const rep = runDuoBot(story, 3000, rand);
    expect(rep.errors.slice(0, 3)).toEqual([]);
    expect(rep.stuck).toBe(0);
    const endings = Object.values(story.scenes).filter((s) => s.ending).map((s) => s.ending!.id);
    expect(endings.filter((e) => !rep.endings[e])).toEqual([]);
    expect(Object.keys(story.scenes).filter((id) => !rep.visited.has(id))).toEqual([]);
  });
});

describe('two-player voices', () => {
  it('the voice map matches the story, and every speaker has a voice', async () => {
    const { readFileSync } = await import('node:fs');
    const map = (await import('../src/stories/mirror.voices.json')).default as { lines: Record<string, string[]> };
    const voices = JSON.parse(readFileSync(new URL('../tools/voices/voices.json', import.meta.url), 'utf8'));
    const problems: string[] = [];
    for (const [ref, speakers] of Object.entries(map.lines)) {
      const [id, idx] = ref.split('#');
      const p = story.scenes[id]?.text?.[Number(idx)];
      if (!p) { problems.push(`${ref}: no such paragraph`); continue; }
      const raw = typeof p === 'string' ? p : p.text;
      const quotes = [...raw.matchAll(/“([^”]+)”/g)].length;
      if (quotes !== speakers.length) problems.push(`${ref}: ${speakers.length} speakers for ${quotes} quotes`);
    }
    const used = new Set(['Narrator', ...Object.values(map.lines).flat(), ...Object.values(story.scenes).map((s) => s.speaker).filter(Boolean)]);
    for (const sp of used) if (!voices[sp as string]) problems.push(`no voice for ${sp}`);
    expect(problems).toEqual([]);
  });
});
