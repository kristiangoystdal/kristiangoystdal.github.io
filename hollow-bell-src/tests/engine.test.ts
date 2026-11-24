import { describe, expect, it } from 'vitest';
import { evalCondition } from '../src/engine/conditions';
import { applyEffects } from '../src/engine/effects';
import { d10, draw } from '../src/engine/rng';
import { choose, newGame, visibleChoices } from '../src/engine/state';
import { interpolate, isDialogue, sceneText } from '../src/engine/text';
import type { Story, WorldState } from '../src/engine/types';

const world = (): WorldState => ({
  stats: { courage: 3, wit: 5, kindness: 0, cunning: 10 },
  flags: { a: true },
  items: ['key'],
  relations: { m: 2 },
  bonds: { 'a|b': -1 },
  counters: { song: 1 },
});

describe('conditions', () => {
  it('handles flags, items and ranges', () => {
    const s = world();
    expect(evalCondition({ flag: 'a' }, s)).toBe(true);
    expect(evalCondition({ flag: 'b' }, s)).toBe(false);
    expect(evalCondition({ flag: 'b', is: false }, s)).toBe(true);
    expect(evalCondition({ item: 'key' }, s)).toBe(true);
    expect(evalCondition({ stat: 'wit', gte: 5 }, s)).toBe(true);
    expect(evalCondition({ stat: 'wit', gte: 6 }, s)).toBe(false);
    expect(evalCondition({ stat: 'wit', lte: 5 }, s)).toBe(true);
    expect(evalCondition({ relation: 'unknown', gte: 0 }, s)).toBe(true);
    expect(evalCondition({ bond: 'a|b', lte: -1 }, s)).toBe(true);
    expect(evalCondition({ counter: 'song', gte: 2 }, s)).toBe(false);
  });
  it('combines all/any/not', () => {
    const s = world();
    expect(evalCondition({ all: [{ flag: 'a' }, { item: 'key' }] }, s)).toBe(true);
    expect(evalCondition({ all: [{ flag: 'a' }, { item: 'nope' }] }, s)).toBe(false);
    expect(evalCondition({ any: [{ flag: 'x' }, { item: 'key' }] }, s)).toBe(true);
    expect(evalCondition({ not: { any: [] } }, s)).toBe(true);
    expect(evalCondition(undefined, s)).toBe(true);
  });
});

describe('effects', () => {
  it('clamps stats to 0-10 and counters at 0', () => {
    const n = applyEffects(world(), [
      { stat: 'cunning', add: 3 },
      { stat: 'kindness', add: -2 },
      { counter: 'song', add: -5 },
    ]);
    expect(n.stats.cunning).toBe(10);
    expect(n.stats.kindness).toBe(0);
    expect(n.counters.song).toBe(0);
  });
  it('gives and takes items without duplicates, and does not mutate', () => {
    const s = world();
    const n = applyEffects(s, [{ item: 'key', give: true }, { item: 'fork', give: true }, { item: 'key', give: false }]);
    expect(n.items).toEqual(['fork']);
    expect(s.items).toEqual(['key']);
  });
});

describe('rng', () => {
  it('gives the same roll for the same seed and draw', () => {
    expect(draw(42, 3)).toBe(draw(42, 3));
    expect(d10(42, 3)).toBe(d10(42, 3));
    const rolls = Array.from({ length: 2000 }, (_, i) => d10(7, i));
    expect(Math.min(...rolls)).toBe(1);
    expect(Math.max(...rolls)).toBe(10);
  });
});

describe('text', () => {
  it('fills in names and leaves unknown keys', () => {
    expect(interpolate('Hi {name} of {house}, {x}', { name: 'Ada', house: 'Hufflepuff' })).toBe('Hi Ada of Hufflepuff, {x}');
  });
  it('tells dialogue from narration', () => {
    expect(isDialogue('“Come in.”')).toBe(true);
    expect(isDialogue('«Kom inn.»')).toBe(true);
    expect(isDialogue('“Come,” he says. “Now.”')).toBe(false);
    expect(isDialogue('He says “come”.')).toBe(false);
  });
});

