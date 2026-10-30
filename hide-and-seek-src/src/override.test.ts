import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { roundStats } from './clock'
import { ANSWER_CANT, ANSWER_NULL, ANSWER_RANDOM, ANSWER_VETO, UNSURE_M, autoAnswer, byHand, canCutZone, informs, shrinks, solve, stationPos, unsureAnswer } from './geo'
import { DEFAULT_SETTINGS, useGame } from './store'
import { diff, fromShared, toShared } from './sync'
import type { GeoData, LngLat, Question, Settings, Station } from './types'

// Hider svarer selv, og seekerne tar svar ut av kartet.

const raw = JSON.parse(readFileSync('public/data/oslo/stations.json', 'utf8'))
const METRO = ['1', '2', '3', '4', '5']
const stations: Station[] = raw.stations.filter((s: Station) => s.lines.some((l) => METRO.includes(l)))
const pos = (name: string) => stationPos(stations.find((s) => s.name === name)!)
const data: GeoData = { stations, lines: { type: 'FeatureCollection', features: [] }, admin: [], shapes: {}, islands: [], poi: {} }
const settings: Settings = { ...DEFAULT_SETTINGS, city: 'oslo', zoneRadius: 500, lines: METRO, playArea: null }

const radar = (id: string, answer: string | null, extra: Partial<Question> = {}): Question =>
  ({ id, time: Number(id.replace(/\D/g, '')) || 1, answer, kind: 'radar', center: pos('Majorstuen'), radiusM: 1000, ...extra }) as Question
const count = (qs: Question[]) => solve(qs, data, settings).stations.length
const ALL = count([])

describe('usikkert svar', () => {
  const at = (marginM?: number) => ({ answer: 'in', detail: '', marginM })

  it('uten margin (svaret snur ikke med avstand) er svaret aldri usikkert', () => {
    expect(unsureAnswer(at(undefined), 500)).toBe(false)
    expect(unsureAnswer(at(undefined), null)).toBe(false)
  })
  it('ukjent eller ugyldig nøyaktighet faller tilbake til UNSURE_M', () => {
    expect(unsureAnswer(at(UNSURE_M - 1), null)).toBe(true)
    expect(unsureAnswer(at(UNSURE_M + 1), null)).toBe(false)
    expect(unsureAnswer(at(UNSURE_M - 1), NaN)).toBe(true)
    expect(unsureAnswer(at(UNSURE_M + 1), Infinity)).toBe(false)
  })
  it('god GPS gjør ikke grensen mindre enn UNSURE_M', () => {
    expect(unsureAnswer(at(20), 3)).toBe(true)
    expect(unsureAnswer(at(0), 0)).toBe(true)
  })
  it('dårlig GPS gjør grensen større', () => {
    expect(unsureAnswer(at(60), 80)).toBe(true)
    expect(unsureAnswer(at(100), 80)).toBe(false)
  })
  it('akkurat på grensen regnes som sikkert', () => {
    expect(unsureAnswer(at(UNSURE_M), null)).toBe(false)
    expect(unsureAnswer(at(80), 80)).toBe(false)
  })
  it('margin som ikke er et tall (f.eks. Infinity) gir ikke usikkert svar', () => {
    expect(unsureAnswer(at(Infinity), 50)).toBe(false)
    expect(unsureAnswer(at(NaN), 50)).toBe(false)
  })
  it('virker sammen med radar: 10 m innenfor kanten er usikkert, 500 m er ikke', () => {
    const station = stations[0]
    const edge: LngLat = [pos('Majorstuen')[0], pos('Majorstuen')[1] + 0.0089] // ca. 990 m nord
    const q = radar('q1', null)
    const a = autoAnswer(q, { pos: edge, station }, data)!
    expect(a.answer).toBe('in')
    expect(unsureAnswer(a, 5)).toBe(true)
    const near = autoAnswer(q, { pos: pos('Majorstuen'), station }, data)!
    expect(unsureAnswer(near, 50)).toBe(false)
  })
})

