// Two-player engine: one shared story, each player gets their own (secret) choices in a scene,
// and the story moves on once everyone who has something to choose has chosen. Where it goes next,
// and how it ends, depends on the combination of both players' choices.
import { evalCondition } from './conditions';
import { applyEffects } from './effects';
import { d10, draw, newSeed } from './rng';
import { STAT_NAMES, type Condition, type Effect, type Mood, type Particle, type RollResult, type StatName, type WorldState } from './types';

export type PlayerId = 'ingerid' | 'kristian';
export const PLAYER_IDS: PlayerId[] = ['ingerid', 'kristian'];

/** A condition on one player's own stats or items, or any shared-world condition. */
export type DuoCondition =
  | Condition
  | ({ player: PlayerId } & ({ stat: StatName; gte?: number; lte?: number } | { item: string }))
  | { all: DuoCondition[] }
  | { any: DuoCondition[] }
  | { not: DuoCondition };

/** A shared-world effect, or a change to one player's own stats or items. */
export type DuoEffect = Effect | ({ player: PlayerId } & ({ stat: StatName; add: number } | { item: string; give: boolean }));

export type DuoChoice = {
  label: string;
  requires?: DuoCondition;
  lockedHint?: string;
  effects?: DuoEffect[];
  /** A d10 + the player's stat; success or fail effects are applied before the story moves on. */
  check?: { stat: StatName; difficulty: number; success?: DuoEffect[]; fail?: DuoEffect[] };
  ripple?: string;
};

export type DuoParagraph = string | { if: DuoCondition; text: string };

export type DuoScene = {
  id: string;
  title?: string;
  mood?: Mood;
  visual?: { preset?: string; particles?: Particle[] };
  audio?: { ambience?: string; sfx?: string[] };
  speaker?: string;
  /** Who is on stage: 'ingerid', 'kristian', 'kristian@mirror' (seen through glass), or a character name. */
  cast?: string[];
  text?: DuoParagraph[];
  onEnter?: DuoEffect[];
  choices?: Partial<Record<PlayerId, DuoChoice[]>>;
  /** Where to go once everyone has chosen: the first entry whose condition holds. The last one has no condition. */
  next?: { if?: DuoCondition; to: string }[];
  ending?: { id: string; title: string; kind: 'good' | 'neutral' | 'bad' | 'secret' };
};

export type DuoStory = {
  id: string;
  title: string;
  tagline: string;
  estimatedMinutes: number;
  startScene: string;
  players: { id: PlayerId; name: string }[];
  houses: string[];
  bonusPoints: number;
  initialState: { stats: Record<StatName, number>; flags?: Record<string, boolean>; relations?: Record<string, number>; counters?: Record<string, number> };
  scenes: Record<string, DuoScene>;
  credits?: { title?: string; lines?: string[] };
};

export type PlayerState = { name: string; house: string; stats: Record<StatName, number>; items: string[]; look?: Record<string, string> };

export type DuoPick = { choice: number; roll?: RollResult };

export type DuoState = {
  version: 1;
  mode: 'duo';
  storyId: string;
  sceneId: string;
  flags: Record<string, boolean>;
  relations: Record<string, number>;
  counters: Record<string, number>;
  players: Record<PlayerId, PlayerState>;
  /** Choices made in the current scene that have not been resolved yet. Secret until the story reveals them. */
  pending: Partial<Record<PlayerId, number>>;
  history: { scene: string; picks: Partial<Record<PlayerId, DuoPick>> }[];
  seen: string[];
  seed: number;
  draws: number;
};

export type DuoSetup = Record<PlayerId, { house: string; bonus: Partial<Record<StatName, number>>; look?: Record<string, string> }>;

// ---------- conditions and effects ----------
/** The shared world, plus one player's stats and items when a condition or effect is about that player. */
function worldFor(s: DuoState, p?: PlayerId): WorldState {
  const pl = p ? s.players[p] : undefined;
  return {
    stats: pl ? pl.stats : { courage: 0, wit: 0, kindness: 0, cunning: 0 },
    items: pl ? pl.items : [],
    flags: s.flags,
    relations: s.relations,
    bonds: {},
    counters: s.counters,
  };
}

