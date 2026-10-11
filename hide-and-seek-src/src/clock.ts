import { responseMinutes } from './form'
import type { Endgame } from './geo'
import type { GameSize, Question } from './types'

/** Hvorfor klokkene står: vanlig pause eller avtalt hvileperiode. */
export type PauseKind = 'pause' | 'rest'

export interface Pause {
  at: number
  kind: PauseKind
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
}

export const PLANNING_MINUTES = 10

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
  const ms = Math.max(0, now - pause.at)
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