describe('svar gitt for hånd', () => {
  it('samme svar som appen merkes ikke', () => expect(byHand('radar', 'in', 'in')).toBe(false))
  it('annet svar enn appen merkes', () => expect(byHand('radar', 'out', 'in')).toBe(true))
  it('uten forslag merkes spørsmål appen vanligvis regner ut', () => expect(byHand('radar', 'in', undefined)).toBe(true))
  it('uten forslag merkes ikke spørsmål appen aldri regner ut', () => expect(byHand('manual', 'yes', undefined)).toBe(false))
  it('spørsmål appen ikke regner ut merkes når hider går mot Kartverkets forslag', () => expect(byHand('manual', 'no', 'yes')).toBe(true))
  it('nullsvar, veto, randomize og «kan ikke svare» merkes aldri', () => {
    for (const v of [ANSWER_NULL, ANSWER_VETO, ANSWER_RANDOM, ANSWER_CANT]) {
      expect(byHand('radar', v, 'in')).toBe(false)
      expect(byHand('radar', v, undefined)).toBe(false)
    }
  })
})

describe('svar tatt ut av kartet', () => {
  it('krymper ikke kartet, men sier fortsatt noe om hider', () => {
    const q = radar('q1', 'in', { ignored: true })
    expect(informs(q)).toBe(true)
    expect(shrinks(q)).toBe(false)
    expect(canCutZone(q)).toBe(false)
    expect(count([q])).toBe(ALL)
    expect(count([radar('q1', 'in')])).toBeLessThan(ALL)
  })
  it('bare det ene svaret tas ut, de andre gjelder fortsatt', () => {
    const a = radar('q1', 'in')
    const b = radar('q2', 'out', { center: pos('Jernbanetorget') })
    expect(count([a, { ...b, ignored: true }])).toBe(count([a]))
    expect(count([{ ...a, ignored: true }, b])).toBe(count([b]))
  })
  it('to svar som motsier hverandre: tas det ene ut, er det andre igjen', () => {
    // Inni 1 km og utenfor 300 m fra samme sted kan ikke stemme for Majorstuen
    const inn = radar('q1', 'in')
    const ut = radar('q2', 'in', { radiusM: 300, center: pos('Jernbanetorget') })
    const both = solve([inn, ut], data, settings)
    expect(both.stations.length).toBeLessThan(count([inn]))
    expect(count([inn, { ...ut, ignored: true }])).toBe(count([inn]))
  })
  it('stasjonstallet i loggen står stille på et svar som er tatt ut', () => {
    const qs = [radar('q1', 'in'), radar('q2', 'out', { ignored: true, radiusM: 400 })]
    const steps = solve(qs, data, settings).steps.map((s) => s.count)
    expect(steps[1]).toBe(steps[0])
  })
  it('alle svar tatt ut gir hele kartet tilbake', () => {
    expect(count([radar('q1', 'in', { ignored: true }), radar('q2', 'out', { ignored: true })])).toBe(ALL)
  })
  it('nullsvar og veto tatt ut endrer ingenting (de krympet ikke fra før)', () => {
    const q = radar('q1', ANSWER_NULL, { ignored: true })
    expect(informs(q)).toBe(false)
    expect(count([q])).toBe(ALL)
  })
  it('i endgame skjærer et svar som er tatt ut ikke sonen, selv om seekerne valgte det', () => {
    const endgame = { stationId: stations.find((s) => s.name === 'Majorstuen')!.id, time: 100, include: ['q1'] }
    const far = radar('q1', 'out', { radiusM: 100 }) // ute av 100 m rundt Majorstuen: skjærer sonen
    const cut = solve([far], data, settings, endgame).area
    const notCut = solve([{ ...far, ignored: true }], data, settings, endgame).area
    const whole = solve([], data, settings, endgame).area
    expect(JSON.stringify(notCut)).toBe(JSON.stringify(whole))
    expect(JSON.stringify(cut)).not.toBe(JSON.stringify(whole))
  })
  it('et svar etter endgame-start som er tatt ut skjærer heller ikke sonen', () => {
    const endgame = { stationId: stations.find((s) => s.name === 'Majorstuen')!.id, time: 1 }
    const q = radar('q5', 'out', { radiusM: 100 })
    expect(JSON.stringify(solve([{ ...q, ignored: true }], data, settings, endgame).area)).toBe(JSON.stringify(solve([], data, settings, endgame).area))
  })
  it('spørsmålet regnes fortsatt som stilt i statistikken', () => {
    const round = { hidingMinutes: 30, hider: 'Ada', seekFrom: 0 }
    const stats = roundStats(round, [radar('q1', 'in', { ignored: true, answeredAt: 2 })], 'M', 10)
    expect(stats.asked).toBe(1)
  })
})

