// Placeholder characters: watercolour silhouettes in side view, one look per character.
// Each look is painted once to a sprite; the stage animates it (breathing, walking, floating).
import { ellipse, makeRand, rect, wash, type Pt } from './paint';

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

const SPRITE_W = 220;
const SPRITE_H = 360;
const cache = new Map<string, HTMLCanvasElement>();

/** Paints a look facing right, feet at the bottom centre of the sprite. */
export function sprite(look: Look, accent?: string): HTMLCanvasElement {
  const key = JSON.stringify(look) + accent;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = SPRITE_W * 2; // painted at double size so the enlarged figures stay crisp
  c.height = SPRITE_H * 2;
  const ctx = c.getContext('2d')!;
  ctx.scale(2, 2);
  const r = makeRand(look.height * 7 + look.robe.length);
  const cx = SPRITE_W / 2;
  const base = SPRITE_H - 6;
  const h = look.height;
  const wf = look.width ?? 1;
  const headR = h * 0.075;
  const neckY = base - h + headR * 2.1;
  const lean = (look.stoop ?? 0) * h;
  const robe: Pt[] = [
    [cx - 18 * wf + lean * 0.6, neckY],
    [cx + 16 * wf + lean * 0.6, neckY],
    [cx + 30 * wf + lean * 0.3, neckY + h * 0.3],
    [cx + 42 * wf, base],
    [cx - 44 * wf, base],
    [cx - 32 * wf + lean * 0.2, neckY + h * 0.3],
  ];
  const a = look.ghost ? 0.13 : 0.2;
  if (!look.ghost) wash(ctx, robe, look.robe, r, { layers: 5, alpha: 0.6, spread: 2.5, edge: false }); // opaque core
  wash(ctx, robe, look.robe, r, { layers: 12, alpha: a, spread: 3 });
  const acc = accent ?? look.accent;
  if (acc) wash(ctx, rect(cx - 14 * wf + lean * 0.6, neckY, 30 * wf, 14), acc, r, { layers: 6, alpha: 0.35, spread: 2 }); // collar / scarf
  // arm
  wash(ctx, [[cx + 8 + lean * 0.6, neckY + 12], [cx + 22 + lean * 0.5, neckY + 14], [cx + 30, neckY + h * 0.38], [cx + 18, neckY + h * 0.4]], look.robe, r, { layers: 6, alpha: a + 0.05, spread: 2 });
  // head
  const hx = cx + lean + 4;
  const hy = neckY - headR * 0.9;
  wash(ctx, ellipse(hx, hy, headR * 0.92, headR, 12), look.ghost ? '#d8e6ff' : look.skin ?? '#e3c2a0', r, { layers: 8, alpha: look.ghost ? 0.18 : 0.5, spread: 1.5 });
  wash(ctx, ellipse(hx + headR * 0.85, hy + 2, 3, 4, 6), look.ghost ? '#d8e6ff' : look.skin ?? '#e3c2a0', r, { layers: 3, alpha: 0.3, spread: 1 }); // nose
  // hair
  const hairA = { layers: 8, alpha: look.ghost ? 0.15 : 0.45, spread: 2 };
  if (look.hairStyle === 'short') wash(ctx, [[hx - headR, hy], [hx - headR * 0.6, hy - headR * 1.05], [hx + headR * 0.7, hy - headR * 1.0], [hx + headR * 0.5, hy - headR * 0.4], [hx - headR * 0.4, hy + headR * 0.3]], look.hair, r, hairA);
  if (look.hairStyle === 'bun') {
    wash(ctx, [[hx - headR, hy + headR * 0.2], [hx - headR * 0.6, hy - headR * 1.05], [hx + headR * 0.7, hy - headR * 0.95], [hx + headR * 0.4, hy - headR * 0.3], [hx - headR * 0.4, hy + headR * 0.5]], look.hair, r, hairA);
    wash(ctx, ellipse(hx - headR * 1.1, hy - headR * 0.4, headR * 0.45, headR * 0.45, 8), look.hair, r, hairA);
  }
  if (look.hairStyle === 'long') wash(ctx, [[hx - headR * 1.1, hy + headR * 1.8], [hx - headR, hy - headR * 0.9], [hx + headR * 0.6, hy - headR * 1.05], [hx + headR * 0.3, hy - headR * 0.2], [hx - headR * 0.3, hy + headR * 1.6]], look.hair, r, hairA);
  if (look.hairStyle === 'bald') wash(ctx, [[hx - headR, hy + headR * 0.1], [hx - headR * 0.9, hy - headR * 0.4], [hx - headR * 0.3, hy - headR * 0.2], [hx - headR * 0.4, hy + headR * 0.4]], look.hair, r, hairA);
  if (look.hairStyle === 'cap') wash(ctx, [[hx - headR * 1.05, hy - headR * 0.2], [hx - headR * 0.7, hy - headR * 1.15], [hx + headR * 0.8, hy - headR * 1.1], [hx + headR * 0.9, hy - headR * 0.5]], '#f4f2ec', r, hairA);
  // props
  if (look.prop === 'book') wash(ctx, rect(cx + 22, neckY + h * 0.33, 22, 28), '#5a2e2a', r, { layers: 5, alpha: 0.4, spread: 1.5 });
  if (look.prop === 'lantern') {
    wash(ctx, rect(cx + 28, neckY + h * 0.38, 3, 20), '#2a2018', r, { layers: 3, alpha: 0.5, spread: 1 });
    wash(ctx, rect(cx + 20, neckY + h * 0.38 + 20, 20, 26), '#ffcf7a', r, { layers: 5, alpha: 0.45, spread: 1.5 });
  }
  cache.set(key, c);
  return c;
}

export const SPRITE = { w: SPRITE_W, h: SPRITE_H };

/** Where the lantern sits relative to the feet (for the stage to add a light). */
export function lanternOffset(look: Look) {
  const h = look.height;
  const neckY = -h + h * 0.075 * 2.1;
  return { x: 30, y: neckY + h * 0.38 + 33 };
}
