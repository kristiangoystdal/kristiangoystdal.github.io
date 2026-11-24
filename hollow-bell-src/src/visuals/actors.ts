// Characters: watercolour figures in side view, built as a small rig (body, head, upper arm, forearm).
// Each part is painted once; the stage moves and rotates the parts every frame, tweening between poses,
// so gestures, walking and talking move smoothly instead of switching pictures.
import { ellipse, makeRand, rect, wash, type Pt, type Rand } from './paint';

export type Look = {
  height: number;
  robe: string;
  accent?: string;
  skin?: string;
  hair: string;
  hairStyle: 'short' | 'bun' | 'long' | 'bald' | 'cap';
  width?: number;
  stoop?: number;
  ghost?: boolean;
  prop?: 'lantern' | 'book' | 'none';
};

export type Pose = 'idle' | 'scared' | 'cast' | 'surprised';

export const HOUSE_COLORS: Record<string, string> = {
  Gryffindor: '#a3342c',
  Slytherin: '#2f6b4a',
  Ravenclaw: '#3a5a9a',
  Hufflepuff: '#c99a2e',
};

export const LOOKS: Record<string, Look> = {
  player: { height: 215, robe: '#262536', hair: '#5a3a28', hairStyle: 'short' },
  Mirela: { height: 245, robe: '#2c2840', accent: '#b8a35a', hair: '#1e1410', hairStyle: 'bun', prop: 'book' },
  Quill: { height: 250, robe: '#6a5a40', accent: '#8a7a50', hair: '#ddd6c6', hairStyle: 'short', stoop: 0.12, prop: 'lantern' },
  Harrow: { height: 262, robe: '#3a3a34', hair: '#77766c', hairStyle: 'bald', width: 1.25, prop: 'lantern' },
  Ashgrove: { height: 288, robe: '#4a2a46', accent: '#8a6a8a', hair: '#3a3030', hairStyle: 'short' },
  Vale: { height: 270, robe: '#9fc4ff', hair: '#c8dcff', hairStyle: 'long', ghost: true },
  'Matron Hale': { height: 238, robe: '#ded8cc', accent: '#ffffff', hair: '#8a6a50', hairStyle: 'cap' },
};

/** Maps a speaker / pov name in the story to a look. */
export function lookFor(name: string): Look | undefined {
  if (LOOKS[name]) return LOOKS[name];
  const key = Object.keys(LOOKS).find((k) => name.includes(k));
  return key ? LOOKS[key] : undefined;
}

// ---------- joint angles ----------
/** Angles in radians. upper/elbow: 0 = hanging straight down, positive = swung forward (the way the figure faces). */
export type Joints = { upper: number; elbow: number; head: number; lean: number };

export const POSES: Record<Pose, Joints> = {
  idle: { upper: 0.12, elbow: 0.35, head: 0, lean: 0 },
  scared: { upper: 0.55, elbow: 2.35, head: -0.12, lean: -0.05 }, // hand up by the face, leaning back
  cast: { upper: 1.45, elbow: 0.1, head: 0.04, lean: 0.04 }, // arm out, wand forward
  surprised: { upper: 2.55, elbow: 0.35, head: -0.16, lean: -0.03 }, // hand thrown up
};

// ---------- the rig ----------
export type Part = { img: HTMLCanvasElement; px: number; py: number }; // image and its pivot (in figure px)

export type Rig = {
  body: Part; // pivot at the feet
  head: Part; // pivot at the neck
  upper: Part; // pivot at the shoulder, hangs down
  fore: Part; // pivot at the elbow, hangs down
  neck: { x: number; y: number }; // relative to the feet (y up is negative)
  shoulder: { x: number; y: number };
  upperLen: number;
  foreLen: number;
};

const RES = 2; // parts are painted at double size so the enlarged figures stay crisp
const cache = new Map<string, Rig>();

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * RES);
  c.height = Math.ceil(h * RES);
  const ctx = c.getContext('2d')!;
  ctx.scale(RES, RES);
  return [c, ctx];
}

