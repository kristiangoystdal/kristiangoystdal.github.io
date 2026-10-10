import { existsSync, readFileSync } from 'node:fs'
import { booleanPointInPolygon, destination } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import { ITEMS, drawFor, formToQuestion, itemsFor, newForm, responseMinutes } from './form'
import { areaAt, autoAnswer, autoPlayArea, dist, isPositive, nearestStation, regionOf, solve, stationPos, voronoiCell } from './geo'
import type { AdminLevel, GeoData, LngLat, Question, QuestionBody, Settings, Station } from './types'

const raw = JSON.parse(readFileSync('public/data/stations.json', 'utf8'))
const stations: Station[] = raw.stations
const byName = (name: string) => stations.find((s) => s.name === name)!
const pos = (name: string) => stationPos(byName(name))

const data: GeoData = {
  stations,
  lines: { type: 'FeatureCollection', features: [] },
  admin: [],
  poi: {
    kino: [
      { name: 'Colosseum', pos: [10.7106, 59.9297] },
      { name: 'Saga', pos: [10.7296, 59.9141] },
      { name: 'Ringen', pos: [10.7585, 59.9283] },
    ],
  },
}
const settings: Settings = { zoneRadius: 500, lines: ['1', '2', '3', '4', '5'], day: 'wk', hourFrom: 10, hourTo: 18, adminLevel: 'bydel', theme: 'auto', basemap: 'clean', size: 'M', playArea: null }
const q = (body: QuestionBody, answer: string | null = null): Question => ({ id: 'q', time: 0, answer, ...body })
const names = (qs: Question[]) => solve(qs, data, settings).stations.map((s) => s.name)

describe('stasjonsdata', () => {
  it('har 101 stasjoner fordelt på linje 1–5', () => {
    expect(stations).toHaveLength(101)
    expect(new Set(stations.flatMap((s) => s.lines))).toEqual(new Set(['1', '2', '3', '4', '5']))
    expect(byName('Kolsås').lines).toEqual(['3'])
    expect(byName('Majorstuen').lines).toEqual(['1', '2', '3', '4', '5'])
  })
})

describe('radar', () => {
  const radar: QuestionBody = { kind: 'radar', center: pos('Majorstuen'), radiusM: 1000 }

  it('innenfor 1 km fra Majorstuen beholder bare nabostasjonene', () => {
    const left = names([q(radar, 'in')])
    expect(left).toContain('Majorstuen')
    expect(left).toContain('Frøen')
    expect(left).not.toContain('Jernbanetorget')
    expect(left).not.toContain('Kolsås')
  })

  it('utenfor fjerner stasjoner der hele sonen ligger inni sirkelen', () => {
    const left = names([q(radar, 'out')])
    expect(left).not.toContain('Majorstuen')
    expect(left).toContain('Jernbanetorget')
    // Frøen ligger ~650 m unna: sonen på 500 m stikker ut av sirkelen.
    expect(left).toContain('Frøen')
  })

  it('hider kan flytte seg i sonen: innenfor og så utenfor samme sirkel beholder stasjonene på kanten', () => {
    const res = solve([q(radar, 'in'), { ...q(radar, 'out'), id: 'q2' }], data, settings)
    const left = res.stations.map((s) => s.name)
    expect(left).toContain('Frøen') // ~650 m unna, sonen krysser sirkelen
    expect(left).not.toContain('Majorstuen') // hele sonen ligger inni
    expect(left).not.toContain('Jernbanetorget') // hele sonen ligger utenfor
    expect(res.steps.map((x) => x.count)).toEqual([6, left.length])
  })

  it('før endgame vises området svarene peker ut, ikke stasjonssonene', () => {
    const res = solve([q(radar, 'in')], data, settings)
    // Punkt 400 m nord for Vinderen: inni Vinderens sone, men over 1 km fra Majorstuen.
    const far = destination(pos('Vinderen'), 0.4, 0, { units: 'kilometers' }).geometry.coordinates as LngLat
    expect(dist(far, pos('Majorstuen'))).toBeGreaterThan(1000)
    expect(res.stations.map((s) => s.name)).toContain('Vinderen') // stasjonen er fortsatt mulig
    expect(booleanPointInPolygon(far, res.area!)).toBe(false)
    expect(booleanPointInPolygon(pos('Majorstuen'), res.area!)).toBe(true)
  })

  it('utelukker svarene hverandre på kartet, vises sonene til stasjonene som står igjen', () => {
    const res = solve([q(radar, 'in'), { ...q(radar, 'out'), id: 'q2' }], data, settings)
    expect(res.area).not.toBeNull()
    expect(booleanPointInPolygon(pos('Frøen'), res.area!)).toBe(true)
  })
})

