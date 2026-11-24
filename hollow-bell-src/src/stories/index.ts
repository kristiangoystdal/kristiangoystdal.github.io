import type { Story } from '../engine/types';
import hollowBellEn from './hollow-bell.json';

const en = hollowBellEn as unknown as Story;

export const STORIES: Story[] = [en];
export const storyById = (id: string) => STORIES.find((s) => s.id === id);

/** Display names for relation ids and items. Ids without an entry are shown humanised. */
export const NAMES: Record<string, string> = {
  mirela: 'Mirela',
  quill: 'Quill',
  cantor: 'Vale',
  ashgrove: 'Ashgrove',
  harrow: 'Harrow',
  score_page: 'Score page',
  page_a: 'First page of the song',
  page_b: 'Second page of the song',
  tuning_fork: 'Tuning fork',
  ledger: 'Ledger',
  harrow_key: "Harrow's key",
  pip_frog: "Pip's chocolate frog",
};

export function displayName(id: string) {
  return NAMES[id] ?? id.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
