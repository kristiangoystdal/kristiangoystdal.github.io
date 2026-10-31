import { useEffect } from 'react'
import { create } from 'zustand'
import { city } from './cities'
import { answerOptions } from './form'
import { ANSWER_NULL, autoAnswer, dist, stationPos } from './geo'
import { lookup } from './online'
import { useGame, useUi, type State } from './store'
import { resumeRoom, suspendRoom, useSync } from './sync'
import { setTestMode, useTestMode, type TestMode } from './testmode'
import type { GeoData, LngLat, Station } from './types'

/**
 * Demorunden: et ferdig spill der telefonen er seeker og en datastyrt hider svarer.
 * Spillet som var på telefonen lagres unna og kommer tilbake når demoen er ferdig,
 * også om siden lastes på nytt midt i.
 */

const BACKUP_KEY = 'hideandseek.demo'
export const DEMO_CITY = 'oslo'
export const DEMO_LINES = ['1', '2', '3', '4', '5']
/** Der seeker starter: Jernbanetorget. */
export const DEMO_START: LngLat = [10.7507, 59.9116]
const ANSWER_DELAY_MS = 1500
/** Hider gjemmer seg mellom 3 og 8 km fra start, så det tar noen spørsmål å finne hen. */
const HIDE_MIN_M = 3000
const HIDE_MAX_M = 8000
export const DEMO_HIDER = 'Demo-hider'
export const DEMO_ME = 'Du'

interface DemoState {
  /** Demoen eller et simulert spill er i gang, og det ekte spillet er lagt til side. */
  active: boolean
  kind: 'demo' | 'showcase' | null
  /** Hiders hemmelige stasjon og hvor hen står. Velges når kartdataene er lastet. */
  hider: DemoHider | null
}
export interface DemoHider {
  stationId: string
  name: string
  pos: LngLat
}
export const useDemo = create<DemoState>(() => ({ active: false, kind: null, hider: null }))

type Saved = Omit<State, { [K in keyof State]: State[K] extends (...a: never[]) => unknown ? K : never }[keyof State]>
interface Backup {
  game: Saved
  test: TestMode
  room: boolean
}

const dataOf = (s: State): Saved => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')) as Saved

/**
 * Legger det ekte spillet til side (også i lagringen, så det overlever en omlasting), kobler fra
 * rommet og setter opp `game` i stedet. Brukes av demoen og de simulerte spillene.
 */
export function enterSandbox(kind: 'demo' | 'showcase', game: Partial<Saved>) {
  const current = useDemo.getState()
  if (current.active) {
    // Allerede i sandkassen: bytt bare innhold. Det ekte spillet ligger trygt i lagringen.
    useGame.setState(game)
    useDemo.setState({ kind, hider: null })
    return
  }
  const backup: Backup = { game: dataOf(useGame.getState()), test: { ...useTestMode.getState() }, room: !!useSync.getState().room }
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
  } catch {
    // Uten lagring kan demoen ikke garantere at spillet kommer tilbake etter en omlasting. Den virker likevel.
  }
  suspendRoom()
  // Et halvferdig spørsmål eller en tegning fra det ekte spillet hører ikke hjemme i sandkassen.
  useUi.setState({ draft: null, pick: null, draw: null, viewing: null })
  useGame.setState(game)
  useDemo.setState({ active: true, kind, hider: null })
}

/** Et tomt spill uten runde, spillere eller historikk. Utgangspunkt for sandkassen. */
export function blankGame(settings: Partial<State['settings']>): Partial<Saved> {
  const g = useGame.getState()
  return {
    // Demoen og de simulerte spillene bruker hele nettet, som spillene er regnet ut med.
    settings: { ...g.settings, playArea: null, areaAuto: false, questions: null, ...settings },
    questions: [],
    past: [],
    mode: 'seeker',
    hider: { stationId: null },
    round: { hidingMinutes: 30, hider: '', seekFrom: null, endgame: null, pause: null, stoppedMs: 0, planUntil: null, moves: [], drained: [], spotty: null },
    players: [],
    results: [],
    archive: [],
    hiderPts: [],
    tools: { radar: null, thermo: null },
    bonusAsked: null,
  }
}

