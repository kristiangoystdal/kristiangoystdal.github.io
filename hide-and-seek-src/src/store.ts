import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PLANNING_MINUTES, resume, type PauseKind, type Round } from './clock'
import type { Form } from './form'
import type { LngLat, Question, QuestionBody, RoundResult, Settings } from './types'

const UNDO_LIMIT = 30
const uid = () => Math.random().toString(36).slice(2, 10)

export const DEFAULT_SETTINGS: Settings = {
  zoneRadius: 400,
  lines: ['1', '2', '3', '4', '5'],
  day: 'wk',
  hourFrom: 10,
  hourTo: 18,
  adminLevel: 'bydel',
  theme: 'auto',
  basemap: 'clean',
  size: 'M',
  playArea: null,
}

/** Innstillingene som er felles for alle i spillet og deles i rommet. */
export const GAME_SETTINGS = ['size', 'questions', 'zoneRadius', 'lines', 'playArea'] as const satisfies readonly (keyof Settings)[]

export type Layer = 'lines' | 'zones' | 'area' | 'admin' | 'poi'

export type { Round }

export interface State {
  settings: Settings
  questions: Question[]
  past: Question[][]
  mode: 'seeker' | 'hider'
  hider: { stationId: string | null; pos: LngLat | null }
  layers: Record<Layer, boolean>
  round: Round
  players: string[]
  results: RoundResult[]
  /** Siste runde hider har fått spørsmål om tidsbonus for, så det ikke spørres to ganger. */
  bonusAsked: string | null
  /** Seeker deler posisjonen sin i rommet. */
  sharePos: boolean

  setSettings: (patch: Partial<Settings>) => void
  saveQuestion: (body: QuestionBody, answer: string | null, id?: string) => void
  /** Hider svarer, eller trekker svaret med null. Går utenom angre-loggen, som er seekernes. */
  answerQuestion: (id: string, answer: string | null) => void
  removeQuestion: (id: string) => void
  setNote: (id: string, note: string) => void
  undo: () => void
  setMode: (mode: State['mode']) => void
  setHider: (hider: State['hider']) => void
  toggleLayer: (layer: Layer) => void
  setRound: (patch: Partial<Round>) => void
  startRound: () => void
  cancelRound: () => void
  pauseGame: (kind: PauseKind) => void
  resumeGame: () => void
  /** Hider oppgir tidsbonusen for runden som nettopp er ferdig. */
  answerBonus: (id: string, minutes: number) => void
  setSharePos: (on: boolean) => void
  shufflePlayers: () => void
  addPlayer: (name: string) => void
  removePlayer: (name: string) => void
  finishRound: (seconds: number) => void
  setBonus: (id: string, minutes: number) => void
  removeResult: (id: string) => void
  newGame: () => void
  importGame: (game: SharedGame) => void
}

/** Det som deles mellom spillere: spørsmålsloggen og innstillingene som påvirker geometrien. */
export interface SharedGame {
  v: 1
  questions: Question[]
  settings: Pick<Settings, 'zoneRadius' | 'lines' | 'playArea' | 'size' | 'questions'>
}

const HISTORY_LIMIT = 10
/** Endres et svar som alt er gitt, tas det gamle vare på så alle ser at det er endret. */
const historyOf = (q: Question, answer: string | null) =>
  q.answer !== null && q.answer !== answer ? [...(q.history ?? []), { answer: q.answer, at: Date.now() }].slice(-HISTORY_LIMIT) : q.history

