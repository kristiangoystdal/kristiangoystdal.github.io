// Every story: 1000 random playthroughs through the real engine must all end in an ending.
import { describe, expect, it } from 'vitest';
import { runBot } from '../src/engine/bot';
import { STORIES } from '../src/stories';

let seed = 12345;
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

describe.each(STORIES.map((s) => [s.id, s] as const))('%s', (_id, story) => {
  it('1000 random games all reach an ending without errors', () => {
    const rep = runBot(story, 1000, rand);
    expect(rep.errors.slice(0, 5)).toEqual([]);
    expect(rep.stuck).toBe(0);
    const total = Object.values(rep.endings).reduce((a, b) => a + b, 0);
    expect(total).toBe(1000);
  });
  it('every playable scene is reachable by some random game', () => {
    const rep = runBot(story, 4000, rand);
    const never = Object.values(story.scenes)
      .filter((s) => !s.director && !s.ending && !rep.visited.has(s.id))
      .map((s) => s.id);
    expect(never).toEqual([]);
  });
});

describe('voices', () => {
  it('the voice map matches the story: every override names a paragraph with that many quotes, every speaker has a voice', async () => {
    const { readFileSync } = await import('node:fs');
    const { VOICES } = await import('../src/stories');
    const voices = JSON.parse(readFileSync(new URL('../tools/voices/voices.json', import.meta.url), 'utf8'));
    const story = STORIES[0];
    const problems: string[] = [];
    for (const [ref, speakers] of Object.entries(VOICES.lines)) {
      const [id, idx] = ref.split('#');
      const p = story.scenes[id]?.text?.[Number(idx)];
      if (!p) {
        problems.push(`${ref}: no such paragraph`);
        continue;
      }
      const raw = typeof p === 'string' ? p : p.text;
      const quotes = [...raw.matchAll(/“([^”]+)”/g)].length;
      if (quotes !== speakers.length) problems.push(`${ref}: ${speakers.length} speakers for ${quotes} quotes`);
    }
    const used = new Set(['Narrator', ...Object.values(VOICES.lines).flat(), ...Object.values(story.scenes).map((s) => s.speaker).filter(Boolean)]);
    for (const sp of used) if (!voices[sp as string]) problems.push(`no voice for ${sp}`);
    expect(problems).toEqual([]);
  });
});

describe('areas', () => {
  it('every location belongs to a known area, and explicit walks only join neighbouring areas', async () => {
    const { adjacent, NEIGHBOURS } = await import('../src/visuals/areas');
    const { PRESETS } = await import('../src/visuals/presets');
    const known = new Set(Object.values(PRESETS).map((p) => p.area));
    for (const [a, b] of NEIGHBOURS) expect(known.has(a) && known.has(b), `${a}|${b}`).toBe(true);
    const story = STORIES[0];
    const bad: string[] = [];
    for (const sc of Object.values(story.scenes)) {
      if (sc.visual?.preset && !PRESETS[sc.visual.preset]) bad.push(`${sc.id}: unknown preset`);
      for (const c of sc.choices ?? []) {
        const to = story.scenes[c.to];
        const walk = c.transition === 'walk' || (to?.transition === 'walk' && !c.transition);
        if (walk && to && !adjacent(PRESETS[sc.visual?.preset ?? '']?.area, PRESETS[to.visual?.preset ?? '']?.area)) bad.push(`${sc.id} -> ${to.id}: walk between areas that do not touch`);
      }
    }
    expect(bad).toEqual([]);
  });
});