/** Paints the parts of a look (facing right). Cached per look and accent colour. */
export function rig(look: Look, accent?: string): Rig {
  const key = JSON.stringify(look) + accent;
  const hit = cache.get(key);
  if (hit) return hit;
  const r: Rand = makeRand(look.height * 7 + look.robe.length);
  const h = look.height;
  const wf = look.width ?? 1;
  const headR = h * 0.075;
  const lean = (look.stoop ?? 0) * h;
  const neckY = -h + headR * 2.1; // relative to the feet
  const a = look.ghost ? 0.13 : 0.2;
  const skin = look.ghost ? '#d8e6ff' : look.skin ?? '#e3c2a0';

  // body: robe and collar, feet at (BW/2, BH)
  const BW = 140 * Math.max(1, wf);
  const BH = h + 10;
  const [bc, bx] = canvas(BW, BH);
  const fx = BW / 2;
  const fy = BH - 4;
  const ny = fy + neckY;
  const robe: Pt[] = [
    [fx - 18 * wf + lean * 0.6, ny],
    [fx + 16 * wf + lean * 0.6, ny],
    [fx + 30 * wf + lean * 0.3, ny + h * 0.3],
    [fx + 42 * wf, fy],
    [fx - 44 * wf, fy],
    [fx - 32 * wf + lean * 0.2, ny + h * 0.3],
  ];
  if (!look.ghost) wash(bx, robe, look.robe, r, { layers: 5, alpha: 0.6, spread: 2.5, edge: false }); // opaque core
  wash(bx, robe, look.robe, r, { layers: 12, alpha: a, spread: 3 });
  const acc = accent ?? look.accent;
  if (acc) wash(bx, rect(fx - 14 * wf + lean * 0.6, ny, 30 * wf, 14), acc, r, { layers: 6, alpha: 0.35, spread: 2 }); // collar / scarf

  // head: pivot at the neck
  const HS = headR * 4.4;
  const [hc, hx] = canvas(HS, HS);
  const hpx = HS / 2;
  const hpy = HS * 0.82;
  const cx = hpx + 2;
  const cy = hpy - headR * 0.9 - 2;
  wash(hx, ellipse(cx, cy, headR * 0.92, headR, 12), skin, r, { layers: 8, alpha: look.ghost ? 0.18 : 0.5, spread: 1.5 });
  wash(hx, ellipse(cx + headR * 0.85, cy + 2, 3, 4, 6), skin, r, { layers: 3, alpha: 0.3, spread: 1 }); // nose
  const hairA = { layers: 8, alpha: look.ghost ? 0.15 : 0.45, spread: 2 };
  const R = headR;
  if (look.hairStyle === 'short') wash(hx, [[cx - R, cy], [cx - R * 0.6, cy - R * 1.05], [cx + R * 0.7, cy - R], [cx + R * 0.5, cy - R * 0.4], [cx - R * 0.4, cy + R * 0.3]], look.hair, r, hairA);
  if (look.hairStyle === 'bun') {
    wash(hx, [[cx - R, cy + R * 0.2], [cx - R * 0.6, cy - R * 1.05], [cx + R * 0.7, cy - R * 0.95], [cx + R * 0.4, cy - R * 0.3], [cx - R * 0.4, cy + R * 0.5]], look.hair, r, hairA);
    wash(hx, ellipse(cx - R * 1.1, cy - R * 0.4, R * 0.45, R * 0.45, 8), look.hair, r, hairA);
  }
  if (look.hairStyle === 'long') wash(hx, [[cx - R * 1.1, cy + R * 1.8], [cx - R, cy - R * 0.9], [cx + R * 0.6, cy - R * 1.05], [cx + R * 0.3, cy - R * 0.2], [cx - R * 0.3, cy + R * 1.6]], look.hair, r, hairA);
  if (look.hairStyle === 'bald') wash(hx, [[cx - R, cy + R * 0.1], [cx - R * 0.9, cy - R * 0.4], [cx - R * 0.3, cy - R * 0.2], [cx - R * 0.4, cy + R * 0.4]], look.hair, r, hairA);
  if (look.hairStyle === 'cap') wash(hx, [[cx - R * 1.05, cy - R * 0.2], [cx - R * 0.7, cy - R * 1.15], [cx + R * 0.8, cy - R * 1.1], [cx + R * 0.9, cy - R * 0.5]], '#f4f2ec', r, hairA);

  // arm segments: hang down from their pivot
  const upperLen = h * 0.19;
  const foreLen = h * 0.19;
  const AW = 26 * wf;
  const limb = (len: number, w0: number, w1: number): Part => {
    const [c, x] = canvas(AW + 8, len + 14);
    const px = (AW + 8) / 2;
    const py = 5;
    wash(x, [[px - w0 / 2, py - 3], [px + w0 / 2, py - 3], [px + w1 / 2, py + len + 3], [px - w1 / 2, py + len + 3]], look.robe, r, { layers: 7, alpha: a + 0.1, spread: 1.6 });
    return { img: c, px, py };
  };
  const upper = limb(upperLen, 13 * wf, 11 * wf);
  const fore = limb(foreLen, 11 * wf, 9 * wf);
  // a hand at the end of the forearm
  const fctx = fore.img.getContext('2d')!;
  fctx.save();
  fctx.scale(RES, RES);
  wash(fctx, ellipse(fore.px, fore.py + foreLen + 2, 4.5, 5, 8), skin, r, { layers: 4, alpha: look.ghost ? 0.2 : 0.55, spread: 1 });
  fctx.restore();

  const result: Rig = {
    body: { img: bc, px: fx, py: fy },
    head: { img: hc, px: hpx, py: hpy },
    upper,
    fore,
    neck: { x: lean + 2, y: neckY + 2 },
    shoulder: { x: 9 * wf + lean * 0.5, y: neckY + 14 },
    upperLen,
    foreLen,
  };
  cache.set(key, result);
  return result;
}

