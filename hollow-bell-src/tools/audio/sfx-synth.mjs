// Procedural SFX/ambience. Pure DSP -> Float32Array @ 44.1kHz mono. No assets, no copyright.
export const SR = 44100;
const TAU = Math.PI * 2;
let seed = 1337;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const buf = (sec) => new Float32Array(Math.floor(sec * SR));
const env = (t, a, d) => Math.min(t / a, 1) * Math.exp(-t / d);
const lp = (x, k) => { let y = 0; for (let i = 0; i < x.length; i++) { y += k * (x[i] - y); x[i] = y; } return x; };
const norm = (x, peak = 0.8) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; };
const fade = (x, ms = 15) => { const n = Math.floor(SR * ms / 1000); for (let i = 0; i < n && i < x.length; i++) { x[i] *= i / n; x[x.length - 1 - i] *= i / n; } return x; };
const noise = (sec, k = 1) => lp(buf(sec).map(() => rnd()), k);
const partials = (f, parts, sec, decay) => { const x = buf(sec); for (const [m, a, d = 1] of parts) for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] += a * Math.sin(TAU * f * m * t) * Math.exp(-t / (decay * d)); } return x; };
const mix = (sec, ...layers) => { const x = buf(sec); for (const [l, off = 0, g = 1] of layers) { const o = Math.floor(off * SR); for (let i = 0; i < l.length && o + i < x.length; i++) x[o + i] += l[i] * g; } return x; };
const loopable = (x, ms = 400) => { const n = Math.floor(SR * ms / 1000); for (let i = 0; i < n; i++) { const w = i / n; x[i] = x[i] * w + x[x.length - n + i] * (1 - w); } return x.subarray(0, x.length - n); };

const bell = (f, sec, g = 1) => norm(partials(f, [[0.5, 0.6, 1.6], [1, 1, 1], [1.19, 0.5, 0.8], [1.56, 0.4, 0.6], [2, 0.5, 0.5], [2.74, 0.3, 0.35], [3.76, 0.15, 0.25]], sec, 1.1), 0.8 * g);
const droneAmb = (f, sec, lpk, extra = 0) => { const n = noise(sec, lpk); const x = buf(sec); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = n[i] * (0.6 + 0.4 * Math.sin(TAU * 0.13 * t)) + 0.3 * Math.sin(TAU * f * t) + 0.15 * Math.sin(TAU * f * 1.5 * t) + extra * rnd() * 0.05; } return norm(x, 0.35); };
const step = (sec, f) => { const x = buf(sec); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.sin(TAU * f * t * (1 - t)) * env(t, 0.002, 0.04) + rnd() * env(t, 0.001, 0.015) * 0.5; } return x; };
const click = (sec = 0.05, g = 1) => { const x = buf(sec); for (let i = 0; i < x.length; i++) x[i] = rnd() * Math.exp(-i / SR / 0.006) * g; return x; };
const chime = (f, sec) => partials(f, [[1, 1, 1], [2.0, 0.3, 0.6], [3.0, 0.15, 0.4]], sec, 0.5);
const voiceHum = (f, sec) => { const x = buf(sec); for (let i = 0; i < x.length; i++) { const t = i / SR, v = f * (1 + 0.006 * Math.sin(TAU * 5 * t)); let s = 0; for (let h = 1; h <= 6; h++) s += Math.sin(TAU * v * h * t) / h; x[i] = s * Math.min(t / 0.4, 1) * Math.min((sec - t) / 0.5, 1); } return x; };

