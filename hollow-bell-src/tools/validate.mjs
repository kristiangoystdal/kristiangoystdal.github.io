// Validates story graph and plays random games with a bot.
// Usage: node validate.mjs hollow-bell.json [runs]
// Supports: conditions/effects (flag, item, stat, relation, bond), checks, resetState,
// conditional text, and director scenes that pick storylets from a pool.
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'hollow-bell.json';
const runs = Number(process.argv[3] ?? 5000);
const story = JSON.parse(readFileSync(file, 'utf8'));
const scenes = story.scenes;
const errors = [];
const warnings = [];
const RETURN = '$return';

const freshState = () => ({
  stats: { ...story.initialState.stats },
  flags: {},
  items: [],
  relations: { ...story.initialState.relations },
  bonds: { ...(story.initialState.bonds ?? {}) },
  counters: { ...(story.initialState.counters ?? {}) },
  seen: new Set()
});

const evalCond = (c, s) => {
  if (!c) return true;
  if ('all' in c) return c.all.every((x) => evalCond(x, s));
  if ('any' in c) return c.any.some((x) => evalCond(x, s));
  if ('not' in c) return !evalCond(c.not, s);
  if ('flag' in c) return !!s.flags[c.flag] === (c.is ?? true);
  if ('item' in c) return s.items.includes(c.item);
  if ('stat' in c) {
    const v = s.stats[c.stat];
    return (c.gte === undefined || v >= c.gte) && (c.lte === undefined || v <= c.lte);
  }
  if ('relation' in c) {
    const v = s.relations[c.relation] ?? 0;
    return (c.gte === undefined || v >= c.gte) && (c.lte === undefined || v <= c.lte);
  }
  if ('counter' in c) {
    const v = s.counters[c.counter] ?? 0;
    return (c.gte === undefined || v >= c.gte) && (c.lte === undefined || v <= c.lte);
  }
  if ('bond' in c) {
    const v = s.bonds[c.bond] ?? 0;
    return (c.gte === undefined || v >= c.gte) && (c.lte === undefined || v <= c.lte);
  }
  throw new Error('Unknown condition ' + JSON.stringify(c));
};
const apply = (effs = [], s) => {
  for (const e of effs) {
    if ('stat' in e) s.stats[e.stat] = Math.max(0, Math.min(10, s.stats[e.stat] + e.add));
    else if ('flag' in e) s.flags[e.flag] = e.set;
    else if ('item' in e) {
      if (e.give && !s.items.includes(e.item)) s.items.push(e.item);
      if (!e.give) s.items = s.items.filter((i) => i !== e.item);
    } else if ('relation' in e) s.relations[e.relation] = (s.relations[e.relation] ?? 0) + e.add;
    else if ('counter' in e) s.counters[e.counter] = Math.max(0, (s.counters[e.counter] ?? 0) + e.add);
    else if ('bond' in e) {
      if (!(e.bond in s.bonds)) throw new Error('Unknown bond ' + e.bond);
      s.bonds[e.bond] += e.add;
    } else throw new Error('Unknown effect ' + JSON.stringify(e));
  }
};
const condRefs = (c, out = { flags: new Set(), items: new Set(), bonds: new Set() }) => {
  if (!c) return out;
  if (c.all) c.all.forEach((x) => condRefs(x, out));
  if (c.any) c.any.forEach((x) => condRefs(x, out));
  if (c.not) condRefs(c.not, out);
  if (c.flag) out.flags.add(c.flag);
  if (c.item) out.items.add(c.item);
  if (c.bond) out.bonds.add(c.bond);
  return out;
};
const targets = (ch) => {
  const t = [ch.to];
  if (ch.check) t.push(ch.check.successTo, ch.check.failTo);
  return t.filter((x) => x !== RETURN);
};
const poolScenes = (pool) => Object.values(scenes).filter((sc) => sc.storylet?.pool === pool);

