// SceneStage: draws the painted location (parallax layers), lights, characters and particles on one canvas,
// with a slow camera pan, mouse parallax, and cut/walk transitions between scenes.
import type { Mood, Particle } from '../engine/types';
import { lanternOffset, lookFor, LOOKS, sprite, SPRITE, type Look } from './actors';
import { Particles } from './particles';
import { FLOOR, getPreset, H, paintPreset, VIEW_H, W, type Light } from './presets';

export type Motion = 'full' | 'reduced' | 'off';
export type ActorSpec = { id: string; look: Look; accent?: string; x: number; facing: 1 | -1 };
export type StageScene = { preset?: string; particles?: Particle[]; mood?: Mood; actors: ActorSpec[] };

type Actor = ActorSpec & { cx: number; tx: number; walking: boolean; phase: number; alpha: number; leaving: boolean };

const ACTOR_DEPTH = 0.85;
export const ACTOR_SCALE = 1.35;
/** Where the floor sits on screen, as a fraction of the height (leaves room for the text box). */
const FLOOR_AT = 0.68;
const MOOD_TINT: Record<Mood, string> = {
  cozy: 'rgba(255,190,120,0.10)',
  tense: 'rgba(120,110,170,0.08)',
  dark: 'rgba(30,20,70,0.22)',
  magic: 'rgba(150,120,255,0.10)',
  funny: 'rgba(255,230,150,0.08)',
};

