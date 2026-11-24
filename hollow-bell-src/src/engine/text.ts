import { evalCondition } from './conditions';
import type { GameState, Paragraph, Scene } from './types';

/** Replaces {name}, {house} and any extra {key} values. Unknown keys are left as they are. */
export function interpolate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export const playerVars = (s: Pick<GameState, 'player'>) => ({ name: s.player.name, house: s.player.house });

/** The paragraphs of a scene that apply to this state, with names filled in. */
export function sceneText(scene: Scene, s: GameState): string[] {
  return (scene.text ?? [])
    .filter((p: Paragraph) => typeof p === 'string' || evalCondition(p.if, s))
    .map((p) => interpolate(typeof p === 'string' ? p : p.text, playerVars(s)));
}

/** True when the whole paragraph is one quoted line, so it can go in a speech bubble. */
export function isDialogue(p: string): boolean {
  const t = p.trim();
  if (!/^[“"«]/.test(t) || !/[”"»]$/.test(t)) return false;
  // "…" she says. "…" has narration between the quotes: keep it in the narrator box.
  return !/[”"»]\s+[\p{L}][^“”"«»]*[“"«]/u.test(t);
}

/** Strips the outer quote marks of a dialogue line. */
export const unquote = (p: string) => p.trim().replace(/^[“"«]/, '').replace(/[”"»]$/, '');

export type ShownParagraph = { text: string; raw: string; index: number; dialogue: boolean };

/** Like sceneText, but keeps each paragraph's original index and raw text (for voice lookup). */
export function sceneParagraphs(scene: Scene, s: GameState): ShownParagraph[] {
  const out: ShownParagraph[] = [];
  (scene.text ?? []).forEach((p, index) => {
    if (typeof p !== 'string' && !evalCondition(p.if, s)) return;
    const raw = typeof p === 'string' ? p : p.text;
    const text = interpolate(raw, playerVars(s));
    out.push({ text, raw, index, dialogue: isDialogue(text) });
  });
  return out;
}
