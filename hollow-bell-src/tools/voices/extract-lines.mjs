// node tools/voices/extract-lines.mjs -> tools/voices/lines.json: every spoken segment of the story
// (narration and quoted speech), split the same way the game splits it (src/engine/segments.ts).
// {name} uses the story's default player name; {house} gets one variant per house.
// Prints counts only (the story stays a surprise).
import { readFileSync, writeFileSync } from 'node:fs';
import { fillVars, segmentParagraph, speakable, voiceKey } from '../../src/engine/segments.ts';

const root = new URL('../../', import.meta.url);
const story = JSON.parse(readFileSync(new URL('src/stories/hollow-bell.json', root), 'utf8'));
const voices = JSON.parse(readFileSync(new URL('src/stories/hollow-bell.voices.json', root), 'utf8'));
const name = story.characterCreation?.nameInput?.default ?? 'Kringer';
const houses = story.characterCreation?.houseChoice ?? ['Gryffindor'];

// Tone of voice from cues in the narration around a line (Piper has no emotions, but tempo, pitch,
// volume, expressiveness and a tremble go a long way). First match wins.
const TONES = [
  ['whisper', /\bwhisper(s|ed|ing)?\b|under (his|her|their) breath|barely audible/],
  ['shout', /\b(cries|cried|shouts?|shouted|roars?|snaps?|snapped|retorts?|yells?)\b/],
  ['shaky', /\b(shakes|shaking|trembl\w*|cracks|cracked|crying|bitterly|breaks)\b/],
  ['quiet', /\b(quietly|softly|gently|lowers (his|her|their) voice|low voice|not unkindly|mutters|murmurs)\b/],
  ['dry', /\b(dryly|flat(ly)?|tight-lipped|coldly|calmly)\b/],
];
const MOOD_PACE = { dark: 'slow', magic: 'slow' };

function toneFor(raw, segText, speaker, mood) {
  if (speaker === 'Narrator') return MOOD_PACE[mood] ?? 'neutral';
  const probe = segText.slice(0, 24);
  const at = Math.max(0, raw.indexOf(probe));
  const end = at + segText.length;
  const near = (raw.slice(Math.max(0, at - 90), at) + ' ' + raw.slice(end, end + 90)).toLowerCase();
  for (const [tone, re] of TONES) if (re.test(near)) return tone;
  if (/!\s*$/.test(segText)) return 'shout';
  return 'neutral';
}

const lines = [];
// Both stories: the single-player story (its default player name, one variant per house) and the
// two-player story (fixed names, one variant per house for each player who has one in the line).
const mirror = JSON.parse(readFileSync(new URL('src/stories/mirror.json', root), 'utf8'));
const mirrorVoices = JSON.parse(readFileSync(new URL('src/stories/mirror.voices.json', root), 'utf8'));
const SOURCES = [
  { story, voices, vars: (t) => (/\{house\}/.test(t) ? houses : [houses[0]]).map((house) => ({ name, house })) },
  {
    story: mirror,
    voices: mirrorVoices,
    vars: (t) => {
      const base = Object.fromEntries(mirror.players.map((p) => [p.id, p.name]));
      const iH = /\{ingeridHouse\}/.test(t) ? mirror.houses : [mirror.houses[0]];
      const kH = /\{kristianHouse\}/.test(t) ? mirror.houses : [mirror.houses[0]];
      return iH.flatMap((ingeridHouse) => kH.map((kristianHouse) => ({ ...base, ingeridHouse, kristianHouse })));
    },
  },
];
for (const src of SOURCES) {
  for (const [id, sc] of Object.entries(src.story.scenes)) {
    for (const [index, p] of (sc.text ?? []).entries()) {
      const raw = typeof p === 'string' ? p : p.text;
      const segs = segmentParagraph(raw, src.voices.lines[`${id}#${index}`], sc.speaker);
      for (const [seg, s] of segs.entries()) {
        const tone = toneFor(raw, s.text, s.speaker, sc.mood);
        const seenText = new Set();
        for (const v of src.vars(s.text)) {
          const text = speakable(fillVars(s.text, v));
          if (seenText.has(text)) continue;
          seenText.add(text);
          lines.push({ key: await voiceKey(id, index, seg, text), story: src.story.id, scene: id, index, seg, speaker: s.speaker, tone, text });
        }
      }
    }
  }
}
writeFileSync(new URL('tools/voices/lines.json', root), JSON.stringify(lines, null, 1));
const by = {};
for (const l of lines) by[l.speaker] = (by[l.speaker] ?? 0) + 1;
const words = lines.reduce((a, l) => a + l.text.split(/\s+/).length, 0);
console.log(`${lines.length} segments, ${words} words, default name "${name}"`);
console.log(Object.entries(by).map(([k, v]) => `${k}: ${v}`).join(', '));
const tones = {};
for (const l of lines) tones[l.tone] = (tones[l.tone] ?? 0) + 1;
console.log('tones:', Object.entries(tones).map(([k, v]) => `${k} ${v}`).join(', '));
const missing = Object.keys(by).filter((k) => !JSON.parse(readFileSync(new URL('tools/voices/voices.json', root), 'utf8'))[k]);
if (missing.length) {
  console.log('No voice configured for:', missing.join(', '));
  process.exit(1);
}
