import {
  bboxPolygon,
  booleanIntersects,
  booleanPointInPolygon,
  circle,
  convex,
  difference,
  distance,
  featureCollection,
  intersect,
  pointToPolygonDistance,
  polygon,
  union,
} from '@turf/turf'
import type { AdminArea, AdminLevel, Area, GeoData, LngLat, Poi, Question, Settings, Station } from './types'

/** Ytre ramme for alt som regnes ut. Dekker hele T-banenettet med god margin. */
export const BOUNDS: [number, number, number, number] = [10.2, 59.7, 11.25, 60.2]
export const WORLD: Area = bboxPolygon(BOUNDS)

export const FIXED_REFS: Record<string, Poi> = {
  slottet: { name: 'Slottet', pos: [10.7275, 59.917] },
  holmenkollen: { name: 'Holmenkollbakken', pos: [10.6678, 59.9638] },
}

export const POI_TYPES: { key: string; label: string }[] = [
  { key: 'kino', label: 'Kino' },
  { key: 'sykehus', label: 'Sykehus' },
  { key: 'museum', label: 'Museum' },
  { key: 'park', label: 'Park' },
  { key: 'bibliotek', label: 'Bibliotek' },
  { key: 'universitet', label: 'Universitet' },
  { key: 'svommehall', label: 'Svømmehall' },
  { key: 'hoyeste_bygninger', label: 'Høy bygning' },
]

export const ADMIN_LEVELS: { key: AdminLevel; label: string }[] = [
  { key: 'fylke', label: 'Fylke' },
  { key: 'kommune', label: 'Kommune' },
  { key: 'bydel', label: 'Bydel' },
  { key: 'postsone', label: 'Postsone (3 første siffer)' },
  { key: 'postnummer', label: 'Postnummer' },
]

export const POSITIVE: Record<string, string> = { radar: 'in', thermometer: 'warmer', measure: 'closer' }
export const NEGATIVE: Record<string, string> = { radar: 'out', thermometer: 'colder', measure: 'further' }

const GAP_M = 300

/** Avstand i meter. */
export const dist = (a: LngLat, b: LngLat) => distance(a, b, { units: 'meters' })
export const stationPos = (s: Station): LngLat => [s.lon, s.lat]
const disc = (c: LngLat, radiusM: number, steps = 64): Area => circle(c, radiusM / 1000, { steps, units: 'kilometers' })

// Voronoi og midtnormaler regnes i et lokalt plan der én enhet er like lang
// i begge retninger. Rå lengde/breddegrader ville strukket alt med 2x øst-vest på 60°N.
const LON0 = 10.75
const LAT0 = 59.93
const K = Math.cos((LAT0 * Math.PI) / 180)
type P = [number, number]
const proj = (p: LngLat): P => [(p[0] - LON0) * K, p[1] - LAT0]
const unproj = (p: P): LngLat => [p[0] / K + LON0, p[1] + LAT0]

/** Klipper et konvekst polygon til halvplanet som er nærmere a enn b. */
function clipCloser(poly: P[], a: P, b: P): P[] {
  const nx = b[0] - a[0]
  const ny = b[1] - a[1]
  const c = (b[0] ** 2 + b[1] ** 2 - a[0] ** 2 - a[1] ** 2) / 2
  const f = (p: P) => p[0] * nx + p[1] * ny - c
  const out: P[] = []
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i]
    const nxt = poly[(i + 1) % poly.length]
    const fc = f(cur)
    const fn = f(nxt)
    if (fc <= 0) out.push(cur)
    if ((fc < 0 && fn > 0) || (fc > 0 && fn < 0)) {
      const t = fc / (fc - fn)
      out.push([cur[0] + (nxt[0] - cur[0]) * t, cur[1] + (nxt[1] - cur[1]) * t])
    }
  }
  return out
}

/** Området (innenfor BOUNDS) som ligger nærmere `site` enn alle `others`. */
export function voronoiCell(site: LngLat, others: LngLat[]): Area | null {
  const [w, s, e, n] = BOUNDS
  let poly: P[] = [proj([w, s]), proj([e, s]), proj([e, n]), proj([w, n])]
  const a = proj(site)
  for (const o of others) {
    if (o[0] === site[0] && o[1] === site[1]) continue
    poly = clipCloser(poly, a, proj(o))
    if (poly.length < 3) return null
  }
  const ring = poly.map(unproj)
  return polygon([[...ring, ring[0]]])
}

