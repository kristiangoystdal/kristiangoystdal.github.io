// npm run validate: graph check + bot (tools/validate.mjs) for every story, plus checks that every
// sound a story names exists in public/audio. Exits non-zero on any error.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url).pathname;
const stories = ['src/stories/hollow-bell.json', 'src/stories/hollow-bell.no.json'];
const manifest = JSON.parse(readFileSync(root + 'public/audio/audio-manifest.json', 'utf8'));
let failed = false;

for (const f of stories) {
  console.log(`\n=== ${f} ===`);
  try {
    // The bot output names scenes and endings, so only the summary lines are printed (spoiler-free).
    const out = execFileSync('node', [root + 'tools/validate.mjs', root + f, '3000'], { encoding: 'utf8' });
    console.log(out.split('\n').filter((l) => /^(Scenes|Errors|Warnings|Bot runs|Average|Distinct)/.test(l)).join('\n'));
  } catch (e) {
    failed = true;
    console.log(e.stdout ?? String(e));
  }
  const story = JSON.parse(readFileSync(root + f, 'utf8'));
  const used = new Set();
  for (const s of Object.values(story.scenes)) {
    if (s.audio?.ambience) used.add(s.audio.ambience);
    (s.audio?.sfx ?? []).forEach((i) => used.add(i));
  }
  const missing = [...used].filter((id) => !manifest[id] || !existsSync(root + 'public/' + manifest[id].file));
  console.log(`Sounds used: ${used.size}, missing: ${missing.join(', ') || 'none'}`);
  if (missing.length) failed = true;
}
process.exit(failed ? 1 : 0);
