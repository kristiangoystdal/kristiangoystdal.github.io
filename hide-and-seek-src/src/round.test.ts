import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { movedAt } from './clock'
import { solve, stationPos } from './geo'
import { DEFAULT_SETTINGS, useGame } from './store'
import type { GeoData, QuestionBody, Settings, Station } from './types'

// En hel runde gjennom appens lagring, fra start til hider er funnet, slik knappene i appen gjør det.

const raw = JSON.parse(readFileSync('public/data/oslo/stations.json', 'utf8'))
const METRO = ['1', '2', '3', '4', '5']
const stations: Station[] = raw.stations.filter((s: Station) => s.lines.some((l) => METRO.includes(l)))
const station = (name: string) => stations.find((s) => s.name === name)!
const data: GeoData = { stations, lines: { type: 'FeatureCollection', features: [] }, admin: [], shapes: {}, islands: [], poi: {} }
const settings: Settings = { ...DEFAULT_SETTINGS, city: 'oslo', zoneRadius: 500, lines: METRO, playArea: null }

const MIN = 60000
const T0 = new Date('2026-06-01T10:00:00Z').getTime()
const g = () => useGame.getState()
const radar = (name: string, radiusM: number): QuestionBody => ({ kind: 'radar', center: stationPos(station(name)), radiusM })
const last = () => g().questions.at(-1)!
const left = () => solve(g().questions, data, settings, g().round.endgame ?? null, movedAt(g().round)).stations.map((s) => s.name)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  useGame.setState(useGame.getInitialState(), true)
  useGame.setState({ settings })
})
afterEach(() => vi.useRealTimers())

