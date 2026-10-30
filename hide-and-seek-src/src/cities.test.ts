import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CITIES, MODES, cityOf, linesOf, modeOf, modesOf, setActiveModes, setCity, transit } from './cities'
import { describe as describeQuestion } from './form'
import { POI_TYPES, dist, setBounds, solve, stationPos, transitStops } from './geo'
import type { GeoData, Question, Settings, Station } from './types'

const read = (id: string, file: string) => JSON.parse(readFileSync(`public/data/${id}/${file}`, 'utf8'))

function load(id: string): GeoData {
  const lines = read(id, 'lines.geojson')
  const admin = existsSync(`public/data/${id}/admin.geojson`) ? read(id, 'admin.geojson').features : []
  return { stations: read(id, 'stations.json').stations, lines, admin, shapes: {}, islands: [], poi: {} }
}

const settings = (lines: string[]): Settings => ({ city: 'x', zoneRadius: 400, lines, day: 'wk', hourFrom: 10, hourTo: 18, adminLevel: 'bydel', theme: 'auto', basemap: 'clean', size: 'M', playArea: null })

describe.each(['bergen', 'stavanger', 'trondheim'])('%s', (id) => {
  const c = cityOf(id)
  const data = load(id)
  const lineIds = data.lines.features.map((f) => f.properties.line)
  const [w, s, e, n] = c.bounds

  it('har buss, og bare de transportmidlene som finnes i dataene', () => {
    expect(c.id).toBe(id)
    expect(c.modes).toContain('bus')
    const inData = new Set(data.lines.features.map((f) => f.properties.mode))
    expect(new Set(c.modes)).toEqual(inData)
    expect(c.modes.some((m) => MODES[m].rail)).toBe(false)
  })

  it('har bybusslinjene med holdeplasser i kjørerekkefølge', () => {
    expect(lineIds.length).toBeGreaterThanOrEqual(20)
    const ids = new Set(data.stations.map((x) => x.id))
    for (const f of data.lines.features) {
      expect(f.properties.stations!.length).toBeGreaterThanOrEqual(2)
      for (const sid of f.properties.stations!) expect(ids.has(sid)).toBe(true)
      expect(f.properties.name).not.toBe('')
      expect(f.properties.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('har bare holdeplasser som en linje stopper ved, og alle innenfor kartrammen', () => {
    for (const x of data.stations) {
      expect(x.lines.length).toBeGreaterThan(0)
      expect(x.lon).toBeGreaterThan(w)
      expect(x.lon).toBeLessThan(e)
      expect(x.lat).toBeGreaterThan(s)
      expect(x.lat).toBeLessThan(n)
    }
  })

  it('krymper kartet med en radar på et par sekunder', () => {
    setBounds(c.bounds)
    const center = stationPos(data.stations[0])
    const q: Question = { id: 'r', time: 0, answer: 'in', kind: 'radar', center, radiusM: 2000 }
    const t0 = performance.now()
    const r = solve([q], data, settings(lineIds))
    expect(performance.now() - t0).toBeLessThan(3000)
    expect(r.stations.length).toBeGreaterThan(0)
    expect(r.stations.length).toBeLessThan(data.stations.length)
    // Sonen må nå inn i radaren: holdeplassen er innen radius + soneradius.
    expect(r.stations.every((x: Station) => dist(stationPos(x), center) <= 2000 + 400 + 1)).toBe(true)
  })

  it('kan stille Kollektivlinje-spørsmålet på en busslinje', () => {
    const f = data.lines.features[0]
    const stops = transitStops(data, { line: f.properties.line, dir: 1, next: 1 })
    expect(stops.length).toBe(f.properties.stations!.length - 1)
  })

  it('har grenser for alle områdenivåene byen tilbyr', () => {
    if (!data.admin.length) return
    const levels = new Set(data.admin.map((a) => a.properties.level))
    for (const l of c.adminLevels.filter((x) => x.key !== 'postsone')) expect(levels.has(l.key)).toBe(true)
  })
})

describe('tekstene følger byens nett', () => {
  const onBoard = (line: string): Question => ({ id: 't', time: 0, answer: null, kind: 'transit', line, dir: 1, next: 1 })

  it('sier «bussen» og «bussholdeplass» når bare bussen er med', () => {
    const data = load('stavanger')
    setCity(cityOf('stavanger'))
    setActiveModes(['bus'])
    expect(describeQuestion(onBoard(data.lines.features[0].properties.line), data)).toMatch(/^Stopper bussen vi sitter på/)
    expect(POI_TYPES.find((t) => t.key === 'jernbanestasjon')!.label).toBe('jernbanestasjon')
    expect(transit().stop).toBe('bussholdeplass')
  })

  it('sier «holdeplass» og «linje» når flere transportmidler er med', () => {
    setCity(cityOf('bergen'))
    setActiveModes(['lightrail', 'bus'])
    expect(transit().stop).toBe('holdeplass')
    setActiveModes(['lightrail'])
    expect(transit().vehicle).toBe('Bybanen')
  })

  it('sier fortsatt «T-banen» i Oslo med bare T-banen', () => {
    const data = load('oslo')
    setCity(CITIES[0])
    setActiveModes(['metro'])
    expect(describeQuestion(onBoard('1'), data)).toMatch(/^Stopper T-banen vi sitter på/)
    expect(POI_TYPES.find((t) => t.key === 'jernbanestasjon')!.label).toBe('jernbane- eller T-banestasjon')
  })
})

describe('trikk og buss i Oslo', () => {
  const data = load('oslo')
  setCity(CITIES[0])

  it('har T-banen, trikken og buss 20, og T-banen er med fra start', () => {
    expect(new Set(data.lines.features.map((f) => modeOf(f)))).toEqual(new Set(['metro', 'tram', 'bus']))
    expect(linesOf(data, ['bus'])).toEqual(['20'])
    expect(linesOf(data, CITIES[0].defaultModes)).toEqual(['1', '2', '3', '4', '5'])
    expect(linesOf(data, ['tram']).length).toBeGreaterThanOrEqual(5)
  })

  it('vet hvilke transportmidler som er med ut fra linjene', () => {
    expect(modesOf(data, ['1', '2'])).toEqual(['metro'])
    expect(modesOf(data, ['1', linesOf(data, ['tram'])[0]])).toEqual(['metro', 'tram'])
    expect(modesOf(data, [])).toEqual([])
  })

  it('har de samme T-banestasjonene som før, og egne trikkeholdeplasser', () => {
    const metro = data.stations.filter((s) => s.lines.some((l) => ['1', '2', '3', '4', '5'].includes(l)))
    expect(metro).toHaveLength(101)
    expect(data.stations.length).toBeGreaterThan(150)
  })

  it('lar Kollektivlinje-spørsmålet bruke en trikkelinje', () => {
    const f = data.lines.features.find((x) => modeOf(x) === 'tram')!
    expect(transitStops(data, { line: f.properties.line, dir: 1, next: 1 }).length).toBe(f.properties.stations!.length - 1)
  })
})