export function evalDuo(c: DuoCondition | undefined, s: DuoState): boolean {
  if (!c) return true;
  if ('all' in c) return c.all.every((x) => evalDuo(x, s));
  if ('any' in c) return c.any.some((x) => evalDuo(x, s));
  if ('not' in c) return !evalDuo(c.not, s);
  if ('player' in c) {
    const { player, ...rest } = c;
    return evalCondition(rest as Condition, worldFor(s, player));
  }
  return evalCondition(c, worldFor(s));
}

export function applyDuo(s: DuoState, effects: DuoEffect[] | undefined): DuoState {
  if (!effects?.length) return s;
  let n: DuoState = { ...s };
  for (const e of effects) {
    if ('player' in e) {
      const { player, ...rest } = e;
      const w = applyEffects(worldFor(n, player), [rest as Effect]);
      n = { ...n, players: { ...n.players, [player]: { ...n.players[player], stats: w.stats, items: w.items } } };
    } else {
      const w = applyEffects(worldFor(n), [e]);
      n = { ...n, flags: w.flags, relations: w.relations, counters: w.counters };
    }
  }
  return n;
}

// ---------- game flow ----------
export const duoScene = (story: DuoStory, s: DuoState) => {
  const sc = story.scenes[s.sceneId];
  if (!sc) throw new Error('Scene not found: ' + s.sceneId);
  return sc;
};

export function newDuoGame(story: DuoStory, setup: DuoSetup, seed = newSeed()): DuoState {
  const players = {} as Record<PlayerId, PlayerState>;
  for (const p of story.players) {
    const stats = { ...story.initialState.stats };
    for (const k of STAT_NAMES) stats[k] = Math.min(10, stats[k] + (setup[p.id]?.bonus[k] ?? 0));
    players[p.id] = { name: p.name, house: setup[p.id]?.house ?? story.houses[0], stats, items: [], ...(setup[p.id]?.look ? { look: setup[p.id].look } : {}) };
  }
  const s: DuoState = {
    version: 1,
    mode: 'duo',
    storyId: story.id,
    sceneId: '',
    flags: { ...(story.initialState.flags ?? {}) },
    relations: { ...(story.initialState.relations ?? {}) },
    counters: { ...(story.initialState.counters ?? {}) },
    players,
    pending: {},
    history: [],
    seen: [],
    seed,
    draws: 0,
  };
  return enterDuo(story, s, story.startScene);
}

function enterDuo(story: DuoStory, s: DuoState, id: string): DuoState {
  const sc = story.scenes[id];
  if (!sc) throw new Error('Scene not found: ' + id);
  let n = applyDuo({ ...s, sceneId: id, pending: {} }, sc.onEnter);
  if (!n.seen.includes(id)) n = { ...n, seen: [...n.seen, id] };
  return n;
}

export type DuoChoiceView = { index: number; choice: DuoChoice; available: boolean };

/** One player's choices in the current scene (locked ones without a hint are left out). */
export function duoChoices(story: DuoStory, s: DuoState, p: PlayerId): DuoChoiceView[] {
  return (duoScene(story, s).choices?.[p] ?? [])
    .map((choice, index) => ({ index, choice, available: evalDuo(choice.requires, s) }))
    .filter((v) => v.available || v.choice.lockedHint);
}

/** The players who have something to choose in this scene. */
export function choosers(story: DuoStory, s: DuoState): PlayerId[] {
  return PLAYER_IDS.filter((p) => duoChoices(story, s, p).some((v) => v.available));
}

/** Everyone who has to choose has chosen (a scene where nobody chooses is ready to move on). */
export const duoReady = (story: DuoStory, s: DuoState) => choosers(story, s).every((p) => s.pending[p] !== undefined);

export function submitDuo(story: DuoStory, s: DuoState, p: PlayerId, index: number): DuoState {
  const v = duoChoices(story, s, p).find((c) => c.index === index);
  if (!v || !v.available) throw new Error(`${p} cannot pick ${index} in ${s.sceneId}`);
  return { ...s, pending: { ...s.pending, [p]: index } };
}

export type DuoResolve = { state: DuoState; rolls: Partial<Record<PlayerId, RollResult>>; ripples: { player: PlayerId; text: string }[] };

