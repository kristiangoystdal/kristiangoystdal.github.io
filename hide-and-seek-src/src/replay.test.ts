import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { stationPos } from './geo'
import { buildNet, checkpoints, frameAt, holdFor, paceText, pendingAt, posAt, prepare, questionsAt, replayTracks, route, speedAt, timeline } from './replay'
import type { ArchivedRound } from './store'
import type { GeoData, LngLat, Question, Settings, Station } from './types'

const stations: Station[] = JSON.parse(readFileSync('public/data/oslo/stations.json', 'utf8')).stations
const byName = (name: string) => stations.find((s) => s.name === name)!
const pos = (name: string) => stationPos(byName(name))
const lines = JSON.parse(readFileSync('public/data/oslo/lines.geojson', 'utf8'))
const data: GeoData = { stations, lines: { type: 'FeatureCollection', features: [] }, admin: [], shapes: {}, islands: [], poi: {} }
const withLines: GeoData = { ...data, lines }
const settings: Settings = { city: 'oslo', zoneRadius: 500, lines: ['1', '2', '3', '4', '5'], day: 'wk', hourFrom: 10, hourTo: 18, adminLevel: 'bydel', theme: 'auto', basemap: 'clean', size: 'M', playArea: null }

const MIN = 60000
const T0 = Date.UTC(2026, 9, 24, 10)
const seekFrom = T0 + 45 * MIN
const radar = (id: string, at: number, center: LngLat, radiusM: number, answer: string | null, answerAfter = 3): Question => ({
  id,
  time: seekFrom + at * MIN,
  answeredAt: answer === null ? undefined : seekFrom + (at + answerAfter) * MIN,
  answer,
  kind: 'radar',
  center,
  radiusM,
})

// Hider ved Blindern. Seekerne starter sentralt og går nordover.
const round: ArchivedRound = {
  id: 'test',
  room: null,
  hider: 'Kari',
  nth: 1,
  endedAt: seekFrom + 80 * MIN,
  outcome: 'found',
  seconds: 80 * 60,
  round: { hidingMinutes: 45, hider: 'Kari', seekFrom, endgame: { stationId: byName('Blindern').id, time: seekFrom + 60 * MIN } },
  questions: [
    radar('a', 5, pos('Jernbanetorget'), 3000, 'out'),
    radar('b', 20, pos('Majorstuen'), 2000, 'in'),
    radar('c', 40, pos('Forskningsparken'), 1000, 'in'),
    radar('d', 70, pos('Blindern'), 300, null),
  ],
  setup: { city: 'oslo', size: 'M', questions: null, zoneRadius: 500, lines: settings.lines, playArea: null },
  stats: { asked: 3, byCategory: { Radar: 3 }, vetoes: 0, randomized: 0, late: 0, answerSec: 180, hidingMinutes: 45, endgameSec: 1200, moves: 0, pausedSec: 0 },
}

