/**
 * Simulerte runder: spiller en runde i en by, slik appen gjør det: seekerne stiller alle spørsmålene byen
 * har data til, hider svarer ut fra der hen faktisk står (`autoAnswer`), og kartet krymper
 * (`solve`). Det viktigste: hiders stasjon skal aldri bli utelukket av riktige svar.
 *
 * Testfilene ved siden av (`<by>-<del>.test.ts`) kjører hver sin del, så de går parallelt.
 * Kjøres med `npm run test:sim`, eller én by: `npx vitest run src/sim/bergen`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { booleanPointInPolygon, destination } from '@turf/turf'
import { beforeEach, describe, expect, it } from 'vitest'
import { cityOf, linesOf, setActiveModes, setCity, type City, type Mode } from '../cities'
import { loadData } from '../data'
import { answerOptions, describe as describeQuestion } from '../form'
import { ANSWER_CANT, ANSWER_NULL, METRO_LINES, POI_TYPES, autoAnswer, informs, clipData, dist, hasData, levelAreas, nearestStation, onlyLines, setBounds, solve, stationPos } from '../geo'
import type { GeoData, LngLat, Question, QuestionBody, Settings, ShapeKey, Station } from '../types'

const read = (id: string) => async (path: string) => {
  const file = `public/data/${id}/${path}`
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
}

const ZONE = 400
const settingsFor = (city: City, lines: string[]): Settings => ({
  city: city.id,
  zoneRadius: ZONE,
  lines,
  day: 'wk',
  hourFrom: 10,
  hourTo: 18,
  adminLevel: 'bydel',
  theme: 'auto',
  basemap: 'clean',
  size: 'L',
  playArea: null,
})

/** Et sted i hiders sone: et stykke fra stasjonen i en fast retning. */
const spotNear = (s: Station, m: number, bearing: number): LngLat => destination(stationPos(s), m / 1000, bearing, { units: 'kilometers' }).geometry.coordinates as LngLat

/** Alle spørsmålene seekerne kan stille fra et sted, med det byen har data til. */
function questionsFrom(pos: LngLat, toward: LngLat, data: GeoData, city: City): QuestionBody[] {
  const qs: QuestionBody[] = [
    { kind: 'radar', center: pos, radiusM: 5000 },
    { kind: 'radar', center: pos, radiusM: 2000 },
    { kind: 'radar', center: pos, radiusM: 1000 },
    // Seekerne reiser en kilometer mot sentrum av nettet.
    { kind: 'thermometer', from: pos, to: destination(pos, 1, bearing(pos, toward), { units: 'kilometers' }).geometry.coordinates as LngLat, minM: 1000 },
    { kind: 'namelen', pos },
  ]
  for (const l of city.adminLevels) qs.push({ kind: 'admin', level: l.key, pos })
  for (const level of ['fylke', 'kommune'] as const) if (levelAreas(data, level).length) qs.push({ kind: 'border', level, pos })
  for (const t of POI_TYPES) {
    if (!(t.key in data.poi)) continue
    qs.push({ kind: 'nearest', poiType: t.key, pos }, { kind: 'measure', ref: t.key, pos })
  }
  for (const k of ['museum', 'kino', 'bibliotek', 'sykehus']) if (k in data.poi) qs.push({ kind: 'tentacles', poiType: k, pos, radiusM: 2000 })
  qs.push({ kind: 'tentacles', poiType: METRO_LINES, pos, radiusM: 25000 })
  for (const ref of ['coast', 'water', 'riks'] as ShapeKey[]) if (ref in data.shapes) qs.push({ kind: 'geodist', ref, pos })
  if ('coast' in data.shapes) qs.push({ kind: 'landmass', pos })
  // Om bord på en linje som går fra seekers nærmeste stasjon.
  const here = nearestStation(data.stations, pos)
  const f = data.lines.features.find((x) => x.properties.stations?.includes(here.id))
  if (f) {
    const i = f.properties.stations!.indexOf(here.id)
    const dir = i < f.properties.stations!.length - 1 ? 1 : -1
    qs.push({ kind: 'transit', line: f.properties.line, dir, next: i + dir })
  }
  return qs
}