// A tiny story that exercises checks, the director and the loop.
const mini: Story = {
  id: 'mini',
  title: 'Mini',
  tagline: '',
  difficulty: 1,
  estimatedMinutes: 1,
  startScene: 'a',
  initialState: { stats: { courage: 0, wit: 0, kindness: 0, cunning: 0 }, bonds: { 'x|y': 0 } },
  scenes: {
    a: {
      id: 'a',
      text: ['Hello {name}', { if: { flag: 'looped' }, text: 'Again.' }],
      choices: [
        { label: 'roll', to: 'd', check: { stat: 'courage', difficulty: 6, successTo: 'd', failTo: 'end_bad' } },
        { label: 'locked', to: 'd', requires: { flag: 'never' }, lockedHint: 'no' },
        { label: 'hidden', to: 'd', requires: { flag: 'never' } },
      ],
    },
    d: { id: 'd', director: { pool: 'p', pick: 2, then: 'end_good' } },
    s1: { id: 's1', storylet: { pool: 'p', priority: 5 }, choices: [{ label: 'ok', to: '$return', effects: [{ bond: 'x|y', add: 1 }] }] },
    s2: { id: 's2', storylet: { pool: 'p', priority: 9 }, choices: [{ label: 'ok', to: '$return' }] },
    s3: { id: 's3', storylet: { pool: 'p', priority: 1, when: { flag: 'never' } }, choices: [{ label: 'ok', to: '$return' }] },
    end_good: { id: 'end_good', ending: { id: 'good', title: 'Good', kind: 'good' } },
    end_bad: {
      id: 'end_bad',
      ending: { id: 'bad', title: 'Bad', kind: 'bad' },
      choices: [{ label: 'again', to: 'a', resetState: { keep: ['stats'] }, effects: [{ flag: 'looped', set: true }, { stat: 'courage', add: 1 }] }],
    },
  },
};

describe('state', () => {
  it('hides locked choices without a hint', () => {
    const s = newGame(mini, { name: 'Ada', house: 'Ravenclaw' }, {}, 1);
    expect(visibleChoices(mini, s).map((c) => c.choice.label)).toEqual(['roll', 'locked']);
    expect(sceneText(mini.scenes.a, s)).toEqual(['Hello Ada']);
  });
  it('rolls checks deterministically from the seed', () => {
    const s = newGame(mini, { name: 'A', house: 'H' }, { courage: 3 }, 99);
    const r1 = choose(mini, s, 0);
    const r2 = choose(mini, s, 0);
    expect(r1.roll).toEqual(r2.roll);
    expect(r1.roll!.success).toBe(r1.roll!.die + 3 >= 6);
  });
  it('runs storylets by priority, then returns to the director target', () => {
    // courage 10 always passes
    let s = newGame(mini, { name: 'A', house: 'H' }, { courage: 10 }, 5);
    s = choose(mini, s, 0).state;
    expect(s.sceneId).toBe('s2');
    s = choose(mini, s, 0).state;
    expect(s.sceneId).toBe('s1');
    s = choose(mini, s, 0).state;
    expect(s.sceneId).toBe('end_good');
    expect(s.bonds['x|y']).toBe(1);
    expect(s.director).toBeNull();
  });
  it('the loop resets the world but keeps stats', () => {
    let s = newGame(mini, { name: 'A', house: 'H' }, {}, 5); // courage 0 fails a d10 >= 6 roll only if die < 6
    let guard = 0;
    while (s.sceneId !== 'end_bad' && guard++ < 50) s = newGame(mini, { name: 'A', house: 'H' }, {}, guard), (s = choose(mini, s, 0).state);
    expect(s.sceneId).toBe('end_bad');
    s = choose(mini, s, 0).state;
    expect(s.sceneId).toBe('a');
    expect(s.flags.looped).toBe(true);
    expect(s.stats.courage).toBe(1);
    expect(s.loops).toBe(1);
    expect(sceneText(mini.scenes.a, s)).toEqual(['Hello A', 'Again.']);
  });
});
