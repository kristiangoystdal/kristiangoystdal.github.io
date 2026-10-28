import { afterEach, describe, expect, it, vi } from 'vitest'
import { hiderPathFor, useGame, useHiderPos } from './store'
import type { Question } from './types'

const MIN = 60000
const T0 = Date.UTC(2026, 9, 24, 10)
const q = (id: string, at: number): Question => ({ id, time: T0 + at * MIN, answer: null, kind: 'radar', center: [10.7, 59.9], radiusM: 1000 })

afterEach(() => vi.useRealTimers())

describe('hiders punkter', () => {
  it('huskes på hiders telefon ved hvert svar, og følger runden inn i arkivet', () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    useGame.setState({ mode: 'hider', hiderPts: [], archive: [], questions: [q('a', 50), q('b', 60)], round: { hidingMinutes: 45, hider: 'Kari', seekFrom: T0 + 45 * MIN } })
    const answer = (id: string, at: number, pos: [number, number]) => {
      vi.setSystemTime(T0 + at * MIN)
      useHiderPos.setState({ pos })
      useGame.getState().answerQuestion(id, 'out')
    }
    answer('a', 52, [10.71, 59.94])
    answer('b', 63, [10.712, 59.941])
    expect(useGame.getState().hiderPts).toEqual([
      [T0 + 52 * MIN, 10.71, 59.94],
      [T0 + 63 * MIN, 10.712, 59.941],
    ])
    vi.setSystemTime(T0 + 70 * MIN)
    useGame.getState().finishRound(25 * 60)
    expect(useGame.getState().archive.at(-1)!.hiderPath).toHaveLength(2)
  })

  it('huskes ikke på seekernes telefoner', () => {
    useGame.setState({ mode: 'seeker', hiderPts: [], questions: [q('a', 50)] })
    useHiderPos.setState({ pos: [10.71, 59.94] })
    useGame.getState().answerQuestion('a', 'out')
    expect(useGame.getState().hiderPts).toEqual([])
  })

  it('tar bare med punktene fra runden', () => {
    const round = { hidingMinutes: 45, seekFrom: T0 + 45 * MIN }
    const pts: [number, number, number][] = [
      [T0 - 200 * MIN, 1, 1],
      [T0 + 50 * MIN, 2, 2],
      [T0 + 200 * MIN, 3, 3],
    ]
    expect(hiderPathFor(pts, round, T0 + 100 * MIN)).toEqual([pts[1]])
  })
})