// ---------- static checks ----------
if (!scenes[story.startScene]) errors.push('startScene missing: ' + story.startScene);
const setFlags = new Set(), setItems = new Set();
const usedFlags = new Set(), usedItems = new Set(), usedBonds = new Set();
const endings = new Set();
for (const [id, sc] of Object.entries(scenes)) {
  if (sc.id !== id) errors.push(`id mismatch ${id} vs ${sc.id}`);
  const hasChoices = sc.choices && sc.choices.length > 0;
  if (!hasChoices && !sc.ending && !sc.director) errors.push(`${id}: no choices, ending or director`);
  if (sc.director) {
    if (!scenes[sc.director.then]) errors.push(`${id}: director.then missing ${sc.director.then}`);
    if (!poolScenes(sc.director.pool).length) errors.push(`${id}: empty pool ${sc.director.pool}`);
  }
  if (sc.storylet) {
    for (const ch of sc.choices ?? []) {
      if (!targets(ch).length && ch.to !== RETURN) errors.push(`${id}: bad storylet target`);
    }
    if (!(sc.choices ?? []).some((c) => c.to === RETURN)) errors.push(`${id}: storylet never returns`);
  } else {
    for (const ch of sc.choices ?? []) {
      if ([ch.to, ch.check?.successTo, ch.check?.failTo].includes(RETURN)) errors.push(`${id}: $return outside storylet`);
    }
  }
  if (sc.ending) {
    if (endings.has(sc.ending.id)) errors.push('duplicate ending id ' + sc.ending.id);
    endings.add(sc.ending.id);
  }
  const effs = [...(sc.onEnter ?? []), ...(sc.choices ?? []).flatMap((c) => c.effects ?? [])];
  for (const e of effs) {
    if (e.flag && e.set) setFlags.add(e.flag);
    if (e.item && e.give) setItems.add(e.item);
    if (e.bond && !(e.bond in (story.initialState.bonds ?? {}))) errors.push(`${id}: unknown bond ${e.bond}`);
  }
  const conds = [sc.storylet?.when];
  (sc.text ?? []).forEach((t) => typeof t === 'object' && conds.push(t.if));
  (sc.choices ?? []).forEach((c) => {
    conds.push(c.requires);
    for (const t of targets(c)) if (!scenes[t]) errors.push(`${id}: choice "${c.label}" -> missing scene ${t}`);
    if (c.check && c.to !== c.check.successTo) errors.push(`${id}: choice "${c.label}" to != successTo`);
  });
  for (const c of conds) {
    const r = condRefs(c);
    r.flags.forEach((f) => usedFlags.add(f));
    r.items.forEach((i) => usedItems.add(i));
    r.bonds.forEach((b) => { usedBonds.add(b); if (!(b in (story.initialState.bonds ?? {}))) errors.push(`${id}: unknown bond in condition ${b}`); });
  }
}
for (const f of usedFlags) if (!setFlags.has(f)) errors.push(`flag used but never set: ${f}`);
for (const i of usedItems) if (!setItems.has(i)) errors.push(`item used but never given: ${i}`);
for (const f of setFlags) if (!usedFlags.has(f)) warnings.push(`flag set but never used: ${f}`);
for (const b of Object.keys(story.initialState.bonds ?? {})) if (!usedBonds.has(b)) warnings.push(`bond never used in a condition: ${b}`);

// reachability (ignoring conditions)
const seenIds = new Set();
const q = [story.startScene];
while (q.length) {
  const id = q.pop();
  if (seenIds.has(id) || !scenes[id]) continue;
  seenIds.add(id);
  const sc = scenes[id];
  for (const c of sc.choices ?? []) targets(c).forEach((t) => q.push(t));
  if (sc.director) {
    q.push(sc.director.then);
    poolScenes(sc.director.pool).forEach((p) => q.push(p.id));
  }
}
for (const id of Object.keys(scenes)) if (!seenIds.has(id)) errors.push(`unreachable scene: ${id}`);