describe('tidslinjen', () => {
  const tl = timeline(round, data)

  it('starter når gjemmetiden starter og slutter når runden er over', () => {
    expect(tl.start).toBe(T0)
    expect(tl.end).toBe(round.endedAt)
    expect(tl.beats[0].kind).toBe('start')
    expect(tl.beats.at(-1)!.kind).toBe('end')
  })

  it('har hendelsene i rekkefølge, med spørsmål og svar for seg', () => {
    expect(tl.beats.map((b) => b.kind)).toEqual(['start', 'seek', 'ask', 'answer', 'ask', 'answer', 'ask', 'answer', 'endgame', 'ask', 'end'])
    for (let i = 1; i < tl.beats.length; i++) expect(tl.beats[i].t).toBeGreaterThanOrEqual(tl.beats[i - 1].t)
  })

  it('fordeler videoen sammenhengende, og står stille på hendelsene', () => {
    for (let i = 1; i < tl.segments.length; i++) expect(tl.segments[i].v0).toBeCloseTo(tl.segments[i - 1].v1)
    expect(tl.duration).toBeGreaterThan(30)
    expect(tl.duration).toBeLessThan(90)
    const hold = tl.segments.find((s) => s.beat?.kind === 'answer')!
    expect(frameAt(tl, (hold.v0 + hold.v1) / 2).t).toBe(hold.t0)
    expect(frameAt(tl, 0).t).toBe(tl.start)
    expect(frameAt(tl, tl.duration).t).toBe(tl.end)
  })

  it('står lenge nok på et spørsmål til at teksten rekker å leses', () => {
    const ask = tl.beats.find((b) => b.kind === 'ask')!
    const seek = tl.beats.find((b) => b.kind === 'seek')!
    expect(holdFor(round, data, ask)).toBeGreaterThan(4)
    expect(holdFor(round, data, ask)).toBeGreaterThan(holdFor(round, data, seek))
  })

  it('står stille på hendelsene, og går fortest midt mellom dem', () => {
    const hold = tl.segments.find((s) => s.beat)!
    expect(speedAt(tl, (hold.v0 + hold.v1) / 2)).toBe(0)
    const travel = tl.segments.find((s) => !s.beat && s.t1 - s.t0 > 10 * MIN)!
    const at = (p: number) => speedAt(tl, travel.v0 + (travel.v1 - travel.v0) * p)
    expect(at(0.5)).toBeGreaterThan(at(0.1))
    expect(at(0.5)).toBeGreaterThan(at(0.9))
  })

  it('går 1 min per sekund mens et spørsmål venter på svar, og fortere ellers', () => {
    const waiting = tl.segments.find((s) => s.active)!
    expect(waiting.t0).toBe(seekFrom + 5 * MIN)
    expect(speedAt(tl, (waiting.v0 + waiting.v1) / 2)).toBe(60)
    expect(pendingAt(tl, seekFrom + 6 * MIN)?.q.id).toBe('a')
    expect(pendingAt(tl, seekFrom + 10 * MIN)).toBeUndefined()
    // Fra svaret på første spørsmål til neste spørsmål (12 min) skjer det ingenting.
    const idle = tl.segments.find((s) => !s.beat && !s.active && s.t0 === seekFrom + 8 * MIN)!
    expect(idle.v1 - idle.v0).toBeLessThan(12)
    expect(speedAt(tl, (idle.v0 + idle.v1) / 2)).toBeGreaterThan(60)
  })

  it('viser farten som tekst', () => {
    expect(paceText(0)).toBe('⏸ Klokka står')
    expect(paceText(60)).toBe('▶ 1 s = 1 min')
    expect(paceText(450)).toBe('⏩ 1 s = 7,5 min')
  })

  it('går fremover i tid gjennom hele videoen', () => {
    let last = -Infinity
    for (let v = 0; v <= tl.duration; v += 0.1) {
      const { t } = frameAt(tl, v)
      expect(t).toBeGreaterThanOrEqual(last)
      last = t
    }
  })
})

describe('kartet underveis', () => {
  it('teller bare svar som var kommet', () => {
    const qs = questionsAt(round.questions, seekFrom + 21 * MIN)
    expect(qs.map((q) => q.answer)).toEqual(['out', null])
  })

  it('krymper for hvert svar og ender på hiders stasjon', () => {
    const tl = timeline(round, data)
    const counts = checkpoints(round, data, settings, tl).map((c) => c.result.stations.length)
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
    expect(counts[0]).toBe(stations.length)
    expect(counts.at(-1)).toBe(1)
  })
})

