import { evalCondition } from './conditions';
import { applyEffects } from './effects';
import { d10, draw, newSeed } from './rng';
import {
  RETURN,
  STAT_NAMES,
  type Choice,
  type GameState,
  type Player,
  type RollResult,
  type Scene,
  type StatName,
  type Story,
  type WorldState,
} from './types';

export function initialWorld(story: Story): WorldState {
  const i = story.initialState;
  return {
    stats: { ...i.stats },
    flags: { ...(i.flags ?? {}) },
    items: [...(i.items ?? [])],
    relations: { ...(i.relations ?? {}) },
    bonds: { ...(i.bonds ?? {}) },
    counters: { ...(i.counters ?? {}) },
  };
}

export function getScene(story: Story, id: string): Scene {
  const sc = story.scenes[id];
  if (!sc) throw new Error(`Scene not found: ${id}`);
  return sc;
}

/** Starts a story. `bonus` is what the player added on top of the story's starting stats. */
export function newGame(
  story: Story,
  player: Player,
  bonus: Partial<Record<StatName, number>> = {},
  seed = newSeed(),
): GameState {
  const w = initialWorld(story);
  for (const k of STAT_NAMES) w.stats[k] = Math.min(10, (w.stats[k] ?? 0) + (bonus[k] ?? 0));
  const s: GameState = {
    ...w,
    version: 1,
    storyId: story.id,
    sceneId: '',
    player,
    history: [],
    seen: [],
    seed,
    draws: 0,
    director: null,
    loops: 0,
  };
  return enterScene(story, s, story.startScene);
}

const poolScenes = (story: Story, pool: string) =>
  Object.values(story.scenes).filter((sc) => sc.storylet?.pool === pool);

/** Which storylets a director scene would pick in this state. Draws random numbers to break ties. */
function pickStorylets(story: Story, s: GameState, director: NonNullable<Scene['director']>) {
  let draws = s.draws;
  const picked = poolScenes(story, director.pool)
    .filter((e) => !(e.storylet!.once && s.seen.includes(e.id)) && evalCondition(e.storylet!.when, s))
    .map((e) => ({ id: e.id, w: e.storylet!.priority + draw(s.seed, draws++) * 2 }))
    .sort((a, b) => b.w - a.w)
    .slice(0, director.pick)
    .map((x) => x.id);
  return { picked, draws };
}

/** Moves to a scene: runs directors until a playable scene is reached, then applies its onEnter. */
export function enterScene(story: Story, s: GameState, id: string): GameState {
  let n: GameState = { ...s };
  let sc = getScene(story, id);
  for (let guard = 0; sc.director; guard++) {
    if (guard > 20) throw new Error('Director loop at ' + id);
    const { picked, draws } = pickStorylets(story, n, sc.director);
    n = { ...n, draws, seen: [...n.seen, sc.id] };
    const [first, ...rest] = picked;
    n.director = first ? { queue: rest, then: sc.director.then } : null;
    id = first ?? sc.director.then;
    sc = getScene(story, id);
  }
  n = applyEffects(n, sc.onEnter);
  n.sceneId = id;
  if (!n.seen.includes(id)) n.seen = [...n.seen, id];
  return n;
}

/** Resolves `$return` from a storylet: the next storylet in the queue, or the director's `then`. */
function resolveTarget(s: GameState, to: string): { s: GameState; id: string } {
  if (to !== RETURN) return { s, id: to };
  if (!s.director) throw new Error('$return outside a storylet');
  const [next, ...rest] = s.director.queue;
  if (next) return { s: { ...s, director: { ...s.director, queue: rest } }, id: next };
  return { s: { ...s, director: null }, id: s.director.then };
}

export const isAvailable = (c: Choice, s: GameState) => evalCondition(c.requires, s);

export type ChoiceView = { index: number; choice: Choice; available: boolean };

/** All choices with availability. Locked choices without a lockedHint are meant to stay hidden. */
export function choiceViews(story: Story, s: GameState): ChoiceView[] {
  return (getScene(story, s.sceneId).choices ?? []).map((choice, index) => ({
    index,
    choice,
    available: isAvailable(choice, s),
  }));
}

export const visibleChoices = (story: Story, s: GameState) =>
  choiceViews(story, s).filter((c) => c.available || c.choice.lockedHint);

export type ChooseResult = { state: GameState; roll?: RollResult; ripple?: string };

export function choose(story: Story, s: GameState, index: number): ChooseResult {
  const scene = getScene(story, s.sceneId);
  const ch = scene.choices?.[index];
  if (!ch) throw new Error(`No choice ${index} in ${s.sceneId}`);
  if (!isAvailable(ch, s)) throw new Error(`Choice ${index} in ${s.sceneId} is locked`);

  let n: GameState = { ...s };
  if (ch.resetState) {
    // The loop: the world forgets, the player keeps what `keep` lists.
    const fresh = initialWorld(story);
    for (const k of ch.resetState.keep) (fresh as Record<string, unknown>)[k] = n[k];
    n = { ...n, ...fresh, seen: [], director: null, loops: n.loops + 1 };
  }
  n = applyEffects(n, ch.effects);

  let target = ch.to;
  let roll: RollResult | undefined;
  if (ch.check) {
    const die = d10(n.seed, n.draws);
    const bonus = n.stats[ch.check.stat] ?? 0;
    const success = die + bonus >= ch.check.difficulty;
    roll = { stat: ch.check.stat, die, bonus, difficulty: ch.check.difficulty, success };
    n.draws += 1;
    target = success ? ch.check.successTo : ch.check.failTo;
  }
  n.history = [...s.history, { scene: s.sceneId, choice: index, ...(roll ? { roll } : {}) }];

  const r = resolveTarget(n, target);
  return { state: enterScene(story, r.s, r.id), roll, ripple: ch.ripple };
}

export const currentScene = (story: Story, s: GameState) => getScene(story, s.sceneId);

/** An ending scene whose only way on is to accept it (or with no available choices at all). */
export const atEnding = (story: Story, s: GameState) => !!currentScene(story, s).ending;
