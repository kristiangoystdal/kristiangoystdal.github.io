import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './store'
import { clashLosers, cleanCode, diff, fromShared, roomFromHash, toShared } from './sync'
import type { Question } from './types'

const q = (id: string, time: number, answer: string | null = null): Question => ({ id, time, answer, kind: 'radar', center: [10.7, 59.9], radiusM: 1000 })
const state = (questions: Question[]) => ({
  questions,
  results: [],
  round: { hidingMinutes: 30, hider: 'Ada', seekFrom: null },
  settings: { ...DEFAULT_SETTINGS, playArea: null },
  players: ['Ada', 'Bo'],
})

describe('romsynk', () => {
  it('tilstanden overlever en tur innom databasen, også null-svar og tomme lister', () => {
    const local = state([q('b', 2, 'in'), q('a', 1)])
    const back = fromShared(JSON.parse(JSON.stringify(toShared(local))), state([]))
    expect(back.questions.map((x) => x.id)).toEqual(['a', 'b']) // sortert på tid
    expect(back.questions[0].answer).toBeNull()
    expect(back.results).toEqual([])
    expect(back.round).toEqual(local.round)
    expect(back.players).toEqual(['Ada', 'Bo'])
  })

  it('telefonens egne innstillinger røres ikke av rommet', () => {
    const local = { ...state([]), settings: { ...DEFAULT_SETTINGS, theme: 'dark' as const, basemap: 'satellite' as const } }
    const remote = toShared({ ...state([]), settings: { ...DEFAULT_SETTINGS, zoneRadius: 750, lines: ['1'] } })
    const merged = fromShared(remote, local).settings
    expect(merged).toMatchObject({ theme: 'dark', basemap: 'satellite', zoneRadius: 750, lines: ['1'] })
  })

  it('sender bare det som er endret', () => {
    const before = toShared(state([q('a', 1), q('b', 2)]))
    const after = toShared(state([q('a', 1, 'out'), q('c', 3)]))
    const patch = diff(before, after)
    expect(Object.keys(patch).sort()).toEqual(['questions/a', 'questions/b', 'questions/c'])
    expect(patch['questions/b']).toBeNull()
    expect(diff(after, after)).toEqual({})
  })

  it('to telefoner som legger til hvert sitt spørsmål overskriver ikke hverandre', () => {
    const base = toShared(state([q('a', 1)]))
    const fromA = diff(base, toShared(state([q('a', 1), q('b', 2)])))
    const fromB = diff(base, toShared(state([q('a', 1), q('c', 3)])))
    expect(Object.keys({ ...fromA, ...fromB }).sort()).toEqual(['questions/b', 'questions/c'])
  })

  it('romkoder ryddes og leses fra lenker', () => {
    expect(cleanCode(' ab-c 23x9 ')).toBe('ABC23X')
    expect(roomFromHash('#rom=abc234')).toBe('ABC234')
    expect(roomFromHash('#spill=abc')).toBeNull()
  })
})

describe('spørsmål stilt samtidig', () => {
  const open = (id: string, time: number, by: string) => ({ id, time, by, answer: null, kind: 'photo', text: 'x' }) as Question
  it('bare det første blir stående, og bare eieren trekker sitt tilbake', () => {
    const qs = [open('b', 2, 'B'), open('a', 1, 'A')]
    expect(clashLosers(qs, 'A')).toEqual([])
    expect(clashLosers(qs, 'B').map((q) => q.id)).toEqual(['b'])
    expect(clashLosers([open('b', 1, 'B'), open('a', 1, 'A')], 'B').map((q) => q.id)).toEqual(['b'])
    expect(clashLosers([open('a', 1, 'A')], 'A')).toEqual([])
  })
})
