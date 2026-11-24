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
