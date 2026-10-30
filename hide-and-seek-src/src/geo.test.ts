import { existsSync, readFileSync } from 'node:fs'
import { booleanPointInPolygon, destination } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import { ITEMS, SIZE_RULES, enabledIds, formToQuestion, itemsFor, lockedBy, newForm, questionKey, randomSwap, responseMinutes, usedKeys } from './form'
import { ANSWER_NULL, ANSWER_RANDOM, ANSWER_VETO, HIGH_SPEED, WORLD, applyQuestion, disc, areaAt, autoAnswer, autoPlayArea, clipData, dist, hiderStation, isPositive, landmassOf, nearestStation, polylineDist, regionOf, shapeDist, solve, stationPos, stationsInReach, transitStops, voronoiCell } from './geo'
import type { AdminLevel, GeoData, LngLat, Question, QuestionBody, Settings, Station } from './types'

const raw = JSON.parse(readFileSync('public/data/oslo/stations.json', 'utf8'))
// Testene gjelder T-banen. Trikkeholdeplassene i dataene er ikke med.
const METRO = ['1', '2', '3', '4', '5']
const stations: Station[] = raw.stations.filter((s: Station) => s.lines.some((l) => METRO.includes(l)))
const byName = (name: string) => stations.find((s) => s.name === name)!
const pos = (name: string) => stationPos(byName(name))