/** Starter demoen: et ferdig spill i Oslo der telefonen er seeker. */
export function startDemo() {
  const game = blankGame({ city: DEMO_CITY, size: 'M', zoneRadius: 500, lines: DEMO_LINES })
  enterSandbox('demo', {
    ...game,
    questions: [],
    past: [],
    mode: 'seeker',
    hider: { stationId: null },
    round: { ...game.round!, hider: DEMO_HIDER },
    players: [DEMO_ME, DEMO_HIDER],
  })
  setTestMode({ on: true, pos: DEMO_START, accuracy: 5 })
}

/** Avslutter demoen eller det simulerte spillet, og legger tilbake spillet som var på telefonen. */
export function endDemo() {
  const raw = readBackup()
  useDemo.setState({ active: false, kind: null, hider: null })
  useUi.setState({ draft: null, pick: null, draw: null })
  if (raw) {
    useGame.setState(raw.game)
    setTestMode(raw.test)
  } else setTestMode({ on: false })
  try {
    localStorage.removeItem(BACKUP_KEY)
  } catch {
    // Ingenting å rydde.
  }
  if (raw?.room) resumeRoom()
}

function readBackup(): Backup | null {
  try {
    const text = localStorage.getItem(BACKUP_KEY)
    return text ? (JSON.parse(text) as Backup) : null
  } catch {
    return null
  }
}

/** Ble siden lastet på nytt midt i en demo, legges det ekte spillet tilbake. Kalles når appen starter. */
export function restoreAfterReload() {
  if (!useDemo.getState().active && readBackup()) endDemo()
}

/** Velger hiders stasjon: tilfeldig blant stasjonene et stykke fra start. */
export function pickHider(stations: Station[], random = Math.random): DemoHider | null {
  const fits = stations.filter((s) => {
    const d = dist(stationPos(s), DEMO_START)
    return d >= HIDE_MIN_M && d <= HIDE_MAX_M
  })
  const pool = fits.length ? fits : stations
  if (!pool.length) return null
  const s = pool[Math.floor(random() * pool.length)]
  // Hider står litt unna selve stasjonen, i sonen.
  const p = stationPos(s)
  return { stationId: s.id, name: s.name, pos: [p[0] + 0.0012, p[1] + 0.0005] }
}

/** Svaret den datastyrte hideren gir, ut fra der hen står. */
export function demoAnswer(q: Parameters<typeof autoAnswer>[0], hider: { pos: LngLat; station: Station }, data: GeoData): string {
  const a = autoAnswer(q, hider, data, lookup)
  if (a) return a.answer
  if (q.kind === 'photo') return 'Bilde sendt'
  return answerOptions(q, data)[0] ?? ANSWER_NULL
}

/** Den datastyrte hideren: velger stasjon, og svarer på nye spørsmål etter et par sekunder. */
export function useDemoHider(data: GeoData | null) {
  const active = useDemo((s) => s.kind === 'demo')
  const hider = useDemo((s) => s.hider)
  const questions = useGame((s) => s.questions)
  useEffect(() => {
    // Kartdataene for demobyen kan komme litt etter at demoen startet. Hider velger stasjon først når de er der.
    if (!active || !data || data.loading || city().id !== DEMO_CITY) return
    if (!hider || !data.stations.some((s) => s.id === hider.stationId)) useDemo.setState({ hider: pickHider(data.stations) })
  }, [active, data, hider])
  useEffect(() => {
    if (!active || !data || data.loading || !hider) return
    const station = data.stations.find((s) => s.id === hider.stationId)
    if (!station) return
    const open = questions.filter((q) => q.answer === null)
    const timers = open.map((q) => setTimeout(() => useGame.getState().answerQuestion(q.id, demoAnswer(q, { pos: hider.pos, station }, data)), ANSWER_DELAY_MS))
    return () => timers.forEach(clearTimeout)
  }, [active, data, hider, questions])
}