describe('endgame', () => {
  const at = (id: string, time: number, body: QuestionBody, answer: string): Question => ({ ...q(body, answer), id, time })
  const endgame = { stationId: byName('Frøen').id, time: 100 }

  it('bare sonen til den valgte stasjonen er gyldig', () => {
    const res = solve([at('a', 1, { kind: 'radar', center: pos('Majorstuen'), radiusM: 1000 }, 'in')], data, settings, endgame)
    expect(res.stations.map((s) => s.name)).toEqual(['Frøen'])
    expect(booleanPointInPolygon(pos('Frøen'), res.area!)).toBe(true)
    expect(booleanPointInPolygon(pos('Majorstuen'), res.area!)).toBe(false)
  })

  it('spørsmål etter start skjærer sonen nøyaktig, spørsmål før gjør det ikke', () => {
    const cut: QuestionBody = { kind: 'radar', center: pos('Majorstuen'), radiusM: 700 }
    const north = destination(pos('Frøen'), 0.4, 0, { units: 'kilometers' }).geometry.coordinates as LngLat
    const before = solve([at('a', 1, cut, 'in')], data, settings, endgame)
    const after = solve([at('a', 200, cut, 'in')], data, settings, endgame)
    expect(booleanPointInPolygon(north, before.area!)).toBe(true)
    expect(booleanPointInPolygon(north, after.area!)).toBe(false)
    expect(booleanPointInPolygon(pos('Frøen'), after.area!)).toBe(true)
  })

  it('svar som utelukker hele sonen gir null stasjoner', () => {
    const res = solve([at('a', 200, { kind: 'radar', center: pos('Kolsås'), radiusM: 500 }, 'in')], data, settings, endgame)
    expect(res.area).toBeNull()
    expect(res.stations).toHaveLength(0)
})
})

describe('spillområde', () => {
  it('stasjoner utenfor området er utelukket før første spørsmål', () => {
    // Firkant rundt sentrum, fra Majorstuen i vest til Tøyen i øst.
    const playArea: LngLat[] = [[10.70, 59.905], [10.78, 59.905], [10.78, 59.935], [10.70, 59.935]]
    const res = solve([], data, { ...settings, playArea })
    const left = res.stations.map((s) => s.name)
    expect(left).toContain('Majorstuen')
    expect(left).toContain('Tøyen')
    expect(left).not.toContain('Kolsås')
    expect(left).not.toContain('Vestli')
    expect(left.length).toBeLessThan(25)
  })

  it('auto-området dekker alle stasjoner på linjene som er med, med et par km margin', () => {
    const all = autoPlayArea(stations, settings)!
    expect(solve([], data, { ...settings, playArea: all }).stations).toHaveLength(101)
    const area = solve([], data, { ...settings, playArea: all }).area!
    // Kolsås er den vestligste stasjonen: 1,5 km lenger vest er innenfor, 3 km er utenfor.
    const west = (km: number) => destination(pos('Kolsås'), km, 270, { units: 'kilometers' }).geometry.coordinates as LngLat
    expect(booleanPointInPolygon(west(1.5), area)).toBe(true)
    expect(booleanPointInPolygon(west(3), area)).toBe(false)

    // Bare linje 1: Kolsås (linje 3, langt vest) faller utenfor rammen.
    const line1 = autoPlayArea(stations, { ...settings, lines: ['1'] })!
    const left = solve([], data, { ...settings, playArea: line1 }).stations.map((s) => s.name)
    expect(left).toContain('Frognerseteren')
    expect(left).toContain('Bergkrystallen')
    expect(left).not.toContain('Kolsås')
  })

  it('spørsmål krymper videre innenfor området', () => {
    const playArea: LngLat[] = [[10.70, 59.905], [10.78, 59.905], [10.78, 59.935], [10.70, 59.935]]
    const radar = q({ kind: 'radar', center: pos('Majorstuen'), radiusM: 1000 }, 'out')
    const left = solve([radar], data, { ...settings, playArea }).stations.map((s) => s.name)
    expect(left).not.toContain('Majorstuen')
    expect(left).toContain('Tøyen')
    expect(left).not.toContain('Kolsås')
  })
})

