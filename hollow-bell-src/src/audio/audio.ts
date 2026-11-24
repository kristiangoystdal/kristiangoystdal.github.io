// Web Audio: ambience crossfades between scenes, one-shot sound effects, and voice lines.
// Voices: a pre-generated file from public/voices/manifest.json (Piper, see tools/voices), else Web Speech, else nothing.
import type { Scene } from '../engine/types';

type SfxEntry = { file: string; loop: boolean; seconds: number; volume: number };
export type Volumes = { master: number; ambience: number; sfx: number; voice: number };

const base = import.meta.env.BASE_URL;

// Web Speech settings per speaker, used when there is no recorded line.
const SPEECH: Record<string, { pitch: number; rate: number }> = {
  Mirela: { pitch: 1.15, rate: 1.05 },
  Quill: { pitch: 0.9, rate: 0.92 },
  Ashgrove: { pitch: 0.85, rate: 0.98 },
  Vale: { pitch: 0.7, rate: 0.85 },
  Harrow: { pitch: 0.7, rate: 0.95 },
  'Matron Hale': { pitch: 1.1, rate: 1 },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cache = new Map<string, Promise<AudioBuffer>>();
  private amb: { id: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private manifest: Record<string, SfxEntry> = {};
  private voices: Record<string, string> = {};
  private voiceSrc: AudioBufferSourceNode | null = null;
  private timers: number[] = [];
  vol: Volumes = { master: 0.8, ambience: 0.5, sfx: 0.8, voice: 1 };
  enabled = true;
  voiceEnabled = false;
  lang = 'en-GB';

  /** Must be called from a user gesture (a click). Safe to call many times. */
  async init() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.setVolumes(this.vol);
      try {
        this.manifest = await (await fetch(base + 'audio/audio-manifest.json')).json();
      } catch {
        this.manifest = {};
      }
      try {
        const r = await fetch(base + 'voices/manifest.json');
        if (r.ok) this.voices = await r.json();
      } catch {
        /* no recorded voices */
      }
    }
    await this.ctx.resume().catch(() => {});
  }

  setVolumes(v: Volumes) {
    this.vol = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.enabled ? v.master : 0, this.ctx.currentTime, 0.05);
    if (this.amb && this.ctx) this.amb.gain.gain.setTargetAtTime((this.manifest[this.amb.id]?.volume ?? 0.4) * v.ambience, this.ctx.currentTime, 0.1);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.setVolumes(this.vol);
    if (!on) this.stopVoice();
  }

  private load(file: string): Promise<AudioBuffer> {
    let p = this.cache.get(file);
    if (!p) {
      p = fetch(base + file)
        .then((r) => r.arrayBuffer())
        .then((b) => this.ctx!.decodeAudioData(b));
      this.cache.set(file, p);
    }
    return p;
  }

  async sfx(id: string) {
    const m = this.manifest[id];
    if (!m || !this.ctx || !this.master) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = await this.load(m.file);
      const g = this.ctx.createGain();
      g.gain.value = m.volume * this.vol.sfx;
      src.connect(g).connect(this.master);
      src.start();
    } catch {
      /* a missing or undecodable file is not worth breaking the game for */
    }
  }

  async ambience(id: string | undefined) {
    if (!this.ctx || !this.master || this.amb?.id === id) return;
    const t = this.ctx.currentTime;
    const old = this.amb;
    if (old) {
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + 1.5);
      old.src.stop(t + 1.6);
      this.amb = null;
    }
    const m = id ? this.manifest[id] : undefined;
    if (!id || !m) return;
    try {
      const buf = await this.load(m.file);
      if (this.amb) return; // another ambience started while this one loaded
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(m.volume * this.vol.ambience, this.ctx.currentTime + 1.5);
      src.connect(gain).connect(this.master);
      src.start();
      this.amb = { id, src, gain };
    } catch {
      /* ignore */
    }
  }

  /** Ambience for the scene, then its sound effects one after another. */
  scene(sc: Scene) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (!this.ctx) return;
    void this.ambience(sc.audio?.ambience ?? this.amb?.id);
    (sc.audio?.sfx ?? []).forEach((id, i) => this.timers.push(window.setTimeout(() => void this.sfx(id), 400 + i * 1200)));
  }

  /** Speaks a line. `key` is the voice manifest key (see tools/voices/extract-lines.mjs). */
  async say(key: string | null, text: string, speaker: string) {
    this.stopVoice();
    if (!this.voiceEnabled || !this.enabled) return;
    const file = key ? this.voices[key] : undefined;
    if (file && this.ctx && this.master) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = await this.load(file);
        const g = this.ctx.createGain();
        g.gain.value = this.vol.voice;
        src.connect(g).connect(this.master);
        src.start();
        this.voiceSrc = src;
        return;
      } catch {
        /* fall through to speech */
      }
    }
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      const cfg = SPEECH[speaker] ?? { pitch: 1, rate: 1 };
      u.pitch = cfg.pitch;
      u.rate = cfg.rate;
      u.lang = this.lang;
      u.volume = this.vol.voice * this.vol.master;
      speechSynthesis.speak(u);
    }
  }

  stopVoice() {
    try {
      this.voiceSrc?.stop();
    } catch {
      /* already stopped */
    }
    this.voiceSrc = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

/** Same key as tools/voices/extract-lines.mjs: sha1(sceneId + paragraphIndex + quotedText), 10 hex chars. */
export async function voiceKey(sceneId: string, index: number, raw: string): Promise<string | null> {
  if (/\{name\}|\{house\}/.test(raw)) return null;
  const q = [...raw.matchAll(/“([^”]+)”/g)].map((m) => m[1]).join(' ... ');
  if (!q || !crypto.subtle) return null;
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(sceneId + index + q));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 10);
}
