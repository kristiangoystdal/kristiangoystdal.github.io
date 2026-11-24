import type { Effect, WorldState } from './types';

export const STAT_MIN = 0;
export const STAT_MAX = 10;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Applies effects to a copy of the world and returns it. Stats are clamped to 0-10, counters to >= 0. */
export function applyEffects<T extends WorldState>(s: T, effects: Effect[] | undefined): T {
  if (!effects?.length) return s;
  const n: T = {
    ...s,
    stats: { ...s.stats },
    flags: { ...s.flags },
    items: [...s.items],
    relations: { ...s.relations },
    bonds: { ...s.bonds },
    counters: { ...s.counters },
  };
  for (const e of effects) {
    if ('stat' in e) n.stats[e.stat] = clamp((n.stats[e.stat] ?? 0) + e.add, STAT_MIN, STAT_MAX);
    else if ('flag' in e) n.flags[e.flag] = e.set;
    else if ('item' in e) {
      if (e.give && !n.items.includes(e.item)) n.items.push(e.item);
      if (!e.give) n.items = n.items.filter((i) => i !== e.item);
    } else if ('relation' in e) n.relations[e.relation] = (n.relations[e.relation] ?? 0) + e.add;
    else if ('bond' in e) n.bonds[e.bond] = (n.bonds[e.bond] ?? 0) + e.add;
    else if ('counter' in e) n.counters[e.counter] = Math.max(0, (n.counters[e.counter] ?? 0) + e.add);
    else throw new Error('Unknown effect ' + JSON.stringify(e));
  }
  return n;
}
