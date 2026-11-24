// Web Audio: ambience crossfades between scenes, one-shot sound effects, and voices (narrator and characters).
// Voices: a pre-generated file from public/voices/manifest.json (Piper, see tools/voices), else Web Speech, else nothing.
import type { Scene } from '../engine/types';

type SfxEntry = { file: string; loop: boolean; seconds: number; volume: number };
export type Volumes = { master: number; ambience: number; sfx: number; voice: number };

const base = import.meta.env.BASE_URL;

// Web Speech settings per speaker, used when there is no recorded line.
const SPEECH: Record<string, { pitch: number; rate: number }> = {
  Narrator: { pitch: 1, rate: 1 },
  Pip: { pitch: 1.2, rate: 1.05 },
  Headmaster: { pitch: 0.75, rate: 0.9 },
  'Wall voice': { pitch: 0.5, rate: 0.8 },
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
  private voiceFiles: Record<string, string> = {};
  private voiceSrc: AudioBufferSourceNode | null = null;
  private speakToken = 0;
  private timers: number[] = [];
  vol: Volumes = { master: 0.8, ambience: 0.5, sfx: 0.8, voice: 1 };
  enabled = true;
  /** Character voices and the narrator can be switched separately. */
  voices = true;
  narrator = true;
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
        if (r.ok) this.voiceFiles = await r.json();
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

  /**
   * Speaks the parts of a paragraph one after another. Resolves true when everything was spoken,
   * false when it was interrupted (stopVoice, or a new paragraph) or nothing was spoken.
   */
  async speak(parts: { key: string; text: string; speaker: string }[]): Promise<boolean> {
    this.stopVoice();
    const token = ++this.speakToken;
    const wanted = parts.filter((p) => (p.speaker === 'Narrator' ? this.narrator : this.voices));
    if (!this.enabled || !wanted.length) return false;
    this.duck(true);
    try {
      for (const p of wanted) {
        if (token !== this.speakToken) return false;
        const ok = await this.speakOne(p, token);
        if (!ok) return false;
      }
      return token === this.speakToken;
    } finally {
      if (token === this.speakToken) this.duck(false);
    }
  }

  private async speakOne(p: { key: string; text: string; speaker: string }, token: number): Promise<boolean> {
    const file = this.voiceFiles[p.key];
    if (file && this.ctx && this.master) {
      try {
        const buf = await this.load(file);
        if (token !== this.speakToken) return false;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const g = this.ctx.createGain();
        g.gain.value = this.vol.voice;
        src.connect(g).connect(this.master);
        this.voiceSrc = src;
        await new Promise<void>((done) => {
          src.onended = () => done();
          src.start();
        });
        return token === this.speakToken;
      } catch {
        /* fall through to speech */
      }
    }
    if (!('speechSynthesis' in window)) return true;
    const u = new SpeechSynthesisUtterance(p.text);
    const cfg = SPEECH[p.speaker] ?? { pitch: 1, rate: 1 };
    u.pitch = cfg.pitch;
    u.rate = cfg.rate;
    u.lang = this.lang;
    u.volume = Math.min(1, this.vol.voice * this.vol.master);
    await new Promise<void>((done) => {
      u.onend = () => done();
      u.onerror = () => done();
      speechSynthesis.speak(u);
    });
    return token === this.speakToken;
  }

  /** Lowers the ambience while someone speaks. */
  private duck(on: boolean) {
    if (!this.amb || !this.ctx) return;
    const base = (this.manifest[this.amb.id]?.volume ?? 0.4) * this.vol.ambience;
    this.amb.gain.gain.setTargetAtTime(on ? base * 0.45 : base, this.ctx.currentTime, 0.25);
  }

  stopVoice() {
    this.speakToken++;
    try {
      this.voiceSrc?.stop();
    } catch {
      /* already stopped */
    }
    this.voiceSrc = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}
