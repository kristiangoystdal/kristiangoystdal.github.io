// npm run validate: graph check + bot (tools/validate.mjs) for every story, plus checks that every
// sound a story names exists in public/audio. Exits non-zero on any error.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url).pathname;
const stories = ['src/stories/hollow-bell.json'];
const manifest = JSON.parse(readFileSync(root + 'public/audio/audio-manifest.json', 'utf8'));
let failed = false;

for (const f of stories) {
  console.log(`\n=== ${f} ===`);
  try {
    // The bot output names scenes and endings, so only the summary lines are printed (spoiler-free).
    const out = execFileSync('node', [root + 'tools/validate.mjs', root + f, '1000'], { encoding: 'utf8' });
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
// Every spoken segment should have a recorded voice (tools/voices). Missing ones fall back to the browser's speech.
{
  const { segmentParagraph, fillVars, speakable, voiceKey } = await import('../src/engine/segments.ts');
  const voiceManifest = existsSync(root + 'public/voices/manifest.json') ? JSON.parse(readFileSync(root + 'public/voices/manifest.json', 'utf8')) : {};
  const single = JSON.parse(readFileSync(root + stories[0], 'utf8'));
  const duo = JSON.parse(readFileSync(root + 'src/stories/mirror.json', 'utf8'));
  const checks = [
    { story: single, map: 'src/stories/hollow-bell.voices.json', vars: (t) => (/\{house\}/.test(t) ? single.characterCreation.houseChoice : [single.characterCreation.houseChoice[0]]).map((house) => ({ name: single.characterCreation.nameInput.default, house })) },
    { story: duo, map: 'src/stories/mirror.voices.json', vars: (t) => {
      const base = Object.fromEntries(duo.players.map((p) => [p.id, p.name]));
      const iH = /\{ingeridHouse\}/.test(t) ? duo.houses : [duo.houses[0]];
      const kH = /\{kristianHouse\}/.test(t) ? duo.houses : [duo.houses[0]];
      return iH.flatMap((ingeridHouse) => kH.map((kristianHouse) => ({ ...base, ingeridHouse, kristianHouse })));
    } },
  ];
  for (const c of checks) {
    const map = JSON.parse(readFileSync(root + c.map, 'utf8'));
    let total = 0, missing = 0;
    for (const [id, sc] of Object.entries(c.story.scenes)) {
      for (const [index, p] of (sc.text ?? []).entries()) {
        const raw = typeof p === 'string' ? p : p.text;
        for (const [seg, s] of segmentParagraph(raw, map.lines[`${id}#${index}`], sc.speaker).entries()) {
          const texts = new Set(c.vars(s.text).map((v) => speakable(fillVars(s.text, v))));
          for (const text of texts) {
            total++;
            const file = voiceManifest[await voiceKey(id, index, seg, text)];
            if (!file || !existsSync(root + 'public/' + file)) missing++;
          }
        }
      }
    }
    console.log(`\nVoices (${c.story.id}): ${total - missing} of ${total} segments recorded${missing ? ` (${missing} missing: run tools/voices, see CLAUDE.md)` : ''}`);
    if (missing) failed = true;
  }
}
process.exit(failed ? 1 : 0);
