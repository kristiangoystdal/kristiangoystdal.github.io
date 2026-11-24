// Plays random games through the real engine. Used by the tests and by the ?debug quick test.
import { STAT_NAMES, type Story } from './types';
import { choose, currentScene, newGame, visibleChoices } from './state';

export type BotReport = {
  runs: number;
  stuck: number;
  errors: string[];
  endings: Record<string, number>;
  avgSteps: number;
  visited: Set<string>;
};

export function runBot(story: Story, runs: number, rand: () => number = Math.random, maxSteps = 400): BotReport {
  const rep: BotReport = { runs, stuck: 0, errors: [], endings: {}, avgSteps: 0, visited: new Set() };
  let totalSteps = 0;
  const bonusPoints = story.characterCreation?.bonusPoints ?? 6;
  for (let r = 0; r < runs; r++) {
    const bonus: Record<string, number> = {};
    for (let p = 0; p < bonusPoints; p++) {
      const k = STAT_NAMES[Math.floor(rand() * STAT_NAMES.length)];
      bonus[k] = (bonus[k] ?? 0) + 1;
    }
    try {
      let s = newGame(story, { name: 'Bot', house: 'Ravenclaw' }, bonus, Math.floor(rand() * 2 ** 32));
      let steps = 0;
      for (; steps < maxSteps; steps++) {
        rep.visited.add(s.sceneId);
        const sc = currentScene(story, s);
        const avail = visibleChoices(story, s).filter((c) => c.available);
        if (sc.ending && (!avail.length || rand() < 0.5)) {
          rep.endings[sc.ending.id] = (rep.endings[sc.ending.id] ?? 0) + 1;
          break;
        }
        if (!avail.length) {
          rep.stuck++;
          rep.errors.push(`stuck at ${s.sceneId}`);
          break;
        }
        s = choose(story, s, avail[Math.floor(rand() * avail.length)].index).state;
      }
      if (steps >= maxSteps) {
        rep.stuck++;
        rep.errors.push('too many steps');
      }
      totalSteps += steps;
    } catch (e) {
      rep.errors.push(String(e));
    }
  }
  rep.avgSteps = totalSteps / runs;
  return rep;
}
