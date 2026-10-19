import { categoryOf, responseMinutes } from './form'
import { ANSWER_RANDOM, ANSWER_VETO, type Endgame } from './geo'
import type { GameSize, Question, RoundStats } from './types'

/** Hvorfor klokkene står: vanlig pause, avtalt hvileperiode, eller hider som har spilt Move. */
export type PauseKind = 'pause' | 'rest' | 'move'

export interface Pause {
  at: number
  kind: PauseKind
  /** Pausen slutter av seg selv på dette tidspunktet. Brukes av Move. */
  until?: number
}

/** Hider spilte Move ved `at`, og oppga stasjonen sin da. */
export interface Move {
  at: number
  from: string | null
}

export interface Round {
  hidingMinutes: number
  hider: string
  /** Tidspunktet gjemmetiden er over og letingen starter. null = ingen runde i gang. */
  seekFrom: number | null
  /** Satt når seekerne har startet endgame ved en stasjon. */
  endgame?: Endgame | null
  /** Satt mens alle klokker står stille. */
  pause?: Pause | null
  /** Samlet tid klokken har stått stille under letingen, i ms. */
  stoppedMs?: number
  /** Neste hider har planleggingstid til dette tidspunktet. */
  planUntil?: number | null
  /** Hver gang hider har spilt Move denne runden. Spørsmål stilt før siste Move krymper ikke kartet. */
  moves?: Move[]
  /** Drained Brain: spørsmålene (id i ITEMS) som ikke kan stilles resten av runden. */
  drained?: string[]
  /** Spotty Memory: kategorien som er slått ut. */
  spotty?: string | null
}

export const PLANNING_MINUTES = 10

/** Når hider sist spilte Move, eller 0. Spørsmål fra før dette sier ingenting om den nye sonen. */
export const movedAt = (round: Pick<Round, 'moves'>) => round.moves?.at(-1)?.at ?? 0

/** Tiden klokkene viser. Den står stille mens spillet er på pause. */
export const gameNow = (round: Pick<Round, 'pause'>, now: number) => (round.pause ? Math.min(now, round.pause.at) : now)

/** Når svartiden på et spørsmål går ut. */
export const deadline = (q: Question, size: GameSize) => q.time + responseMinutes(q, size) * 60000 + (q.extraMs ?? 0)

/** Hvor lenge spørsmålet har ligget, eller lå, ubesvart etter at svartiden gikk ut. */
export function overtimeMs(q: Question, size: GameSize, now: number) {
  // Svar fra før svartidspunktet ble lagret regnes som gitt i tide.
  const end = q.answer === null ? now : (q.answeredAt ?? q.time)
  return Math.max(0, end - deadline(q, size))
}

/**
 * Tiden hider har holdt seg skjult, i sekunder. Klokken står mens spillet er på
 * pause, og mens et spørsmål ligger ubesvart etter at svartiden er ute.
 */
export function hiderSeconds(round: Round, questions: Question[], size: GameSize, now: number) {
  if (round.seekFrom === null) return 0
  const t = gameNow(round, now)
  const late = questions.filter((q) => q.time >= round.seekFrom!).reduce((sum, q) => sum + overtimeMs(q, size, t), 0)
  return Math.max(0, (t - round.seekFrom - (round.stoppedMs ?? 0) - late) / 1000)
}

/** Står hiders klokke fordi et spørsmål er ubesvart etter svartiden? */
export const waitingForAnswer = (questions: Question[], size: GameSize, now: number) => questions.some((q) => q.answer === null && overtimeMs(q, size, now) > 0)

/**
 * Starter klokkene igjen. Pausen legges til gjemmetiden hvis den ikke var over,
 * ellers trekkes den fra hiders tid. Ubesvarte spørsmål får svartiden forlenget.
 */
export function resume(round: Round, questions: Question[], now: number): { round: Round; questions: Question[] } {
  const { pause, seekFrom } = round
  if (!pause) return { round, questions }
  // En pause med sluttid regnes bare frem til sluttiden, uansett når noen trykker fortsett.
  const ms = Math.max(0, Math.min(now, pause.until ?? now) - pause.at)
  const hiding = seekFrom !== null && pause.at < seekFrom
  return {
    round: {
      ...round,
      pause: null,
      ...(hiding ? { seekFrom: seekFrom + ms } : { stoppedMs: (round.stoppedMs ?? 0) + ms }),
    },
    questions: questions.map((q) => (q.answer === null ? { ...q, extraMs: (q.extraMs ?? 0) + ms } : q)),
  }
}

/** Hva som har skjedd i runden så langt. Lagres med resultatet når hider er funnet. */
export function roundStats(round: Round, questions: Question[], size: GameSize, now: number): RoundStats {
  const t = gameNow(round, now)
  const answered = questions.filter((q) => q.answer !== null)
  const asked = answered.filter((q) => q.answer !== ANSWER_RANDOM)
  const byCategory: Record<string, number> = {}
  for (const q of asked) byCategory[categoryOf(q)] = (byCategory[categoryOf(q)] ?? 0) + 1
  const waits = answered.map((q) => Math.max(0, (q.answeredAt ?? q.time) - q.time - (q.extraMs ?? 0)))
  const paused = (round.stoppedMs ?? 0) + (round.pause && round.seekFrom !== null && round.pause.at >= round.seekFrom ? Math.min(now, round.pause.until ?? now) - round.pause.at : 0)
  return {
    asked: asked.length,
    byCategory,
    vetoes: answered.filter((q) => q.answer === ANSWER_VETO).length,
    randomized: answered.filter((q) => q.answer === ANSWER_RANDOM).length,
    late: answered.filter((q) => overtimeMs(q, size, t) > 0).length,
    answerSec: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length / 1000) : null,
    hidingMinutes: round.hidingMinutes,
    endgameSec: round.endgame ? Math.max(0, Math.round((t - round.endgame.time) / 1000)) : null,
    moves: round.moves?.length ?? 0,
    pausedSec: Math.round(paused / 1000),
  }
}