describe('thermometer', () => {
  it('varmere mot øst beholder østsiden av midtnormalen', () => {
    const t: QuestionBody = { kind: 'thermometer', from: pos('Majorstuen'), to: pos('Jernbanetorget') }
    const warm = names([q(t, 'warmer')])
    const cold = names([q(t, 'colder')])
    expect(warm).toContain('Tøyen')
    expect(warm).not.toContain('Kolsås')
    expect(cold).toContain('Kolsås')
    expect(cold).not.toContain('Tøyen')
  })

  it('midtnormalen ligger like langt fra begge punkter', () => {
    const a = pos('Majorstuen')
    const b = pos('Helsfyr')
    const ring = voronoiCell(b, [a])!.geometry.coordinates[0] as LngLat[]
    const onBisector = ring.filter((p) => Math.abs(dist(p, a) - dist(p, b)) < 50)
    expect(onBisector.length).toBeGreaterThanOrEqual(2)
  })
})

describe('korttrekk', () => {
  const radar = (id: string, station: string, radiusM: number): Question => ({ ...q({ kind: 'radar', center: pos(station), radiusM }), id })

  it('samme spørsmål på nytt gir to trekk, uansett hvor seeker står', () => {
    const log = [radar('a', 'Majorstuen', 1000), radar('b', 'Tøyen', 2000), radar('c', 'Helsfyr', 1000)]
    expect(drawFor(log[0], log)).toMatchObject({ draw: 2, keep: 1, repeat: false })
    expect(drawFor(log[1], log).repeat).toBe(false) // annen radius er et annet spørsmål
    expect(drawFor(log[2], log).repeat).toBe(true)
  })

  it('et nytt spørsmål i skjemaet sammenlignes med hele loggen', () => {
    const log = [{ ...q({ kind: 'line', line: '3' }), id: 'a' }]
    expect(drawFor({ ...q({ kind: 'line', line: '3' }), id: 'draft' }, log)).toMatchObject({ draw: 3, keep: 1, repeat: true })
    expect(drawFor({ ...q({ kind: 'line', line: '4' }), id: 'draft' }, log).repeat).toBe(false)
  })
})

