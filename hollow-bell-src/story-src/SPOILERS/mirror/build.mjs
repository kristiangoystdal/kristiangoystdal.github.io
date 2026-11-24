// node story-src/SPOILERS/mirror/build.mjs -> src/stories/mirror.json (the two-player story)
// Adds ids, ambience and sound effects to the scenes in story.mjs.
import { writeFileSync } from 'node:fs';
import S from './story.mjs';

const AMBIENCE = {
  'ballroom-night': 'amb_hall', 'mirror-hall': 'amb_music_room', 'mirror-world': 'amb_silence',
  'library-basement': 'amb_archive', 'corridor-torch': 'amb_corridor', 'ending-dark': 'amb_dark_drone',
};
const SFX = {
  m_ball: ['chime_soft'], m_hall: ['whisper'], m_hall_k: ['hum_low'], m_split: ['glass_shatter', 'whoosh'],
  m_k_silver: ['wind_gust'], m_i_glass: ['page_rustle'], m_k_library: ['hum_voice'], m_i_library: ['page_rustle'],
  m_talk1: ['whisper'], m_talk2: ['frost_crackle'], m_talk3: ['hum_low'], m_clock_i: ['clock_tick', 'bell_far'],
  m_clock_k: ['clock_tick'], m_door: ['bell_near', 'chime_success'], m_door_miss: ['bell_crack'], m_offer_k: ['heartbeat'],
  m_offer_i: ['heartbeat'],
};
const JINGLE = { good: 'jingle_good', neutral: 'jingle_neutral', bad: 'jingle_bad', secret: 'jingle_secret' };

const scenes = {};
for (const [id, s] of Object.entries(S)) {
  const sc = { id, ...s };
  sc.audio = { ambience: AMBIENCE[s.visual?.preset] ?? 'amb_hall', sfx: [...(SFX[id] ?? []), ...(s.ending ? [JINGLE[s.ending.kind]] : [])] };
  scenes[id] = sc;
}

const story = {
  id: 'mirror',
  title: 'The Other Side of the Glass',
  tagline: 'A story for two. One night, one ball, one mirror, and two people on opposite sides of it.',
  estimatedMinutes: 20,
  startScene: 'm_ball',
  players: [
    { id: 'ingerid', name: 'Ingerid' },
    { id: 'kristian', name: 'Kristian' },
  ],
  houses: ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'],
  bonusPoints: 6,
  initialState: { stats: { courage: 2, wit: 2, kindness: 2, cunning: 2 }, flags: {}, relations: { gloam: 0 }, counters: {} },
  credits: { title: 'The Other Side of the Glass', lines: ['A story for two', 'Written for Ingerid and Kristian'] },
  scenes,
};
writeFileSync(new URL('../../../src/stories/mirror.json', import.meta.url), JSON.stringify(story, null, 2) + '\n');
const words = Object.values(scenes).flatMap((s) => (s.text ?? []).map((t) => (typeof t === 'string' ? t : t.text))).join(' ').split(/\s+/).length;
console.log(`built mirror.json: ${Object.keys(scenes).length} scenes, ${Object.values(scenes).filter((s) => s.ending).length} endings, ${words} words`);
