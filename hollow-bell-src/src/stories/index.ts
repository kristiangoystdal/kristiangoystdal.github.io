import type { Story } from '../engine/types';
import hollowBellEn from './hollow-bell.json';
import hollowBellNo from './hollow-bell.no.json';

// Both files share the id "hollow-bell"; the Norwegian one gets its own id so saves and endings stay apart.
const no = { ...(hollowBellNo as unknown as Story), id: 'hollow-bell-no', language: 'no' as const };
const en = { ...(hollowBellEn as unknown as Story), language: 'en' as const };

export const STORIES: Story[] = [en, no];
export const storyById = (id: string) => STORIES.find((s) => s.id === id);

/** Display names for relation ids and items. Ids without an entry are shown humanised. */
export const NAMES: Record<string, { en: string; no: string }> = {
  mirela: { en: 'Mirela', no: 'Mirela' },
  quill: { en: 'Quill', no: 'Quill' },
  cantor: { en: 'Vale', no: 'Vale' },
  ashgrove: { en: 'Ashgrove', no: 'Ashgrove' },
  harrow: { en: 'Harrow', no: 'Harrow' },
  score_page: { en: 'Score page', no: 'Noteside' },
  page_a: { en: 'First page of the song', no: 'Første side av sangen' },
  page_b: { en: 'Second page of the song', no: 'Andre side av sangen' },
  tuning_fork: { en: 'Tuning fork', no: 'Stemmegaffel' },
  ledger: { en: 'Ledger', no: 'Regnskap' },
  harrow_key: { en: "Harrow's key", no: 'Harrows nøkkel' },
  pip_frog: { en: "Pip's chocolate frog", no: 'Pips sjokoladefrosk' },
};

export function displayName(id: string, lang: 'en' | 'no') {
  return NAMES[id]?.[lang] ?? id.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
