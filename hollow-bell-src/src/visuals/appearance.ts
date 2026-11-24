// What a player can choose about how they look. Shared by the phone setup and the big screen.
import { LOOKS, type Look } from './actors';

export type Appearance = { hairStyle: Look['hairStyle']; hair: string; skin: string; height: 'short' | 'medium' | 'tall' };

export const HAIR_STYLES: { id: Look['hairStyle']; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'bun', label: 'Bun' },
  { id: 'bald', label: 'Shaved' },
];
export const HAIR_COLOURS = ['#1e1410', '#4a3020', '#7a4a28', '#8a3e22', '#c89a5a', '#e6cf8e', '#a03a20', '#6a6a70', '#e8e8ec'];
export const SKIN_TONES = ['#f2d4b8', '#e3c2a0', '#c99a72', '#a0704a', '#6e4a30'];
export const HEIGHTS: { id: Appearance['height']; label: string; px: number }[] = [
  { id: 'short', label: 'Shorter', px: 205 },
  { id: 'medium', label: 'Medium', px: 220 },
  { id: 'tall', label: 'Taller', px: 238 },
];

export const DEFAULT_APPEARANCE: Record<'ingerid' | 'kristian', Appearance> = {
  // Ingerid: long blonde hair. Kristian: short auburn hair. About the same height.
  ingerid: { hairStyle: 'long', hair: '#e6cf8e', skin: '#f2d4b8', height: 'medium' },
  kristian: { hairStyle: 'short', hair: '#8a3e22', skin: '#f2d4b8', height: 'medium' },
};

/** A player's look with their choices applied. Unknown values fall back to the defaults. */
export function lookWith(base: Look, a: Partial<Appearance> | undefined): Look {
  if (!a) return base;
  const h = HEIGHTS.find((x) => x.id === a.height)?.px ?? base.height;
  return {
    ...base,
    hairStyle: HAIR_STYLES.some((x) => x.id === a.hairStyle) ? a.hairStyle! : base.hairStyle,
    hair: HAIR_COLOURS.includes(a.hair ?? '') ? a.hair! : base.hair,
    skin: SKIN_TONES.includes(a.skin ?? '') ? a.skin : base.skin,
    height: h,
  };
}

export const playerLook = (id: 'ingerid' | 'kristian', a?: Partial<Appearance>) => lookWith(LOOKS[id], a ?? DEFAULT_APPEARANCE[id]);
