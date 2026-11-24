// Builds ../hollow-bell.json (English) from part files.
// Adds visual/audio/speaker metadata so the engine and the audio layer are data-driven.
import { writeFileSync, existsSync, renameSync, readFileSync } from 'node:fs';
import p0 from './part0.mjs';
import p1 from './part1.mjs';
import p2 from './part2.mjs';
import p3 from './part3.mjs';

const out = new URL('../../../src/stories/hollow-bell.json', import.meta.url).pathname;
const oldNo = new URL('../../../src/stories/hollow-bell.no.json', import.meta.url).pathname;
if (existsSync(out) && !existsSync(oldNo)) {
  const prev = JSON.parse(readFileSync(out, 'utf8'));
  if (prev.title && prev.scenes?.p01_midnight?.text?.[0]?.includes('Klokken')) renameSync(out, oldNo);
}

const raw = { ...p0, ...p1, ...p2, ...p3 };

const AMBIENCE = {
  'dormitory-night': 'amb_dorm', 'window-night': 'amb_night_wind', 'corridor-torch': 'amb_corridor',
  'tower-stairs': 'amb_tower_stairs', 'great-hall-day': 'amb_hall', 'courtyard-day': 'amb_courtyard',
  'library-basement': 'amb_archive', 'music-room-moon': 'amb_music_room', 'office-study': 'amb_office',
  'belfry-storm': 'amb_belfry', 'ending-dawn': 'amb_dawn', 'ending-dark': 'amb_dark_drone', 'ending-silence': 'amb_silence'
};
const SFX = {
  intro_title: ['bell_far', 'wind_gust'], intro_arrival: ['chime_soft'],
  p01_midnight: ['bell_far'], p02_pip: ['heartbeat'], p03_window: ['bell_far'],
  r1_stairs: ['footsteps'], r1_split: ['keys_chime'], r1_figure: ['keys_chime', 'door_creak', 'cough'],
  r1_door: ['hum_low', 'whisper'], r1_caught: ['lantern_swing'], r2_felt: ['hum_low'], r2_dragged: ['whoosh'],
  r2_spell: ['spell'], r4_chart: ['page_rustle'], a1_archive: ['page_rustle'], a4_found: ['page_rustle', 'chime_soft'],
  a4_hum: ['hum_voice'], b1_door: ['frost_crackle'], b2_soft: ['door_creak', 'choir_hum'], b2_hard: ['door_splinter', 'glass_shatter'],
  b_flash1: ['choir_hum'], b_flash2: ['bell_far'], b3_gift: ['fork_ring'], c1_office: ['clock_tick'], c2_ledger: ['page_rustle'],
  c2_drawer: ['drawer_slide', 'page_rustle'], c2_caught: ['door_slam'], m1_door: ['whisper', 'hum_low'], m2_holds: ['spell'],
  m2_falls: ['silence_swallow', 'sleep_fall'], m2_retreats: ['door_slam'], n2_stairs: ['footsteps'],
  n2_setback: ['silence_swallow', 'heartbeat'], n3_belfry: ['bell_near', 'wind_gust'], n3_vale_breaks: ['chain_snap', 'choir_hum'],
  n4_fight: ['spell', 'whoosh'], n4_clapper: ['bell_near'], n5_yields: ['chime_soft'], n5_cantor: ['choir_hum'],
  n6_bargain: ['hum_low', 'bell_near'], n7_reseal: ['fork_ring', 'choir_hum', 'chime_success'],
  ending_broken_bell: ['bell_crack', 'glass_shatter'], ending_silence: ['silence_swallow'], ending_expelled: ['door_slam'],
  ending_last_toll: ['bell_near', 'bell_near', 'bell_near']
};
const JINGLE = { good: 'jingle_good', neutral: 'jingle_neutral', bad: 'jingle_bad', secret: 'jingle_secret' };
const SPEAKER = {
  r1_quill_meet: 'Quill', r1_caught: 'Harrow', r1_truth: 'Harrow', r1_detention: 'Harrow',
  r2_mirela: 'Mirela', r2_walk: 'Mirela', r2_felt: 'Mirela', r2_dragged: 'Mirela', r2_spell: 'Mirela', r3_mirela: 'Mirela',
  mirela_talk: 'Mirela', mirela_wait: 'Mirela', mirela_hurt: 'Mirela', n1b_mirela: 'Mirela',
  r4_wing: 'Matron Hale', r4_matron: 'Matron Hale', r4_shooed: 'Matron Hale',
  r3_ashgrove: 'Ashgrove', c2_talk: 'Ashgrove', c_ashgrove_past: 'Ashgrove', c3_hints: 'Ashgrove', c4_leave: 'Ashgrove',
  n4_talk: 'Ashgrove', n5_yields: 'Ashgrove', n3_belfry: 'Ashgrove',
  d_harrow: 'Harrow', d_harrow_accuse: 'Harrow', d_harrow_forgive: 'Harrow', d_harrow_story: 'Harrow', d_harrow_key: 'Harrow',
  a1_archive: 'Quill', a2_truth: 'Quill', a2_sneak: 'Quill', a_quill_past: 'Quill', a3_search: 'Quill', a4_found: 'Quill',
  a4_hum: 'Quill', a4_missed: 'Quill', n4_quill: 'Quill',
  b2_soft: 'Vale', b2_hard: 'Vale', b_flash3: 'Vale', b3_gift: 'Vale', b3_press: 'Vale', b_vale_ash: 'Vale',
  n5_cantor: 'Vale', n3_vale_breaks: 'Vale', n6_bargain: 'Vale'
};
const isPureDialogue = (t) => /^[“"].*[”"]$/s.test(t.trim()) && !/[”"]\s+[A-Za-z][^“”]*[“"]/.test(t);

