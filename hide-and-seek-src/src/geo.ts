import {
  bbox,
  bboxPolygon,
  booleanIntersects,
  booleanPointInPolygon,
  circle,
  convex,
  difference,
  distance,
  featureCollection,
  intersect,
  isobands,
  pointGrid,
  pointToLineDistance,
  pointToPolygonDistance,
  polygon,
  union,
} from '@turf/turf'
import { DEFAULT_CITY, MODES, city, cityOf, railMode } from './cities'
import type { Lookup, LookupKind } from './online'
import type { AdminArea, AdminLevel, Area, GeoData, LngLat, Poi, Question, Settings, ShapeKey, Station } from './types'

type Box4 = [number, number, number, number]
/** Ytre ramme for alt som regnes ut. Dekker hele nettet i byen med god margin. Settes av `useBounds`. */
export let BOUNDS: Box4 = cityOf(DEFAULT_CITY).bounds
/** Hele rammen. Brukes også som merke for «ingen spillområde», så den sammenlignes på identitet. */
export let WORLD: Area = bboxPolygon(BOUNDS)
// Skyggen går langt utenfor rammen, så kanten aldri synes når man zoomer ut.
const shadeOf = ([w, s, e, n]: Box4): Area => bboxPolygon([w - 6, s - 3, e + 6, n + 3])
let SHADE: Area = shadeOf(BOUNDS)

/** Bytter rammen når en annen by lastes inn. */
export function setBounds(bounds: Box4) {
  if (bounds.every((v, i) => v === BOUNDS[i])) return
  BOUNDS = bounds
  setPlane(bounds)
  WORLD = bboxPolygon(bounds)
  SHADE = shadeOf(bounds)
}

/** `icon` er merket stedene får på kartet. */
export const POI_TYPES: { key: string; icon: string; label: string; plural: string }[] = [
  { key: 'flyplass', icon: '✈️', label: 'flyplass', plural: 'flyplasser' },
  {
    key: 'jernbanestasjon',
    icon: '🚆',
    get label() {
      const rail = railMode()
      return rail ? `jernbane- eller ${MODES[rail].stop}` : 'jernbanestasjon'
    },
    get plural() {
      const rail = railMode()
      return rail ? `jernbane- og ${MODES[rail].stop}er` : 'jernbanestasjoner'
    },
  },
  { key: 'fjell', icon: '⛰️', label: 'fjell', plural: 'fjell' },
  { key: 'park', icon: '🌳', label: 'park', plural: 'parker' },
  { key: 'fornoyelsespark', icon: '🎢', label: 'fornøyelsespark', plural: 'fornøyelsesparker' },
  { key: 'dyrepark', icon: '🦁', label: 'dyrepark', plural: 'dyreparker' },
  { key: 'akvarium', icon: '🐠', label: 'akvarium', plural: 'akvarier' },
  { key: 'golfbane', icon: '⛳', label: 'golfbane', plural: 'golfbaner' },
  { key: 'museum', icon: '🏛️', label: 'museum', plural: 'museer' },
  { key: 'kino', icon: '🎬', label: 'kino', plural: 'kinoer' },
  { key: 'sykehus', icon: '🏥', label: 'sykehus', plural: 'sykehus' },
  { key: 'bibliotek', icon: '📚', label: 'bibliotek', plural: 'biblioteker' },
  { key: 'konsulat', icon: '🚩', label: 'utenlandsk konsulat eller ambassade (ikke honorært)', plural: 'konsulater og ambassader' },
]
/** Emnet i det manuelle spørsmålet om høyhastighetsbane (se ITEMS i form.ts). */
export const HIGH_SPEED = 'høyhastighetsbane'
/** Tentacles kan også spørre om linjene i nettet, som ikke er punkter. */
export const METRO_LINES = 'metrolinje'

/** Områdenivåene i byen som er lastet inn, grovest først. */
export const adminLevels = () => city().adminLevels

const POSITIVE_ANSWERS = ['yes', 'in', 'warmer', 'closer']

/** Nullsvar: det spørsmålet handler om finnes ikke innenfor kartet. */
export const ANSWER_NULL = 'none'
/** Endgame: hider kan ikke ta bildet uten å flytte seg. */
export const ANSWER_CANT = 'cant'
/** Hider spilte Veto: seekerne får ikke svar, men spørsmålet regnes som stilt. */
export const ANSWER_VETO = 'veto'
/** Hider spilte Randomize: et annet spørsmål stilles i stedet, og dette regnes ikke som stilt. */
export const ANSWER_RANDOM = 'random'
const NEUTRAL_ANSWERS = [ANSWER_NULL, ANSWER_CANT, ANSWER_VETO, ANSWER_RANDOM]
/** Besvart med et svar som sier noe om hvor hider er. Nullsvar, «kan ikke svare» og kort som spilles i stedet for svar krymper ikke kartet. */
export const shrinks = (q: Question) => q.answer !== null && !NEUTRAL_ANSWERS.includes(q.answer)

