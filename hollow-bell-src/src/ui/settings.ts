import { readJSON, writeJSON } from '../engine/save';
import type { Lang } from './i18n';

export type Settings = {
  lang: Lang;
  animation: 'full' | 'reduced' | 'off';
  transitions: 'auto' | 'cut';
  theme: 'paper' | 'ink';
  textSize: number; // rem
  autoAdvance: boolean;
  sound: boolean;
  voice: boolean;
  volumes: { master: number; ambience: number; sfx: number; voice: number };
};

const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const browserLang = (): Lang => (/^(nb|nn|no)\b/i.test(navigator.language ?? '') ? 'no' : 'en');

export function defaults(): Settings {
  return {
    lang: browserLang(),
    animation: prefersReducedMotion() ? 'reduced' : 'full',
    transitions: prefersReducedMotion() ? 'cut' : 'auto',
    theme: 'paper',
    textSize: 1.2,
    autoAdvance: false,
    sound: true,
    voice: false,
    volumes: { master: 0.8, ambience: 0.5, sfx: 0.8, voice: 1 },
  };
}

export const loadSettings = (): Settings => {
  const d = defaults();
  const s = readJSON<Settings>('settings', d);
  return { ...s, volumes: { ...d.volumes, ...s.volumes } };
};
export const storeSettings = (s: Settings) => writeJSON('settings', s);
