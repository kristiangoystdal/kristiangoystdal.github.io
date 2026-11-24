// Which places in the castle lie next to each other (PLAN 6.5). Moving between neighbours is shown as a walk;
// anything else (time jumps, far places, dreams, endings) is a cut. The area of a scene comes from its preset.
import { getPreset } from './presets';

export const NEIGHBOURS: [string, string][] = [
  ['dormitory', 'corridor'],
  ['corridor', 'hall'],
  ['corridor', 'tower'],
  ['corridor', 'archive'],
  ['corridor', 'music-room'],
  ['corridor', 'office'],
  ['hall', 'courtyard'],
  ['tower', 'belfry'],
];

export const areaOf = (preset?: string) => getPreset(preset).area;

export function adjacent(a: string, b: string): boolean {
  return NEIGHBOURS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
