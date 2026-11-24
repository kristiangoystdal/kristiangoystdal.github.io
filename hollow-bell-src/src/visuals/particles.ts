// Ambient particles drawn in screen space on top of the painted stage.
import type { Particle } from '../engine/types';

type P = { kind: Particle; x: number; y: number; vx: number; vy: number; s: number; a: number; t: number };

const COUNTS: Record<Particle, number> = { dust: 70, fog: 14, fireflies: 26, candles: 14, sparks: 40, snow: 120, rain: 160 };

export class Particles {
  private ps: P[] = [];
  private w = 1;
  private h = 1;
  density = 1;

  set(kinds: Particle[], w: number, h: number) {
    this.w = w;
    this.h = h;
    this.ps = [];
    for (const kind of kinds) {
      const n = Math.round(COUNTS[kind] * this.density);
      for (let i = 0; i < n; i++) this.ps.push(this.spawn(kind, true));
    }
  }

  resize(w: number, h: number) {
    for (const p of this.ps) {
      p.x *= w / this.w;
      p.y *= h / this.h;
    }
    this.w = w;
    this.h = h;
  }

  private spawn(kind: Particle, anywhere: boolean): P {
    const { w, h } = this;
    const rnd = Math.random;
    const p: P = { kind, x: rnd() * w, y: rnd() * h, vx: 0, vy: 0, s: 1, a: 1, t: rnd() * 100 };
    const u = h / 720; // scale with screen height
    switch (kind) {
      case 'dust':
        Object.assign(p, { vx: (rnd() - 0.5) * 6 * u, vy: (rnd() - 0.3) * 4 * u, s: (0.8 + rnd() * 1.6) * u, a: 0.25 + rnd() * 0.4 });
        break;
      case 'fog':
        Object.assign(p, { y: h * (0.45 + rnd() * 0.55), vx: (8 + rnd() * 14) * u * (rnd() < 0.5 ? -1 : 1), s: (180 + rnd() * 220) * u, a: 0.05 + rnd() * 0.06 });
        break;
      case 'fireflies':
        Object.assign(p, { vx: (rnd() - 0.5) * 20 * u, vy: (rnd() - 0.5) * 20 * u, s: (1.6 + rnd() * 1.6) * u, a: 0.8 });
        break;
      case 'candles':
        Object.assign(p, { y: h * (0.05 + rnd() * 0.4), s: (5 + rnd() * 4) * u, a: 0.9 });
        break;
      case 'sparks':
        Object.assign(p, { y: anywhere ? p.y : h + 10, vx: (rnd() - 0.5) * 30 * u, vy: -(30 + rnd() * 60) * u, s: (1 + rnd() * 1.5) * u, a: 0.9 });
        break;
      case 'snow':
        Object.assign(p, { y: anywhere ? p.y : -10, vx: (rnd() - 0.5) * 10 * u, vy: (20 + rnd() * 30) * u, s: (1 + rnd() * 2.5) * u, a: 0.7 });
        break;
      case 'rain':
        Object.assign(p, { y: anywhere ? p.y : -20, vx: -60 * u, vy: (500 + rnd() * 300) * u, s: (10 + rnd() * 10) * u, a: 0.25 });
        break;
    }
    return p;
  }

  update(dt: number) {
    const { w, h } = this;
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      p.t += dt;
      if (p.kind === 'fireflies') {
        p.vx += (Math.random() - 0.5) * 30 * dt;
        p.vy += (Math.random() - 0.5) * 30 * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
      if (p.kind === 'candles') p.y += Math.sin(p.t * 0.8) * 0.15;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const m = p.kind === 'fog' ? p.s : 20;
      if (p.x < -m) p.x = w + m;
      if (p.x > w + m) p.x = -m;
      if (p.y < -m || p.y > h + m) this.ps[i] = this.spawn(p.kind, false);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.ps) {
      switch (p.kind) {
        case 'dust':
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255,236,200,${p.a * (0.6 + 0.4 * Math.sin(p.t))})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, 7);
          ctx.fill();
          break;
        case 'fog': {
          ctx.globalCompositeOperation = 'screen';
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
          g.addColorStop(0, `rgba(200,205,235,${p.a})`);
          g.addColorStop(1, 'rgba(200,205,235,0)');
          ctx.fillStyle = g;
          ctx.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
          break;
        }
        case 'fireflies': {
          ctx.globalCompositeOperation = 'lighter';
          const blink = Math.max(0, Math.sin(p.t * 1.7));
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 6);
          g.addColorStop(0, `rgba(255,240,150,${0.9 * blink})`);
          g.addColorStop(1, 'rgba(255,220,120,0)');
          ctx.fillStyle = g;
          ctx.fillRect(p.x - p.s * 6, p.y - p.s * 6, p.s * 12, p.s * 12);
          break;
        }
        case 'candles': {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(240,230,210,0.75)';
          ctx.fillRect(p.x - p.s * 0.35, p.y, p.s * 0.7, p.s * 2.4);
          ctx.globalCompositeOperation = 'lighter';
          const f = 1 + Math.sin(p.t * 13) * 0.15;
          const g = ctx.createRadialGradient(p.x, p.y - p.s * 0.5, 0, p.x, p.y - p.s * 0.5, p.s * 4 * f);
          g.addColorStop(0, 'rgba(255,210,120,0.8)');
          g.addColorStop(1, 'rgba(255,160,60,0)');
          ctx.fillStyle = g;
          ctx.fillRect(p.x - p.s * 4, p.y - p.s * 4.5, p.s * 8, p.s * 8);
          break;
        }
        case 'sparks':
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255,${150 + Math.floor(Math.sin(p.t * 9) * 60)},80,${p.a})`;
          ctx.fillRect(p.x, p.y, p.s * 1.5, p.s * 1.5);
          break;
        case 'snow':
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = `rgba(255,255,255,${p.a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, 7);
          ctx.fill();
          break;
        case 'rain':
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = `rgba(200,210,240,${p.a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 0.02, p.y + p.s);
          ctx.stroke();
          break;
      }
    }
    ctx.restore();
  }
}
