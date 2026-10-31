import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PLANNING_MINUTES, resume, roundStats, type PauseKind, type Round } from './clock'
import { DEFAULT_CITY } from './cities'
import { deviceId } from './device'
import type { Form } from './form'
import type { LngLat, Question, QuestionBody, RoundResult, RoundStats, Settings } from './types'

const UNDO_LIMIT = 30
const uid = () => Math.random().toString(36).slice(2, 10)

export const DEFAULT_SETTINGS: Settings = {
  city: DEFAULT_CITY,
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
export const GAME_SETTINGS = ['city', 'size', 'questions', 'zoneRadius', 'lines', 'playArea', 'areaAuto'] as const satisfies readonly (keyof Settings)[]

export type Layer = 'lines' | 'zones' | 'area' | 'admin' | 'poi'

export type { Round }

export interface State {
  settings: Settings
  questions: Question[]
  past: Question[][]
  mode: 'seeker' | 'hider'
  /** Stasjonen hider har valgt. Posisjonen lagres ikke, den ligger bare i `useHiderPos` mens appen er åpen. */
  hider: { stationId: string | null }
  layers: Record<Layer, boolean>
  round: Round
  players: string[]
  results: RoundResult[]
  /** Siste runde hider har fått spørsmål om tidsbonus for, så det ikke spørres to ganger. */
  bonusAsked: string | null
  /** Måleverktøyet, f.eks. til kostnaden for en forbannelse. Bare på denne telefonen, og teller ikke som spørsmål. */
  tools: Tools
  /** Alle rundene som er spilt, med logg og oppsett, så de kan åpnes igjen. Nyeste sist. */
  archive: ArchivedRound[]
  /**
   * Bare på hiders telefon: der hider sto hver gang et spørsmål ble besvart og når endgame startet.
   * Deles aldri i rommet mens runden pågår. Legges til runden i arkivet når den er over.
   */
  hiderPts: HiderPoint[]

  setSettings: (patch: Partial<Settings>) => void
  /** Bytter by. Spillområde, linjer og spørsmålsutvalg hører til byen og nullstilles. */
  setCity: (city: string) => void
  saveQuestion: (body: QuestionBody, answer: string | null, id?: string) => void
  /** Hider svarer, eller trekker svaret med null. Går utenom angre-loggen, som er seekernes. `swap` er spørsmålet Randomize ga. */
  answerQuestion: (id: string, answer: string | null, swap?: string, manual?: boolean) => void
  /** Seekerne tar svaret ut av kartet, eller bruker det igjen. */
  toggleIgnored: (id: string) => void
  removeQuestion: (id: string) => void
  setNote: (id: string, note: string) => void
  undo: () => void
  setMode: (mode: State['mode']) => void
  setHider: (hider: State['hider']) => void
  toggleLayer: (layer: Layer) => void
  setRound: (patch: Partial<Round>) => void
  /** Endgame: et spørsmål fra før start skal skjære sonen, eller ikke lenger. */
  toggleEndgameCut: (id: string) => void
  startRound: () => void
  /** `room`: rommet runden ble spilt i, så arkivet vet hvor den hører til. */
  cancelRound: (room?: string | null) => void
  pauseGame: (kind: PauseKind) => void
  /** Hider spiller Move: klokkene står i like lang tid som gjemmetiden, mens hider finner en ny sone. */
  playMove: (from: string | null) => void
  resumeGame: () => void
  /** Hider oppgir tidsbonusen for runden som nettopp er ferdig. */
  answerBonus: (id: string, minutes: number) => void
  setTools: (patch: Partial<Tools>) => void
  shufflePlayers: () => void
  addPlayer: (name: string) => void
  removePlayer: (name: string) => void
  finishRound: (seconds: number, room?: string | null) => void
  /** Legger inn runder fra rommet som denne telefonen ikke har. */
  mergeArchive: (rounds: ArchivedRound[]) => void
  removeArchived: (id: string) => void
  /** Hider husker hvor hen står nå (ved svar og når endgame starter). */
  markHider: () => void
  /** Legger hiders punkter til en arkivert runde. */
  addHiderPath: (id: string, pts: HiderPoint[]) => void
  setBonus: (id: string, minutes: number) => void
  removeResult: (id: string) => void
  newGame: () => void
  /** Etter å ha forlatt et rom: runder, poeng, spillere og arkiv fra rommet fjernes. Byen og reglene beholdes. */
  clearRoomGame: (room: string) => void
  importGame: (game: SharedGame) => void
}

/** En radar eller et termometer med fritt valgt avstand. null = ikke i bruk. */
export interface Tools {
  radar: { center: LngLat | null; radiusM: number } | null
  /** `at` er der telefonen er nå, oppdatert fra GPS. */
  thermo: { start: LngLat | null; at: LngLat | null; minM: number } | null
}
const NO_TOOLS: Tools = { radar: null, thermo: null }

/** Der hider sto, som [tidspunkt, lengdegrad, breddegrad]. */
export type HiderPoint = [number, number, number]
const HIDER_POINTS = 300

/** Hiders punkter som hører til runden: fra gjemmetiden startet til runden var over. */
export function hiderPathFor(pts: HiderPoint[], round: Pick<Round, 'seekFrom' | 'hidingMinutes'>, endedAt: number): HiderPoint[] {
  if (round.seekFrom === null) return []
  // Pause i gjemmetiden flytter starten, så det regnes med litt slark.
  const from = round.seekFrom - round.hidingMinutes * 60000 * 2
  return pts.filter((p) => p[0] >= from && p[0] <= endedAt)
}
const longer = (a?: HiderPoint[], b?: HiderPoint[]) => ((b?.length ?? 0) > (a?.length ?? 0) ? b : a)

/** Alt fra én runde: loggen, klokken, kortene, endgame og oppsettet den ble spilt med. */
export interface ArchivedRound {
  /** Samme id som resultatet på poengtavlen når hider ble funnet. */
  id: string
  room: string | null
  hider: string
  /** Hvilken runde dette var for hider, 1 = første. */
  nth: number
  endedAt: number
  outcome: 'found' | 'cancelled'
  /** Tiden hider holdt seg skjult, uten tidsbonus. null når runden ble avbrutt. */
  seconds: number | null
  round: Round
  questions: Question[]
  setup: Pick<Settings, (typeof GAME_SETTINGS)[number]>
  stats: RoundStats
  /** Der hider sto ved hvert svar og i endgame. Kommer fra hiders telefon etter runden. */
  hiderPath?: HiderPoint[]
}
const ARCHIVE_LIMIT = 100
const byEnd = (a: ArchivedRound, b: ArchivedRound) => a.endedAt - b.endedAt

/** Lager arkivoppføringen for runden som pågår. */
function archived(s: State, id: string, outcome: ArchivedRound['outcome'], seconds: number | null, room: string | null, now: number): ArchivedRound {
  const hider = s.round.hider || 'Ukjent'
  const setup = Object.fromEntries(GAME_SETTINGS.map((k) => [k, s.settings[k] ?? null])) as ArchivedRound['setup']
  return {
    id,
    room,
    hider,
    nth: s.archive.filter((a) => a.hider === hider && (a.room === room || !room)).length + 1,
    endedAt: now,
    outcome,
    seconds,
    round: s.round,
    questions: s.questions,
    setup,
    stats: roundStats(s.round, s.questions, s.settings.size, now),
    hiderPath: hiderPathFor(s.hiderPts, s.round, now),
  }
}
// Samme runde fra rommet erstatter den på telefonen, men hiders punkter beholdes.
const addArchive = (list: ArchivedRound[], r: ArchivedRound) => {
  const hiderPath = longer(list.find((a) => a.id === r.id)?.hiderPath, r.hiderPath)
  return [...list.filter((a) => a.id !== r.id), hiderPath?.length ? { ...r, hiderPath } : r].sort(byEnd).slice(-ARCHIVE_LIMIT)
}

/** Det som deles mellom spillere: spørsmålsloggen og innstillingene som påvirker geometrien. */
export interface SharedGame {
  v: 1
  questions: Question[]
  /** `city` mangler i lenker fra før byvalget fantes. Da gjelder Oslo. */
  settings: Pick<Settings, 'zoneRadius' | 'lines' | 'playArea' | 'size' | 'questions' | 'areaAuto'> & { city?: string }
}

/** Legger til der hider står nå, hvis telefonen vet det. GPS-en er alt på for hider, så det koster ikke strøm. */
function withHiderPoint(pts: HiderPoint[]): HiderPoint[] {
  const { pos } = useHiderPos.getState()
  if (!pos) return pts
  return [...pts, [Date.now(), Math.round(pos[0] * 1e5) / 1e5, Math.round(pos[1] * 1e5) / 1e5] as HiderPoint].slice(-HIDER_POINTS)
}

const HISTORY_LIMIT = 10
/** Endres et svar som alt er gitt, tas det gamle vare på så alle ser at det er endret. */
const historyOf = (q: Question, answer: string | null) =>
  q.answer !== null && q.answer !== answer ? [...(q.history ?? []), { answer: q.answer, at: Date.now() }].slice(-HISTORY_LIMIT) : q.history

/** Rundens tilstand når ingen runde er i gang. */
const IDLE: Partial<Round> = { seekFrom: null, endgame: null, pause: null, stoppedMs: 0, planUntil: null, moves: [], drained: [], spotty: null }

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
        hider: { stationId: null },
        layers: { lines: true, zones: true, area: true, admin: false, poi: false },
        round: { hidingMinutes: 60, hider: '', seekFrom: null },
        players: [],
        results: [],
        bonusAsked: null,
        tools: NO_TOOLS,
        archive: [],
        hiderPts: [],

        // Spilloppsettet er låst mens en runde pågår. Telefonens egne valg (tema, kart) kan alltid endres.
        setSettings: (patch) =>
          set((s) => (s.round.seekFrom !== null && GAME_SETTINGS.some((k) => k in patch) ? s : { settings: { ...s.settings, ...patch } })),
        setCity: (city) =>
          set((s) =>
            s.round.seekFrom !== null || s.settings.city === city
              ? s
              : // Ny by: spillområdet legges automatisk rundt stasjonene når de er lastet.
                { settings: { ...s.settings, city, playArea: null, areaAuto: true, questions: null, lines: [] }, hider: { stationId: null } },
          ),
        saveQuestion: (body, answer, id) =>
          editQuestions((qs) =>
            id
              ? qs.map((q) => (q.id === id ? { ...body, id, time: q.time, answer, note: q.note, extraMs: q.extraMs, history: historyOf(q, answer), answeredAt: answer === null ? undefined : (q.answeredAt ?? Date.now()) } : q))
              : [...qs, { ...body, id: uid(), time: Date.now(), answer, by: deviceId(), answeredAt: answer === null ? undefined : Date.now() }],
          ),
        // Første svar avgjør om svartiden ble holdt. Svarer hider på nytt, står tidspunktet.
        answerQuestion: (id, answer, swap, manual) =>
          set((s) => ({
            hiderPts: s.mode === 'hider' ? withHiderPoint(s.hiderPts) : s.hiderPts,
            // Et nytt svar er ny informasjon: er det et annet enn det seekerne tok ut av kartet, gjelder det igjen.
            questions: s.questions.map((q) =>
              q.id === id
                ? { ...q, answer, swap, manual: manual && answer !== null ? true : undefined, ignored: q.ignored && answer === q.answer ? true : undefined, history: historyOf(q, answer), answeredAt: q.answeredAt ?? Date.now() }
                : q,
            ),
          })),
        toggleIgnored: (id) => editQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ignored: q.ignored ? undefined : true } : q))),
        removeQuestion: (id) => editQuestions((qs) => qs.filter((q) => q.id !== id)),
        // Notater går utenom angre-loggen, ellers ville hvert tastetrykk blitt et angresteg.
        setNote: (id, note) => set((s) => ({ questions: s.questions.map((q) => (q.id === id ? { ...q, note: note || undefined } : q)) })),
        undo: () => set((s) => (s.past.length ? { questions: s.past[s.past.length - 1], past: s.past.slice(0, -1) } : s)),
        // Rollen er låst mens en runde pågår, så ingen kan kikke på den andre siden.
        // Den som bytter til hider, gjemte seg ikke forrige runde og skal ikke spørres om tidsbonusen for den.
        setMode: (mode) => set((s) => (s.round.seekFrom !== null ? s : { mode, bonusAsked: mode === 'hider' && s.mode !== 'hider' ? (s.results.at(-1)?.id ?? s.bonusAsked) : s.bonusAsked })),
        setHider: (hider) => set({ hider }),
        toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
        setRound: (patch) => set((s) => ({ round: { ...s.round, ...patch } })),
        toggleEndgameCut: (id) =>
          set((s) => {
            const eg = s.round.endgame
            if (!eg) return s
            const include = eg.include?.includes(id) ? eg.include.filter((x) => x !== id) : [...(eg.include ?? []), id]
            return { round: { ...s.round, endgame: { ...eg, include } } }
          }),
        // Ny runde, ny hider: forrige rundes spørsmål teller ikke som stilt, og gjemmestedet er et annet.
        startRound: () =>
          set((s) => ({
            questions: [],
            past: s.questions.length ? [...s.past, s.questions].slice(-UNDO_LIMIT) : s.past,
            hider: { stationId: null },
            round: { ...s.round, ...IDLE, seekFrom: Date.now() + s.round.hidingMinutes * 60000 },
          })),
        // En avbrutt runde arkiveres også, så loggen ikke går tapt. Uten spørsmål er det ingenting å ta vare på.
        cancelRound: (room = null) =>
          set((s) => ({
            round: { ...s.round, ...IDLE },
            archive: s.questions.length && s.round.seekFrom !== null ? addArchive(s.archive, archived(s, uid(), 'cancelled', null, room, Date.now())) : s.archive,
          })),
        pauseGame: (kind) => set((s) => (s.round.seekFrom === null || s.round.pause ? s : { round: { ...s.round, pause: { at: Date.now(), kind } } })),
        playMove: (from) =>
          set((s) => {
            const now = Date.now()
            const { seekFrom, pause, endgame } = s.round
            if (seekFrom === null || now < seekFrom || pause || endgame) return s
            return {
              // Den nye sonen er ikke valgt ennå.
              hider: { stationId: null },
              round: { ...s.round, pause: { at: now, kind: 'move', until: now + s.round.hidingMinutes * 60000 }, moves: [...(s.round.moves ?? []), { at: now, from }] },
            }
          }),
        resumeGame: () => set((s) => resume(s.round, s.questions, Date.now())),
        answerBonus: (id, minutes) => set((s) => ({ bonusAsked: id, results: s.results.map((r) => (r.id === id ? { ...r, bonusMinutes: minutes } : r)) })),
        setTools: (patch) => set((s) => ({ tools: { ...s.tools, ...patch } })),
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
        finishRound: (seconds, room = null) =>
          set((s) => {
            // Neste i rekkefølgen gjemmer seg, og får planleggingstid.
            const next = s.players[(s.players.indexOf(s.round.hider) + 1) % (s.players.length || 1)]
            const id = uid()
            const now = Date.now()
            seconds = Math.round(seconds)
            return {
              archive: addArchive(s.archive, archived(s, id, 'found', seconds, room, now)),
              results: [...s.results, { id, hider: s.round.hider || 'Ukjent', at: now, seconds, bonusMinutes: 0, stats: roundStats(s.round, s.questions, s.settings.size, now) }],
              round: { ...s.round, ...IDLE, hider: s.players.includes(s.round.hider) ? next : s.round.hider, planUntil: Date.now() + PLANNING_MINUTES * 60000 },
            }
          }),
        mergeArchive: (rounds) => set((s) => ({ archive: rounds.reduce(addArchive, s.archive) })),
        removeArchived: (id) => set((s) => ({ archive: s.archive.filter((a) => a.id !== id) })),
        markHider: () => set((s) => (s.mode === 'hider' ? { hiderPts: withHiderPoint(s.hiderPts) } : s)),
        addHiderPath: (id, pts) => set((s) => ({ archive: s.archive.map((a) => (a.id === id ? { ...a, hiderPath: longer(a.hiderPath, pts) } : a)) })),
        setBonus: (id, minutes) => set((s) => ({ results: s.results.map((r) => (r.id === id ? { ...r, bonusMinutes: minutes } : r)) })),
        removeResult: (id) => set((s) => ({ results: s.results.filter((r) => r.id !== id) })),
        clearRoomGame: (room) =>
          set((s) => ({
            questions: [],
            past: [],
            hider: { stationId: null },
            round: { ...s.round, ...IDLE, hider: '' },
            players: [],
            results: [],
            bonusAsked: null,
            hiderPts: [],
            archive: s.archive.filter((a) => a.room !== room),
          })),
        newGame: () =>
          set((s) => ({
            questions: [],
            past: [...s.past, s.questions].slice(-UNDO_LIMIT),
            hider: { stationId: null },
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
      version: 7,
      // v1 hadde nivået «delbydel», som er erstattet av postsone. v3 og v4 la til spillområde og kartvalg.
      // v6 sluttet å lagre hiders posisjon.
      // v7 la til byvalget. Eldre spill er i Oslo (DEFAULT_SETTINGS).
      migrate: (old) => {
        const { hiderGps: _g, ...s } = old as State & { hiderGps?: boolean }
        s.hider = { stationId: s.hider?.stationId ?? null }
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
  settings: { city: s.settings.city, zoneRadius: s.settings.zoneRadius, lines: s.settings.lines, playArea: s.settings.playArea ?? null, areaAuto: s.settings.areaAuto !== false, size: s.settings.size, questions: s.settings.questions ?? null },
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

/**
 * Hiders posisjon akkurat nå, fra GPS. Den lagres ikke fortløpende. Bare punktet ved hvert svar
 * huskes på hiders telefon (`hiderPts`), og deles først når runden er over. `error` er satt når telefonen ikke gir posisjon.
 */
export const useHiderPos = create<{ pos: LngLat | null; t: number; accuracy: number | null; error: string }>(() => ({ pos: null, t: 0, accuracy: null, error: '' }))

/** Fanene på spillskjermen. Før og etter runden vises lobbyen, uten faner. */
export type Tab = 'questions' | 'endgame' | 'tools'
export type Sheet = 'app' | 'learn' | 'rules' | null

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
  /** Regelvisningen er åpen, med avsnittet som skal vises først. null = lukket, '' = fra starten. */
  rules: string | null
  /** Tidligere runde (id i arkivet) som vises på kartet. null = runden som pågår. */
  viewing: string | null
  setViewing: (id: string | null) => void
  setTab: (tab: Tab) => void
  /** Arket som er åpent: innstillinger, lær appen eller oppsettet. */
  sheet: Sheet
  setSheet: (sheet: Sheet) => void
  /** Stegene i lobbyen som er åpne. Huskes mens appen er åpen, også når kartet lastes på nytt. null = ikke valgt ennå. */
  steps: Record<number, boolean> | null
  /** Hvor mange piksler nederst i kartet et ark (guide, simulert spill) dekker. Kartet zoomer slik at stasjonene ligger over. */
  mapInset: number
  setCollapsed: (collapsed: boolean) => void
  setDraft: (draft: UiState['draft']) => void
  setPick: (pick: UiState['pick']) => void
  setDraw: (draw: UiState['draw']) => void
  setRules: (rules: string | null) => void
}

/**
 * Hvor stor del av skjermen panelet under kartet tar på mobil, i prosent. Brukeren drar i streken
 * over panelet. Huskes på telefonen.
 */
export const PANEL_MAX = 90
export const PANEL_DEFAULT = 55
/** Dras panelet lavere enn dette, skjules det helt og bare streken står igjen. */
export const PANEL_HIDE = 6
export const usePanel = create<{ pct: number }>()(persist(() => ({ pct: PANEL_DEFAULT }), { name: 'hideandseek.panel' }))

export const useUi = create<UiState>((set) => ({
  tab: 'questions',
  sheet: null,
  steps: null,
  mapInset: 0,
  setSheet: (sheet) => set({ sheet }),
  collapsed: false,
  draft: null,
  pick: null,
  draw: null,
  rules: null,
  viewing: null,
  setViewing: (viewing) => set({ viewing }),
  // Trykk på fanen som alt er åpen slår panelet sammen eller ut igjen.
  setTab: (tab) => set((s) => ({ tab, collapsed: s.tab === tab ? !s.collapsed : false })),
  setCollapsed: (collapsed) => set({ collapsed }),
  setDraft: (draft) => set({ draft, collapsed: false }),
  setPick: (pick) => set({ pick }),
  setDraw: (draw) => set({ draw }),
  setRules: (rules) => set({ rules }),
}))
