// Seeded randomness. The n-th draw for a seed is always the same, so reloading a save gives the same roll.

/** mulberry32 on (seed, n): a number in [0, 1). */
export function draw(seed: number, n: number): number {
  let t = (seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0;
  t = (t + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A d10 (1-10) for the n-th draw. */
export const d10 = (seed: number, n: number) => 1 + Math.floor(draw(seed, n) * 10);

export const newSeed = () => (Math.random() * 2 ** 32) >>> 0;