describe('regelboken', () => {
  it('spillstørrelsen styrer hvilke spørsmål som er med', () => {
    expect(itemsFor('Tentacles', 'S')).toHaveLength(0)
    expect(itemsFor('Tentacles', 'M')).toHaveLength(4)
    expect(itemsFor('Tentacles', 'L')).toHaveLength(8)
    expect(itemsFor('Thermometer', 'S').map((i) => i.label)).toEqual(['1 km', '5 km'])
    expect(itemsFor('Thermometer', 'L')).toHaveLength(4)
    expect(itemsFor('Radar', 'S')).toHaveLength(10)
    expect(itemsFor('Photos', 'S')).toHaveLength(6)
    expect(itemsFor('Photos', 'M')).toHaveLength(14)
    expect(itemsFor('Photos', 'L')).toHaveLength(18)
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
  })

  it('bilder har lengre svartid', () => {
    const photo = formToQuestion(newForm(itemsFor('Photos', 'S')[0], null))!
    const radar = formToQuestion(newForm(itemsFor('Radar', 'S')[0], pos('Majorstuen')))!
    expect([responseMinutes(photo, 'S'), responseMinutes(photo, 'L'), responseMinutes(radar, 'L')]).toEqual([10, 20, 5])
  })

  it('alle spørsmål som trenger et punkt blir gyldige når seeker har en posisjon', () => {
    for (const item of ITEMS) {
      const form = { ...newForm(item, pos('Majorstuen')), pos2: pos('Tøyen') }
      expect(formToQuestion(form), item.id).not.toBeNull()
    }
  })

  it('lengde på stasjonsnavn deler stasjonene etter antall tegn', () => {
    const body: QuestionBody = { kind: 'namelen', pos: pos('Tøyen') } // 5 tegn
    const yes = names([q(body, 'yes')])
    expect(yes).toContain('Frøen')
    expect(yes).not.toContain('Majorstuen')
    expect(yes.length + names([q(body, 'no')]).length).toBe(101)
    expect(autoAnswer(q(body), { pos: pos('Frøen'), station: byName('Frøen') }, data)!.answer).toBe('yes')
  })

  it('tentacles med T-banelinjer beholder stasjonene på linjen hider er nærmest', () => {
    const body: QuestionBody = { kind: 'tentacles', poiType: 'metrolinje', pos: pos('Stortinget'), radiusM: 25000 }
    const left = names([q(body, '1')])
    expect(left).toContain('Frognerseteren')
    expect(left).not.toContain('Kolsås')
  })
})

describe('samme linje', () => {
  it('ja/nei deler stasjonene etter linje', () => {
    const yes = names([q({ kind: 'line', line: '1' }, 'yes')])
    const no = names([q({ kind: 'line', line: '1' }, 'no')])
    expect(yes).toHaveLength(35)
    expect(yes.length + no.length).toBe(101)
    expect(no).toContain('Kolsås')
  })
})

describe('hiders autosvar stemmer med geometrien', () => {
  const seeker = pos('Nationaltheatret')
  const bodies: QuestionBody[] = [
    { kind: 'radar', center: seeker, radiusM: 2000 },
    { kind: 'thermometer', from: seeker, to: pos('Stortinget') },
    { kind: 'nearest', poiType: 'kino', pos: seeker },
    { kind: 'measure', ref: 'kino', pos: seeker },
    { kind: 'tentacles', poiType: 'kino', pos: seeker, radiusM: 2500 },
  ]
  // Hider-posisjoner spredt rundt i byen, litt unna stasjonene.
  const hiders = stations.filter((_, i) => i % 3 === 0).map((s, i) => destination(stationPos(s), 0.2, i * 47, { units: 'kilometers' }).geometry.coordinates as LngLat)

  for (const body of bodies) {
    it(`${body.kind}${'ref' in body ? ` (${body.ref})` : ''}`, () => {
      let checked = 0
      for (const h of hiders) {
        const auto = autoAnswer(q(body), { pos: h, station: nearestStation(stations, h) }, data)!
        if ((auto.marginM ?? 100) < 25) continue // for nær grensen til at polygon og avstand må være enige
        const answered = q(body, auto.answer)
        const region = regionOf(answered, data)!
        expect(booleanPointInPolygon(h, region)).toBe(isPositive(answered))
        checked++
      }
      expect(checked).toBeGreaterThan(20)
    })
  }

  it('hiders egen stasjon overlever alltid egne svar', () => {
    const hider = byName('Tøyen')
    const answered = bodies.map((b, i) => ({ ...q(b), id: `q${i}` })).map((x) => ({ ...x, answer: autoAnswer(x, { pos: stationPos(hider), station: hider }, data)!.answer }))
    expect(names(answered)).toContain('Tøyen')
  })
})

