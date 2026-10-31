import type { Round } from './clock'
import { tr } from './lang'
import type { Settings } from './types'

/**
 * Endringer i reglene midt i en runde (issue #4). Én side foreslår, den andre godtar.
 * Hider og minst én seeker må ha sagt ja. Sone og spørsmålsutvalg gjelder hele loggen,
 * så kartet regnes ut på nytt fra første spørsmål.
 */

/** Det som kan endres under runden. Bare det som endres, er med. */
export interface Change {
  zoneRadius?: number
  hidingMinutes?: number
  /** Spørsmålsutvalget. null = standard for spillstørrelsen. */
  questions?: string[] | null
}

export type Side = 'hider' | 'seeker'

export interface Proposal {
  id: string
  at: number
  change: Change
  /** Telefonen som foreslo. */
  by: string
  /** Sidene som har sagt ja, med telefonen som gjorde det. */
  ok: Partial<Record<Side, string>>
}

/** En endring som er gjort, slik den huskes i runden. Spørsmålsutvalget lagres som antall, så runden holder seg liten. */
export interface Changed {
  at: number
  zoneRadius?: [number, number]
  hidingMinutes?: [number, number]
  questions?: [number, number]
}

type Rules = Pick<Settings, 'zoneRadius' | 'questions'>

/** Bare det som faktisk er ulikt det som gjelder nå. */
export function onlyDifferent(change: Change, settings: Rules, round: Pick<Round, 'hidingMinutes'>): Change {
  const out: Change = {}
  if (change.zoneRadius !== undefined && change.zoneRadius !== settings.zoneRadius) out.zoneRadius = change.zoneRadius
  if (change.hidingMinutes !== undefined && change.hidingMinutes !== round.hidingMinutes) out.hidingMinutes = change.hidingMinutes
  if (change.questions !== undefined && !sameList(change.questions, settings.questions ?? null)) out.questions = change.questions
  return out
}
const sameList = (a: string[] | null, b: string[] | null) => (a === null || b === null ? a === b : a.length === b.length && [...a].sort().join() === [...b].sort().join())

export const isEmpty = (c: Change) => c.zoneRadius === undefined && c.hidingMinutes === undefined && c.questions === undefined

/** Har begge sider sagt ja? */
export const agreed = (p: Proposal) => !!p.ok.hider && !!p.ok.seeker

/**
 * Gjør endringen. Er gjemmetiden ikke over, flyttes starten på letingen like mye som gjemmetiden endres,
 * men aldri bakover forbi nå. Etter at letingen har startet, gjelder ny gjemmetid bare Move resten av runden.
 * `enabled`: hvor mange spørsmål som er med før og etter, til loggen.
 */
export function applyChange(
  change: Change,
  settings: Settings,
  round: Round,
  now: number,
  enabled: { before: number; after: number },
): { settings: Settings; round: Round } {
  const nextSettings = { ...settings }
  const nextRound = { ...round }
  const log: Changed = { at: now }
  if (change.zoneRadius !== undefined) {
    log.zoneRadius = [settings.zoneRadius, change.zoneRadius]
    nextSettings.zoneRadius = change.zoneRadius
  }
  if (change.questions !== undefined) {
    log.questions = [enabled.before, enabled.after]
    nextSettings.questions = change.questions
  }
  if (change.hidingMinutes !== undefined) {
    log.hidingMinutes = [round.hidingMinutes, change.hidingMinutes]
    nextRound.hidingMinutes = change.hidingMinutes
    // Mens spillet står, regnes «nå» som da pausen startet, som resten av klokken.
    const t = round.pause ? Math.min(now, round.pause.at) : now
    if (round.seekFrom !== null && t < round.seekFrom) nextRound.seekFrom = Math.max(t, round.seekFrom + (change.hidingMinutes - round.hidingMinutes) * 60000)
  }
  nextRound.changes = [...(round.changes ?? []), log]
  return { settings: nextSettings, round: nextRound }
}

/** Endringen som tekst: «sone 400 → 600 m, gjemmetid 60 → 45 min». */
export function changeText(c: Changed): string {
  const parts: string[] = []
  if (c.zoneRadius) parts.push(tr(`sone ${c.zoneRadius[0]} → ${c.zoneRadius[1]} m`, `zone ${c.zoneRadius[0]} → ${c.zoneRadius[1]} m`))
  if (c.hidingMinutes) parts.push(tr(`gjemmetid ${c.hidingMinutes[0]} → ${c.hidingMinutes[1]} min`, `hiding time ${c.hidingMinutes[0]} → ${c.hidingMinutes[1]} min`))
  if (c.questions) parts.push(tr(`spørsmål ${c.questions[0]} → ${c.questions[1]}`, `questions ${c.questions[0]} → ${c.questions[1]}`))
  return parts.join(', ')
}

/** Det som venter på svar fra den andre siden, eller null når begge har sagt ja. */
export const waitingFor = (p: Proposal): Side | null => (!p.ok.hider ? 'hider' : !p.ok.seeker ? 'seeker' : null)

/** Forslaget som tekst, med de nye verdiene: «sone 600 m, gjemmetid 45 min». */
export function proposalText(c: Change): string {
  const parts: string[] = []
  if (c.zoneRadius !== undefined) parts.push(tr(`sone ${c.zoneRadius} m`, `zone ${c.zoneRadius} m`))
  if (c.hidingMinutes !== undefined) parts.push(tr(`gjemmetid ${c.hidingMinutes} min`, `hiding time ${c.hidingMinutes} min`))
  if (c.questions !== undefined) parts.push(c.questions === null ? tr('standard spørsmålsutvalg', 'standard question selection') : tr(`${c.questions.length} spørsmål med`, `${c.questions.length} questions in play`))
  return parts.join(', ')
}

/** Siden til telefonen. */
export const sideOf = (mode: 'hider' | 'seeker'): Side => mode
