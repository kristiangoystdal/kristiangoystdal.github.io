import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Form } from './form'
import type { Card, LngLat, Question, QuestionBody, RoundResult, Settings } from './types'

export const MAX_CARDS = 6
const UNDO_LIMIT = 30
const uid = () => Math.random().toString(36).slice(2, 10)

export const DEFAULT_SETTINGS: Settings = {
  zoneRadius: 500,
  lines: ['1', '2', '3', '4', '5'],
  day: 'wk',
  hourFrom: 10,
  hourTo: 18,
  adminLevel: 'bydel',
  theme: 'auto',
  basemap: 'clean',
  playArea: null,
}

export type Layer = 'lines' | 'zones' | 'area' | 'admin' | 'poi'

interface Round {
  hidingMinutes: number
  hider: string
  /** Tidspunktet gjemmetiden er over og letingen starter. null = ingen runde i gang. */
  seekFrom: number | null
}

interface State {
  settings: Settings
  questions: Question[]
  past: Question[][]
  mode: 'seeker' | 'hider'
  hider: { stationId: string | null; pos: LngLat | null }
  layers: Record<Layer, boolean>
  round: Round
  cards: Card[]
  players: string[]
  results: RoundResult[]

  setSettings: (patch: Partial<Settings>) => void
  saveQuestion: (body: QuestionBody, answer: string | null, id?: string) => void
  removeQuestion: (id: string) => void
  undo: () => void
  setMode: (mode: State['mode']) => void
  setHider: (hider: State['hider']) => void
  toggleLayer: (layer: Layer) => void
  setRound: (patch: Partial<Round>) => void
  addCard: (card: Omit<Card, 'id'>) => void
  removeCard: (id: string) => void
  addPlayer: (name: string) => void
  removePlayer: (name: string) => void
  finishRound: (seconds: number) => void
  removeResult: (id: string) => void
  newGame: () => void
  importGame: (game: SharedGame) => void
}

/** Det som deles mellom spillere: spørsmålsloggen og innstillingene som påvirker geometrien. */
export interface SharedGame {
  v: 1
  questions: Question[]
  settings: Pick<Settings, 'zoneRadius' | 'lines' | 'playArea'>
}

export const useGame = create<State>()(
  persist(
    (set) => {
      // Alle endringer i spørsmålsloggen går via denne, så angre alltid virker.
      const editQuestions = (fn: (qs: Question[]) => Question[]) =>
        set((s) => ({ questions: fn(s.questions), past: [...s.past, s.questions].slice(-UNDO_LIMIT) }))

      return {
        settings: DEFAULT_SETTINGS,
        questions: [],
        past: [],
        mode: 'seeker',
        hider: { stationId: null, pos: null },
        layers: { lines: true, zones: true, area: true, admin: false, poi: false },
        round: { hidingMinutes: 30, hider: '', seekFrom: null },
        cards: [],
        players: [],
        results: [],

        setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        saveQuestion: (body, answer, id) =>
          editQuestions((qs) =>
            id
              ? qs.map((q) => (q.id === id ? { ...body, id, time: q.time, answer } : q))
              : [...qs, { ...body, id: uid(), time: Date.now(), answer }],
          ),
        removeQuestion: (id) => editQuestions((qs) => qs.filter((q) => q.id !== id)),
        undo: () => set((s) => (s.past.length ? { questions: s.past[s.past.length - 1], past: s.past.slice(0, -1) } : s)),
        setMode: (mode) => set({ mode }),
        setHider: (hider) => set({ hider }),
        toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
        setRound: (patch) => set((s) => ({ round: { ...s.round, ...patch } })),
        addCard: (card) => set((s) => (s.cards.length >= MAX_CARDS ? s : { cards: [...s.cards, { ...card, id: uid() }] })),
        removeCard: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),
        addPlayer: (name) => set((s) => (s.players.includes(name) ? s : { players: [...s.players, name] })),
        removePlayer: (name) => set((s) => ({ players: s.players.filter((p) => p !== name) })),
        finishRound: (seconds) =>
          set((s) => ({
            results: [
              ...s.results,
              {
                id: uid(),
                hider: s.round.hider || 'Ukjent',
                seconds,
                bonusMinutes: s.cards.filter((c) => c.type === 'bonus').reduce((sum, c) => sum + c.minutes, 0),
              },
            ],
            round: { ...s.round, seekFrom: null },
          })),
        removeResult: (id) => set((s) => ({ results: s.results.filter((r) => r.id !== id) })),
        newGame: () =>
          set((s) => ({
            questions: [],
            past: [...s.past, s.questions].slice(-UNDO_LIMIT),
            hider: { stationId: null, pos: null },
            cards: [],
            round: { ...s.round, seekFrom: null },
          })),
        importGame: (game) =>
          set((s) => ({
            questions: game.questions,
            past: [...s.past, s.questions].slice(-UNDO_LIMIT),
            settings: { ...s.settings, ...game.settings },
          })),
      }
    },
    {
      name: 'hideandseek.v1',
      version: 4,
      // v1 hadde nivået «delbydel», som er erstattet av postsone. v3 og v4 la til spillområde og kartvalg.
      migrate: (old) => {
        const s = old as State
        const fix = (level: string) => (level === 'delbydel' ? 'postsone' : level)
        const questions = s.questions.map((q) => (q.kind === 'admin' ? { ...q, level: fix(q.level) } : q))
        return { ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings, adminLevel: fix(s.settings.adminLevel) }, questions, past: [] } as State
      },
    },
  ),
)

