// node audio/render-sfx.mjs  -> writes public/audio/sfx/*.wav, audio-manifest.json, verifies peak/RMS.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { SFX, render, wav, SR } from './sfx-synth.mjs';
const dir = new URL('../../public/audio/sfx/', import.meta.url).pathname; mkdirSync(dir, { recursive: true });
const manifest = {}; let bad = 0;
for (const id of Object.keys(SFX)) {
  const x = render(id); let pk = 0, ss = 0; for (const v of x) { pk = Math.max(pk, Math.abs(v)); ss += v * v; }
  const rms = Math.sqrt(ss / x.length), sec = x.length / SR;
  if (!(pk > 0.05 && pk <= 1 && rms > 0.003 && sec > 0.3 && Number.isFinite(rms))) { bad++; console.log('BAD', id, { pk, rms, sec }); }
  writeFileSync(dir + id + '.wav', wav(x));
  manifest[id] = { file: `audio/sfx/${id}.ogg`, loop: id.startsWith('amb_'), seconds: +sec.toFixed(2), volume: id.startsWith('amb_') ? 0.4 : 0.8 };
}
writeFileSync(new URL('../../public/audio/audio-manifest.json', import.meta.url).pathname, JSON.stringify(manifest, null, 2));
// every sfx/ambience id used in the story must exist
const story = JSON.parse(readFileSync(new URL('../../src/stories/hollow-bell.json', import.meta.url), 'utf8'));
const used = new Set(); for (const s of Object.values(story.scenes)) { if (s.audio?.ambience) used.add(s.audio.ambience); (s.audio?.sfx ?? []).forEach((i) => used.add(i)); }
const missing = [...used].filter((i) => !manifest[i]);
import { execSync } from 'node:child_process';
try { for (const id of Object.keys(manifest)) execSync(`ffmpeg -loglevel error -y -i ${dir}${id}.wav -c:a libvorbis -q:a 3 ${dir}${id}.ogg`); } catch { console.log('ffmpeg missing: WAV files kept; change .ogg to .wav in manifest'); }
console.log(`Rendered ${Object.keys(manifest).length} sounds, ${bad} bad, missing in story: ${missing.join(', ') || 'none'}`);
process.exit(bad || missing.length ? 1 : 0);
