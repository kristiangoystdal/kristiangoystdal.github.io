import { describe, expect, it } from 'vitest'
import { HIDE_AT_REPORTS, fromStored, listPresets, newId, presetFromHash, setupKey, shouldCount, today, visible, type SharedPreset, type Setup } from './presets'

// Delte oppsett: oversikten, skjuling ved rapporter og telling av bruk.

const setup = (extra: Partial<Setup> = {}): Setup => ({ city: 'oslo', size: 'M', questions: null, zoneRadius: 500, lines: ['1', '2', '3'], playArea: null, areaAuto: true, ...extra })
const p = (id: string, extra: Partial<SharedPreset> = {}): SharedPreset => ({ id, name: id, description: '', city: 'oslo', setup: setup(), hidingMinutes: 60, created: 1, uses: 0, reports: 0, mine: false, reported: false, ...extra })

describe('oversikten', () => {
  const all = [
    p('a', { uses: 5, created: 1, name: 'Sentrum kveld' }),
    p('b', { uses: 20, created: 2, setup: setup({ size: 'S' }), description: 'Kort runde i sentrum' }),
    p('c', { uses: 5, created: 3, setup: setup({ size: 'L' }) }),
    p('d', { uses: 0, created: 4 }),
  ]
  it('mest brukt først, ved likt antall det nyeste', () => {
    expect(listPresets(all, 'popular', { size: null, query: '' }).map((x) => x.id)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('nyeste først', () => {
    expect(listPresets(all, 'newest', { size: null, query: '' }).map((x) => x.id)).toEqual(['d', 'c', 'b', 'a'])
  })
  it('filter på spillstørrelse', () => {
    expect(listPresets(all, 'popular', { size: 'S', query: '' }).map((x) => x.id)).toEqual(['b'])
    expect(listPresets(all, 'popular', { size: 'M', query: '' }).map((x) => x.id)).toEqual(['a', 'd'])
  })
  it('søk i navn og beskrivelse, uten å bry seg om store bokstaver eller mellomrom', () => {
    expect(listPresets(all, 'popular', { size: null, query: '  SENTRUM ' }).map((x) => x.id)).toEqual(['b', 'a'])
    expect(listPresets(all, 'popular', { size: 'L', query: 'sentrum' })).toEqual([])
  })
})

describe('rapporter', () => {
  it(`skjules ved ${HIDE_AT_REPORTS} rapporter, men eieren ser sitt eget`, () => {
    expect(visible(p('a', { reports: HIDE_AT_REPORTS - 1 }))).toBe(true)
    expect(visible(p('a', { reports: HIDE_AT_REPORTS }))).toBe(false)
    expect(visible(p('a', { reports: 10, mine: true }))).toBe(true)
    expect(listPresets([p('a', { reports: 5 }), p('b')], 'popular', { size: null, query: '' }).map((x) => x.id)).toEqual(['b'])
  })
})

describe('telling av bruk', () => {
  const key = setupKey(setup(), 60)
  it('telles når runden startes med oppsettet uendret', () => {
    expect(shouldCount({ id: 'a', key }, key, {}, '2026-10-31')).toBe('a')
  })
  it('telles ikke når oppsettet er endret etterpå, eller ingen er valgt', () => {
    expect(shouldCount({ id: 'a', key }, setupKey(setup({ zoneRadius: 750 }), 60), {}, '2026-10-31')).toBeNull()
    expect(shouldCount({ id: 'a', key }, setupKey(setup(), 45), {}, '2026-10-31')).toBeNull()
    expect(shouldCount(null, key, {}, '2026-10-31')).toBeNull()
  })
  it('én gang per telefon per dag', () => {
    expect(shouldCount({ id: 'a', key }, key, { a: '2026-10-31' }, '2026-10-31')).toBeNull()
    expect(shouldCount({ id: 'a', key }, key, { a: '2026-10-30' }, '2026-10-31')).toBe('a')
  })
  it('rekkefølgen på linjer og spørsmål gjør ikke oppsettet ulikt', () => {
    expect(setupKey(setup({ lines: ['3', '1', '2'], questions: ['b', 'a'] }), 60)).toBe(setupKey(setup({ lines: ['1', '2', '3'], questions: ['a', 'b'] }), 60))
  })
  it('manglende automatisk område regnes som på', () => {
    expect(setupKey(setup({ areaAuto: null }), 60)).toBe(setupKey(setup({ areaAuto: true }), 60))
    expect(setupKey(setup({ areaAuto: false }), 60)).not.toBe(setupKey(setup({ areaAuto: true }), 60))
  })
  it('dagen er en dato', () => {
    expect(today(Date.UTC(2026, 9, 31, 12))).toBe('2026-10-31')
  })
})

describe('fra databasen', () => {
  const stored = { owner: 'ada', name: 'Kveld', city: 'oslo', setup: JSON.stringify(setup()), hidingMinutes: 45, created: 5, uses: 3, reports: { bo: true, cy: true } }
  it('leser eier, bruk og rapporter', () => {
    const x = fromStored('abcd1234', stored, 'bo')!
    expect(x).toMatchObject({ id: 'abcd1234', name: 'Kveld', description: '', uses: 3, reports: 2, mine: false, reported: true, hidingMinutes: 45 })
    expect(fromStored('abcd1234', stored, 'ada')!.mine).toBe(true)
    expect(fromStored('abcd1234', stored, null)!).toMatchObject({ mine: false, reported: false })
  })
  it('oppsett som mangler bruk og rapporter, har null av hver', () => {
    const { uses: _u, reports: _r, ...plain } = stored
    expect(fromStored('abcd1234', plain, 'bo')).toMatchObject({ uses: 0, reports: 0 })
  })
  it('ødelagte oppsett hoppes over i stedet for å krasje', () => {
    expect(fromStored('abcd1234', { ...stored, setup: '{ikke json' }, 'bo')).toBeNull()
    expect(fromStored('abcd1234', { ...stored, setup: 'null' }, 'bo')).toBeNull()
  })
})

describe('id-er og lenker', () => {
  it('nye id-er passer med reglene og er ulike', () => {
    const ids = new Set(Array.from({ length: 200 }, newId))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]{8,24}$/)
  })
  it('lenken leses tilbake', () => {
    expect(presetFromHash('#oppsett=abcd2345efgh')).toBe('abcd2345efgh')
    expect(presetFromHash('#rom=ABC123')).toBeNull()
    expect(presetFromHash('#oppsett=ABC')).toBeNull()
  })
})