export const exportGame = (s: Pick<State, 'questions' | 'settings'>): SharedGame => ({
  v: 1,
  questions: s.questions,
  settings: { zoneRadius: s.settings.zoneRadius, lines: s.settings.lines, playArea: s.settings.playArea ?? null },
})

export function parseGame(text: string): SharedGame {
  const game = JSON.parse(text)
  if (game?.v !== 1 || !Array.isArray(game.questions) || !game.settings) throw new Error('Ukjent format')
  return game
}

const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))

export const gameLink = (game: SharedGame) => `${location.origin}${location.pathname}#spill=${toB64(JSON.stringify(game))}`

export function gameFromHash(hash: string): SharedGame | null {
  const m = hash.match(/spill=([\w-]+)/)
  if (!m) return null
  try {
    return parseGame(fromB64(m[1]))
  } catch {
    return null
  }
}

export type Tab = 'map' | 'questions' | 'hider' | 'round' | 'settings'

interface UiState {
  tab: Tab
  /** Spørsmålet som redigeres akkurat nå. Tegnes som forhåndsvisning på kartet. */
  draft: Form | null
  /** Satt mens brukeren skal trykke på kartet for å velge et punkt. */
  pick: { label: string; done: (p: LngLat) => void } | null
  /** Hjørnene som er satt så langt mens spillområdet tegnes. null = tegner ikke. */
  draw: LngLat[] | null
  /** På mobil: panelet er slått sammen så kartet fyller skjermen. */
  collapsed: boolean
  setTab: (tab: Tab) => void
  setCollapsed: (collapsed: boolean) => void
  setDraft: (draft: UiState['draft']) => void
  setPick: (pick: UiState['pick']) => void
  setDraw: (draw: UiState['draw']) => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'map',
  collapsed: false,
  draft: null,
  pick: null,
  draw: null,
  // Trykk på fanen som alt er åpen slår panelet sammen eller ut igjen.
  setTab: (tab) => set((s) => ({ tab, collapsed: s.tab === tab ? !s.collapsed : false })),
  setCollapsed: (collapsed) => set({ collapsed }),
  setDraft: (draft) => set({ draft, collapsed: false }),
  setPick: (pick) => set({ pick }),
  setDraw: (draw) => set({ draw }),
}))
