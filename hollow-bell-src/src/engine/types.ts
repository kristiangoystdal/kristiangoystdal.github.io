// Story data model. Content is data (src/stories/*.json), the engine is code.

export type StatName = 'courage' | 'wit' | 'kindness' | 'cunning';
export const STAT_NAMES: StatName[] = ['courage', 'wit', 'kindness', 'cunning'];

export type Range = { gte?: number; lte?: number };

export type Condition =
  | { flag: string; is?: boolean }
  | { item: string }
  | ({ stat: StatName } & Range)
  | ({ relation: string } & Range)
  | ({ bond: string } & Range)
  | ({ counter: string } & Range)
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type Effect =
  | { stat: StatName; add: number }
  | { flag: string; set: boolean }
  | { item: string; give: boolean }
  | { relation: string; add: number }
  | { bond: string; add: number }
  | { counter: string; add: number };

export type Check = { stat: StatName; difficulty: number; successTo: string; failTo: string };

export type Choice = {
  label: string;
  to: string; // scene id, or RETURN inside a storylet
  requires?: Condition;
  lockedHint?: string;
  effects?: Effect[];
  check?: Check;
  ripple?: string;
  resetState?: { keep: ('stats' | 'flags' | 'items' | 'relations' | 'bonds' | 'counters')[] };
  transition?: Transition;
};

export type Paragraph = string | { if: Condition; text: string };

export type Particle = 'candles' | 'fog' | 'sparks' | 'snow' | 'rain' | 'dust' | 'fireflies';
export type Transition = 'cut' | 'walk' | 'slide';
export type Mood = 'cozy' | 'tense' | 'dark' | 'magic' | 'funny';
export type EndingKind = 'good' | 'neutral' | 'bad' | 'secret';

export type Scene = {
  id: string;
  title?: string;
  mood?: Mood;
  visual?: { preset?: string; particles?: Particle[] };
  audio?: { ambience?: string; sfx?: string[] };
  speaker?: string;
  pov?: { name: string };
  text?: Paragraph[];
  onEnter?: Effect[];
  choices?: Choice[];
  ending?: { id: string; title: string; kind: EndingKind };
  director?: { pool: string; pick: number; then: string };
  storylet?: { pool: string; priority: number; once?: boolean; when?: Condition };
  transition?: Transition;
};

export type WorldState = {
  stats: Record<StatName, number>;
  flags: Record<string, boolean>;
  items: string[];
  relations: Record<string, number>;
  bonds: Record<string, number>;
  counters: Record<string, number>;
};

export type Story = {
  id: string;
  title: string;
  language?: 'en' | 'no';
  tagline: string;
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
  startScene: string;
  initialState: Partial<WorldState> & { stats: Record<StatName, number> };
  scenes: Record<string, Scene>;
  characterCreation?: {
    nameInput?: { label?: string; default?: string; maxLength?: number; placeholder?: string };
    houseChoice?: string[];
    bonusPoints?: number;
  };
  credits?: {
    title?: string;
    lines?: string[];
    showEndingCount?: boolean;
    endingCountText?: string;
    buttons?: string[];
  };
  ui?: { titleScene?: string; skipIntroOnLoop?: boolean };
  pools?: Record<string, { description?: string }>;
};

export type Player = { name: string; house: string };

/** One step the player took: the scene they were in and what they picked there. */
export type HistoryEntry = {
  scene: string;
  choice?: number; // index into scene.choices
  roll?: RollResult;
};

export type RollResult = {
  stat: StatName;
  die: number; // 1-10
  bonus: number; // the stat value
  difficulty: number;
  success: boolean;
};

export type GameState = WorldState & {
  version: 1;
  storyId: string;
  sceneId: string;
  player: Player;
  history: HistoryEntry[];
  seen: string[]; // scene ids visited (storylet `once`)
  seed: number;
  draws: number; // how many random numbers have been used, so a reload gives the same roll
  director: { queue: string[]; then: string } | null;
  loops: number;
};

export const RETURN = '$return';