describe('lagring: answerQuestion og toggleIgnored', () => {
  const get = () => useGame.getState()
  const one = () => get().questions[0]
  beforeEach(() => useGame.setState({ questions: [radar('q1', null)], past: [], mode: 'hider', hiderPts: [] }))

  it('svar for hånd merkes, og angre svaret fjerner merket', () => {
    get().answerQuestion('q1', 'out', undefined, true)
    expect(one().manual).toBe(true)
    get().answerQuestion('q1', null)
    expect(one().manual).toBeUndefined()
    expect(one().answer).toBeNull()
  })
  it('nytt svar fra GPS etter et for hånd fjerner merket', () => {
    get().answerQuestion('q1', 'out', undefined, true)
    get().answerQuestion('q1', 'in')
    expect(one().manual).toBeUndefined()
    expect(one().history?.map((h) => h.answer)).toEqual(['out'])
  })
  it('merket settes ikke på null selv om manual er sant', () => {
    get().answerQuestion('q1', null, undefined, true)
    expect(one().manual).toBeUndefined()
  })
  it('første svartid står når hider svarer på nytt for hånd', () => {
    get().answerQuestion('q1', 'in')
    const first = one().answeredAt
    get().answerQuestion('q1', 'out', undefined, true)
    expect(one().answeredAt).toBe(first)
  })
  it('ta ut og inn igjen, bare det ene spørsmålet', () => {
    useGame.setState({ questions: [radar('q1', 'in'), radar('q2', 'out')] })
    get().toggleIgnored('q1')
    expect(get().questions.map((q) => q.ignored)).toEqual([true, undefined])
    get().toggleIgnored('q1')
    expect(get().questions.map((q) => q.ignored)).toEqual([undefined, undefined])
  })
  it('angre går tilbake til før svaret ble tatt ut', () => {
    useGame.setState({ questions: [radar('q1', 'in')] })
    get().toggleIgnored('q1')
    get().undo()
    expect(one().ignored).toBeUndefined()
  })
  it('ukjent id endrer ingenting', () => {
    const before = get().questions
    get().toggleIgnored('finnes-ikke')
    expect(get().questions).toEqual(before)
  })
  it('hider endrer et svar som var tatt ut: det nye svaret gjelder igjen', () => {
    useGame.setState({ questions: [radar('q1', 'in', { ignored: true })] })
    get().answerQuestion('q1', 'out')
    expect(one().ignored).toBeUndefined()
  })
  it('hider trekker svaret: neste svar gjelder igjen, selv om det er det samme', () => {
    useGame.setState({ questions: [radar('q1', 'in', { ignored: true })] })
    get().answerQuestion('q1', null)
    get().answerQuestion('q1', 'in')
    expect(one().ignored).toBeUndefined()
  })
  it('samme svar på nytt beholder at det er tatt ut', () => {
    useGame.setState({ questions: [radar('q1', 'in', { ignored: true })] })
    get().answerQuestion('q1', 'in')
    expect(one().ignored).toBe(true)
  })
})

describe('romsynk av merkene', () => {
  const state = (questions: Question[]) => ({ questions, results: [], round: { hidingMinutes: 30, hider: 'Ada', seekFrom: null }, settings, players: [] })

  it('manual og ignored kommer fram til de andre telefonene', () => {
    const local = state([radar('q1', 'in', { manual: true, ignored: true })])
    const back = fromShared(JSON.parse(JSON.stringify(toShared(local))), state([]))
    expect(back.questions[0].manual).toBe(true)
    expect(back.questions[0].ignored).toBe(true)
  })
  it('å ta et svar ut sendes som en endring av bare det spørsmålet', () => {
    const before = toShared(state([radar('q1', 'in'), radar('q2', 'out')]))
    const after = toShared(state([radar('q1', 'in', { ignored: true }), radar('q2', 'out')]))
    expect(Object.keys(diff(before, after))).toEqual(['ignored/q1'])
  })
  it('spørsmål uten merkene (eldre logger) leses som før', () => {
    const back = fromShared(toShared(state([radar('q1', 'in')])), state([]))
    expect(back.questions[0].manual).toBeUndefined()
    expect(back.questions[0].ignored).toBeUndefined()
  })
  it('et langt spørsmål med begge merkene er fortsatt under databasens grense på 2000 tegn', () => {
    const q = radar('q1', 'in', { manual: true, ignored: true, note: 'x'.repeat(500), history: Array.from({ length: 10 }, (_, i) => ({ answer: 'out', at: 1700000000000 + i })) })
    expect(toShared(state([q])).questions.q1.length).toBeLessThan(2000)
  })
})