/** Rundens tilstand når ingen runde er i gang. */
const IDLE: Partial<Round> = { seekFrom: null, endgame: null, pause: null, stoppedMs: 0, planUntil: null }

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
        round: { hidingMinutes: 60, hider: '', seekFrom: null },
        players: [],
        results: [],
        bonusAsked: null,
        sharePos: false,

        // Spilloppsettet er låst mens en runde pågår. Telefonens egne valg (tema, kart) kan alltid endres.
        setSettings: (patch) =>
          set((s) => (s.round.seekFrom !== null && GAME_SETTINGS.some((k) => k in patch) ? s : { settings: { ...s.settings, ...patch } })),
        saveQuestion: (body, answer, id) =>
          editQuestions((qs) =>
            id
              ? qs.map((q) => (q.id === id ? { ...body, id, time: q.time, answer, note: q.note, extraMs: q.extraMs, history: historyOf(q, answer), answeredAt: answer === null ? undefined : (q.answeredAt ?? Date.now()) } : q))
              : [...qs, { ...body, id: uid(), time: Date.now(), answer, answeredAt: answer === null ? undefined : Date.now() }],
          ),
        // Første svar avgjør om svartiden ble holdt. Svarer hider på nytt, står tidspunktet.
        answerQuestion: (id, answer) =>
          set((s) => ({ questions: s.questions.map((q) => (q.id === id ? { ...q, answer, history: historyOf(q, answer), answeredAt: q.answeredAt ?? Date.now() } : q)) })),
        removeQuestion: (id) => editQuestions((qs) => qs.filter((q) => q.id !== id)),
        // Notater går utenom angre-loggen, ellers ville hvert tastetrykk blitt et angresteg.
        setNote: (id, note) => set((s) => ({ questions: s.questions.map((q) => (q.id === id ? { ...q, note: note || undefined } : q)) })),
        undo: () => set((s) => (s.past.length ? { questions: s.past[s.past.length - 1], past: s.past.slice(0, -1) } : s)),
        // Rollen er låst mens en runde pågår, så ingen kan kikke på den andre siden.
        setMode: (mode) => set((s) => (s.round.seekFrom !== null ? s : { mode })),
        setHider: (hider) => set({ hider }),
        toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
        setRound: (patch) => set((s) => ({ round: { ...s.round, ...patch } })),
        // Ny runde, ny hider: forrige rundes spørsmål teller ikke som stilt, og gjemmestedet er et annet.
        startRound: () =>
          set((s) => ({
            questions: [],
            past: s.questions.length ? [...s.past, s.questions].slice(-UNDO_LIMIT) : s.past,
            hider: { stationId: null, pos: null },
            round: { ...s.round, ...IDLE, seekFrom: Date.now() + s.round.hidingMinutes * 60000 },
          })),
        cancelRound: () => set((s) => ({ round: { ...s.round, ...IDLE } })),
        pauseGame: (kind) => set((s) => (s.round.seekFrom === null || s.round.pause ? s : { round: { ...s.round, pause: { at: Date.now(), kind } } })),
        resumeGame: () => set((s) => resume(s.round, s.questions, Date.now())),
        answerBonus: (id, minutes) => set((s) => ({ bonusAsked: id, results: s.results.map((r) => (r.id === id ? { ...r, bonusMinutes: minutes } : r)) })),
        setSharePos: (sharePos) => set({ sharePos }),
        shufflePlayers: () =>
          set((s) => {
            const players = [...s.players]
            for (let i = players.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[players[i], players[j]] = [players[j], players[i]]
            }
            return { players, round: s.round.seekFrom === null ? { ...s.round, hider: players[0] ?? s.round.hider } : s.round }
          }),
        addPlayer: (name) => set((s) => (s.players.includes(name) ? s : { players: [...s.players, name] })),
        removePlayer: (name) => set((s) => ({ players: s.players.filter((p) => p !== name) })),
        finishRound: (seconds) =>
          set((s) => {
            // Neste i rekkefølgen gjemmer seg, og får planleggingstid.
            const next = s.players[(s.players.indexOf(s.round.hider) + 1) % (s.players.length || 1)]
            return {
              results: [...s.results, { id: uid(), hider: s.round.hider || 'Ukjent', at: Date.now(), seconds, bonusMinutes: 0 }],
              round: { ...s.round, ...IDLE, hider: s.players.includes(s.round.hider) ? next : s.round.hider, planUntil: Date.now() + PLANNING_MINUTES * 60000 },
            }
          }),
        setBonus: (id, minutes) => set((s) => ({ results: s.results.map((r) => (r.id === id ? { ...r, bonusMinutes: minutes } : r)) })),
        removeResult: (id) => set((s) => ({ results: s.results.filter((r) => r.id !== id) })),
        newGame: () =>
          set((s) => ({
            questions: [],
            past: [...s.past, s.questions].slice(-UNDO_LIMIT),
            hider: { stationId: null, pos: null },
            round: { ...s.round, ...IDLE },
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
      version: 5,
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
  settings: { zoneRadius: s.settings.zoneRadius, lines: s.settings.lines, playArea: s.settings.playArea ?? null, size: s.settings.size, questions: s.settings.questions ?? null },
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