describe('en hel runde', () => {
  it('fra start til funnet: spørsmål, svar for hånd, svar tatt ut, pause, Move, endgame og arkiv', () => {
    for (const p of ['Ada', 'Bo', 'Cy']) g().addPlayer(p)
    g().setRound({ hider: 'Ada', hidingMinutes: 30 })
    g().startRound()
    expect(g().round.seekFrom).toBe(T0 + 30 * MIN)

    // Gjemmetiden: Move kan ikke spilles før letingen har startet.
    g().playMove(null)
    expect(g().round.moves).toEqual([])
    // Spilloppsettet er låst mens runden pågår.
    g().setSettings({ zoneRadius: 900 })
    expect(g().settings.zoneRadius).toBe(500)

    vi.advanceTimersByTime(31 * MIN)

    // 1: radar, hider svarer for hånd (GPS-en var usikker).
    g().saveQuestion(radar('Majorstuen', 3000), null)
    const q1 = last().id
    g().answerQuestion(q1, 'in', undefined, true)
    expect(last()).toMatchObject({ answer: 'in', manual: true })
    const afterQ1 = left()
    expect(afterQ1.length).toBeLessThan(stations.length)
    expect(afterQ1).toContain('Majorstuen')

    // 2: feil svar. Seekerne tar det ut, angrer, og tar det ut igjen.
    vi.advanceTimersByTime(5 * MIN)
    g().saveQuestion(radar('Majorstuen', 1000), null)
    const q2 = last().id
    g().answerQuestion(q2, 'out')
    expect(left()).not.toContain('Majorstuen')
    g().toggleIgnored(q2)
    expect(left()).toEqual(afterQ1)
    g().undo()
    expect(left()).not.toContain('Majorstuen')
    g().toggleIgnored(q2)
    expect(left()).toEqual(afterQ1)

    // 3: spørsmål står ubesvart under en pause. Svartiden forlenges med pausen.
    vi.advanceTimersByTime(MIN)
    g().saveQuestion(radar('Nationaltheatret', 2000), null)
    const q3 = last().id
    g().pauseGame('pause')
    // Move kan ikke spilles mens spillet står.
    g().playMove(null)
    expect(g().round.moves).toEqual([])
    vi.advanceTimersByTime(7 * MIN)
    g().resumeGame()
    expect(g().questions.find((q) => q.id === q3)!.extraMs).toBe(7 * MIN)
    expect(g().questions.find((q) => q.id === q1)!.extraMs).toBeUndefined()
    expect(g().round.stoppedMs).toBe(7 * MIN)
    g().answerQuestion(q3, 'in')

    // Hider endrer svaret på 2 etter at seekerne tok det ut: det nye svaret gjelder igjen.
    g().answerQuestion(q2, 'in')
    expect(g().questions.find((q) => q.id === q2)).toMatchObject({ answer: 'in', ignored: undefined, manual: undefined })
    expect(g().questions.find((q) => q.id === q2)!.history?.map((h) => h.answer)).toEqual(['out'])

    // Move: klokkene står i gjemmetiden, og bare spørsmål etter flyttingen krymper kartet.
    vi.advanceTimersByTime(2 * MIN)
    const beforeMove = left()
    g().playMove(station('Majorstuen').id)
    expect(g().round.pause).toMatchObject({ kind: 'move', until: Date.now() + 30 * MIN })
    expect(left().length).toBe(stations.length)
    expect(left().length).toBeGreaterThan(beforeMove.length)
    // Noen trykker fortsett lenge etter: pausen teller bare til sluttiden.
    vi.advanceTimersByTime(45 * MIN)
    const stopped = g().round.stoppedMs!
    g().resumeGame()
    expect(g().round.stoppedMs).toBe(stopped + 30 * MIN)

    // 4: etter Move.
    g().saveQuestion(radar('Majorstuen', 1500), null)
    const q4 = last().id
    g().answerQuestion(q4, 'in')
    expect(left()).toContain('Majorstuen')

    // Endgame ved Majorstuen. Spørsmål 4 fra før kan velges inn, et svar som er tatt ut kan ikke skjære sonen.
    g().setRound({ endgame: { stationId: station('Majorstuen').id, time: Date.now() } })
    expect(left()).toEqual(['Majorstuen'])
    g().toggleEndgameCut(q4)
    expect(g().round.endgame!.include).toEqual([q4])
    g().toggleIgnored(q4)
    const zone = solve(g().questions, data, settings, g().round.endgame!, movedAt(g().round)).area
    g().toggleIgnored(q4)
    const cut = solve(g().questions, data, settings, g().round.endgame!, movedAt(g().round)).area
    expect(JSON.stringify(zone)).not.toBe(JSON.stringify(cut))
    g().toggleIgnored(q4)

    // Funnet.
    vi.advanceTimersByTime(10 * MIN)
    g().finishRound(3600.4)
    const [result] = g().results
    expect(result).toMatchObject({ hider: 'Ada', seconds: 3600, bonusMinutes: 0 })
    // Alle fire er stilt, også det som er tatt ut av kartet.
    expect(result.stats).toMatchObject({ asked: 4, moves: 1, randomized: 0, vetoes: 0 })
    expect(g().archive).toHaveLength(1)
    const arch = g().archive[0]
    expect(arch).toMatchObject({ outcome: 'found', hider: 'Ada', nth: 1, seconds: 3600 })
    expect(arch.questions.map((q) => [q.manual ?? false, q.ignored ?? false])).toEqual([
      [true, false],
      [false, false],
      [false, false],
      [false, true],
    ])
    // Neste hider, planleggingstid, og runden er ferdig.
    expect(g().round).toMatchObject({ hider: 'Bo', seekFrom: null, endgame: null, pause: null, moves: [] })
    expect(g().round.planUntil).toBe(Date.now() + 10 * MIN)

    // Neste runde starter med tom logg. Forrige logg kan angres tilbake.
    g().startRound()
    expect(g().questions).toEqual([])
    expect(g().round.hider).toBe('Bo')
    g().undo()
    expect(g().questions).toHaveLength(4)
  })

  it('en avbrutt runde uten spørsmål arkiveres ikke, en med spørsmål gjør det', () => {
    g().setRound({ hider: 'Ada' })
    g().startRound()
    g().cancelRound()
    expect(g().archive).toEqual([])
    g().startRound()
    vi.advanceTimersByTime(61 * MIN)
    g().saveQuestion(radar('Majorstuen', 1000), null)
    g().answerQuestion(last().id, 'in', undefined, true)
    g().toggleIgnored(last().id)
    g().cancelRound('ABC234')
    expect(g().archive).toHaveLength(1)
    expect(g().archive[0]).toMatchObject({ outcome: 'cancelled', seconds: null, room: 'ABC234' })
    expect(g().archive[0].questions[0]).toMatchObject({ manual: true, ignored: true })
    expect(g().results).toEqual([])
  })

  it('siste spiller i rekken gir hider-rollen videre til den første', () => {
    for (const p of ['Ada', 'Bo']) g().addPlayer(p)
    g().setRound({ hider: 'Bo' })
    g().startRound()
    g().finishRound(100)
    expect(g().round.hider).toBe('Ada')
  })

  it('en hider som ikke er i spillerlisten beholder rollen', () => {
    g().addPlayer('Ada')
    g().setRound({ hider: 'Gjest' })
    g().startRound()
    g().finishRound(100)
    expect(g().round.hider).toBe('Gjest')
  })
})
