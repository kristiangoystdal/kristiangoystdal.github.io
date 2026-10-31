import { beforeEach, describe, expect, it } from 'vitest'
import type { Round } from './clock'
import { agreed, applyChange, changeText, isEmpty, onlyDifferent, proposalText, waitingFor } from './proposal'
import { DEFAULT_SETTINGS, useGame } from './store'

// Endringer i reglene midt i en runde (issue #4): begge sider må si ja.

const MIN = 60000
const round = (extra: Partial<Round> = {}): Round => ({ hidingMinutes: 60, hider: 'Ada', seekFrom: 1000 * MIN, ...extra })
const settings = { ...DEFAULT_SETTINGS, zoneRadius: 400, questions: null }
const counts = { before: 50, after: 50 }

describe('hva som endres', () => {
  it('bare det som er ulikt det som gjelder nå, tas med', () => {
    expect(onlyDifferent({ zoneRadius: 400, hidingMinutes: 45, questions: null }, settings, round())).toEqual({ hidingMinutes: 45 })
    expect(isEmpty(onlyDifferent({ zoneRadius: 400 }, settings, round()))).toBe(true)
  })
  it('samme spørsmål i en annen rekkefølge er ingen endring', () => {
    const s = { ...settings, questions: ['a', 'b'] }
    expect(onlyDifferent({ questions: ['b', 'a'] }, s, round())).toEqual({})
    expect(onlyDifferent({ questions: null }, s, round())).toEqual({ questions: null })
  })
})

describe('gjemmetiden', () => {
  it('i gjemmetiden flyttes starten på letingen like mye som gjemmetiden endres', () => {
    const now = 970 * MIN
    expect(applyChange({ hidingMinutes: 90 }, settings, round(), now, counts).round.seekFrom).toBe(1030 * MIN)
    expect(applyChange({ hidingMinutes: 45 }, settings, round(), now, counts).round.seekFrom).toBe(985 * MIN)
  })
  it('kortere enn den tiden som alt har gått, starter letingen nå, ikke i fortiden', () => {
    const now = 990 * MIN
    expect(applyChange({ hidingMinutes: 30 }, settings, round(), now, counts).round.seekFrom).toBe(now)
  })
  it('mens spillet står, regnes det fra da pausen startet', () => {
    const r = round({ pause: { at: 950 * MIN, kind: 'pause' } })
    expect(applyChange({ hidingMinutes: 10 }, settings, r, 999 * MIN, counts).round.seekFrom).toBe(950 * MIN)
  })
  it('etter at letingen har startet, flyttes ikke klokken, men ny gjemmetid gjelder Move', () => {
    const out = applyChange({ hidingMinutes: 30 }, settings, round(), 1010 * MIN, counts)
    expect(out.round.seekFrom).toBe(1000 * MIN)
    expect(out.round.hidingMinutes).toBe(30)
  })
})

describe('sone og spørsmål', () => {
  it('endrer oppsettet og huskes i runden med før og etter', () => {
    const out = applyChange({ zoneRadius: 600, questions: ['r-500'] }, settings, round(), 5, { before: 50, after: 1 })
    expect(out.settings).toMatchObject({ zoneRadius: 600, questions: ['r-500'] })
    expect(out.round.changes).toEqual([{ at: 5, zoneRadius: [400, 600], questions: [50, 1] }])
    expect(changeText(out.round.changes![0])).toBe('sone 400 → 600 m, spørsmål 50 → 1')
  })
  it('flere endringer i samme runde huskes alle', () => {
    const first = applyChange({ zoneRadius: 600 }, settings, round(), 5, counts)
    const second = applyChange({ hidingMinutes: 30 }, first.settings, first.round, 6, counts)
    expect(second.round.changes).toHaveLength(2)
  })
  it('forslaget som tekst', () => {
    expect(proposalText({ zoneRadius: 600, hidingMinutes: 45 })).toBe('sone 600 m, gjemmetid 45 min')
    expect(proposalText({ questions: null })).toBe('standard spørsmålsutvalg')
    expect(proposalText({ questions: ['a', 'b'] })).toBe('2 spørsmål med')
  })
})

describe('begge sider må si ja', () => {
  beforeEach(() => {
    useGame.setState({ settings, round: round({ seekFrom: Date.now() - MIN }), proposal: null, questions: [] })
  })
  it('venter på den andre siden', () => {
    expect(waitingFor({ id: 'p', at: 0, change: {}, by: 'a', ok: { seeker: 'a' } })).toBe('hider')
    expect(agreed({ id: 'p', at: 0, change: {}, by: 'a', ok: { seeker: 'a', hider: 'b' } })).toBe(true)
  })
  it('en seeker foreslår, og ingenting skjer før hider sier ja', () => {
    useGame.getState().propose({ zoneRadius: 600 }, 'seeker')
    expect(useGame.getState().settings.zoneRadius).toBe(400)
    expect(waitingFor(useGame.getState().proposal!)).toBe('hider')
    // En annen seeker som sier ja, er ikke nok.
    useGame.getState().answerProposal(true, 'seeker')
    expect(useGame.getState().settings.zoneRadius).toBe(400)
    useGame.getState().answerProposal(true, 'hider')
    expect(useGame.getState().settings.zoneRadius).toBe(600)
    expect(useGame.getState().proposal).toBeNull()
    expect(useGame.getState().round.changes).toHaveLength(1)
  })
  it('nei fjerner forslaget, og reglene er som før', () => {
    useGame.getState().propose({ zoneRadius: 600 }, 'hider')
    useGame.getState().answerProposal(false, 'seeker')
    expect(useGame.getState().proposal).toBeNull()
    expect(useGame.getState().settings.zoneRadius).toBe(400)
  })
  it('kan ikke foreslås uten en runde, og forsvinner når runden er over', () => {
    useGame.setState({ round: round({ seekFrom: null }) })
    useGame.getState().propose({ zoneRadius: 600 }, 'hider')
    expect(useGame.getState().proposal).toBeNull()
    useGame.setState({ round: round({ seekFrom: Date.now() }) })
    useGame.getState().propose({ zoneRadius: 600 }, 'hider')
    useGame.getState().cancelRound()
    expect(useGame.getState().proposal).toBeNull()
  })
  it('på én telefon gjøres endringen med en gang', () => {
    useGame.getState().changeNow({ hidingMinutes: 45, zoneRadius: 500 })
    expect(useGame.getState().round.hidingMinutes).toBe(45)
    expect(useGame.getState().settings.zoneRadius).toBe(500)
  })
  it('en ny runde starter uten endringer fra forrige', () => {
    useGame.getState().changeNow({ zoneRadius: 500 })
    useGame.getState().startRound()
    expect(useGame.getState().round.changes).toEqual([])
  })
})
