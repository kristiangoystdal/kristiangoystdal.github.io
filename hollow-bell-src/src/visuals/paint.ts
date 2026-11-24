// Watercolour primitives for Canvas 2D. A "wash" stacks many slightly different, very transparent
// copies of a roughened polygon, which gives soft, uneven edges and pooled colour like real watercolour.

export type Pt = [number, number];
export type Rand = () => number;

export function makeRand(seed: number): Rand {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const gauss = (r: Rand) => (r() + r() + r() - 1.5) / 1.5;

/** Recursively pushes the midpoint of each edge outwards by a random amount. */
export function deform(poly: Pt[], depth: number, variance: number, r: Rand): Pt[] {
  if (depth <= 0) return poly;
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const v = Math.min(variance, len * 0.35);
    out.push(a, [(a[0] + b[0]) / 2 + gauss(r) * v, (a[1] + b[1]) / 2 + gauss(r) * v]);
  }
  return deform(out, depth - 1, variance * 0.55, r);
}

function fillPoly(ctx: CanvasRenderingContext2D, p: Pt[]) {
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
  ctx.closePath();
  ctx.fill();
}

export type WashOpts = { layers?: number; alpha?: number; spread?: number; edge?: boolean };

/** A soft watercolour fill of a polygon. */
export function wash(ctx: CanvasRenderingContext2D, poly: Pt[], color: string, r: Rand, o: WashOpts = {}) {
  const layers = o.layers ?? 10;
  const spread = o.spread ?? 6;
  const base = deform(poly, 2, spread * 1.6, r);
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = o.alpha ?? 0.09;
  for (let i = 0; i < layers; i++) fillPoly(ctx, deform(base, 3, spread, r));
  if (o.edge !== false) {
    // A faint darker rim where pigment pools at the edge.
    ctx.globalAlpha = (o.alpha ?? 0.09) * 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    const p = deform(base, 2, spread * 0.6, r);
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (const q of p) ctx.lineTo(q[0], q[1]);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

// ---- shapes ----
export const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

export function ellipse(cx: number, cy: number, rx: number, ry: number, n = 14): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });
}

/** A rectangle with a round (or pointed, gothic) top. y is the top of the arch. */
export function arch(x: number, y: number, w: number, h: number, pointed = false): Pt[] {
  const pts: Pt[] = [[x, y + h]];
  const r = w / 2;
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    const lift = pointed ? Math.sin((i / n) * Math.PI) ** 0.6 * r * 0.35 : 0;
    pts.push([x + r + Math.cos(a) * r, y + r - Math.sin(a) * r - lift]);
  }
  pts.push([x + w, y + h]);
  return pts;
}

export const tri = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y + h],
  [x + w / 2, y],
  [x + w, y + h],
];

/** Vertical gradient sky/wall with a few blotchy washes on top so it does not look digital. */
export function ground(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bottom: string, r: Rand) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    const cx = r() * w;
    const cy = r() * h;
    wash(ctx, ellipse(cx, cy, 120 + r() * 260, 60 + r() * 140), i % 2 ? top : bottom, r, { layers: 6, alpha: 0.05, spread: 30, edge: false });
  }
}

/** Soft light pooling (used for painted, static glows; animated lights are drawn by the stage). */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, color: string, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  ctx.restore();
}

/** A paper texture as a data URL, used as a multiply overlay over the whole stage. */
export function paperTexture(size = 256): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const r = makeRand(7);
  for (let i = 0; i < size * size; i++) {
    const fibre = (Math.sin(i * 0.013) + Math.sin((i % size) * 0.21)) * 4;
    const v = 236 + gauss(r) * 14 + fibre;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v - 3;
    img.data[i * 4 + 2] = v - 10;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}