/** Applies both players' picks (in player order), rolls their checks, and moves to the next scene. */
export function resolveDuo(story: DuoStory, s: DuoState): DuoResolve {
  if (!duoReady(story, s)) throw new Error('Not everyone has chosen');
  const sc = duoScene(story, s);
  if (sc.ending) throw new Error('The story has ended');
  let n: DuoState = { ...s };
  const rolls: DuoResolve['rolls'] = {};
  const ripples: DuoResolve['ripples'] = [];
  const picks: Partial<Record<PlayerId, DuoPick>> = {};
  for (const p of PLAYER_IDS) {
    const idx = s.pending[p];
    if (idx === undefined) continue;
    const ch = sc.choices![p]![idx];
    n = applyDuo(n, ch.effects);
    let roll: RollResult | undefined;
    if (ch.check) {
      const die = d10(n.seed, n.draws);
      const bonus = n.players[p].stats[ch.check.stat] ?? 0;
      roll = { stat: ch.check.stat, die, bonus, difficulty: ch.check.difficulty, success: die + bonus >= ch.check.difficulty };
      n = { ...n, draws: n.draws + 1 };
      n = applyDuo(n, roll.success ? ch.check.success : ch.check.fail);
      rolls[p] = roll;
    }
    if (ch.ripple) ripples.push({ player: p, text: ch.ripple });
    picks[p] = { choice: idx, ...(roll ? { roll } : {}) };
  }
  n = { ...n, history: [...n.history, { scene: sc.id, picks }] };
  const next = (sc.next ?? []).find((x) => evalDuo(x.if, n));
  if (!next) throw new Error('No way on from ' + sc.id);
  return { state: enterDuo(story, n, next.to), rolls, ripples };
}

// ---------- text ----------
export function duoVars(s: DuoState): Record<string, string> {
  return {
    ingerid: s.players.ingerid.name,
    kristian: s.players.kristian.name,
    ingeridHouse: s.players.ingerid.house,
    kristianHouse: s.players.kristian.house,
  };
}

export function duoText(sc: DuoScene, s: DuoState): { text: string; raw: string; index: number }[] {
  const vars = duoVars(s);
  const out: { text: string; raw: string; index: number }[] = [];
  (sc.text ?? []).forEach((p: DuoParagraph, index) => {
    if (typeof p !== 'string' && !evalDuo(p.if, s)) return;
    const raw = typeof p === 'string' ? p : p.text;
    out.push({ raw, index, text: raw.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) });
  });
  return out;
}

// ---------- bot ----------
export type DuoBotReport = { runs: number; endings: Record<string, number>; errors: string[]; visited: Set<string>; stuck: number };

/** Plays random games with both players choosing at random. */
export function runDuoBot(story: DuoStory, runs: number, rand: () => number = Math.random): DuoBotReport {
  const rep: DuoBotReport = { runs, endings: {}, errors: [], visited: new Set(), stuck: 0 };
  for (let r = 0; r < runs; r++) {
    try {
      const setup = {} as DuoSetup;
      for (const p of PLAYER_IDS) {
        const bonus: Partial<Record<StatName, number>> = {};
        for (let i = 0; i < story.bonusPoints; i++) {
          const k = STAT_NAMES[Math.floor(rand() * 4)];
          bonus[k] = (bonus[k] ?? 0) + 1;
        }
        setup[p] = { house: story.houses[Math.floor(rand() * story.houses.length)], bonus };
      }
      let s = newDuoGame(story, setup, Math.floor(rand() * 2 ** 32));
      let steps = 0;
      for (; steps < 200; steps++) {
        rep.visited.add(s.sceneId);
        const sc = duoScene(story, s);
        if (sc.ending) {
          rep.endings[sc.ending.id] = (rep.endings[sc.ending.id] ?? 0) + 1;
          break;
        }
        for (const p of choosers(story, s)) {
          const avail = duoChoices(story, s, p).filter((v) => v.available);
          s = submitDuo(story, s, p, avail[Math.floor(rand() * avail.length)].index);
        }
        s = resolveDuo(story, s).state;
      }
      if (steps >= 200) rep.stuck++;
    } catch (e) {
      rep.errors.push(String(e));
    }
  }
  return rep;
}

/** Random draw helper re-exported for UIs that need a deterministic pick. */
export { draw };