const GAP_M = 300

/** Avstand i meter. */
export const dist = (a: LngLat, b: LngLat) => distance(a, b, { units: 'meters' })
export const stationPos = (s: Station): LngLat => [s.lon, s.lat]
export const disc = (c: LngLat, radiusM: number, steps = 64): Area => circle(c, radiusM / 1000, { steps, units: 'kilometers' })

// Voronoi og midtnormaler regnes i et lokalt plan der én enhet er like lang
// i begge retninger. Rå lengde/breddegrader ville strukket alt med 2x øst-vest på 60°N.
// Planet legges midt i byens ramme, så det stemmer i hver by (Oslo 59,9° N, Trondheim 63,4° N).
let LON0 = 0
let LAT0 = 0
let K = 1
function setPlane([w, s, e, n]: Box4) {
  LON0 = (w + e) / 2
  LAT0 = (s + n) / 2
  K = Math.cos((LAT0 * Math.PI) / 180)
}
setPlane(BOUNDS)
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

/** Stasjonene hider kan velge som «sin»: de som har hider innenfor sonen, nærmeste først. */
export function stationsInReach(stations: Station[], pos: LngLat, zoneRadius: number): Station[] {
  return stations.filter((s) => dist(stationPos(s), pos) <= zoneRadius).sort((a, b) => dist(stationPos(a), pos) - dist(stationPos(b), pos))
}

/** Hiders stasjon: den hider har valgt så lenge hider står i sonen dens, ellers den nærmeste. */
export function hiderStation(stations: Station[], pos: LngLat, zoneRadius: number, chosenId: string | null): Station {
  const chosen = stations.find((s) => s.id === chosenId)
  return chosen && dist(stationPos(chosen), pos) <= zoneRadius ? chosen : nearestStation(stations, pos)
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

const borderCache = new WeakMap<LngLat[][], Map<string, number>>()

/** Avstand i meter til nærmeste grense på et nivå, uansett hvilken side man står på. */
export function borderDist(data: GeoData, level: 'fylke' | 'kommune', pos: LngLat): number {
  // Avstanden til nærmeste kant av alle delene (også øyer), de samme kantene området tegnes fra.
  // pointToPolygonDistance ga avstanden til kanten av delen punktet står i, og overså øyer like ved.
  const rings = borderRings(data, level)
  let cache = borderCache.get(rings)
  if (!cache) borderCache.set(rings, (cache = new Map()))
  const key = `${pos[0]},${pos[1]}`
  let d = cache.get(key)
  if (d === undefined) cache.set(key, (d = polylineDist(pos, rings)))
  return d
}

/** Går linjen innen `d` meter fra punktet? */
function lineWithin(data: GeoData, line: string, pos: LngLat, d: number) {
  return data.lines.features.some((f) => f.properties.line === line && pointToLineDistance(pos, f, { units: 'meters' }) <= d)
}

/** Linjen som går nærmest et punkt. */
export function nearestLine(data: GeoData, pos: LngLat): string | null {
  let best: string | null = null
  let bestD = Infinity
  for (const f of data.lines.features) {
    const d = pointToLineDistance(pos, f, { units: 'meters' })
    if (d < bestD) {
      bestD = d
      best = f.properties.line
    }
  }
  return best
}

const RAD = Math.PI / 180

/**
 * Avstand i meter til nærmeste punkt på en samling linjer. Nærmeste punkt finnes
 * i et lokalt plan rundt `pos`, og avstanden dit måles så nøyaktig.
 */
export function polylineDist(pos: LngLat, lines: LngLat[][]): number {
  const [lon0, lat0] = pos
  const x = (p: LngLat) => (p[0] - lon0) * Math.cos(((p[1] + lat0) / 2) * RAD)
  let best = Infinity
  let at: LngLat | null = null
  for (const line of lines) {
    let ax = x(line[0])
    let ay = line[0][1] - lat0
    for (let i = 1; i < line.length; i++) {
      const bx = x(line[i])
      const by = line[i][1] - lat0
      const dx = bx - ax
      const dy = by - ay
      const len = dx * dx + dy * dy
      const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0
      const d = (ax + t * dx) ** 2 + (ay + t * dy) ** 2
      if (d < best) {
        best = d
        at = [line[i - 1][0] + t * (line[i][0] - line[i - 1][0]), line[i - 1][1] + t * (line[i][1] - line[i - 1][1])]
      }
      ax = bx
      ay = by
    }
  }
  return at ? dist(pos, at) : Infinity
}

// Per datasett, siden spillområdet avgjør hvilke linjer som er med.
const shapeCache = new WeakMap<object, Map<string, number>>()

/** Avstand i meter til kystlinjen, nærmeste vann eller riksgrensen. Sjøen teller også som vann. */
export function shapeDist(data: GeoData, ref: ShapeKey, pos: LngLat): number {
  let cache = shapeCache.get(data.shapes)
  if (!cache) shapeCache.set(data.shapes, (cache = new Map()))
  const key = `${ref}:${pos[0]},${pos[1]}`
  let d = cache.get(key)
  if (d === undefined) {
    d = polylineDist(pos, data.shapes[ref] ?? [])
    if (ref === 'water') d = Math.min(d, polylineDist(pos, data.shapes.coast ?? []))
    cache.set(key, d)
  }
  return d
}

/** Øya et punkt ligger på, som plass i `data.islands`. -1 = fastlandet. */
export const landmassOf = (data: GeoData, pos: LngLat) => data.islands.findIndex((f) => booleanPointInPolygon(pos, f))

/** Stasjonene T-banen seekerne sitter på har igjen å stoppe ved, fra neste stopp til endestasjonen. */
export function transitStops(data: GeoData, q: { line: string; dir: 1 | -1; next: number }): string[] {
  const order = data.lines.features.find((f) => f.properties.line === q.line)?.properties.stations ?? []
  return q.dir === 1 ? order.slice(q.next) : order.slice(0, q.next + 1)
}

/** POI-ene en tentacles-seeker kan få som svar: de innenfor radius fra seeker. */
function tentacleCandidates(data: GeoData, q: Extract<Question, { kind: 'tentacles' }>): Poi[] {
  return (data.poi[q.poiType] ?? []).filter((p) => dist(p.pos, q.pos) <= q.radiusM)
}

export const isPositive = (q: Question) => (q.kind === 'tentacles' ? q.answer !== 'outside' : POSITIVE_ANSWERS.includes(q.answer ?? ''))

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
    // Measuring på steder tegnes i et rutenett (lineRegion), som avstand til kysten. Å slå
    // sammen en sirkel per park eller fjell tok over et halvt minutt.
    case 'tentacles': {
      const reach = disc(q.pos, q.radiusM)
      // Linjer er ikke punkter: da avgrenser bare rekkevidden området, resten skjer per stasjon.
      if (!q.answer || q.answer === 'outside' || q.poiType === METRO_LINES) return reach
      const cands = tentacleCandidates(data, q)
      const hit = cands.find((p) => p.name === q.answer)
      const cell = hit && voronoiCell(hit.pos, cands.map((p) => p.pos))
      return cell ? intersect(featureCollection([cell, reach])) : null
    }
    default:
      return null
  }
}