function bearing(a: LngLat, b: LngLat) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b[0] - a[0])) * Math.cos(toRad(b[1]))
  const x = Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) - Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(toRad(b[0] - a[0]))
  return (Math.atan2(y, x) * 180) / Math.PI
}

interface Played {
  questions: Question[]
  asked: number
  skipped: string[]
  before: number
  after: number
  ms: number
}

/** Spiller en runde: seekerne står tre steder i nettet og stiller alt de kan, hider svarer. */
/** Hvor nær kanten hider kan stå før kartet ikke kan avgjøre det. Rutenettet er grovt når hele kartet er med. */
const EDGE_M: Partial<Record<Question['kind'], number>> = { measure: 700, geodist: 700, border: 700 }
const DEFAULT_EDGE_M = 60

/**
 * Spiller en runde: seekerne står tre steder i nettet og stiller alt de kan, hider svarer.
 * Hvert spørsmål krymper kartet uavhengig av de andre, så hvert sjekkes for seg: hiders
 * stasjon skal aldri utelukkes, og der hider står skal være innenfor området seekerne ser.
 */
function play(data: GeoData, settings: Settings, city: City, hider: { pos: LngLat; station: Station }, seekerStops: Station[]): Played {
  const center = stationPos(data.stations[Math.floor(data.stations.length / 2)])
  const questions: Question[] = []
  const skipped: string[] = []
  let t = 0
  for (const s of seekerStops) {
    for (const body of questionsFrom(stationPos(s), center, data, city)) {
      const q = { ...body, id: `q${questions.length}`, time: (t += 60000), answer: null } as Question
      if (!hasData(q, data)) continue
      const a = autoAnswer(q, hider, data)
      if (!a) {
        skipped.push(q.kind)
        continue
      }
      const answered = { ...q, answer: a.answer, answeredAt: t + 1000 } as Question
      const text = `${q.kind}: ${describeQuestion(q, data)}, svar ${a.answer}`
      // Teksten i loggen må kunne lages for alle spørsmål.
      expect(text.length).toBeGreaterThan(20)
      const one = solve([answered], data, settings)
      if (!one.stations.some((x) => x.id === hider.station.id)) throw new Error(`${text}: utelukket hiders stasjon ${hider.station.name}`)
      const edge = EDGE_M[q.kind] ?? DEFAULT_EDGE_M
      if (one.area && (a.marginM ?? Infinity) > edge && !booleanPointInPolygon(hider.pos, one.area)) {
        throw new Error(`${text}: la hider (${Math.round(a.marginM ?? 0)} m fra kanten) utenfor det mulige området`)
      }
      questions.push(answered)
    }
  }
  // Hele runden på én gang, som appen regner den.
  const t0 = performance.now()
  const result = solve(questions, data, settings)
  const ms = performance.now() - t0
  expect(result.stations.map((x) => x.id)).toContain(hider.station.id)
  return { questions, asked: questions.length, skipped, before: data.stations.length, after: result.stations.length, ms }
}

/** Der hider står ved hvert svar i midgame: rundt i sonen, men innenfor den. */
const WANDER: [number, number][] = [
  [0, 0],
  [150, 30],
  [300, 120],
  [220, 210],
  [320, 300],
  [80, 260],
]
const WRONG_EVERY = 6
const MANUAL_EVERY = 7

interface Messy {
  questions: Question[]
  wrong: number
  manual: number
  before: number
  after: number
  /** Ville de feile svarene ha utelukket hiders stasjon hvis seekerne ikke tok dem ut? */
  wrongHurts: boolean
}