describe('posisjonene', () => {
  const r = prepare(round, data, settings)
  const tracks = replayTracks(round, data, r.cps.at(-1)!.result)

  it('lar seekerne vente på svaret og så reise videre til neste sted', () => {
    const s = tracks.seekers
    expect(posAt(s, seekFrom)).toBeNull()
    expect(posAt(s, seekFrom + 5 * MIN)).toEqual(pos('Jernbanetorget'))
    // Svaret kom etter 3 minutter. Så langt står de stille.
    expect(posAt(s, seekFrom + 7.5 * MIN)).toEqual(pos('Jernbanetorget'))
    const mid = posAt(s, seekFrom + 14 * MIN)!
    const [a, b] = [pos('Jernbanetorget'), pos('Majorstuen')]
    expect(mid[0]).toBeCloseTo((a[0] + b[0]) / 2, 6)
    expect(posAt(s, round.endedAt)).toEqual(pos('Blindern'))
  })

  it('setter hider på endgame-stasjonen fra letingen starter', () => {
    expect(posAt(tracks.hider, seekFrom - MIN)).toBeNull()
    expect(posAt(tracks.hider, seekFrom + 30 * MIN)).toEqual(pos('Blindern'))
  })

  it('følger hider fra stasjon til stasjon ved Move', () => {
    const moved: ArchivedRound = { ...round, round: { ...round.round, moves: [{ at: seekFrom + 30 * MIN, from: byName('Tøyen').id }] } }
    const t = replayTracks(moved, data, r.cps.at(-1)!.result).hider
    expect(posAt(t, seekFrom + 10 * MIN)).toEqual(pos('Tøyen'))
    expect(posAt(t, seekFrom + 30 * MIN + 45 * MIN)).toEqual(pos('Blindern'))
    const between = posAt(t, seekFrom + 50 * MIN)!
    expect(between).not.toEqual(pos('Tøyen'))
    expect(between).not.toEqual(pos('Blindern'))
  })
})

describe('T-banen', () => {
  const net = buildNet(withLines, settings.lines)

  it('følger linjen fra stasjon til stasjon', () => {
    const path = route(net, pos('Jernbanetorget'), pos('Blindern'))
    expect(path[0]).toEqual(pos('Jernbanetorget'))
    expect(path.at(-1)).toEqual(pos('Blindern'))
    // Linjen går via Majorstuen, så veien går gjennom stasjonen, ikke rett over byen.
    const nearMajorstuen = Math.min(...path.map((p) => Math.hypot(p[0] - pos('Majorstuen')[0], p[1] - pos('Majorstuen')[1])))
    expect(nearMajorstuen).toBeLessThan(0.0005)
    expect(path.length).toBeGreaterThan(10)
  })

  it('går til fots når neste sted er nær', () => {
    expect(route(net, pos('Blindern'), [pos('Blindern')[0] + 0.003, pos('Blindern')[1]])).toHaveLength(2)
  })

  it('lar seekerne i videoen kjøre langs linjen', () => {
    const tracks = replayTracks(round, withLines, prepare(round, withLines, settings).cps.at(-1)!.result)
    // Midt mellom Jernbanetorget og Majorstuen er de på sporet, under Nationaltheatret-strekningen.
    const mid = posAt(tracks.seekers, seekFrom + 14 * MIN)!
    const straight = [(pos('Jernbanetorget')[0] + pos('Majorstuen')[0]) / 2, (pos('Jernbanetorget')[1] + pos('Majorstuen')[1]) / 2]
    expect(Math.hypot(mid[0] - straight[0], mid[1] - straight[1])).toBeGreaterThan(0.001)
  })
})

describe('hider i sonen', () => {
  const b = pos('Blindern')
  const spots: [number, number, number][] = [
    [seekFrom + 8 * MIN, b[0] + 0.002, b[1]],
    [seekFrom + 23 * MIN, b[0], b[1] + 0.002],
    [seekFrom + 43 * MIN, b[0] - 0.002, b[1]],
    [seekFrom + 60 * MIN, b[0], b[1] - 0.001],
  ]
  const moving: ArchivedRound = { ...round, hiderPath: spots }
  const t = replayTracks(moving, data, prepare(moving, data, settings).cps.at(-1)!.result).hider

  it('går mellom stedene hider sto ved hvert svar', () => {
    expect(posAt(t, seekFrom)).toEqual([spots[0][1], spots[0][2]])
    expect(posAt(t, spots[1][0])).toEqual([spots[1][1], spots[1][2]])
    const between = posAt(t, seekFrom + 33 * MIN)!
    expect(between).not.toEqual([spots[1][1], spots[1][2]])
    expect(between).not.toEqual([spots[2][1], spots[2][2]])
  })

  it('står stille fra endgame til runden er over', () => {
    const last: LngLat = [spots[3][1], spots[3][2]]
    expect(posAt(t, seekFrom + 61 * MIN)).toEqual(last)
    expect(posAt(t, round.endedAt)).toEqual(last)
  })
})
