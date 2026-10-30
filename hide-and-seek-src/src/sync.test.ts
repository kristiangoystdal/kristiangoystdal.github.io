import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, useGame } from './store'
import { clashLosers, cleanCode, diff, fromShared, roomFromHash, splitPatch, toShared, type Shared } from './sync'
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

/**
 * To telefoner som endrer samme spørsmål samtidig. Begge regner forskjellen fra det de sist
 * så i rommet, og databasen bruker den som skrev sist på hver sti, som Firebase gjør.
 */
describe('samme spørsmål endret på to telefoner samtidig', () => {
  const apply = (db: Shared, patch: Record<string, string | null>): Shared => {
    const next = JSON.parse(JSON.stringify(db)) as Record<string, unknown>
    for (const [path, v] of Object.entries(patch)) {
      const [key, id] = path.split('/')
      if (id === undefined) next[key] = v ?? ''
      else {
        const map = { ...((next[key] as Record<string, string>) ?? {}) }
        if (v === null) delete map[id]
        else map[id] = v
        next[key] = map
      }
    }
    return next as unknown as Shared
  }
  const answered = (id: string, answer: string, extra: Partial<Question> = {}) => ({ ...q(id, 1, answer), ...extra }) as Question
  /** Begge telefonene starter fra `base`. Kjører endringene i begge rekkefølger og gir det rommet ender med. */
  const race = (base: Question[], hider: Question[], seeker: Question[]) => {
    const start = toShared(state(base))
    const a = diff(start, toShared(state(hider)))
    const b = diff(start, toShared(state(seeker)))
    return [apply(apply(start, a), b), apply(apply(start, b), a)].map((db) => fromShared(db, state([])).questions)
  }

  it('seeker tar svaret ut mens hider endrer det: hiders nye svar står, og det gjelder på kartet', () => {
    for (const qs of race([answered('a', 'in')], [answered('a', 'out', { history: [{ answer: 'in', at: 5 }] })], [answered('a', 'in', { ignored: true })])) {
      expect(qs[0].answer).toBe('out')
      expect(qs[0].ignored).toBeUndefined()
    }
  })
  it('seeker tar svaret ut mens hider trekker det: spørsmålet står ubesvart, uten merke', () => {
    for (const qs of race([answered('a', 'in')], [q('a', 1)], [answered('a', 'in', { ignored: true })])) {
      expect(qs[0].answer).toBeNull()
      expect(qs[0].ignored).toBeUndefined()
    }
  })
  it('seeker skriver notat mens hider svarer: både svaret og notatet står', () => {
    for (const qs of race([q('a', 1)], [answered('a', 'in')], [{ ...q('a', 1), note: 'sjekk kartet' }])) {
      expect(qs[0].answer).toBe('in')
      expect(qs[0].note).toBe('sjekk kartet')
    }
  })
  it('to seekere: én tar svaret ut, en annen skriver notat. Begge står', () => {
    for (const qs of race([answered('a', 'in')], [answered('a', 'in', { ignored: true })], [answered('a', 'in', { note: 'feil?' })])) {
      expect(qs[0].ignored).toBe(true)
      expect(qs[0].note).toBe('feil?')
    }
  })
  it('hider endrer svaret og så tilbake: merket fra det gamle svaret kommer ikke tilbake', () => {
    let db = toShared(state([answered('a', 'in', { ignored: true })]))
    const step = (qs: Question[]) => {
      const local = fromShared(db, state([])).questions
      const s = useGame.getState()
      useGame.setState({ questions: local, mode: 'hider' })
      for (const x of qs) s.answerQuestion(x.id, x.answer)
      db = apply(db, diff(db, toShared(state(useGame.getState().questions))))
    }
    step([answered('a', 'out')])
    step([answered('a', 'in')])
    expect(fromShared(db, state([])).questions[0].ignored).toBeUndefined()
  })
  it('merker og notater sendes for seg, så resten av synken virker selv om reglene for dem mangler', () => {
    const patch = diff(toShared(state([answered('a', 'in')])), toShared(state([answered('a', 'out', { note: 'x' }), answered('b', 'in', { ignored: true })])))
    const { main, marks } = splitPatch(patch)
    expect(Object.keys(main).sort()).toEqual(['questions/a', 'questions/b'])
    expect(Object.keys(marks).sort()).toEqual(['ignored/b', 'notes/a'])
  })
  it('notat og merke ligger ikke inni spørsmålet, så spørsmålet ikke endres når de gjør det', () => {
    const plain = toShared(state([answered('a', 'in')]))
    const marked = toShared(state([answered('a', 'in', { ignored: true, note: 'hei' })]))
    expect(marked.questions.a).toBe(plain.questions.a)
  })
  it('notat fra en eldre versjon av appen (inni spørsmålet) leses fortsatt', () => {
    const old = { questions: { a: JSON.stringify({ ...q('a', 1, 'in'), note: 'gammelt' }) } }
    expect(fromShared(old, state([])).questions[0].note).toBe('gammelt')
  })
  it('databasereglene har en regel for alt appen skriver i et rom', () => {
    const rules = JSON.parse(readFileSync('database.rules.json', 'utf8')).rules.rooms.$code
    for (const key of Object.keys(toShared(state([answered('a', 'in', { ignored: true, note: 'x' })])))) expect(rules).toHaveProperty(key)
    expect(rules.ignored.$id['.validate']).toContain('isString')
    expect(rules.notes.$id['.validate']).toContain('isString')
  })
})
