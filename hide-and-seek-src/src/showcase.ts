import { useEffect } from 'react'
import { create } from 'zustand'
import { city, cityOf, linesOf } from './cities'
import { blankGame, endDemo, enterSandbox, useDemo, type DemoHider } from './demo'
import { ANSWER_NULL, POI_TYPES, adminLevels, autoAnswer, dist, excluded, hasData, levelAreas, nearestStation, solve, stationPos } from './geo'
import { useGame, useUi } from './store'
import { setTestMode } from './testmode'
import type { GeoData, LngLat, Question, QuestionBody, Settings, Station } from './types'

/**
 * Simulerte spill: appen spiller en runde i en by mot en datastyrt hider, og brukeren
 * blar gjennom den spørsmål for spørsmål. Kartet krymper for hvert steg, slik det gjør i et
 * ekte spill. Det ekte spillet ligger trygt til side imens (samme sandkasse som demoen).
 */

export interface SimGame {
  city: string
  hider: DemoHider
  /** Stasjonen seekerne starter ved. */
  start: string
  questions: Question[]
  /** Hvor seekerne sto da de stilte hvert spørsmål. */
  positions: LngLat[]
  /** Stasjoner igjen etter hvert spørsmål. */
  left: number[]
  total: number
  /** Når runden startet. Spørsmålene har tidspunkter etter dette. I filen er det 0, og tidene flyttes til nå når spillet åpnes. */
  seekFrom: number
}

const MAX_QUESTIONS = 12
const RADII = [500, 1000, 2000, 5000, 10000, 15000, 40000]
const STEP_MS = 12 * 60000
/** Hver by får sin egen hider, men den samme hver gang. */
export const SEEDS: Record<string, number> = { oslo: 11, bergen: 23, stavanger: 37, trondheim: 41 }
/** Filen med det ferdige spillet i hver bys datamappe. */
export const GAME_FILE = 'game.json'
export const SIM_HIDER = 'Datastyrt hider'

/** Tilfeldige tall som blir de samme hver gang for samme frø. */
export function seeded(seed: number) {
  let x = seed >>> 0 || 1
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    return x / 2 ** 32
  }
}