const scenes = {};
for (const [id, s] of Object.entries(raw)) {
  const sc = { id, title: s.title, mood: s.mood ?? 'tense' };
  if (s.pov) sc.pov = s.pov;
  if (s.preset) {
    sc.visual = { preset: s.preset, particles: s.particles ?? [] };
    sc.audio = { ambience: AMBIENCE[s.preset] };
  }
  if (SFX[id]) (sc.audio ??= {}).sfx = SFX[id];
  if (s.ending) sc.audio = { ...(sc.audio ?? {}), sfx: [...(sc.audio?.sfx ?? []), JINGLE[s.ending.kind]] };
  for (const k of ['onEnter', 'text', 'choices', 'ending', 'director', 'storylet']) if (s[k]) sc[k] = s[k];
  if (SPEAKER[id]) sc.speaker = SPEAKER[id]; // default voice for quoted speech in this scene
  scenes[id] = sc;
}

const story = {
  id: 'hollow-bell',
  title: 'The Hollow Bell',
  language: 'en',
  tagline: 'Every night a bell rings that no one should hear. Every morning, more students do not wake.',
  difficulty: 2,
  estimatedMinutes: 15,
  startScene: 'intro_title',
  characterCreation: {
    nameInput: { label: 'What is your name?', default: 'Alex', maxLength: 16, placeholder: 'Type your name' },
    houseChoice: ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'],
    bonusPoints: 6,
    note: '{name} and {house} are used throughout the text. The name is stored in GameState.player.name.'
  },
  credits: {
    title: 'The Hollow Bell',
    lines: ['A choose-your-own-adventure', 'Story, sound and design: Kristian, with Claude', 'Thank you for playing, {name}.'],
    showEndingCount: true,
    endingCountText: 'Endings found: {found} of {total}',
    buttons: ['Play again', 'Back to title']
  },
  ui: { titleScene: 'intro_title', skipIntroOnLoop: true },
  initialState: {
    stats: { courage: 2, wit: 2, kindness: 2, cunning: 2 },
    flags: {},
    items: [],
    relations: { mirela: 0, quill: 0, cantor: 0, ashgrove: 0, harrow: 0 },
    bonds: {
      'ashgrove|cantor': -1, 'ashgrove|harrow': 0, 'ashgrove|mirela': 0, 'ashgrove|quill': 1,
      'harrow|mirela': 0, 'harrow|quill': 1, 'mirela|quill': 0
    },
    counters: { song: 0 }
  },
  pools: { dusk: { description: 'Afternoon events. The director picks the most relevant ones from bonds, relations and flags.' } },
  scenes
};
writeFileSync(out, JSON.stringify(story, null, 2));
console.log('built', Object.keys(scenes).length, 'scenes ->', out);