export class Stage {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private cw = 1;
  private ch = 1;
  private layers: HTMLCanvasElement[] = [];
  private presetId = '';
  private lights: Light[] = [];
  private depths: number[] = [];
  private mood: Mood = 'tense';
  private actors: Actor[] = [];
  private particles = new Particles();
  private mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  private t = 0;
  private last = 0;
  private fade: { snap: HTMLCanvasElement; start: number; dur: number } | null = null;
  private talking: string | null = null;
  motion: Motion = 'full';

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / innerWidth - 0.5) * 2;
      this.mouse.y = (e.clientY / innerHeight - 0.5) * 2;
    });
    requestAnimationFrame((t) => this.frame(t));
  }

  private resize() {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.cw = Math.round(this.canvas.clientWidth * this.dpr) || 1;
    this.ch = Math.round(this.canvas.clientHeight * this.dpr) || 1;
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
    this.particles.resize(this.cw, this.ch);
  }

  /** World-to-screen scale: the painting covers the screen. */
  private get scale() {
    return Math.max(this.ch / VIEW_H, this.cw / W);
  }
  private get viewW() {
    return this.cw / this.scale;
  }

  /** Camera x (world px, left edge of the view at depth 1). */
  private camX() {
    const range = Math.max(0, W - this.viewW);
    const centre = range / 2;
    if (this.motion !== 'full') return centre;
    return centre + Math.sin(this.t * 0.035) * range * 0.3 + this.mouse.sx * 18;
  }
  private layerX(depth: number) {
    const centre = Math.max(0, W - this.viewW) / 2;
    return centre + (this.camX() - centre) * depth;
  }

  /** Shows a scene. Resolves when the transition has finished. */
  async show(scene: StageScene, transition: 'cut' | 'walk' | 'none' = 'cut') {
    const presetChanged = (scene.preset ?? '') !== this.presetId;
    if (this.motion !== 'full' && transition === 'walk') transition = 'cut';
    if (!presetChanged) {
      this.mood = scene.mood ?? 'tense';
      this.updateActors(scene.actors, this.motion === 'full');
      return;
    }
    if (transition === 'walk' && this.actors.length) {
      // everyone walks off to the right before the picture changes
      for (const a of this.actors) {
        a.tx = 1.15;
        a.facing = 1;
        a.walking = true;
      }
      await wait(650);
    }
    if (transition !== 'none' && this.layers.length) this.snapshot(this.motion === 'off' ? 1 : 700);
    this.presetId = scene.preset ?? '';
    const p = getPreset(scene.preset);
    this.layers = paintPreset(scene.preset ?? '');
    this.depths = p.layers.map((l) => l.depth);
    this.lights = p.lights;
    this.mood = scene.mood ?? 'tense';
    this.particles.density = this.motion === 'off' ? 0 : this.motion === 'reduced' ? 0.4 : 1;
    this.particles.set(scene.particles ?? [], this.cw, this.ch);
    this.actors = [];
    this.updateActors(scene.actors, transition === 'walk');
    if (transition !== 'none') await wait(this.motion === 'off' ? 0 : 700);
  }

  private updateActors(specs: ActorSpec[], animate: boolean) {
    for (const a of this.actors) {
      if (!specs.some((s) => s.id === a.id && s.look === a.look)) {
        a.leaving = true;
        a.tx = a.cx > 0.5 ? 1.2 : -0.2;
        a.facing = a.tx > a.cx ? 1 : -1;
        a.walking = animate;
        if (!animate) a.alpha = 0;
      }
    }
    for (const s of specs) {
      const existing = this.actors.find((a) => a.id === s.id && a.look === s.look && !a.leaving);
      if (existing) {
        existing.tx = s.x;
        existing.walking = animate && Math.abs(existing.cx - s.x) > 0.01;
        if (!animate) existing.cx = s.x;
        existing.facing = s.facing;
        continue;
      }
      const from = s.x > 0.5 ? 1.15 : -0.15;
      this.actors.push({ ...s, cx: animate ? from : s.x, tx: s.x, walking: animate, phase: Math.random() * 6, alpha: 1, leaving: false });
    }
  }

  setTalking(id: string | null) {
    this.talking = id;
  }

  /** Screen position (CSS px) above an actor's head, for speech bubbles. */
  headPos(id: string): { x: number; y: number } | null {
    const a = this.actors.find((x) => x.id === id && !x.leaving);
    if (!a) return null;
    const s = this.scale;
    const x = this.actorScreenX(a) / this.dpr;
    const y = (this.yOff() + (FLOOR - a.look.height * ACTOR_SCALE - 14) * s) / this.dpr;
    return { x, y };
  }

  private actorScreenX(a: Actor) {
    // actors sit in the view by fraction, and move a little with the camera so they belong to the picture
    const centre = Math.max(0, W - this.viewW) / 2;
    const worldX = centre + a.cx * this.viewW;
    return (worldX - this.layerX(ACTOR_DEPTH)) * this.scale;
  }

  /** Vertical offset of the painting: floor at FLOOR_AT of the screen, without showing past its edges. */
  private yOff() {
    const s = this.scale;
    const wanted = FLOOR_AT * this.ch - FLOOR * s + (this.motion === 'full' ? this.mouse.sy * 6 : 0);
    return Math.max(this.ch - H * s, Math.min(0, wanted));
  }

  private snapshot(dur: number) {
    const c = document.createElement('canvas');
    c.width = this.cw;
    c.height = this.ch;
    c.getContext('2d')!.drawImage(this.canvas, 0, 0);
    this.fade = { snap: c, start: performance.now(), dur };
  }

  private frame(now: number) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    if (this.motion === 'full') this.t += dt;
    const ease = this.motion === 'full' ? 1 - Math.exp(-dt * 3) : 1;
    this.mouse.sx += (this.mouse.x - this.mouse.sx) * ease;
    this.mouse.sy += (this.mouse.y - this.mouse.sy) * ease;
    if (this.motion !== 'off') this.particles.update(dt);
    this.updateWalk(dt);
    this.draw(now);
    requestAnimationFrame((t) => this.frame(t));
  }

  private updateWalk(dt: number) {
    for (const a of this.actors) {
      const d = a.tx - a.cx;
      if (Math.abs(d) < 0.004) {
        a.cx = a.tx;
        a.walking = false;
      } else {
        a.cx += Math.sign(d) * Math.min(Math.abs(d), dt * 0.32);
        a.walking = true;
      }
    }
    this.actors = this.actors.filter((a) => !(a.leaving && (a.cx < -0.15 || a.cx > 1.15 || a.alpha === 0)));
  }

  private draw(now: number) {
    const { ctx, cw, ch } = this;
    const s = this.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#14122a';
    ctx.fillRect(0, 0, cw, ch);
    const yOff = this.yOff();
    let actorsDrawn = false;
    this.layers.forEach((layer, i) => {
      const depth = this.depths[i];
      if (!actorsDrawn && depth > ACTOR_DEPTH) {
        this.drawActors(yOff);
        actorsDrawn = true;
      }
      ctx.drawImage(layer, -this.layerX(depth) * s, yOff + (this.motion === 'full' ? this.mouse.sy * depth * 4 : 0), W * s, H * s);
    });
    if (!actorsDrawn) this.drawActors(yOff);
    this.drawLights(yOff);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = MOOD_TINT[this.mood] ?? MOOD_TINT.tense;
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over';
    this.particles.draw(ctx);
    if (this.fade) {
      const k = Math.min(1, (now - this.fade.start) / this.fade.dur);
      ctx.globalAlpha = 1 - k * k;
      ctx.drawImage(this.fade.snap, 0, 0);
      ctx.globalAlpha = 1;
      if (k >= 1) this.fade = null;
    }
  }

  private drawLights(yOff: number) {
    const { ctx } = this;
    const s = this.scale;
    const lights: Light[] = [...this.lights];
    for (const a of this.actors) {
      if (a.look.prop === 'lantern') {
        const o = lanternOffset(a.look);
        const wx = Math.max(0, W - this.viewW) / 2 + a.cx * this.viewW + o.x * a.facing * ACTOR_SCALE;
        lights.push({ x: wx, y: FLOOR + o.y * ACTOR_SCALE, r: 150, color: '#ffc46a', flicker: 0.3, depth: ACTOR_DEPTH });
      }
      if (a.look.ghost) {
        const wx = Math.max(0, W - this.viewW) / 2 + a.cx * this.viewW;
        lights.push({ x: wx, y: FLOOR - a.look.height * ACTOR_SCALE * 0.5, r: 220, color: '#7aa6ff', flicker: 0.1, depth: ACTOR_DEPTH });
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const f = this.motion === 'full' ? 1 + (Math.sin(this.t * 11 + l.x) * 0.5 + Math.sin(this.t * 4.3 + l.y)) * 0.5 * (l.flicker ?? 0) : 1;
      const x = (l.x - this.layerX(l.depth ?? 0.6)) * s;
      const y = yOff + l.y * s;
      const rad = l.r * s * f;
      const g = this.ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, hexA(l.color, 0.35));
      g.addColorStop(0.4, hexA(l.color, 0.12));
      g.addColorStop(1, hexA(l.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawActors(yOff: number) {
    const { ctx } = this;
    const s = this.scale;
    for (const a of this.actors) {
      const img = sprite(a.look, a.accent);
      const x = this.actorScreenX(a);
      const t = this.t + a.phase;
      const full = this.motion === 'full';
      const bob = full ? (a.walking ? Math.abs(Math.sin(t * 9)) * 7 : 0) + (a.look.ghost ? Math.sin(t * 1.3) * 10 + 14 : 0) : 0;
      const breathe = full ? 1 + Math.sin(t * 2.1) * 0.012 + (this.talking === a.id ? Math.abs(Math.sin(t * 7)) * 0.012 : 0) : 1;
      const tilt = full && a.walking ? Math.sin(t * 9) * 0.03 : 0;
      ctx.save();
      ctx.globalAlpha = a.alpha * (a.look.ghost ? 0.75 + Math.sin(t * 0.9) * 0.15 : 1);
      ctx.translate(x, yOff + (FLOOR + 6 - bob) * s);
      ctx.rotate(tilt);
      ctx.scale(a.facing * s * ACTOR_SCALE, s * ACTOR_SCALE * breathe);
      // a soft shadow
      if (!a.look.ghost) {
        ctx.fillStyle = 'rgba(10,8,20,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 46, 8, 0, 0, 7);
        ctx.fill();
      }
      ctx.drawImage(img, -SPRITE.w / 2, -SPRITE.h + 6, SPRITE.w, SPRITE.h);
      ctx.restore();
    }
  }
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Builds the actors for a scene: the player (or the pov character) on the left, the speaker on the right. */
export function castFor(opts: { speaker?: string; pov?: string; house?: string; houseColor?: string }): ActorSpec[] {
  const out: ActorSpec[] = [];
  const povLook = opts.pov ? lookFor(opts.pov) : undefined;
  out.push({ id: 'player', look: povLook ?? LOOKS.player, accent: povLook ? undefined : opts.houseColor, x: 0.3, facing: 1 });
  const sp = opts.speaker ? lookFor(opts.speaker) : undefined;
  if (sp && sp !== povLook) out.push({ id: 'speaker:' + opts.speaker, look: sp, x: 0.68, facing: -1 });
  return out;
}
