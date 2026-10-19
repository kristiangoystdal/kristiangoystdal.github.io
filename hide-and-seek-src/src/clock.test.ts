import { describe, expect, it } from 'vitest'
import { gameNow, hiderSeconds, overtimeMs, resume, roundStats, type Round } from './clock'
import type { Question } from './types'

const MIN = 60000
const round = (patch: Partial<Round> = {}): Round => ({ hidingMinutes: 60, hider: 'Ada', seekFrom: 0, ...patch })
const radar = (time: number, patch: Partial<Question> = {}): Question => ({ id: `q${time}`, time, answer: null, kind: 'radar', center: [10.7, 59.9], radiusM: 1000, ...patch }) as Question

describe('klokken', () => {
  it('teller tiden fra gjemmetiden er over', () => {
    expect(hiderSeconds(round(), [], 'M', 10 * MIN)).toBe(600)
    expect(hiderSeconds(round({ seekFrom: null }), [], 'M', 10 * MIN)).toBe(0)
  })

  it('står stille mens et spørsmål er ubesvart etter svartiden, og starter igjen når svaret kommer', () => {
    const open = radar(10 * MIN)
    expect(overtimeMs(open, 'M', 14 * MIN)).toBe(0)
    expect(overtimeMs(open, 'M', 18 * MIN)).toBe(3 * MIN)
    // Svartiden gikk ut etter 15 min, så klokken viser 15 min helt til svaret kommer.
    expect(hiderSeconds(round(), [open], 'M', 18 * MIN)).toBe(15 * 60)
    const late = radar(10 * MIN, { answer: 'in', answeredAt: 18 * MIN })
    expect(hiderSeconds(round(), [late], 'M', 30 * MIN)).toBe(27 * 60)
  })

  it('bilder har lengre svartid, og svar i tide koster ingenting', () => {
    const photo = radar(0, { kind: 'photo', text: 'Et tre', answer: 'Bilde sendt', answeredAt: 9 * MIN } as Partial<Question>)
    expect(overtimeMs(photo, 'M', 60 * MIN)).toBe(0)
    expect(overtimeMs({ ...photo, answeredAt: 25 * MIN }, 'L', 60 * MIN)).toBe(5 * MIN)
  })

  it('pause stopper alle klokker, og ubesvarte spørsmål får svartiden forlenget', () => {
    const paused = round({ pause: { at: 20 * MIN, kind: 'pause' } })
    const open = radar(18 * MIN)
    expect(gameNow(paused, 50 * MIN)).toBe(20 * MIN)
    expect(hiderSeconds(paused, [open], 'M', 50 * MIN)).toBe(20 * 60)

    const after = resume(paused, [open], 50 * MIN)
    expect(after.round).toMatchObject({ pause: null, stoppedMs: 30 * MIN })
    expect(after.questions[0].extraMs).toBe(30 * MIN)
    // To minutter etter pausen er det fortsatt tid igjen å svare på.
    expect(overtimeMs(after.questions[0], 'M', 52 * MIN)).toBe(0)
    expect(hiderSeconds(after.round, after.questions, 'M', 52 * MIN)).toBe(22 * 60)
  })

  it('pause i gjemmetiden skyver starten på letingen', () => {
    const paused = round({ seekFrom: 60 * MIN, pause: { at: 10 * MIN, kind: 'rest' } })
    expect(resume(paused, [], 25 * MIN).round).toMatchObject({ seekFrom: 75 * MIN, pause: null })
  })

  it('Move står bare til sluttiden, selv om noen trykker fortsett senere', () => {
    const moving = round({ pause: { at: 20 * MIN, kind: 'move', until: 80 * MIN }, moves: [{ at: 20 * MIN, from: null }] })
    const after = resume(moving, [], 95 * MIN)
    expect(after.round).toMatchObject({ pause: null, stoppedMs: 60 * MIN })
    expect(hiderSeconds(after.round, [], 'M', 95 * MIN)).toBe(35 * 60)
    // Hider er fremme før tiden er ute.
    expect(resume(moving, [], 50 * MIN).round.stoppedMs).toBe(30 * MIN)
  })
})

describe('rundestatistikk', () => {
  it('teller spørsmål per kategori, kort, sene svar og endgame', () => {
    const qs = [
      radar(0, { answer: 'in', answeredAt: 2 * MIN }),
      radar(10 * MIN, { answer: 'veto', answeredAt: 11 * MIN }),
      radar(20 * MIN, { answer: 'random', answeredAt: 21 * MIN }),
      radar(30 * MIN, { answer: 'out', answeredAt: 38 * MIN }),
      radar(40 * MIN),
    ]
    const s = roundStats(round({ endgame: { stationId: 'x', time: 50 * MIN }, moves: [{ at: 5 * MIN, from: null }] }), qs, 'M', 55 * MIN)
    expect(s.asked).toBe(3)
    expect(s.byCategory).toEqual({ Radar: 3 })
    expect(s.vetoes).toBe(1)
    expect(s.randomized).toBe(1)
    expect(s.late).toBe(1)
    expect(s.answerSec).toBe(((2 + 1 + 1 + 8) * 60) / 4)
    expect(s.endgameSec).toBe(5 * 60)
    expect(s.moves).toBe(1)
  })

  it('regner pausen frem til nå mens spillet står', () => {
    const s = roundStats(round({ stoppedMs: MIN, pause: { at: 10 * MIN, kind: 'pause' } }), [], 'M', 13 * MIN)
    expect(s.pausedSec).toBe(4 * 60)
    expect(s.endgameSec).toBeNull()
    expect(s.answerSec).toBeNull()
  })
})