const centroid = (stations: Station[]): LngLat => {
  const n = stations.length || 1
  return [stations.reduce((a, s) => a + s.lon, 0) / n, stations.reduce((a, s) => a + s.lat, 0) / n]
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0
/** Et punkt `m` meter fra `a` i retning `b`. */
const toward = (a: LngLat, b: LngLat, m: number): LngLat => {
  const d = dist(a, b)
  if (d < 1) return a
  const f = Math.min(1, m / d)
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

/** Spørsmålene seekerne prøver, i rekkefølge. De som byen mangler data til, hoppes over. */
const PLAN: ((pos: LngLat, left: Station[], data: GeoData) => QuestionBody | null)[] = [
  // Radar med en radius som deler de gjenværende stasjonene omtrent på midten.
  (pos, left) => ({ kind: 'radar', center: pos, radiusM: RADII.reduce((best, r) => (Math.abs(r - median(left.map((s) => dist(pos, stationPos(s))))) < Math.abs(best - median(left.map((s) => dist(pos, stationPos(s))))) ? r : best)) }),
  (pos, left) => ({ kind: 'thermometer', from: pos, to: toward(pos, centroid(left), 1000), minM: 1000 }),
  (pos, _left, data) => {
    const level = adminLevels().find((l) => levelAreas(data, l.key).length > 1)
    return level ? { kind: 'admin', level: level.key, pos } : null
  },
  (pos, _left, data) => {
    const t = ['museum', 'kino', 'bibliotek', 'sykehus', 'park'].find((k) => data.poi[k]?.length)
    return t ? { kind: 'nearest', poiType: t, pos } : null
  },
  (pos, _left, data) => (data.shapes.coast?.length ? { kind: 'geodist', ref: 'coast', pos } : null),
  (pos, _left, data) => {
    const t = POI_TYPES.map((p) => p.key).find((k) => k !== 'museum' && (data.poi[k]?.length ?? 0) > 2)
    return t ? { kind: 'measure', ref: t, pos } : null
  },
]

/**
 * Spiller en runde: hider gjemmer seg ved en stasjon et stykke fra midten av nettet, seekerne
 * starter i midten, stiller spørsmålene i `PLAN` om og om igjen, og reiser mot stasjonene som er igjen.
 */
export function simulateGame(data: GeoData, settings: Settings, seed: number): SimGame {
  const random = seeded(seed)
  const { stations } = data
  const start = nearestStation(stations, centroid(stations))
  const from = stationPos(start)
  const far = stations.map((s) => dist(stationPos(s), from))
  const max = Math.max(...far)
  const pool = stations.filter((_, i) => far[i] > 0.3 * max && far[i] < 0.75 * max)
  const hs = (pool.length ? pool : stations)[Math.floor(random() * (pool.length || stations.length))]
  const hp = stationPos(hs)
  const hider: DemoHider = { stationId: hs.id, name: hs.name, pos: [hp[0] + 0.001, hp[1] + 0.0006] }

  const seekFrom = 0
  const questions: Question[] = []
  const positions: LngLat[] = []
  const left: number[] = []
  let pos = from
  let remaining = solve([], data, settings).stations
  for (let i = 0, tries = 0; questions.length < MAX_QUESTIONS && remaining.length > 1 && tries < MAX_QUESTIONS * 3; tries++) {
    // Annethvert spørsmål reiser seekerne til stasjonen som ligger midt blant dem som er igjen.
    if (questions.length > 0 && questions.length % 2 === 0) pos = stationPos(nearestStation(remaining, centroid(remaining)))
    const body = PLAN[i++ % PLAN.length](pos, remaining, data)
    if (!body || !hasData(body as Question, data)) continue
    const time = seekFrom + (questions.length + 1) * STEP_MS
    const q = { ...body, id: `sim${questions.length}`, time, answer: null } as Question
    const a = autoAnswer(q, { pos: hider.pos, station: hs }, data)
    if (!a || a.answer === ANSWER_NULL) continue
    const answered = { ...q, answer: a.answer, answeredAt: time + 2 * 60000 } as Question
    const next = solve([...questions, answered], data, settings).stations
    // Et spørsmål som ikke utelukker noe, er bortkastet. Seekerne prøver et annet.
    if (next.length === remaining.length && questions.length > 0) continue
    questions.push(answered)
    positions.push(pos)
    left.push(next.length)
    remaining = next
    // Etter termometeret står seekerne der de reiste til.
    if (body.kind === 'thermometer') pos = body.to
  }
  return { city: city().id, hider, start: start.name, questions, positions, left, total: stations.length, seekFrom }
}

interface ShowcaseState {
  /** Byen som vises. null = ingen simulering. */
  city: string | null
  sim: SimGame | null
  /** 0 = før første spørsmål, 1..n = etter spørsmål n, n+1 = endgame og fasit. */
  step: number
  error: string
  /** Hvor mange steg som er regnet ut i bakgrunnen. Stegene etter dette tar litt tid første gang. */
  ready: number
  /** Et steg regnes ut akkurat nå. */
  busy: boolean
}
export const useShowcase = create<ShowcaseState>(() => ({ city: null, sim: null, step: 0, error: '', ready: 0, busy: false }))

/**
 * Går til et steg, men lar knappen vise at den laster før utregningen starter. Utregningen
 * går på samme tråd som skjermen, så uten pausen ville ingenting vises før den var ferdig.
 */
export function goToStep(step: number) {
  if (useShowcase.getState().busy) return
  useShowcase.setState({ busy: true })
  requestAnimationFrame(() =>
    setTimeout(() => {
      showStep(step)
      useShowcase.setState({ busy: false })
    }, 0),
  )
}

export const stepsOf = (sim: SimGame) => sim.questions.length + 2

/** Starter et simulert spill i en by. Det ekte spillet legges til side til det er ferdig. */
export function startShowcase(cityId: string) {
  enterSandbox('showcase', { ...blankGame({ city: cityId, lines: [], size: 'M', zoneRadius: 500 }), players: ['Seekerne', SIM_HIDER] })
  setTestMode({ on: true, pos: null, accuracy: 5 })
  useShowcase.setState({ city: cityId, sim: null, step: 0, error: '', ready: 0, busy: false })
  // Poenget er å se kartet krympe, så panelet skjules. Det kan dras opp igjen for å se loggen.
  useUi.setState({ collapsed: true })
}

export function stopShowcase() {
  useShowcase.setState({ city: null, sim: null, step: 0, error: '', ready: 0, busy: false })
  useUi.setState({ collapsed: false })
  endDemo()
}

/** Viser runden slik den sto etter steg `step`: spørsmålene så langt, hvor seekerne står, og endgame til slutt. */
export function showStep(step: number) {
  const { sim } = useShowcase.getState()
  if (!sim) return
  const n = sim.questions.length
  const k = Math.max(0, Math.min(step, n + 1))
  useShowcase.setState({ step: k })
  const g = useGame.getState()
  useGame.setState({
    questions: sim.questions.slice(0, Math.min(k, n)),
    mode: 'seeker',
    round: {
      ...g.round,
      hider: SIM_HIDER,
      seekFrom: sim.seekFrom,
      pause: null,
      endgame: k > n ? { stationId: sim.hider.stationId, time: sim.seekFrom + (n + 1) * STEP_MS } : null,
    },
  })
  // Der seekerne står etter steget: der de stilte spørsmålet, eller ved sluttpunktet etter et termometer, og ved hider i endgame.
  const q = k >= 1 && k <= n ? sim.questions[k - 1] : null
  setTestMode({ pos: k === 0 ? (sim.positions[0] ?? null) : k > n ? sim.hider.pos : q?.kind === 'thermometer' ? q.to : sim.positions[k - 1] })
}

/** Flytter tidene i et lagret spill så runden ser ut til å ha startet for en stund siden. */
export function rebase(sim: SimGame, now = Date.now()): SimGame {
  const shift = now - (sim.questions.length + 2) * STEP_MS - sim.seekFrom
  return {
    ...sim,
    seekFrom: sim.seekFrom + shift,
    questions: sim.questions.map((q) => ({ ...q, time: q.time + shift, answeredAt: q.answeredAt === undefined ? undefined : q.answeredAt + shift })),
  }
}

/** Henter det ferdige spillet for byen når kartdataene er lastet, og setter linjene byen har fra start. */
export function useShowcaseRunner(loaded: GeoData | null, data: GeoData | null) {
  const active = useDemo((s) => s.kind === 'showcase')
  const target = useShowcase((s) => s.city)
  const sim = useShowcase((s) => s.sim)
  const settings = useGame((s) => s.settings)
  useEffect(() => {
    if (!active || !target || !loaded || loaded.loading || city().id !== target) return
    if (!settings.lines.length) {
      useGame.setState({ settings: { ...settings, lines: linesOf(loaded, cityOf(target).defaultModes) } })
      return
    }
    if (sim) return
    let live = true
    fetch(`${import.meta.env.BASE_URL}data/${target}/${GAME_FILE}`)
      .then((r) => (r.ok ? (r.json() as Promise<SimGame>) : Promise.reject(new Error(String(r.status)))))
      .then((game) => {
        if (!live) return
        useShowcase.setState({ sim: rebase(game), error: '' })
        showStep(0)
      })
      .catch(() => live && useShowcase.setState({ error: 'Fant ikke det simulerte spillet for byen. Sjekk nettet og prøv igjen.' }))
    return () => {
      live = false
    }
  }, [active, target, loaded, sim, settings])

  // Regner ut kartet for alle stegene i bakgrunnen mens brukeren leser det første. Utregningen huskes
  // (se `solve`), så «Neste» og «Forrige» går med en gang etterpå.
  useEffect(() => {
    if (!active || !sim || !data || data.loading || !settings.lines.length) return
    let k = 0
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      if (++k > sim.questions.length) return
      excluded(solve(sim.questions.slice(0, k), data, useGame.getState().settings).area)
      useShowcase.setState({ ready: k })
      timer = setTimeout(next, PREWARM_GAP_MS)
    }
    timer = setTimeout(next, PREWARM_GAP_MS)
    return () => clearTimeout(timer)
  }, [active, sim, data, settings.lines])
}
/** Pause mellom hvert steg som regnes ut i bakgrunnen, så telefonen svarer på trykk imens. */
const PREWARM_GAP_MS = 30