// Grenser og steder hentes av scripts/fetch_geodata.py og er valgfrie.
const ADMIN_FILE = 'public/data/admin.geojson'
describe.skipIf(!existsSync(ADMIN_FILE))('administrative grenser', () => {
  const real: GeoData = { ...data, admin: existsSync(ADMIN_FILE) ? JSON.parse(readFileSync(ADMIN_FILE, 'utf8')).features : [] }
  const name = (level: AdminLevel, station: string) => areaAt(real, level, pos(station))?.properties.name

  it('plasserer kjente stasjoner riktig på alle nivåer', () => {
    expect(name('bydel', 'Majorstuen')).toBe('Frogner')
    expect(name('bydel', 'Tøyen')).toBe('Gamle Oslo')
    expect(name('kommune', 'Kolsås')).toBe('Bærum')
    expect(name('fylke', 'Kolsås')).toBe('Akershus')
    expect(name('fylke', 'Stortinget')).toBe('Oslo')
  })

  it('alle stasjoner har et svar på alle nivåer', () => {
    for (const level of ['fylke', 'kommune', 'bydel', 'postsone', 'postnummer'] as const) {
      expect(stations.filter((s) => !areaAt(real, level, stationPos(s))).map((s) => s.name)).toEqual([])
    }
  })

  it('postsonen er de tre første sifrene i postnummeret', () => {
    for (const s of ['Majorstuen', 'Kolsås', 'Tøyen', 'Vestli']) {
      expect(name('postnummer', s)).toMatch(/^\d{4}$/)
      expect(name('postsone', s)).toBe(`${name('postnummer', s)!.slice(0, 3)}x`)
    }
  })

  it('samme postsone gir minst like mange stasjoner som samme postnummer', () => {
    const left = (level: AdminLevel) => solve([q({ kind: 'admin', level, pos: pos('Majorstuen') }, 'yes')], real, settings).stations.length
    expect(left('postnummer')).toBeGreaterThanOrEqual(1)
    expect(left('postsone')).toBeGreaterThanOrEqual(left('postnummer'))
    expect(left('postsone')).toBeLessThan(15)
  })

  it('avstand til kommunegrensen: hider ved grensen er nærmere enn seeker i sentrum', () => {
    const body: QuestionBody = { kind: 'border', level: 'kommune', pos: pos('Stortinget') }
    // Lijordet ligger rett ved grensen mellom Oslo og Bærum.
    const auto = autoAnswer(q(body), { pos: pos('Lijordet'), station: byName('Lijordet') }, real)!
    expect(auto.answer).toBe('closer')
    const closer = solve([q(body, 'closer')], real, settings).stations.map((s) => s.name)
    const further = solve([q(body, 'further')], real, settings).stations.map((s) => s.name)
    expect(closer).toContain('Lijordet')
    expect(further).not.toContain('Lijordet')
    expect(further).toContain('Stortinget') // seekers egen stasjon: sonen rekker både nærmere og lenger unna
    expect(closer).toContain('Stortinget')
  })

  it('samme bydel som Majorstuen: ja beholder Frogner, nei fjerner Majorstuen-området', () => {
    const body: QuestionBody = { kind: 'admin', level: 'bydel', pos: pos('Majorstuen') }
    const yes = solve([q(body, 'yes')], real, settings).stations.map((s) => s.name)
    const no = solve([q(body, 'no')], real, settings).stations.map((s) => s.name)
    expect(yes).toContain('Majorstuen')
    expect(yes).not.toContain('Tøyen')
    expect(no).toContain('Tøyen')
    expect(yes.length).toBeLessThan(20)
  })
})