const GRID_CELLS = 120
const DEG_M = 111320
type Box = [number, number, number, number]
const lineRegionCache = new WeakMap<object, Map<string, Area | null>>()
const ringCache = new WeakMap<AdminArea[], LngLat[][]>()

const PIECE_POINTS = 16
const pieceCache = new WeakMap<LngLat[][], { line: LngLat[]; box: Box }[]>()
/** Linjene delt i korte stykker med hver sin boks, så stykker langt unna kan hoppes over. */
function piecesOf(lines: LngLat[][]) {
  let pieces = pieceCache.get(lines)
  if (!pieces) {
    pieces = []
    for (const l of lines) {
      for (let i = 0; i < l.length - 1; i += PIECE_POINTS - 1) {
        const line = l.slice(i, i + PIECE_POINTS)
        const xs = line.map((p) => p[0])
        const ys = line.map((p) => p[1])
        pieces.push({ line, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] })
      }
    }
    pieceCache.set(lines, pieces)
  }
  return pieces
}

/** Kantene til områdene på et nivå, som linjer. */
function borderRings(data: GeoData, level: 'fylke' | 'kommune'): LngLat[][] {
  const areas = levelAreas(data, level)
  let rings = ringCache.get(areas)
  if (!rings) {
    rings = areas.flatMap((f) => (f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat()) as LngLat[][])
    ringCache.set(areas, rings)
  }
  return rings
}

/**
 * Området innenfor `d` meter fra linjene, regnet i et rutenett over `box`.
 * Kanten er like nøyaktig som rutene: noen meter i en endgame-sone, noen hundre
 * meter over hele kartet. Stasjonene avgjøres uansett av den nøyaktige avstanden.
 */
