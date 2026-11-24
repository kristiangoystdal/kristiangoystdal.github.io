// ?gallery (dev aid from the plan): every painted location and character, without playing.
import type { Mood, Particle } from '../engine/types';
import { HOUSE_COLORS, LOOKS } from '../visuals/actors';
import { PRESETS } from '../visuals/presets';
import { castFor, type Stage } from '../visuals/stage';
import { h } from './dom';

export function showGallery(stage: Stage, ui: HTMLElement) {
  const params = new URLSearchParams(location.search);
  let preset = params.get('gallery') || Object.keys(PRESETS)[0];
  let speaker = params.get('speaker') || 'Quill';
  const moods: Mood[] = ['cozy', 'tense', 'dark', 'magic'];
  let mood: Mood = 'tense';
  const particles: Particle[] = ['dust', 'fog', 'fireflies', 'candles', 'sparks'];
  let parts: Particle[] = ['dust'];
  const show = () => void stage.show({ preset, mood, particles: parts, actors: castFor({ speaker, houseColor: HOUSE_COLORS.Ravenclaw }) }, 'cut');
  const row = (items: string[], cur: () => string, set: (v: string) => void) =>
    h('div.gallery-row', {}, items.map((v) => h('button.pill', { 'aria-pressed': String(cur() === v), onclick: (e: Event) => {
      set(v);
      (e.currentTarget as HTMLElement).parentElement!.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      show();
    } }, v)));
  ui.append(
    h('div.gallery', {},
      row(Object.keys(PRESETS), () => preset, (v) => (preset = v)),
      row(Object.keys(LOOKS).filter((k) => k !== 'player'), () => speaker, (v) => (speaker = v)),
      row(moods, () => mood, (v) => (mood = v as Mood)),
      row(particles, () => parts[0], (v) => (parts = [v as Particle])),
    ),
  );
  show();
}