/** Where the hand is, relative to the feet, for the given joint angles (figure facing right). */
export function handPos(rg: Rig, j: Joints): { x: number; y: number } {
  const ex = rg.shoulder.x + Math.sin(j.upper) * rg.upperLen;
  const ey = rg.shoulder.y + Math.cos(j.upper) * rg.upperLen;
  const fa = j.upper + j.elbow;
  return { x: ex + Math.sin(fa) * rg.foreLen, y: ey + Math.cos(fa) * rg.foreLen + 3 };
}

/** Draws the figure at the current transform (origin at the feet, facing right). */
export function drawRig(ctx: CanvasRenderingContext2D, rg: Rig, look: Look, j: Joints, sway: number, prop: 'lantern' | 'book' | 'wand' | null) {
  const part = (p: Part) => ctx.drawImage(p.img, -p.px, -p.py, p.img.width / RES, p.img.height / RES);
  ctx.save();
  ctx.rotate(j.lean);
  // robe: a gentle sway of the hem, anchored at the feet
  ctx.save();
  ctx.transform(1, 0, sway, 1, 0, 0);
  part(rg.body);
  ctx.restore();
  // head
  ctx.save();
  ctx.translate(rg.neck.x, rg.neck.y);
  ctx.rotate(j.head);
  part(rg.head);
  ctx.restore();
  // arm: canvas rotation is clockwise, so "forward" is a negative angle for a limb hanging down
  ctx.save();
  ctx.translate(rg.shoulder.x, rg.shoulder.y);
  ctx.rotate(-j.upper);
  part(rg.upper);
  ctx.translate(0, rg.upperLen);
  ctx.rotate(-j.elbow);
  part(rg.fore);
  ctx.translate(0, rg.foreLen + 3);
  if (prop === 'wand') {
    // in the forearm's own frame the arm points along +y, so the wand simply continues it
    ctx.fillStyle = 'rgba(58,42,28,0.85)';
    ctx.fillRect(-1.2, -2, 2.4, 32);
  } else if (prop === 'lantern' && !look.ghost) {
    ctx.rotate(j.upper + j.elbow); // keep it hanging straight down
    ctx.fillStyle = 'rgba(42,32,24,0.8)';
    ctx.fillRect(-1, 0, 2, 12);
    ctx.fillStyle = 'rgba(255,207,122,0.85)';
    ctx.fillRect(-9, 12, 18, 22);
  } else if (prop === 'book') {
    ctx.rotate(j.upper + j.elbow);
    ctx.fillStyle = 'rgba(90,46,42,0.9)';
    ctx.fillRect(-4, -6, 20, 26);
  }
  ctx.restore();
  ctx.restore();
}

/** Height of the figure's top (for speech bubbles), relative to the feet. */
export const topOf = (look: Look) => -look.height;