export function nearLines(lines: LngLat[][], d: number, box: Box): Area | null {
  const b: Box = [Math.max(box[0], BOUNDS[0]), Math.max(box[1], BOUNDS[1]), Math.min(box[2], BOUNDS[2]), Math.min(box[3], BOUNDS[3])]
  if (b[0] >= b[2] || b[1] >= b[3]) return null
  let cache = lineRegionCache.get(lines)
  if (!cache) lineRegionCache.set(lines, (cache = new Map()))
  const key = `${Math.round(d)}:${b.map((x) => x.toFixed(4)).join(',')}`
  if (cache.has(key)) return cache.get(key)!

  // Bare stykkene som kan ligge innenfor d fra boksen, trengs.
  const cos = Math.cos(((b[1] + b[3]) / 2) * RAD)
  const padLat = d / DEG_M
  const padLon = padLat / cos
  const near = piecesOf(lines).filter((p) => p.box[2] >= b[0] - padLon && p.box[0] <= b[2] + padLon && p.box[3] >= b[1] - padLat && p.box[1] <= b[3] + padLat)
  let region: Area | null = null
  if (near.length) {
    const side = Math.max((b[2] - b[0]) * DEG_M * cos, (b[3] - b[1]) * DEG_M) / GRID_CELLS
    // En ramme av «langt unna»-punkter rundt boksen. Uten den mister isobands den ytre kanten
    // når området går helt ut i boksens kanter, og gir bare hullet i midten (det motsatte området).
    const padX = (side * 1.5) / (DEG_M * cos)
    const padY = (side * 1.5) / DEG_M
    const grid = pointGrid([b[0] - padX, b[1] - padY, b[2] + padX, b[3] + padY], side, { units: 'meters' })
    // Alt lenger unna enn cap er «langt unna». Stykker som ikke kan komme nærmere, hoppes over.
    const cap = d * 2 + 1
    for (const pt of grid.features) {
      const [x, y] = pt.geometry.coordinates
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) {
        pt.properties = { z: cap }
        continue
      }
      let best = cap
      for (const piece of near) {
        const dx = Math.max(piece.box[0] - x, 0, x - piece.box[2]) * DEG_M * cos
        const dy = Math.max(piece.box[1] - y, 0, y - piece.box[3]) * DEG_M
        if (dx * dx + dy * dy >= best * best) continue
        best = Math.min(best, polylineDist([x, y], [piece.line]))
      }
      pt.properties = { z: best }
    }
    const band = isobands(grid, [-1, d], { zProperty: 'z' }).features[0]
    region = band && band.geometry.coordinates.length ? (band as unknown as Area) : null
  }
  cache.set(key, region)
  return region
}

// Sjøen teller også som vann. Listen lages én gang, så rutenettene kan gjenbrukes.
const waterCache = new WeakMap<object, LngLat[][]>()
function waterLines(data: GeoData) {
  let lines = waterCache.get(data.shapes)
  if (!lines) waterCache.set(data.shapes, (lines = [...(data.shapes.water ?? []), ...(data.shapes.coast ?? [])]))
  return lines
}

// Stedene av en type som «linjer» med ett punkt, så rutenettet kan måle avstand til dem.
const pointLines = new WeakMap<Poi[], LngLat[][]>()
function poiLines(pois: Poi[]) {
  let lines = pointLines.get(pois)
  if (!lines) pointLines.set(pois, (lines = pois.map((p) => [p.pos, p.pos])))
  return lines
}

/** Avstanden fra et punkt til nærmeste sted av typen. Infinity når det ikke finnes noen. */
function poiDist(pois: Poi[], pos: LngLat) {
  const p = nearestPoi(pois, pos)
  return p ? dist(p.pos, pos) : Infinity
}

/** Området «nærmere enn seeker» for spørsmål om avstand: kyst, vann, riksgrense, grenser og steder. */
function lineRegion(q: Question, data: GeoData, within: Area): Area | null {
  let lines: LngLat[][]
  let d: number
  if (q.kind === 'measure') {
    const pois = data.poi[q.ref] ?? []
    if (!pois.length) return null
    lines = poiLines(pois)
    d = poiDist(pois, q.pos)
  } else if (q.kind === 'geodist') {
    if (!hasData(q, data)) return null
    lines = q.ref === 'water' ? waterLines(data) : (data.shapes[q.ref] ?? [])
    d = shapeDist(data, q.ref, q.pos)
  } else if (q.kind === 'border') {
    if (!hasData(q, data)) return null
    lines = borderRings(data, q.level)
    d = borderDist(data, q.level, q.pos)
  } else return null
  if (!Number.isFinite(d) || !lines.length) return null
  return nearLines(lines, d, (within === WORLD ? BOUNDS : bbox(within)) as Box)
}