/**
 * Midgame slik det går i virkeligheten: hider flytter seg i sonen mellom svarene, noen svar
 * er feil (GPS-en bommet, eller hider trykket feil) og seekerne tar dem ut av kartet, og noen
 * svar gir hider for hånd. Hiders stasjon skal aldri utelukkes av svarene som står igjen.
 */
function playMidgame(data: GeoData, settings: Settings, city: City, station: Station, seekerStops: Station[]): Messy {
  const center = stationPos(data.stations[Math.floor(data.stations.length / 2)])
  const questions: Question[] = []
  let wrong = 0
  let manual = 0
  let t = 0
  for (const s of seekerStops) {
    for (const body of questionsFrom(stationPos(s), center, data, city)) {
      const q = { ...body, id: `q${questions.length}`, time: (t += 60000), answer: null } as Question
      if (!hasData(q, data)) continue
      const [m, b] = WANDER[questions.length % WANDER.length]
      const pos = spotNear(station, m, b)
      const a = autoAnswer(q, { pos, station }, data)
      if (!a) continue
      const n = questions.length + 1
      // Et feil svar: et annet av svarene spørsmålet har. Nullsvar og «kan ikke svare» krymper ikke, så de brukes ikke.
      const other = answerOptions(q, data).find((o) => o !== a.answer && o !== ANSWER_NULL && o !== ANSWER_CANT)
      if (n % WRONG_EVERY === 0 && other) {
        wrong++
        questions.push({ ...q, answer: other, answeredAt: t + 1000, ignored: true } as Question)
        continue
      }
      const byHand = n % MANUAL_EVERY === 0
      if (byHand) manual++
      const answered = { ...q, answer: a.answer, answeredAt: t + 1000, ...(byHand ? { manual: true } : {}) } as Question
      // Hvert riktige svar for seg, der hider sto da, utelukker aldri stasjonen.
      const one = solve([answered], data, settings)
      if (!one.stations.some((x) => x.id === station.id)) throw new Error(`${q.kind}: ${describeQuestion(q, data)}, svar ${a.answer} ${m} m fra ${station.name}: utelukket stasjonen`)
      questions.push(answered)
    }
  }
  const result = solve(questions, data, settings)
  expect(result.stations.map((x) => x.id)).toContain(station.id)
  const unchecked = solve(questions.map(({ ignored: _, ...q }) => q as Question), data, settings)
  return {
    questions,
    wrong,
    manual,
    before: data.stations.length,
    after: result.stations.length,
    wrongHurts: !unchecked.stations.some((x) => x.id === station.id),
  }
}

/** Gjemmesteder spredt utover nettet, og hvor seekerne stiller spørsmål fra. */
function scenarios(data: GeoData) {
  const sorted = [...data.stations].sort((a, b) => a.lat - b.lat || a.lon - b.lon)
  const at = (f: number) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))]
  return [0.15, 0.5, 0.85].map((f, i) => {
    const station = at(f)
    // Hider står et stykke fra stasjonen, i sonen.
    const pos = spotNear(station, [150, 300, 250][i], [40, 200, 300][i])
    const seekers = [at((f + 0.5) % 1), at((f + 0.3) % 1), at((f + 0.1) % 1)]
    return { station, pos, seekers }
  })
}

/** Delene av en by: gjemmested 1, 2 og 3, midgame med feil underveis, og endgame. */
export type Part = 0 | 1 | 2 | 'midgame' | 'endgame'

