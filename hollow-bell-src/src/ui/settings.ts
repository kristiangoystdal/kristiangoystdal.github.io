import { readJSON, writeJSON } from '../engine/save';

export type Settings = {
  animation: 'full' | 'reduced' | 'off';
  transitions: 'auto' | 'cut';
  theme: 'paper' | 'ink';
  textSize: number; // rem
  autoAdvance: boolean;
  sound: boolean;
  /** Character voices and the narrator, switched separately. */
  voices: boolean;
  narrator: boolean;
  /** Turn the page by itself when the voice has finished (listen without reading). */
  advanceAfterVoice: boolean;
  volumes: { master: number; ambience: number; sfx: number; voice: number };
};

const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function defaults(): Settings {
  return {
    animation: prefersReducedMotion() ? 'reduced' : 'full',
    transitions: prefersReducedMotion() ? 'cut' : 'auto',
    theme: 'paper',
    textSize: 1.2,
    autoAdvance: false,
    sound: true,
    voices: true,
    narrator: true,
    advanceAfterVoice: false,
    volumes: { master: 0.8, ambience: 0.5, sfx: 0.8, voice: 1 },
  };
}

export const loadSettings = (): Settings => {
  const d = defaults();
  const s = readJSON<Settings>('settings', d);
  return { ...s, volumes: { ...d.volumes, ...s.volumes } };
};
export const storeSettings = (s: Settings) => writeJSON('settings', s);