/** Området hider kan være i før noen spørsmål er stilt. */
export function startArea(settings: Pick<Settings, 'playArea'>): Area {
  const ring = settings.playArea
  return ring && ring.length >= 3 ? polygon([[...ring, ring[0]]]) : WORLD
}

/**
 * Reglene regner steder utenfor kartgrensen som om de ikke finnes. Er det satt
 * et spillområde, fjernes derfor steder og linjer utenfor. Spørsmål om noe som
 * da ikke finnes, får nullsvar.
 */
export function clipData(data: GeoData, playArea: LngLat[] | null): GeoData {
  if (!playArea || playArea.length < 3) return data
  const area = startArea({ playArea })
  const inside = (p: LngLat) => booleanPointInPolygon(p, area)
  // En linje deles i bitene som ligger innenfor.
  const clip = (line: LngLat[]) => {
    const runs: LngLat[][] = []
    let run: LngLat[] = []
    for (const p of line) {
      if (inside(p)) run.push(p)
      else if (run.length) run = (runs.push(run), [])
    }
    if (run.length) runs.push(run)
    return runs.filter((r) => r.length >= 2)
  }
  return {
    ...data,
    poi: Object.fromEntries(Object.entries(data.poi).map(([k, v]) => [k, v.filter((p) => inside(p.pos))])),
    shapes: Object.fromEntries(Object.entries(data.shapes).map(([k, v]) => [k, v.flatMap(clip)])),
  }
}

/**
 * Linjene som ikke er med i spillet (f.eks. trikken når bare T-banen spilles), regnes
 * som om de ikke finnes: seekers nærmeste stasjon, nærmeste linje og stasjonens linjer
 * gjelder bare det som er med. Stasjoner uten noen valgt linje forsvinner.
 * T-banestasjonene teller fortsatt som jernbanestasjoner, de står der uansett.
 */
export function onlyLines(data: GeoData, lines: string[]): GeoData {
  const on = new Set(lines)
  const features = data.lines.features.filter((f) => on.has(f.properties.line))
  // Uten valgte linjer (rett etter bytte av by) vises alt, så kartet har noe å vise.
  if (features.length === data.lines.features.length || features.length === 0) return data
  return {
    ...data,
    lines: { ...data.lines, features },
    stations: data.stations.filter((s) => s.lines.some((l) => on.has(l))).map((s) => ({ ...s, lines: s.lines.filter((l) => on.has(l)) })),
  }
}

/** Hvor langt utenfor de ytterste stasjonene auto-området går. */
export const AUTO_MARGIN_M = 2000

/**
 * Spillområde laget fra stasjonene: den minste konvekse rammen som ligger et par
 * kilometer utenfor alle stasjoner på linjene som er med.
 */
export function autoPlayArea(stations: Station[], settings: Pick<Settings, 'lines' | 'zoneRadius'>): LngLat[] | null {
  const margin = Math.max(AUTO_MARGIN_M, settings.zoneRadius)
  const zones = stations.filter((s) => s.lines.some((l) => settings.lines.includes(l))).map((s) => disc(stationPos(s), margin, 24))
  const hull = zones.length ? convex(featureCollection(zones)) : null
  // Siste punkt i ringen gjentar det første. playArea lagres uten.
  return hull ? (hull.geometry.coordinates[0].slice(0, -1) as LngLat[]) : null
}

export function applyQuestion(area: Area | null, q: Question, data: GeoData): Area | null {
  if (!area || !shrinks(q)) return area
  const region = regionOf(q, data) ?? lineRegion(q, data, area)
  if (!region) return area
  const pair = featureCollection([area, region])
  return isPositive(q) ? intersect(pair) : difference(pair)
}

/**
 * Spørsmål som ikke lar seg tegne som et område, avgjøres stasjon for stasjon.
 * For avstander til grenser tas det høyde for at hider kan stå hvor som helst i sonen.
 */