/** Definerer testene for en by. `parts` velger hvilke deler denne filen kjører. */
export function simulateCity(cityId: string, parts: Part[]) {
  const city = cityOf(cityId)
  describe(`simulert runde i ${city.name}`, async () => {
    const raw = await loadData(city.id, read(city.id))
    // Med alt som finnes, og med det byen har med fra start.
    const configs: [string, Mode[]][] = [['alle transportmidler', city.modes]]
    if (city.defaultModes.length !== city.modes.length) configs.push([city.defaultModes.join(' + '), city.defaultModes])

    for (const [label, modes] of configs) {
      describe(label, () => {
        const lines = linesOf(raw, modes)
        const settings = settingsFor(city, lines)
        const data = onlyLines(clipData(raw, null), lines)
        // Byen og kartrammen er globale. Hver test setter sin egen, uansett hvilken by som ble lastet sist.
        beforeEach(() => {
          setCity(city)
          setBounds(city.bounds)
          setActiveModes(modes)
        })

        it('har bare stasjoner og linjer som er med', () => {
          expect(data.stations.length).toBeGreaterThan(20)
          for (const s of data.stations) expect(s.lines.every((l) => lines.includes(l))).toBe(true)
        })

        for (const [i, sc] of scenarios(data).entries()) {
          if (!parts.includes(i as Part)) continue
          it(`hider ved ${sc.station.name}: alle svar stemmer, og stasjonen blir aldri utelukket`, { timeout: 180000 }, () => {
            const r = play(data, settings, city, { pos: sc.pos, station: sc.station }, sc.seekers)
            // Seekerne kom et godt stykke på vei.
            expect(r.after).toBeLessThan(r.before / 4)
            expect(r.asked).toBeGreaterThan(15)
            // Svarene regnes ut på telefonen, så de må være raske.
            expect(r.ms).toBeLessThan(30000)
            console.log(`${city.name} (${label}) #${i + 1} ${sc.station.name}: ${r.asked} spørsmål, ${r.before} → ${r.after} stasjoner, ${Math.round(r.ms)} ms${r.skipped.length ? `, svarer selv: ${[...new Set(r.skipped)].join(', ')}` : ''}`)
          })
        }

        if (parts.includes('midgame')) {
          it('midgame: hider flytter seg, feile svar tas ut av kartet, og stasjonen blir aldri utelukket', { timeout: 180000 }, () => {
            const sc = scenarios(data)[0]
            const r = playMidgame(data, settings, city, sc.station, sc.seekers)
            expect(r.wrong).toBeGreaterThanOrEqual(3)
            expect(r.manual).toBeGreaterThanOrEqual(2)
            // Feile svar som er tatt ut, teller ikke, men spørsmålene er stilt.
            expect(r.questions.filter((q) => q.ignored).every((q) => informs(q))).toBe(true)
            expect(r.after).toBeLessThan(r.before / 2)
            // Testen betyr noe bare hvis de feile svarene ville gjort skade uten at seekerne tok dem ut.
            expect(r.wrongHurts).toBe(true)
            console.log(`${city.name} (${label}) midgame ${sc.station.name}: ${r.questions.length} spørsmål, ${r.wrong} feil tatt ut, ${r.manual} for hånd, ${r.before} → ${r.after} stasjoner${r.wrongHurts ? ', de feile svarene ville utelukket hider' : ''}`)
          })
        }

        if (!parts.includes('endgame')) return
        it('endgame: sonen krymper rundt hider og ender på riktig stasjon', { timeout: 180000 }, () => {
          const sc = scenarios(data)[1]
          const r = play(data, settings, city, { pos: sc.pos, station: sc.station }, sc.seekers)
          const endgame = { stationId: sc.station.id, time: 10 ** 9 }
          // I endgame: radarer fra kanten av sonen.
          const extra: Question[] = [0, 120, 240].map((b, k) => {
            const center = spotNear(sc.station, ZONE, b)
            const q: Question = { id: `e${k}`, time: endgame.time + k + 1, answer: null, kind: 'radar', center, radiusM: 500 }
            return { ...q, answer: autoAnswer(q, { pos: sc.pos, station: sc.station }, data)!.answer }
          })
          const res = solve([...r.questions, ...extra], data, settings, endgame)
          expect(res.stations.map((s) => s.id)).toEqual([sc.station.id])
          expect(booleanPointInPolygon(sc.pos, res.area!)).toBe(true)
          expect(dist(sc.pos, stationPos(sc.station))).toBeLessThanOrEqual(ZONE)
        })
      })
    }
  })
}
