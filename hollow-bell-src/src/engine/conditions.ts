import type { Condition, Range, WorldState } from './types';

const inRange = (v: number, r: Range) => (r.gte === undefined || v >= r.gte) && (r.lte === undefined || v <= r.lte);

/** Evaluates a `requires` / `when` / `if` expression. A missing condition is always true. */
export function evalCondition(c: Condition | undefined, s: WorldState): boolean {
  if (!c) return true;
  if ('all' in c) return c.all.every((x) => evalCondition(x, s));
  if ('any' in c) return c.any.some((x) => evalCondition(x, s));
  if ('not' in c) return !evalCondition(c.not, s);
  if ('flag' in c) return !!s.flags[c.flag] === (c.is ?? true);
  if ('item' in c) return s.items.includes(c.item);
  if ('stat' in c) return inRange(s.stats[c.stat] ?? 0, c);
  if ('relation' in c) return inRange(s.relations[c.relation] ?? 0, c);
  if ('bond' in c) return inRange(s.bonds[c.bond] ?? 0, c);
  if ('counter' in c) return inRange(s.counters[c.counter] ?? 0, c);
  throw new Error('Unknown condition ' + JSON.stringify(c));
}