function stationFits(s: Station, q: Question, data: GeoData, zoneRadius: number): boolean {
  switch (q.kind) {
    case 'line':
      return s.lines.includes(q.line) === (q.answer === 'yes')
    case 'transit':
      return !hasData(q, data) || transitStops(data, q).includes(s.id) === (q.answer === 'yes')
    case 'landmass':
      return !hasData(q, data) || (landmassOf(data, stationPos(s)) === landmassOf(data, q.pos)) === (q.answer === 'yes')
    case 'geodist': {
      if (!hasData(q, data)) return true
      const mine = shapeDist(data, q.ref, stationPos(s))
      const theirs = shapeDist(data, q.ref, q.pos)
      return q.answer === 'closer' ? mine - zoneRadius <= theirs : mine + zoneRadius > theirs
    }
    case 'namelen':
      return (s.name.length === nearestStation(data.stations, q.pos).name.length) === (q.answer === 'yes')
    case 'measure': {
      // Hider kan stå hvor som helst i sonen, altså inntil soneradius nærmere eller lenger unna.
      const pois = data.poi[q.ref] ?? []
      if (!pois.length) return true
      const mine = poiDist(pois, stationPos(s))
      const theirs = poiDist(pois, q.pos)
      return q.answer === 'closer' ? mine - zoneRadius <= theirs : mine + zoneRadius > theirs
    }
    case 'border': {
      if (!hasData(q, data)) return true
      const mine = borderDist(data, q.level, stationPos(s))
      const theirs = borderDist(data, q.level, q.pos)
      return q.answer === 'closer' ? mine - zoneRadius <= theirs : mine + zoneRadius > theirs
    }
    case 'tentacles':
      if (q.poiType !== METRO_LINES || q.answer === 'outside') return true
      // Svaret er linjen nærmest der hider står, ikke en av stasjonens linjer. Hider står innen
      // soneradius fra stasjonen, og stasjonens egne linjer er da innen soneradius fra hider.
      // Den nærmeste linjen er altså innen to soneradier fra stasjonen.
      return s.lines.includes(q.answer ?? '') || lineWithin(data, q.answer ?? '', stationPos(s), 2 * zoneRadius)
    default:
      return true
  }
}

export interface Step {
  /** Antall mulige stasjoner etter dette spørsmålet. */
  count: number
}

export interface Result {
  /** Det som vises som gyldig: området svarene peker ut, eller i endgame det som er igjen av den ene sonen. */
  area: Area | null
  stations: Station[]
  steps: Step[]
}

/** Endgame: seekerne er i hiders sone, og hider står stille. */
export interface Endgame {
  stationId: string
  time: number
  /** Spørsmål fra før endgame som seekerne har valgt skal skjære sonen. De etter start gjør det alltid. */
  include?: string[]
}

/** Spørsmål som avgjøres per stasjon eller ikke krymper kartet, og derfor ikke kan skjære en sone. */
const NO_AREA: Question['kind'][] = ['photo', 'manual', 'line', 'transit', 'namelen']
/** Kan svaret skjære endgame-sonen? */
export const canCutZone = (q: Question) => shrinks(q) && !NO_AREA.includes(q.kind)

/** Skjærer spørsmålet endgame-sonen? Alt etter start gjør det, det fra før bare når seekerne har valgt det. */
export const cutsZone = (q: Pick<Question, 'id' | 'time'>, endgame: Endgame) => q.time >= endgame.time || !!endgame.include?.includes(q.id)

/**
 * Kan hider ha stått et sted i denne stasjonens sone da spørsmålet ble besvart?
 * Hider kan flytte seg i sonen mellom spørsmålene, så hvert spørsmål vurderes
 * for seg: en stasjon ryker bare når ikke noe sted i sonen passer med svaret.
 */
function zoneFits(s: Station, q: Question, region: Area | null, zoneRadius: number): boolean {
  if (!region) return true
  const zone = disc(stationPos(s), zoneRadius, 32)
  return isPositive(q) ? booleanIntersects(zone, region) : difference(featureCollection([zone, region])) !== null
}

/** `since`: hider spilte Move da, så eldre svar sier ingenting om den nye sonen. */
export function solve(questions: Question[], data: GeoData, settings: Settings, endgame: Endgame | null = null, since = 0): Result {
  const base = startArea(settings)
  const target = endgame && data.stations.find((s) => s.id === endgame.stationId)
  const live = questions.filter((q) => shrinks(q) && q.time >= since)
  const roaming = live.filter((q) => !target || q.time < endgame!.time)

  let left = data.stations.filter(
    (s) =>
      s.lines.some((l) => settings.lines.includes(l)) &&
      (base === WORLD || booleanIntersects(disc(stationPos(s), settings.zoneRadius, 32), base)),
  )
  const counts = new Map<string, number>()
  // Området svarene peker ut til sammen. Det er dette seeker ser frem til endgame.
  let asked: Area | null = base
  for (const q of roaming) {
    const region = regionOf(q, data)
    left = left.filter((s) => stationFits(s, q, data, settings.zoneRadius) && zoneFits(s, q, region, settings.zoneRadius))
    counts.set(q.id, left.length)
    asked = applyQuestion(asked, q, data)
  }

  if (target) {
    // I endgame står hider stille, så svarene skjærer sonen nøyaktig.
    let area: Area | null = disc(stationPos(target), settings.zoneRadius)
    for (const q of live) {
      if (!cutsZone(q, endgame!)) continue
      area = applyQuestion(area, q, data)
      // Spørsmål fra før beholder tallet fra da de ble stilt.
      if (q.time >= endgame!.time) counts.set(q.id, area ? 1 : 0)
    }
    return { area, stations: area ? [target] : [], steps: steps(questions, counts, left.length) }
  }

  // Svarene kan utelukke hverandre på kartet selv om stasjoner står igjen, fordi hider kan ha
  // flyttet seg i sonen mellom spørsmålene. Da vises sonene til stasjonene som er igjen.
  if (!asked && left.length > 0) {
    const zones = left.map((s) => disc(stationPos(s), settings.zoneRadius, 48))
    asked = zones.length === 1 ? zones[0] : union(featureCollection(zones))
  }
  return { area: left.length ? asked : null, stations: left, steps: steps(questions, counts, data.stations.length) }
}