export const SFX = {
  bell_far: () => lp(bell(110, 5), 0.12),
  bell_near: () => bell(98, 6),
  bell_crack: () => mix(3, [bell(98, 3), 0, 1], [noise(1, 0.7).map((v, i) => v * Math.exp(-i / SR / 0.2)), 0.1, 0.8]),
  heartbeat: () => { const b = (o) => [partials(55, [[1, 1]], 0.25, 0.07), o]; return mix(2.4, ...[0, 0.9, 1.2, 2.1].map((o, i) => [partials(i % 2 ? 48 : 58, [[1, 1]], 0.3, 0.07), o, i % 2 ? 0.7 : 1])); },
  footsteps: () => mix(3, ...[0, 0.5, 1.0, 1.5, 2.0, 2.5].map((o, i) => [step(0.2, 90 + (i % 2) * 15), o, 0.8])),
  keys_chime: () => mix(2, ...[0, 0.12, 0.25, 0.4, 0.55].map((o, i) => [chime(2200 + i * 310, 0.5), o + rnd() * 0.02, 0.35])),
  door_creak: () => { const x = buf(1.6); for (let i = 0; i < x.length; i++) { const t = i / SR, f = 180 + 120 * Math.sin(t * 2.2) + 60 * t; x[i] = (Math.sin(TAU * f * t) + 0.6 * Math.sin(TAU * f * 2.01 * t) + 0.3 * rnd()) * Math.sin(Math.PI * t / 1.6) * 0.4; } return lp(x, 0.35); },
  door_slam: () => mix(1, [partials(70, [[1, 1], [1.9, 0.5]], 0.8, 0.12), 0, 1], [click(0.1), 0, 0.8]),
  door_splinter: () => mix(1, [click(0.3, 1), 0, 1], [noise(0.6, 0.5).map((v, i) => v * Math.exp(-i / SR / 0.1)), 0.02, 0.8], [partials(60, [[1, 1]], 0.6, 0.1), 0, 1]),
  glass_shatter: () => mix(1.5, ...Array.from({ length: 24 }, (_, i) => [chime(3000 + (i * 397) % 4000, 0.3), i * 0.012 + Math.abs(rnd()) * 0.03, 0.25])),
  cough: () => mix(0.6, [noise(0.2, 0.3).map((v, i) => v * env(i / SR, 0.01, 0.06)), 0, 0.8], [noise(0.15, 0.3).map((v, i) => v * env(i / SR, 0.01, 0.05)), 0.22, 0.6]),
  hum_low: () => fade(voiceHum(70, 4)).map((v) => v * 0.5),
  whisper: () => { const n = noise(2.5, 0.6); return n.map((v, i) => v * (0.5 + 0.5 * Math.sin(TAU * 7 * i / SR)) * Math.sin(Math.PI * i / n.length) * 0.5); },
  lantern_swing: () => mix(1.5, [chime(900, 1.2), 0, 0.2], [lp(noise(1.5, 0.15), 0.1).map((v, i) => v * Math.sin(Math.PI * i / SR / 1.5) * 0.5), 0, 1]),
  whoosh: () => { const n = noise(1, 0.4); return n.map((v, i) => v * Math.sin(Math.PI * i / n.length) ** 2); },
  spell: () => { const x = buf(1.2); for (let i = 0; i < x.length; i++) { const t = i / SR, f = 300 + 1800 * t * t; x[i] = (Math.sin(TAU * f * t) * 0.5 + rnd() * 0.15) * env(t, 0.02, 0.5); } return x; },
  page_rustle: () => mix(1.2, ...[0, 0.15, 0.4, 0.6].map((o) => [lp(noise(0.3, 0.7), 0.5).map((v, i) => v * Math.sin(Math.PI * i / (0.3 * SR))), o, 0.5])),
  chime_soft: () => chime(880, 2.5),
  hum_voice: () => fade(voiceHum(196, 3)).map((v) => v * 0.4),
  frost_crackle: () => mix(2, ...Array.from({ length: 30 }, () => [click(0.02, 0.8), Math.abs(rnd()) * 1.9, 0.3])),
  choir_hum: () => { const x = mix(5, ...[130.8, 164.8, 196, 261.6].map((f, i) => [voiceHum(f * (1 + i * 0.002), 5), 0, 0.4])); return fade(x, 400); },
  fork_ring: () => partials(440, [[1, 1, 1], [2.76, 0.1, 0.2]], 4, 1.5),
  clock_tick: () => mix(3, ...Array.from({ length: 6 }, (_, i) => [click(0.03, 0.7), i * 0.5, 1])),
  drawer_slide: () => lp(noise(0.8, 0.3), 0.15).map((v, i, a) => v * Math.sin(Math.PI * i / a.length)),
  silence_swallow: () => { const x = buf(3); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = (Math.sin(TAU * 220 * t) + rnd() * 0.3) * Math.exp(-t * 1.4) * 0.6; } return x; },
  sleep_fall: () => lp(noise(2, 0.05), 0.04).map((v, i, a) => v * 6 * Math.exp(-i / SR / 0.8)),
  wind_gust: () => lp(noise(3, 0.08), 0.5).map((v, i, a) => v * 8 * Math.sin(Math.PI * i / a.length)),
  chain_snap: () => mix(1.2, [click(0.1, 1), 0, 1], [chime(1600, 1), 0.01, 0.4], [chime(2400, 0.8), 0.02, 0.25]),
  chime_success: () => mix(3, ...[523, 659, 784, 1047].map((f, i) => [chime(f, 2.2), i * 0.18, 0.5])),
  jingle_good: () => mix(4, ...[392, 494, 587, 784, 988].map((f, i) => [chime(f, 2.5), i * 0.25, 0.5])),
  jingle_neutral: () => mix(4, ...[392, 466, 392, 349].map((f, i) => [chime(f, 2.5), i * 0.4, 0.5])),
  jingle_bad: () => mix(5, ...[220, 207, 196, 165].map((f, i) => [partials(f, [[1, 1], [2, 0.3]], 2.5, 1.2), i * 0.6, 0.5])),
  jingle_secret: () => mix(5, ...[330, 392, 494, 330, 587].map((f, i) => [chime(f, 3), i * 0.3, 0.45])),
  // loopable ambience beds (12 s, cross-faded)
  amb_dorm: () => loopable(droneAmb(55, 14, 0.02)), amb_night_wind: () => loopable(droneAmb(60, 14, 0.06)),
  amb_corridor: () => loopable(droneAmb(65, 14, 0.04)), amb_tower_stairs: () => loopable(droneAmb(49, 14, 0.03)),
  amb_hall: () => loopable(droneAmb(82, 14, 0.1)), amb_courtyard: () => loopable(droneAmb(98, 14, 0.15)),
  amb_archive: () => loopable(droneAmb(58, 14, 0.015)), amb_music_room: () => loopable(droneAmb(131, 14, 0.03)),
  amb_office: () => loopable(droneAmb(73, 14, 0.02)), amb_belfry: () => loopable(droneAmb(46, 14, 0.2, 1)),
  amb_dawn: () => loopable(droneAmb(196, 14, 0.2)), amb_dark_drone: () => loopable(droneAmb(41, 14, 0.01)),
  amb_silence: () => loopable(droneAmb(30, 14, 0.005))
};
export const render = (id) => { seed = 1337; return fade(norm(Float32Array.from(SFX[id]()), id.startsWith('amb_') ? 0.35 : 0.8)); };
export const wav = (x) => { const b = Buffer.alloc(44 + x.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40); x.forEach((v, i) => b.writeInt16LE(Math.max(-1, Math.min(1, v)) * 32767 | 0, 44 + i * 2)); return b; };
