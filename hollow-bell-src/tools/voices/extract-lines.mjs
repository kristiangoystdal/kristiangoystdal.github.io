// node voices/extract-lines.mjs -> voices/lines.json: quoted speech per paragraph, voiced by the scene's speaker.
// Lines containing {name}/{house} are skipped (text-only). Narration stays unvoiced (or use a narrator voice later).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const story = JSON.parse(readFileSync(new URL('../../src/stories/hollow-bell.json', import.meta.url), 'utf8'));
const lines = [];
for (const [id, sc] of Object.entries(story.scenes)) (sc.text ?? []).forEach((p, i) => {
  if (!sc.speaker) return;
  const raw = typeof p === 'string' ? p : p.text;
  if (/\{name\}|\{house\}/.test(raw)) return;
  const q = [...raw.matchAll(/“([^”]+)”/g)].map((m) => m[1]).join(' ... ');
  if (q.split(/\s+/).length < 3) return;
  lines.push({ key: createHash('sha1').update(id + i + q).digest('hex').slice(0, 10), scene: id, index: i, speaker: sc.speaker, text: q });
});
writeFileSync(new URL('./lines.json', import.meta.url), JSON.stringify(lines, null, 2));
console.log(lines.length, 'lines,', new Set(lines.map((l) => l.speaker)).size, 'speakers');