// ---------- bot ----------
const names = Object.keys(story.initialState.stats);
const endCount = {};
const sceneVisits = {};
const lengths = [];
const reachedBy = {};
const pathsSeen = new Set();
let stuck = 0;
const stuckAt = {};
const bondSwing = {};
for (let r = 0; r < runs; r++) {
  let s = freshState();
  for (let p = 0; p < 6; p++) s.stats[names[Math.floor(Math.random() * 4)]] += 1;
  const keepStats = () => s.stats;
  let cur = story.startScene;
  let steps = 0;
  const path = [];
  const visit = (id) => { sceneVisits[id] = (sceneVisits[id] ?? 0) + 1; path.push(id); s.seen.add(id); };
  const pickChoice = (sc) => {
    const avail = (sc.choices ?? []).filter((c) => evalCond(c.requires, s));
    if (!avail.length) return null;
    const ch = avail[Math.floor(Math.random() * avail.length)];
    if (ch.resetState) {
      const stats = keepStats();
      s = freshState();
      s.stats = stats;
    }
    apply(ch.effects, s);
    if (ch.check) {
      const roll = 1 + Math.floor(Math.random() * 10);
      return roll + s.stats[ch.check.stat] >= ch.check.difficulty ? ch.check.successTo : ch.check.failTo;
    }
    return ch.to;
  };
  while (steps++ < 300) {
    const sc = scenes[cur];
    visit(cur);
    apply(sc.onEnter, s);
    if (sc.director) {
      const elig = poolScenes(sc.director.pool)
        .filter((e) => !(e.storylet.once && s.seen.has(e.id)) && evalCond(e.storylet.when, s))
        .map((e) => ({ e, w: e.storylet.priority + Math.random() * 2 }))
        .sort((a, b) => b.w - a.w)
        .slice(0, sc.director.pick);
      for (const { e } of elig) {
        visit(e.id);
        apply(e.onEnter, s);
        let next = pickChoice(e);
        let guard = 0;
        while (next && next !== RETURN && guard++ < 20) {
          visit(next);
          apply(scenes[next].onEnter, s);
          next = pickChoice(scenes[next]);
        }
      }
      cur = sc.director.then;
      continue;
    }
    if (sc.ending) {
      const choices = (sc.choices ?? []).filter((c) => evalCond(c.requires, s));
      if (choices.length && Math.random() < 0.5) {
        const next = pickChoice(sc);
        cur = next;
        continue;
      }
      endCount[sc.ending.id] = (endCount[sc.ending.id] ?? 0) + 1;
      lengths.push(path.length);
      (reachedBy[sc.ending.id] ??= []).push(path.length);
      pathsSeen.add(path.join('>'));
      for (const [k, v] of Object.entries(s.bonds)) bondSwing[k] = (bondSwing[k] ?? new Set()).add(v);
      break;
    }
    const next = pickChoice(sc);
    if (next === null) {
      stuck++;
      stuckAt[cur] = (stuckAt[cur] ?? 0) + 1;
      break;
    }
    cur = next;
  }
  if (steps >= 300) { stuck++; stuckAt.LOOP = (stuckAt.LOOP ?? 0) + 1; }
}

// ---------- report ----------
const words = Object.values(scenes)
  .flatMap((sc) => (sc.text ?? []).map((t) => (typeof t === 'string' ? t : t.text)))
  .join(' ').split(/\s+/).length;
console.log(`Scenes: ${Object.keys(scenes).length}, endings: ${endings.size}, words: ${words}`);
console.log('Errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none');
console.log('Warnings:', warnings.length ? '\n  ' + warnings.join('\n  ') : 'none');
console.log(`\nBot runs: ${runs}, stuck: ${stuck}`, stuck ? stuckAt : '');
console.log('Ending distribution (random play):');
for (const e of endings) {
  const n = endCount[e] ?? 0;
  const avg = reachedBy[e] ? (reachedBy[e].reduce((a, b) => a + b, 0) / reachedBy[e].length).toFixed(1) : '-';
  console.log(`  ${e.padEnd(18)} ${String(n).padStart(5)}  ${((100 * n) / runs).toFixed(1).padStart(5)}%  avg scenes ${avg}`);
}
const never = Object.keys(scenes).filter((id) => !sceneVisits[id]);
console.log('Never visited by bot:', never.length ? never.join(', ') : 'none');
const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
const total = Object.keys(scenes).length;
console.log(`Average path: ${avgLen.toFixed(1)} of ${total} scenes (${((100 * avgLen) / total).toFixed(0)}% of the story)`);
console.log(`Distinct paths seen: ${pathsSeen.size} of ${runs} runs`);
console.log('Storylet pick rates:');
for (const sc of poolScenes('dusk')) console.log(`  ${sc.id.padEnd(22)} ${((100 * (sceneVisits[sc.id] ?? 0)) / runs).toFixed(1)}% of runs`);
process.exit(errors.length || stuck ? 1 : 0);
