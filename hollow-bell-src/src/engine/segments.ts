// Splits a paragraph into voiced segments: narration (the narrator) and quoted speech (a character).
// Shared by the game and by tools/voices/extract-lines.mjs (Node runs this file directly), so it must
// not import anything. The voice key ties a segment to its recorded file.

export const NARRATOR = 'Narrator';

export type Segment = { speaker: string; text: string };

export type VoiceMap = {
  /** Speaker for each quoted piece, by "sceneId#paragraphIndex". Missing = the scene's speaker. */
  lines: Record<string, string[]>;
};

const QUOTE = /“([^”]+)”/g;
const hasWords = (t: string) => /[\p{L}\p{N}]/u.test(t);

/**
 * Segments of a paragraph template (before {name}/{house} are filled in). Adjacent segments with the same
 * speaker are merged, so a quoted word inside narration is simply read by the narrator.
 */
export function segmentParagraph(raw: string, quoteSpeakers: string[] | undefined, sceneSpeaker: string | undefined): Segment[] {
  const out: Segment[] = [];
  const push = (speaker: string, text: string) => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (!hasWords(t)) return;
    const last = out[out.length - 1];
    if (last && last.speaker === speaker) last.text += ' ' + t;
    else out.push({ speaker, text: t });
  };
  let pos = 0;
  let k = 0;
  for (const m of raw.matchAll(QUOTE)) {
    push(NARRATOR, raw.slice(pos, m.index));
    push(quoteSpeakers?.[k] ?? sceneSpeaker ?? NARRATOR, m[1]);
    k++;
    pos = m.index! + m[0].length;
  }
  push(NARRATOR, raw.slice(pos));
  return out;
}

export function fillVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, key) => vars[key] ?? m);
}

/** The text that gets spoken: names filled in, typographic marks TTS stumbles on smoothed out. */
export function speakable(text: string): string {
  return text.replace(/—/g, ', ').replace(/…/g, '...').replace(/\s+/g, ' ').trim();
}

/** Voice file key: sceneId, paragraph index, segment index and the exact spoken text. */
export async function voiceKey(sceneId: string, index: number, seg: number, text: string): Promise<string> {
  const data = new TextEncoder().encode(`${sceneId}|${index}|${seg}|${text}`);
  const buf = await crypto.subtle.digest('SHA-1', data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}