const data: GeoData = {
  stations,
  lines: { type: 'FeatureCollection', features: [] },
  admin: [],
  shapes: { coast: [], water: [], riks: [] },
  islands: [],
  poi: {
    kino: [
      { name: 'Colosseum', pos: [10.7106, 59.9297] },
      { name: 'Saga', pos: [10.7296, 59.9141] },
      { name: 'Ringen', pos: [10.7585, 59.9283] },
    ],
  },
}
const settings: Settings = { city: 'oslo', zoneRadius: 500, lines: ['1', '2', '3', '4', '5'], day: 'wk', hourFrom: 10, hourTo: 18, adminLevel: 'bydel', theme: 'auto', basemap: 'clean', size: 'M', playArea: null }
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

  it('et svar seekerne har tatt ut av kartet krymper ingenting', () => {
    const all = solve([], data, settings).stations.length
    const res = solve([{ ...q(radar, 'in'), ignored: true }], data, settings)
    expect(res.stations.length).toBe(all)
    expect(names([q(radar, 'in')]).length).toBeLessThan(all)
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

  it('spørsmål fra før skjærer sonen når seekerne velger det', () => {
    const cut: QuestionBody = { kind: 'radar', center: pos('Majorstuen'), radiusM: 700 }
    const north = destination(pos('Frøen'), 0.4, 0, { units: 'kilometers' }).geometry.coordinates as LngLat
    const res = solve([at('a', 1, cut, 'in')], data, settings, { ...endgame, include: ['a'] })
    expect(booleanPointInPolygon(north, res.area!)).toBe(false)
    expect(booleanPointInPolygon(pos('Frøen'), res.area!)).toBe(true)
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

describe('svar som ikke krymper kartet', () => {
  const radar = (id: string, answer: string | null = null): Question => ({ ...q({ kind: 'radar', center: pos('Majorstuen'), radiusM: 1000 }, answer), id, item: 'r-1000' })

  it('samme spørsmål kjennes igjen uansett hvor seeker står', () => {
    const elsewhere = { ...radar('b'), center: pos('Tøyen') } as Question
    expect(usedKeys([radar('a')]).has(questionKey(elsewhere))).toBe(true)
    expect(usedKeys([radar('a')]).has('r-2000')).toBe(false)
  })

  it('nullsvar teller som besvart uten å utelukke noe', () => {
    const res = solve([radar('a', ANSWER_NULL)], data, settings)
    expect(res.stations).toHaveLength(101)
    expect(res.area).not.toBeNull()
  })

  it('høyhastighetsbane finnes ikke i kartet og gir nullsvar', () => {
    const auto = autoAnswer(q({ kind: 'manual', family: 'measuring', subject: HIGH_SPEED }), { pos: pos('Tøyen'), station: byName('Tøyen') }, data)
    expect(auto?.answer).toBe(ANSWER_NULL)
    expect(ITEMS.find((i) => i.id === 'me-highspeed')!.fields.text).toBe(HIGH_SPEED)
  })
})

describe('regelboken', () => {
  it('spillstørrelsen setter gjemmetid og sone', () => {
    expect(SIZE_RULES).toEqual({ S: { hidingMinutes: 30, zoneRadius: 400 }, M: { hidingMinutes: 60, zoneRadius: 400 }, L: { hidingMinutes: 180, zoneRadius: 800 } })
  })

  it('spillstørrelsen styrer hvilke spørsmål som er med', () => {
    expect(itemsFor('Tentacles', { size: 'S' })).toHaveLength(0)
    expect(itemsFor('Tentacles', { size: 'M' })).toHaveLength(4)
    expect(itemsFor('Tentacles', { size: 'L' })).toHaveLength(8)
    expect(itemsFor('Thermometer', { size: 'S' }).map((i) => i.label)).toEqual(['1 km', '5 km'])
    expect(itemsFor('Thermometer', { size: 'L' })).toHaveLength(4)
    expect(itemsFor('Radar', { size: 'S' })).toHaveLength(10)
    expect(itemsFor('Photos', { size: 'S' })).toHaveLength(6)
    expect(itemsFor('Photos', { size: 'M' })).toHaveLength(14)
    expect(itemsFor('Photos', { size: 'L' })).toHaveLength(18)
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
  })

  it('et egendefinert utvalg går foran spillstørrelsen', () => {
    const custom = { size: 'S' as const, questions: [...enabledIds({ size: 'S' }), 'te-museum'].filter((id) => id !== 'r-500') }
    expect(itemsFor('Tentacles', custom).map((i) => i.id)).toEqual(['te-museum'])
    expect(itemsFor('Radar', custom)).toHaveLength(9)
    expect(itemsFor('Photos', { size: 'L', questions: [] })).toHaveLength(0)
    expect(enabledIds({ size: 'M', questions: null })).toHaveLength(ITEMS.filter((i) => i.sizes.includes('M')).length)
  })

  it('bilder har lengre svartid', () => {
    const photo = formToQuestion(newForm(itemsFor('Photos', { size: 'S' })[0], null))!
    const radar = formToQuestion(newForm(itemsFor('Radar', { size: 'S' })[0], pos('Majorstuen')))!
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
  // Et utsnitt rundt sentrum, så rutenettet for Measuring blir fint nok til å sjekke.
  const LOCAL = disc(seeker, 6000)
  // Hider-posisjoner spredt rundt i byen, litt unna stasjonene.
  const hiders = stations.filter((_, i) => i % 3 === 0).map((s, i) => destination(stationPos(s), 0.2, i * 47, { units: 'kilometers' }).geometry.coordinates as LngLat)

  for (const body of bodies) {
    it(`${body.kind}${'ref' in body ? ` (${body.ref})` : ''}`, () => {
      let checked = 0
      for (const h of hiders) {
        const auto = autoAnswer(q(body), { pos: h, station: nearestStation(stations, h) }, data)!
        if ((auto.marginM ?? 100) < 25) continue // for nær grensen til at polygon og avstand må være enige
        const answered = q(body, auto.answer)
        const region = regionOf(answered, data)
        if (region) {
          expect(booleanPointInPolygon(h, region)).toBe(isPositive(answered))
          checked++
        } else if (booleanPointInPolygon(h, LOCAL) && (auto.marginM ?? Infinity) > 150) {
          // Measuring tegnes i et rutenett over området det gjelder. Nær kanten avgjør rutene.
          const area = applyQuestion(LOCAL, answered, data)
          expect(area !== null && booleanPointInPolygon(h, area)).toBe(true)
          checked++
        }
      }
      expect(checked).toBeGreaterThan(10)
    })
  }

  it('hiders egen stasjon overlever alltid egne svar', () => {
    const hider = byName('Tøyen')
    const answered = bodies.map((b, i) => ({ ...q(b), id: `q${i}` })).map((x) => ({ ...x, answer: autoAnswer(x, { pos: stationPos(hider), station: hider }, data)!.answer }))
    expect(names(answered)).toContain('Tøyen')
  })
})

// Grenser og steder hentes av scripts/fetch_geodata.py og er valgfrie.
const ADMIN_FILE = 'public/data/oslo/admin.geojson'
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

const LINES_FILE = 'public/data/oslo/lines.geojson'
const shapeFile = (k: string) => `public/data/oslo/${k}.geojson`
const outline = (f: { geometry: { type: string; coordinates: unknown } }) => (f.geometry.type === 'Polygon' ? (f.geometry.coordinates as LngLat[][]) : [f.geometry.coordinates as LngLat[]])

describe('kollektivlinje', () => {
  const real: GeoData = { ...data, lines: JSON.parse(readFileSync(LINES_FILE, 'utf8')) }
  const route = real.lines.features.find((f) => f.properties.line === '3')!.properties.stations!
  const at = (name: string) => route.indexOf(byName(name).id)
  // Linje 3 mot Mortensrud, neste stopp Tøyen.
  const east: QuestionBody = { kind: 'transit', line: '3', dir: 1, next: at('Tøyen') }

  it('svaret er ja bare for stasjonene T-banen har igjen å stoppe ved', () => {
    const stops = transitStops(real, east)
    expect(stops[0]).toBe(byName('Tøyen').id)
    expect(stops.at(-1)).toBe(byName('Mortensrud').id)
    const ask = (name: string) => autoAnswer(q(east), { pos: pos(name), station: byName(name) }, real)!.answer
    expect(ask('Mortensrud')).toBe('yes')
    expect(ask('Tøyen')).toBe('yes')
    expect(ask('Kolsås')).toBe('no') // samme linje, men bak toget
    expect(ask('Vestli')).toBe('no')
  })

  it('motsatt retning gir stasjonene den andre veien', () => {
    const west = transitStops(real, { line: '3', dir: -1, next: at('Tøyen') })
    expect(west[0]).toBe(byName('Kolsås').id)
    expect(west).not.toContain(byName('Mortensrud').id)
  })

  it('kartet krymper til stoppene som gjenstår, og linjen teller i gjentakelser', () => {
    const yes = solve([q(east, 'yes')], real, settings).stations.map((s) => s.name)
    const no = solve([q(east, 'no')], real, settings).stations.map((s) => s.name)
    expect(yes).toContain('Mortensrud')
    expect(yes).not.toContain('Kolsås')
    expect(no).toContain('Kolsås')
    expect(yes.length + no.length).toBe(101)
    expect(questionKey({ ...q(east), item: 'm-line' })).toBe('m-line:3')
  })
})

describe.skipIf(!existsSync(shapeFile('coast')))('kyst, vann, riksgrense og landmasse', () => {
  const load = (k: string) => (existsSync(shapeFile(k)) ? JSON.parse(readFileSync(shapeFile(k), 'utf8')).features : [])
  const coast = load('coast')
  const real: GeoData = {
    ...data,
    shapes: { coast: coast.flatMap(outline), water: load('water').flatMap(outline), riks: load('riks').flatMap(outline) },
    islands: coast.filter((f: { geometry: { type: string } }) => f.geometry.type === 'Polygon'),
  }
  const hider = (name: string) => ({ pos: pos(name), station: byName(name) })

  it('avstand til en linje måles til nærmeste punkt', () => {
    const line: LngLat[] = [[10.7, 59.9], [10.8, 59.9]]
    expect(polylineDist([10.75, 59.91], [line])).toBeCloseTo(dist([10.75, 59.91], [10.75, 59.9]), -1)
    expect(polylineDist([10.6, 59.9], [line])).toBeCloseTo(dist([10.6, 59.9], [10.7, 59.9]), -1)
    expect(polylineDist([10.7, 59.9], [])).toBe(Infinity)
  })

  it('Jernbanetorget ligger nærmere kysten enn Sognsvann', () => {
    expect(shapeDist(real, 'coast', pos('Jernbanetorget'))).toBeLessThan(1000)
    expect(shapeDist(real, 'coast', pos('Sognsvann'))).toBeGreaterThan(5000)
    const body: QuestionBody = { kind: 'geodist', ref: 'coast', pos: pos('Majorstuen') }
    expect(autoAnswer(q(body), hider('Jernbanetorget'), real)!.answer).toBe('closer')
    expect(autoAnswer(q(body), hider('Sognsvann'), real)!.answer).toBe('further')
    const closer = solve([q(body, 'closer')], real, settings).stations.map((s) => s.name)
    expect(closer).toContain('Jernbanetorget')
    expect(closer).not.toContain('Sognsvann')
  })

  it('kystsvaret tegnes som et område, og i endgame skjærer det sonen', () => {
    const body: QuestionBody = { kind: 'geodist', ref: 'coast', pos: pos('Majorstuen') }
    const d = shapeDist(real, 'coast', pos('Majorstuen'))
    const t = performance.now()
    const area = applyQuestion(WORLD, q(body, 'closer'), real)!
    expect(performance.now() - t).toBeLessThan(3000)
    // Rutene er grove over hele kartet, så det sjekkes bare godt unna kanten.
    expect(booleanPointInPolygon(pos('Jernbanetorget'), area)).toBe(true)
    expect(booleanPointInPolygon(pos('Sognsvann'), area)).toBe(false)

    // Endgame ved Majorstuen: sonen deles der avstanden til kysten er lik seekerens.
    const zone = disc(pos('Majorstuen'), 500)
    const cut = applyQuestion(zone, q({ kind: 'geodist', ref: 'coast', pos: pos('Majorstuen') }, 'closer'), real)!
    expect(cut).not.toBeNull()
    for (const [dx, dy] of [[-0.006, -0.002], [0.006, 0.003], [0, -0.004], [0.002, 0.004]]) {
      const p: LngLat = [pos('Majorstuen')[0] + dx, pos('Majorstuen')[1] + dy]
      const off = shapeDist(real, 'coast', p) - d
      // Mer enn 30 m fra kanten skal fasiten stemme.
      if (Math.abs(off) > 30 && booleanPointInPolygon(p, zone)) expect(booleanPointInPolygon(p, cut)).toBe(off < 0)
    }
    const further = applyQuestion(zone, q({ kind: 'geodist', ref: 'coast', pos: pos('Majorstuen') }, 'further'), real)
    expect(further).not.toBeNull()
  })

  it('Sognsvann stasjon ligger rett ved vannet', () => {
    expect(shapeDist(real, 'water', pos('Sognsvann'))).toBeLessThan(500)
    const body: QuestionBody = { kind: 'geodist', ref: 'water', pos: pos('Sognsvann') }
    expect(autoAnswer(q(body), hider('Carl Berners plass'), real)!.answer).toBe('further')
  })

  it('riksgrensen ligger øst for Oslo, så østlige stasjoner er nærmere', () => {
    const east = shapeDist(real, 'riks', pos('Ellingsrudåsen'))
    const west = shapeDist(real, 'riks', pos('Kolsås'))
    expect(east).toBeGreaterThan(50000)
    expect(east).toBeLessThan(110000)
    expect(west - east).toBeGreaterThan(15000)
  })

  it('alle stasjoner ligger på fastlandet, og en øy i fjorden er en annen landmasse', () => {
    expect(stations.every((s) => landmassOf(real, stationPos(s)) === -1)).toBe(true)
    const hovedoya: LngLat = [10.7285, 59.895]
    expect(landmassOf(real, hovedoya)).toBeGreaterThanOrEqual(0)
    const body: QuestionBody = { kind: 'landmass', pos: hovedoya }
    expect(autoAnswer(q(body), hider('Tøyen'), real)!.answer).toBe('no')
    expect(autoAnswer(q({ kind: 'landmass', pos: pos('Majorstuen') }), hider('Tøyen'), real)!.answer).toBe('yes')
    expect(solve([q(body, 'yes')], real, settings).stations).toHaveLength(0)
  })
})

describe('hiders stasjon', () => {
  // Stortinget og Jernbanetorget ligger så tett at sonene overlapper.
  const between: LngLat = [(pos('Stortinget')[0] + pos('Jernbanetorget')[0]) / 2, (pos('Stortinget')[1] + pos('Jernbanetorget')[1]) / 2]

  it('hider kan velge blant stasjonene som har hider i sonen', () => {
    const reach = stationsInReach(stations, between, 400).map((s) => s.name)
    expect(reach).toContain('Stortinget')
    expect(reach).toContain('Jernbanetorget')
    expect(reach).not.toContain('Majorstuen')
  })

  it('valget står så lenge hider er i sonen, ellers gjelder den nærmeste', () => {
    expect(hiderStation(stations, between, 400, byName('Stortinget').id).name).toBe('Stortinget')
    expect(hiderStation(stations, between, 400, byName('Jernbanetorget').id).name).toBe('Jernbanetorget')
    expect(hiderStation(stations, pos('Kolsås'), 400, byName('Stortinget').id).name).toBe('Kolsås')
    expect(hiderStation(stations, pos('Tøyen'), 400, null).name).toBe('Tøyen')
  })
})

describe('steder utenfor kartgrensen finnes ikke', () => {
  const far = { name: 'Gardermoen', pos: [11.1, 60.19] as LngLat }
  const full: GeoData = { ...data, poi: { ...data.poi, flyplass: [far] }, shapes: { riks: [[[12.5, 59.0], [12.5, 61.0]]], coast: [[[10.7, 59.905], [10.76, 59.905]]] } }
  const clipped = clipData(full, autoPlayArea(stations, settings))
  const hider = { pos: pos('Tøyen'), station: byName('Tøyen') }

  it('uten spillområde er alt med', () => {
    expect(clipData(full, null)).toBe(full)
    expect(autoAnswer(q({ kind: 'nearest', poiType: 'flyplass', pos: pos('Majorstuen') }), hider, full)!.answer).toBe('yes')
  })

  it('flyplassen og riksgrensen utenfor området gir nullsvar, og kartet krymper ikke', () => {
    expect(clipped.poi.flyplass).toEqual([])
    expect(clipped.poi.kino).toHaveLength(3)
    expect(clipped.shapes.riks).toEqual([])
    expect(clipped.shapes.coast).toHaveLength(1)
    const airport: QuestionBody = { kind: 'nearest', poiType: 'flyplass', pos: pos('Majorstuen') }
    expect(autoAnswer(q(airport), hider, clipped)!.answer).toBe(ANSWER_NULL)
    expect(autoAnswer(q({ kind: 'measure', ref: 'flyplass', pos: pos('Majorstuen') }), hider, clipped)!.answer).toBe(ANSWER_NULL)
    expect(autoAnswer(q({ kind: 'geodist', ref: 'riks', pos: pos('Majorstuen') }), hider, clipped)!.answer).toBe(ANSWER_NULL)
    expect(autoAnswer(q({ kind: 'geodist', ref: 'coast', pos: pos('Majorstuen') }), hider, clipped)!.answer).toBe('closer')
    expect(solve([q(airport, ANSWER_NULL)], clipped, settings).stations).toHaveLength(101)
  })

  it('data som ikke er lastet inn gir ikke noe forslag', () => {
    expect(autoAnswer(q({ kind: 'nearest', poiType: 'museum', pos: pos('Majorstuen') }), hider, clipped)).toBeNull()
    expect(autoAnswer(q({ kind: 'geodist', ref: 'water', pos: pos('Majorstuen') }), hider, { ...clipped, shapes: {} })).toBeNull()
  })

  it('tentacles uten noen steder innen rekkevidde gir nullsvar', () => {
    const none: QuestionBody = { kind: 'tentacles', poiType: 'kino', pos: pos('Kolsås'), radiusM: 2000 }
    expect(autoAnswer(q(none), hider, data)!.answer).toBe(ANSWER_NULL)
  })
})

describe('kort', () => {
  const radar = (id: string, item: string, answer: string | null, time = 0): Question => ({ id, time, answer, item, kind: 'radar', center: pos('Majorstuen'), radiusM: 1000 })

  it('Veto og Randomize krymper ikke kartet', () => {
    expect(names([radar('a', 'r-1000', ANSWER_VETO)])).toHaveLength(101)
    expect(names([radar('a', 'r-1000', ANSWER_RANDOM)])).toHaveLength(101)
  })

  it('Veto regnes som stilt, Randomize gjør det ikke', () => {
    expect(usedKeys([radar('a', 'r-1000', ANSWER_VETO)]).has('r-1000')).toBe(true)
    expect(usedKeys([radar('a', 'r-1000', ANSWER_RANDOM)]).has('r-1000')).toBe(false)
  })

  it('Randomize velger et ustilt og åpent spørsmål i samme kategori', () => {
    const asked = [radar('a', 'r-500', 'in'), radar('b', 'r-2000', null)]
    const locks = { drained: ['r-5000'] }
    const picks = new Set(Array.from({ length: 200 }, (_, n) => randomSwap(asked[1], asked, settings, locks, () => n / 200)?.id))
    expect(picks.has('r-500')).toBe(false)
    expect(picks.has('r-2000')).toBe(false)
    expect(picks.has('r-5000')).toBe(false)
    expect(picks.has('r-1000')).toBe(true)
    expect([...picks].every((id) => id?.startsWith('r-'))).toBe(true)
  })

  it('Drained Brain og Spotty Memory stenger spørsmål', () => {
    const r = ITEMS.find((i) => i.id === 'r-1000')!
    expect(lockedBy(r, {})).toBeNull()
    expect(lockedBy(r, { drained: ['r-1000'] })).toBe('Drained Brain')
    expect(lockedBy(r, { spotty: 'Radar' })).toBe('Spotty Memory')
    expect(lockedBy(r, { spotty: 'Photos' })).toBeNull()
  })

  it('etter Move krymper bare spørsmål stilt etter flyttingen kartet', () => {
    const before = radar('a', 'r-1000', 'in', 1)
    expect(solve([before], data, settings).stations.length).toBeLessThan(101)
    expect(solve([before], data, settings, null, 2).stations).toHaveLength(101)
    expect(solve([before, radar('b', 'r-1000', 'in', 3)], data, settings, null, 2).stations.length).toBeLessThan(101)
  })
})

describe('oppslag hos Kartverket', () => {
  const at = (item: string, subject: string, family: 'matching' | 'measuring'): Question => ({ id: 'q', time: 0, answer: null, item, kind: 'manual', family, subject, pos: pos('Jernbanetorget') })
  const hider = { pos: pos('Majorstuen'), station: byName('Majorstuen') }
  const heights = (h: number, s: number) => (_: string, p: LngLat) => ({ status: 'ok' as const, height: p === hider.pos ? h : s })
  const streets = (h: string[], s: string[]) => (_: string, p: LngLat) => ({ status: 'ok' as const, streets: (p === hider.pos ? h : s).map((name, i) => ({ name, d: 10 + i * 40 })) })

  it('havnivå: lavere enn seeker er nærmere', () => {
    const q = at('me-sealevel', 'havnivå (høyde over havet)', 'measuring')
    expect(autoAnswer(q, hider, data, heights(12, 80))?.answer).toBe('closer')
    expect(autoAnswer(q, hider, data, heights(80, 12))?.answer).toBe('further')
    expect(autoAnswer(q, hider, data, heights(80, 12))?.marginM).toBe(68)
  })

  it('gate: samme nærmeste gate gir ja', () => {
    const q = at('m-street', 'gate eller sti', 'matching')
    expect(autoAnswer(q, hider, data, streets(['Bogstadveien', 'Kirkeveien'], ['Bogstadveien']))?.answer).toBe('yes')
    expect(autoAnswer(q, hider, data, streets(['Kirkeveien'], ['Bogstadveien']))?.answer).toBe('no')
  })

  it('uten svar fra Kartverket må hider svare selv', () => {
    const q = at('me-sealevel', 'havnivå (høyde over havet)', 'measuring')
    expect(autoAnswer(q, hider, data)).toBeNull()
    expect(autoAnswer(q, hider, data, () => ({ status: 'error' }))).toBeNull()
    expect(autoAnswer(q, hider, data, () => undefined)).toBeNull()
  })
})
