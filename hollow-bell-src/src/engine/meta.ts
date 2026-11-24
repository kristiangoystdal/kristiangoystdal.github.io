// Progress kept across playthroughs: which endings have been found in which story.
import { readJSON, writeJSON } from './save';
import type { Story } from './types';

type Meta = { endings: Record<string, string[]> };

export const loadMeta = (): Meta => readJSON<Meta>('meta', { endings: {} });

export function recordEnding(storyId: string, endingId: string): Meta {
  const m = loadMeta();
  const list = new Set(m.endings[storyId] ?? []);
  list.add(endingId);
  m.endings = { ...m.endings, [storyId]: [...list] };
  writeJSON('meta', m);
  return m;
}

export const allEndings = (story: Story) =>
  Object.values(story.scenes)
    .filter((s) => s.ending)
    .map((s) => s.ending!);

export function endingsFound(story: Story) {
  const found = new Set(loadMeta().endings[story.id] ?? []);
  const all = allEndings(story);
  return { found: all.filter((e) => found.has(e.id)).length, total: all.length, ids: found };
}