export function nearestPoi(pois: Poi[], pos: LngLat): Poi | null {
  let best: Poi | null = null
  let bestD = Infinity
  for (const p of pois) {
    const d = dist(p.pos, pos)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best
}

export function nearestStation(stations: Station[], pos: LngLat): Station {
  return stations.reduce((a, b) => (dist(stationPos(a), pos) <= dist(stationPos(b), pos) ? a : b))
}

/** Det administrative området et punkt ligger i, på gitt nivå. */
const zoneCache = new WeakMap<AdminArea[], Map<AdminLevel, AdminArea[]>>()

/**
 * Alle områdene på et nivå. Postsoner finnes ikke i dataene: de lages ved å slå
 * sammen postnumrene som deler de tre første sifrene (0368 og 0369 blir «036x»).
 */
export function levelAreas(data: GeoData, level: AdminLevel): AdminArea[] {
  let cache = zoneCache.get(data.admin)
  if (!cache) zoneCache.set(data.admin, (cache = new Map()))
  let areas = cache.get(level)
  if (areas) return areas
  if (level === 'postsone') {
    const groups = new Map<string, AdminArea[]>()
    for (const f of levelAreas(data, 'postnummer')) {
      const zone = f.properties.name.slice(0, 3)
      groups.set(zone, [...(groups.get(zone) ?? []), f])
    }
    areas = [...groups].map(([zone, feats]) => {
      const merged = feats.length === 1 ? feats[0] : union(featureCollection(feats))!
      return { ...merged, properties: { name: `${zone}x`, level } }
    })
  } else {
    areas = data.admin.filter((f) => f.properties.level === level)
  }
  cache.set(level, areas)
  return areas
}

export function areaAt(data: GeoData, level: AdminLevel, pos: LngLat) {
  const areas = levelAreas(data, level)
  const hit = areas.find((f) => booleanPointInPolygon(pos, f))
  if (hit || areas.length === 0) return hit ?? null
  // Grensene er forenklet og kan ha små glipper. Da gjelder nærmeste område.
  const near = areas
    .map((f) => ({ f, d: pointToPolygonDistance(pos, f, { units: 'meters' }) }))
    .reduce((a, b) => (a.d <= b.d ? a : b))
  return near.d <= GAP_M ? near.f : null
}

function refPois(data: GeoData, ref: string): Poi[] {
  return FIXED_REFS[ref] ? [FIXED_REFS[ref]] : (data.poi[ref] ?? [])
}

/** POI-ene en tentacles-seeker kan få som svar: de innenfor radius fra seeker. */
function tentacleCandidates(data: GeoData, q: Extract<Question, { kind: 'tentacles' }>): Poi[] {
  return (data.poi[q.poiType] ?? []).filter((p) => dist(p.pos, q.pos) <= q.radiusM)
}

export const isPositive = (q: Question) =>
  q.kind === 'tentacles' ? q.answer !== 'outside' : q.answer === 'yes' || q.answer === POSITIVE[q.kind]

/**
 * Området et spørsmål peker ut: hider er innenfor ved positivt svar og
 * utenfor ved negativt. null = spørsmålet har ingen geometri (eller data mangler).
 */
export function regionOf(q: Question, data: GeoData): Area | null {
  switch (q.kind) {
    case 'radar':
      return disc(q.center, q.radiusM)
    case 'thermometer':
      return voronoiCell(q.to, [q.from])
    case 'admin':
      return areaAt(data, q.level, q.pos)
    case 'nearest': {
      const pois = data.poi[q.poiType] ?? []
      const mine = nearestPoi(pois, q.pos)
      return mine && voronoiCell(mine.pos, pois.map((p) => p.pos))
    }
    case 'measure': {
      const pois = refPois(data, q.ref)
      const mine = nearestPoi(pois, q.pos)
      if (!mine) return null
      // «Nærmere enn meg» = innenfor min avstand fra et hvilket som helst sted av typen.
      const d = dist(mine.pos, q.pos)
      const discs = pois.map((p) => disc(p.pos, d, 32))
      return discs.length === 1 ? discs[0] : union(featureCollection(discs))
    }
    case 'tentacles': {
      const reach = disc(q.pos, q.radiusM)
      if (!q.answer || q.answer === 'outside') return reach
      const cands = tentacleCandidates(data, q)
      const hit = cands.find((p) => p.name === q.answer)
      const cell = hit && voronoiCell(hit.pos, cands.map((p) => p.pos))
      return cell ? intersect(featureCollection([cell, reach])) : null
    }
    default:
      return null
  }
}

/** Området hider kan være i før noen spørsmål er stilt. */
export function startArea(settings: Pick<Settings, 'playArea'>): Area {
  const ring = settings.playArea
  return ring && ring.length >= 3 ? polygon([[...ring, ring[0]]]) : WORLD
}

/**
 * Spillområde laget fra stasjonene: den minste konvekse rammen rundt sonene til
 * alle stasjoner på linjene som er med.
 */
export function autoPlayArea(stations: Station[], settings: Pick<Settings, 'lines' | 'zoneRadius'>): LngLat[] | null {
  const zones = stations.filter((s) => s.lines.some((l) => settings.lines.includes(l))).map((s) => disc(stationPos(s), settings.zoneRadius, 24))
  const hull = zones.length ? convex(featureCollection(zones)) : null
  // Siste punkt i ringen gjentar det første. playArea lagres uten.
  return hull ? (hull.geometry.coordinates[0].slice(0, -1) as LngLat[]) : null
}

export function applyQuestion(area: Area | null, q: Question, data: GeoData): Area | null {
  if (!area || q.answer === null) return area
  const region = regionOf(q, data)
  if (!region) return area
  const pair = featureCollection([area, region])
  return isPositive(q) ? intersect(pair) : difference(pair)
}

export function possibleStations(area: Area | null, questions: Question[], data: GeoData, settings: Settings): Station[] {
  if (!area) return []
  return data.stations.filter((s) => {
    if (!s.lines.some((l) => settings.lines.includes(l))) return false
    for (const q of questions) {
      if (q.kind !== 'line' || q.answer === null) continue
      if (s.lines.includes(q.line) !== (q.answer === 'yes')) return false
    }
    return area === WORLD || booleanIntersects(disc(stationPos(s), settings.zoneRadius, 32), area)
  })
}

export interface Step {
  /** Antall mulige stasjoner etter dette spørsmålet. */
  count: number
}

export interface Result {
  area: Area | null
  stations: Station[]
  steps: Step[]
}

export function solve(questions: Question[], data: GeoData, settings: Settings): Result {
  let area: Area | null = startArea(settings)
  const steps: Step[] = []
  questions.forEach((q, i) => {
    area = applyQuestion(area, q, data)
    steps.push({ count: possibleStations(area, questions.slice(0, i + 1), data, settings).length })
  })
  return { area, stations: possibleStations(area, questions, data, settings), steps }
}

// Skyggen går langt utenfor BOUNDS, så kanten aldri synes når man zoomer ut.
const SHADE: Area = bboxPolygon([4, 57, 18, 63])

/** Alt utenfor det mulige området, til skyggelegging på kartet. */
export function excluded(area: Area | null): Area | null {
  if (!area) return SHADE
  return area === WORLD ? null : difference(featureCollection([SHADE, area]))
}

export interface AutoAnswer {
  answer: string
  /** Hvor mange meter hider er fra å få motsatt svar. Liten margin = usikkert svar. */
  marginM?: number
  detail: string
}

const m = (d: number) => (d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`)

/** Svaret hider skal gi, regnet direkte fra hiders posisjon. */
export function autoAnswer(q: Question, hider: { pos: LngLat; station: Station }, data: GeoData): AutoAnswer | null {
  switch (q.kind) {
    case 'radar': {
      const d = dist(hider.pos, q.center)
      return { answer: d <= q.radiusM ? 'in' : 'out', marginM: Math.abs(d - q.radiusM), detail: `${m(d)} fra seeker` }
    }
    case 'thermometer': {
      const a = dist(hider.pos, q.from)
      const b = dist(hider.pos, q.to)
      return { answer: b < a ? 'warmer' : 'colder', marginM: Math.abs(a - b) / 2, detail: `${m(a)} → ${m(b)}` }
    }
    case 'line':
      return {
        answer: hider.station.lines.includes(q.line) ? 'yes' : 'no',
        detail: `${hider.station.name}: linje ${hider.station.lines.join(', ')}`,
      }
    case 'admin': {
      const mine = areaAt(data, q.level, hider.pos)
      const theirs = areaAt(data, q.level, q.pos)
      if (!mine || !theirs) return null
      const same = mine.properties.name === theirs.properties.name
      return { answer: same ? 'yes' : 'no', detail: `du: ${mine.properties.name}, seeker: ${theirs.properties.name}` }
    }
    case 'nearest': {
      const pois = data.poi[q.poiType] ?? []
      const mine = nearestPoi(pois, hider.pos)
      const theirs = nearestPoi(pois, q.pos)
      if (!mine || !theirs) return null
      return { answer: mine.name === theirs.name ? 'yes' : 'no', detail: `du: ${mine.name}, seeker: ${theirs.name}` }
    }
    case 'measure': {
      const pois = refPois(data, q.ref)
      const mine = nearestPoi(pois, hider.pos)
      const theirs = nearestPoi(pois, q.pos)
      if (!mine || !theirs) return null
      const a = dist(mine.pos, hider.pos)
      const b = dist(theirs.pos, q.pos)
      return {
        answer: a <= b ? 'closer' : 'further',
        marginM: Math.abs(a - b),
        detail: `du: ${m(a)} (${mine.name}), seeker: ${m(b)} (${theirs.name})`,
      }
    }
    case 'tentacles': {
      const d = dist(hider.pos, q.pos)
      if (d > q.radiusM) return { answer: 'outside', marginM: d - q.radiusM, detail: `${m(d)} fra seeker` }
      const mine = nearestPoi(tentacleCandidates(data, q), hider.pos)
      return mine && { answer: mine.name, marginM: q.radiusM - d, detail: `${m(dist(mine.pos, hider.pos))} unna` }
    }
    default:
      return null
  }
}

/** Kan spørsmålet stilles med dataene som er lastet? */
export function hasData(q: Pick<Question, 'kind'> & Partial<{ level: AdminLevel; poiType: string; ref: string }>, data: GeoData) {
  if (q.kind === 'admin') return !!q.level && levelAreas(data, q.level).length > 0
  if (q.kind === 'nearest' || q.kind === 'tentacles') return (data.poi[q.poiType ?? ''] ?? []).length > 0
  if (q.kind === 'measure') return refPois(data, q.ref ?? '').length > 0
  return true
}
