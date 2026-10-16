import { describe, expect, it } from 'vitest'
import { gameNow, hiderSeconds, overtimeMs, resume, type Round } from './clock'
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