/** Antall stasjoner etter hvert spørsmål. Ubesvarte spørsmål endrer ingenting. */
function steps(questions: Question[], counts: Map<string, number>, start: number): Step[] {
  let count = start
  return questions.map((q) => ({ count: (count = counts.get(q.id) ?? count) }))
}


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

const NOTHING: AutoAnswer = { answer: ANSWER_NULL, detail: 'Det spørsmålet handler om finnes ikke innenfor kartet.' }

const m = (d: number) => (d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`)

/** Oppslag i Kartverkets API-er for spørsmål appen ikke har data til. undefined = ikke hentet ennå. */
export type Look = (kind: LookupKind, p: LngLat) => Lookup | undefined

/** Matching og Measuring som slås opp på nett i stedet for i kartdataene. */
export const STREET_ITEM = 'm-street'
export const SEALEVEL_ITEM = 'me-sealevel'

/** Svaret hider skal gi, regnet direkte fra hiders posisjon. */
export function autoAnswer(q: Question, hider: { pos: LngLat; station: Station }, data: GeoData, look?: Look): AutoAnswer | null {
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
      if (!hasData(q, data)) return null
      // Står seeker utenfor alle områdene på nivået, finnes ikke det spørsmålet handler om.
      if (!theirs) return { answer: ANSWER_NULL, detail: `Seeker står ikke i noen ${q.level}.` }
      if (!mine) return { answer: 'no', detail: `du står ikke i noen ${q.level}, seeker: ${theirs.properties.name}` }
      const same = mine.properties.name === theirs.properties.name
      return { answer: same ? 'yes' : 'no', detail: `du: ${mine.properties.name}, seeker: ${theirs.properties.name}` }
    }
    case 'nearest': {
      const pois = data.poi[q.poiType] ?? []
      const mine = nearestPoi(pois, hider.pos)
      const theirs = nearestPoi(pois, q.pos)
      if (!hasData(q, data)) return null
      if (!mine || !theirs) return NOTHING
      // Hvor langt hider må gå før svaret snur: halve forskjellen mellom avstanden til seekers
      // sted og til nærmeste andre sted.
      const toTheirs = dist(hider.pos, theirs.pos)
      const other = Math.min(...pois.filter((p) => p !== theirs).map((p) => dist(hider.pos, p.pos)))
      const marginM = Number.isFinite(other) ? Math.abs(other - toTheirs) / 2 : undefined
      return { answer: mine.name === theirs.name ? 'yes' : 'no', marginM, detail: `du: ${mine.name}, seeker: ${theirs.name}` }
    }
    case 'measure': {
      const pois = data.poi[q.ref] ?? []
      const mine = nearestPoi(pois, hider.pos)
      const theirs = nearestPoi(pois, q.pos)
      if (!hasData(q, data)) return null
      if (!mine || !theirs) return NOTHING
      const a = dist(mine.pos, hider.pos)
      const b = dist(theirs.pos, q.pos)
      return {
        answer: a <= b ? 'closer' : 'further',
        marginM: Math.abs(a - b),
        detail: `du: ${m(a)} (${mine.name}), seeker: ${m(b)} (${theirs.name})`,
      }
    }
    case 'tentacles': {
      if (!hasData(q, data)) return null
      if (q.poiType !== METRO_LINES && tentacleCandidates(data, q).length === 0) return { answer: ANSWER_NULL, detail: 'Ingen slike steder innen rekkevidde fra seeker.' }
      const d = dist(hider.pos, q.pos)
      if (d > q.radiusM) return { answer: 'outside', marginM: d - q.radiusM, detail: `${m(d)} fra seeker` }
      if (q.poiType === METRO_LINES) {
        const line = nearestLine(data, hider.pos)
        return line === null ? null : { answer: line, marginM: q.radiusM - d, detail: `nærmeste linje er ${line}` }
      }
      const mine = nearestPoi(tentacleCandidates(data, q), hider.pos)
      return mine && { answer: mine.name, marginM: q.radiusM - d, detail: `${m(dist(mine.pos, hider.pos))} unna` }
    }
    case 'namelen': {
      const theirs = nearestStation(data.stations, q.pos)
      const same = hider.station.name.length === theirs.name.length
      return { answer: same ? 'yes' : 'no', detail: `${hider.station.name}: ${hider.station.name.length} tegn, ${theirs.name}: ${theirs.name.length} tegn` }
    }
    case 'border': {
      if (!hasData(q, data)) return null
      const a = borderDist(data, q.level, hider.pos)
      const b = borderDist(data, q.level, q.pos)
      return { answer: a <= b ? 'closer' : 'further', marginM: Math.abs(a - b), detail: `du: ${m(a)}, seeker: ${m(b)}` }
    }
    case 'transit': {
      if (!hasData(q, data)) return null
      const stops = transitStops(data, q).includes(hider.station.id)
      return { answer: stops ? 'yes' : 'no', detail: `${hider.station.name} er ${stops ? '' : 'ikke '}blant stoppene som gjenstår` }
    }
    case 'geodist': {
      if (!hasData(q, data)) return null
      const a = shapeDist(data, q.ref, hider.pos)
      const b = shapeDist(data, q.ref, q.pos)
      if (!Number.isFinite(a) || !Number.isFinite(b)) return NOTHING
      return { answer: a <= b ? 'closer' : 'further', marginM: Math.abs(a - b), detail: `du: ${m(a)}, seeker: ${m(b)}` }
    }
    case 'landmass': {
      if (!hasData(q, data)) return null
      const name = (i: number) => (i === -1 ? 'fastlandet' : 'en øy')
      const mine = landmassOf(data, hider.pos)
      const theirs = landmassOf(data, q.pos)
      return { answer: mine === theirs ? 'yes' : 'no', detail: `du: ${name(mine)}, seeker: ${name(theirs)}` }
    }
    case 'manual': {
      // Har byen ingen høyhastighetsbane (som Oslo), er svaret alltid null. Ellers svarer hider selv.
      if (q.subject === HIGH_SPEED) return city().highSpeed ? null : NOTHING
      // Høyde og adresser slås opp hos Kartverket, som bare dekker Norge.
      if (!look || !q.pos || !city().norway) return null
      if (q.item === SEALEVEL_ITEM) {
        const a = look('height', hider.pos)
        const b = look('height', q.pos)
        if (a?.status !== 'ok' || b?.status !== 'ok' || !('height' in a) || !('height' in b)) return null
        // Nærmere havnivå = lavere.
        return { answer: a.height <= b.height ? 'closer' : 'further', marginM: Math.abs(a.height - b.height), detail: `du: ${Math.round(a.height)} moh., seeker: ${Math.round(b.height)} moh. (Kartverket)` }
      }
      if (q.item === STREET_ITEM) {
        const a = look('street', hider.pos)
        const b = look('street', q.pos)
        if (a?.status !== 'ok' || b?.status !== 'ok' || !('streets' in a) || !('streets' in b)) return null
        const [mine, mine2] = a.streets
        const [theirs, theirs2] = b.streets
        if (!mine || !theirs) return null
        // Ligger neste gate nesten like nær, kan svaret snu. Margin er avstanden til at det skjer.
        const margin = Math.min(mine2 ? mine2.d - mine.d : Infinity, theirs2 ? theirs2.d - theirs.d : Infinity)
        return {
          answer: mine.name === theirs.name ? 'yes' : 'no',
          marginM: Number.isFinite(margin) ? margin / 2 : undefined,
          detail: `du: ${mine.name}, seeker: ${theirs.name} (nærmeste adresse hos Kartverket, stier uten navn er ikke med)`,
        }
      }
      return null
    }
    default:
      return null
  }
}

/** Kan spørsmålet stilles med dataene som er lastet? */
export function hasData(q: Pick<Question, 'kind'> & Partial<{ level: AdminLevel; poiType: string; ref: string; line: string }>, data: GeoData) {
  if (q.kind === 'geodist') return (q.ref ?? '') in data.shapes
  if (q.kind === 'landmass') return 'coast' in data.shapes
  if (q.kind === 'transit') return data.lines.features.some((f) => f.properties.line === q.line && f.properties.stations?.length)
  if (q.kind === 'admin' || q.kind === 'border') return !!q.level && levelAreas(data, q.level).length > 0
  if (q.kind === 'tentacles' && q.poiType === METRO_LINES) return true
  if (q.kind === 'nearest' || q.kind === 'tentacles') return (q.poiType ?? '') in data.poi
  if (q.kind === 'measure') return (q.ref ?? '') in data.poi
  return true
}
