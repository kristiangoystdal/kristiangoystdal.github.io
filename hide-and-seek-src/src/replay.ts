import type { Feature, Polygon, MultiPolygon } from 'geojson'
import { cityOf } from './cities'
import { answerLabel, categoryOf, describe } from './form'
import { dist, excluded, nearestStation, regionOf, solve, stationPos, type Result } from './geo'
import type { ArchivedRound } from './store'
import type { Area, GeoData, LngLat, Question, Settings, Station } from './types'

/** Der en spiller var underveis, som [tidspunkt, lengdegrad, breddegrad]. Videoen glir mellom punktene. */
export interface Track {
  role: 'hider' | 'seeker'
  pts: [number, number, number][]
}

/*
 * Rundens video: kartet, området som krymper, hvor hider og seekerne gikk og
 * spørsmålene som ble stilt, i den rekkefølgen det skjedde. Tiden går fort
 * mellom hendelsene og står stille mens et spørsmål eller svar vises.
 */

export const WIDTH = 1920
export const HEIGHT = 1080
export const FPS = 30

/** Holder filen liten nok til å dele i en chat. */
const BITRATE = 3_000_000
/**
 * Klokka i videoen går sakte mens noe skjer (et spørsmål venter på svar): ett minutt
 * per sekund video. Når ingenting skjer, går den fort, men ingen stille periode tar
 * mer enn noen få sekunder.
 */
const ACTIVE_MS_PER_S = 60000
const IDLE_MIN_S = 0.6
const IDLE_MAX_S = 3.5
const IDLE_S_PER_MIN = 0.08

type BeatKind = 'start' | 'seek' | 'ask' | 'answer' | 'move' | 'endgame' | 'end'
/**
 * Hvor lenge videoen står på en hendelse: litt for å se kartet, og så lenge det tar å lese kortet.
 * Ved svaret er spørsmålet alt lest, så bare svaret telles.
 */
const BASE_S: Record<BeatKind, number> = { start: 1.2, seek: 0.8, ask: 0.8, answer: 1.6, move: 1.2, endgame: 1.2, end: 2.5 }
/** Et spørsmål uten svar regnes som ventende så lenge. */
const UNANSWERED_MS = 10 * 60000
const READ_CPS = 15
const MAX_HOLD_S = 10
/** Seekerne går til fots når neste sted er så nærme, ellers tar de kollektivt. */
const WALK_M = 900
/** Hendelser på samme tidspunkt vises i denne rekkefølgen. */
const ORDER: BeatKind[] = ['start', 'seek', 'move', 'answer', 'ask', 'endgame', 'end']

/** Noe som skjedde i runden og vises en stund i videoen. `i` er spørsmålets plass i loggen. */
export interface Beat {
  t: number
  kind: BeatKind
  q?: Question
  i?: number
}

/**
 * En bit av videoen. Med `beat` står tiden stille på `t0`, ellers går den fra `t0` til `t1`:
 * sakte (`active`) mens et spørsmål venter på svar, ellers fort.
 */
export interface Segment {
  v0: number
  v1: number
  t0: number
  t1: number
  beat?: Beat
  active?: boolean
}

/** Et spørsmål som venter på svar fra `t0` til `t1`. */
export interface Pending {
  q: Question
  i: number
  t0: number
  t1: number
}

export interface Timeline {
  start: number
  end: number
  beats: Beat[]
  segments: Segment[]
  pending: Pending[]
  duration: number
}

/** Når svaret på et spørsmål kom, eller null hvis det aldri ble besvart. */
export const answeredAt = (q: Question) => (q.answer === null ? null : Math.max(q.time, q.answeredAt ?? q.time))

/** Når runden startet: gjemmetiden før letingen, eller første spørsmål for runder uten klokke. */
export function roundStart(a: ArchivedRound) {
  const firsts = [a.round.seekFrom !== null ? a.round.seekFrom - a.round.hidingMinutes * 60000 : Infinity, ...a.questions.map((q) => q.time)]
  const start = Math.min(...firsts)
  return Number.isFinite(start) ? start : a.endedAt - (a.seconds ?? 0) * 1000
}

/** Hvor lenge videoen står stille på en hendelse, så teksten rekker å bli lest. */
export function holdFor(a: ArchivedRound, data: GeoData, b: Beat): number {
  const c = card(a, data, null, b)
  const text = b.kind === 'answer' ? `${c.answer ?? ''} ${c.count ?? '00 → 00 stasjoner'}` : `${c.title} ${c.body}`
  return Math.min(MAX_HOLD_S, BASE_S[b.kind] + text.length / READ_CPS)
}

/** Hendelsene i runden og hvordan videoens tid fordeles på dem. */
export function timeline(a: ArchivedRound, data: GeoData): Timeline {
  const start = roundStart(a)
  const end = Math.max(a.endedAt, start)
  const clamp = (t: number) => Math.min(end, Math.max(start, t))
  const beats: Beat[] = [{ t: start, kind: 'start' }]
  if (a.round.seekFrom !== null && a.round.seekFrom > start && a.round.seekFrom < end) beats.push({ t: a.round.seekFrom, kind: 'seek' })
  const pending: Pending[] = []
  a.questions.forEach((q, i) => {
    beats.push({ t: q.time, kind: 'ask', q, i })
    const at = answeredAt(q)
    if (at !== null) beats.push({ t: at, kind: 'answer', q, i })
    pending.push({ q, i, t0: clamp(q.time), t1: clamp(at ?? q.time + UNANSWERED_MS) })
  })
  for (const m of a.round.moves ?? []) beats.push({ t: m.at, kind: 'move' })
  if (a.round.endgame) beats.push({ t: a.round.endgame.time, kind: 'endgame' })
  beats.push({ t: end, kind: 'end' })
  const sorted = beats.map((b) => ({ ...b, t: clamp(b.t) }))
  sorted.sort((x, y) => x.t - y.t || ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind) || (x.i ?? 0) - (y.i ?? 0))

  const segments: Segment[] = []
  let v = 0
  sorted.forEach((b, k) => {
    let hold = holdFor(a, data, b)
    if (b.kind === 'ask') {
      // Spørsmålet vises hele tiden det venter på svar. Bare det som mangler for å rekke å lese det, står stille.
      const p = pending.find((x) => x.q.id === b.q!.id)!
      hold = Math.max(BASE_S.ask, hold - (p.t1 - p.t0) / ACTIVE_MS_PER_S)
    }
    segments.push({ v0: v, v1: (v += hold), t0: b.t, t1: b.t, beat: b })
    const next = sorted[k + 1]
    if (!next || next.t <= b.t) return
    const gap = next.t - b.t
    const active = pending.some((p) => p.t0 <= b.t && p.t1 >= next.t)
    const min = gap / 60000
    const dur = active ? gap / ACTIVE_MS_PER_S : Math.min(Math.max(IDLE_MIN_S, Math.min(IDLE_MAX_S, IDLE_MIN_S + min * IDLE_S_PER_MIN)), min)
    segments.push({ v0: v, v1: (v += dur), t0: b.t, t1: next.t, active })
  })
  return { start, end, beats: sorted, segments, pending, duration: v }
}

/** Spørsmålet som venter på svar ved `t`, det siste hvis det er flere. */
export const pendingAt = (tl: Timeline, t: number) => tl.pending.filter((p) => p.t0 <= t && t < p.t1).at(-1)

/** Hvor i runden videoen er ved `v` sekunder: tidspunktet, og hendelsen som vises. */
export function frameAt(tl: Timeline, v: number): { t: number; seg: Segment; p: number; index: number } {
  let lo = 0
  let hi = tl.segments.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (tl.segments[mid].v0 <= v) lo = mid
    else hi = mid - 1
  }
  const seg = tl.segments[lo]
  const p = Math.min(1, Math.max(0, (v - seg.v0) / (seg.v1 - seg.v0 || 1)))
  // Når ingenting skjer, bremser tiden ned inn mot hendelsene og går fort mellom dem.
  const f = seg.active || seg.beat ? p : ease(p)
  return { t: seg.t0 + (seg.t1 - seg.t0) * f, seg, p, index: lo }
}

const ease = (x: number) => x * x * (3 - 2 * x)

/** Hvor mange sekunder i runden ett sekund video er akkurat nå. 0 mens videoen står på en hendelse. */
export function speedAt(tl: Timeline, v: number): number {
  const { seg, p } = frameAt(tl, v)
  if (seg.beat) return 0
  const rate = (seg.t1 - seg.t0) / 1000 / (seg.v1 - seg.v0)
  return seg.active ? rate : rate * 6 * p * (1 - p)
}

/** Spørsmålene slik loggen så ut ved `t`: svar som ikke var kommet ennå, regnes som ikke gitt. */
export function questionsAt(questions: Question[], t: number): Question[] {
  return questions.filter((q) => q.time <= t).map((q) => {
    const at = answeredAt(q)
    return at !== null && at <= t ? q : { ...q, answer: null }
  })
}

/** Et tidspunkt der kartet endret seg, med området og stasjonene som var igjen da. */
export interface Checkpoint {
  t: number
  result: Result
  mask: Area | null
}

/** Kartet etter hvert svar, hver Move og når endgame startet. */
export function checkpoints(a: ArchivedRound, data: GeoData, settings: Settings, tl: Timeline): Checkpoint[] {
  const rules = { ...settings, ...a.setup }
  const times = [tl.start, ...tl.beats.filter((b) => b.kind === 'answer' || b.kind === 'move' || b.kind === 'endgame').map((b) => b.t)]
  const unique = [...new Set(times)].sort((x, y) => x - y)
  return unique.map((t) => {
    const endgame = a.round.endgame && a.round.endgame.time <= t ? a.round.endgame : null
    const since = (a.round.moves ?? []).filter((m) => m.at <= t).at(-1)?.at ?? 0
    const result = solve(questionsAt(a.questions, t), data, rules, endgame, since)
    return { t, result, mask: excluded(result.area) }
  })
}

/** Siste kontrollpunkt ved eller før `t`. `before` gir det før, til å vise kartet like før et svar. */
export function checkpointAt(cps: Checkpoint[], t: number, before = false): Checkpoint {
  let found = cps[0]
  for (const c of cps) if (before ? c.t < t : c.t <= t) found = c
  return found
}

/** Posisjonen på et spor ved `t`, mellom to punkter. null før sporet starter. */
export function posAt(track: Track, t: number): LngLat | null {
  const pts = track.pts
  if (!pts.length || t < pts[0][0]) return null
  for (let i = 1; i < pts.length; i++) {
    const b = pts[i]
    if (b[0] < t) continue
    const a = pts[i - 1]
    const f = (t - a[0]) / (b[0] - a[0] || 1)
    return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
  }
  const last = pts.at(-1)!
  return [last[1], last[2]]
}

/** Der seeker sto da spørsmålet ble stilt, hvis spørsmålet har et sted. */
export function questionPos(q: Question): LngLat | null {
  switch (q.kind) {
    case 'radar':
      return q.center
    case 'thermometer':
      return q.to
    case 'line':
    case 'photo':
      return null
    default:
      return q.pos ?? null
  }
}

type Pt = [number, number, number]

/** Kollektivnettet som graf: fra stasjon til stasjon langs linjene. */
export interface Net {
  stations: Station[]
  edges: Map<string, { to: string; path: LngLat[]; len: number }[]>
}

const lengthOf = (path: LngLat[]) => path.slice(1).reduce((sum, p, i) => sum + dist(path[i], p), 0)

export function buildNet(data: GeoData, lines: string[]): Net {
  const edges: Net['edges'] = new Map()
  const add = (from: string, to: string, path: LngLat[]) => {
    const list = edges.get(from) ?? []
    list.push({ to, path, len: lengthOf(path) })
    edges.set(from, list)
  }
  const used = new Set<string>()
  for (const f of data.lines.features) {
    const order = f.properties.stations
    if (!order || !lines.includes(f.properties.line)) continue
    const coords = f.geometry.coordinates as LngLat[]
    const stops = order.map((id) => data.stations.find((s) => s.id === id)).filter((s): s is Station => !!s)
    // Stasjonens plass i linjen er punktet på linjen nærmest stasjonen.
    const at = stops.map((s) => {
      let best = 0
      coords.forEach((c, k) => {
        if (dist(c, stationPos(s)) < dist(coords[best], stationPos(s))) best = k
      })
      return best
    })
    for (let k = 0; k < stops.length - 1; k++) {
      const [i0, i1] = [at[k], at[k + 1]]
      const mid = i0 <= i1 ? coords.slice(i0, i1 + 1) : coords.slice(i1, i0 + 1).reverse()
      const path = [stationPos(stops[k]), ...mid, stationPos(stops[k + 1])]
      add(stops[k].id, stops[k + 1].id, path)
      add(stops[k + 1].id, stops[k].id, [...path].reverse())
      used.add(stops[k].id).add(stops[k + 1].id)
    }
  }
  return { stations: data.stations.filter((s) => used.has(s.id)), edges }
}

/** Veien fra ett sted til et annet: gå til nærmeste stasjon, ta kollektivt, og gå det siste stykket. */
export function route(net: Net, from: LngLat, to: LngLat): LngLat[] {
  if (dist(from, to) < WALK_M || !net.stations.length) return [from, to]
  const a = nearestStation(net.stations, from)
  const b = nearestStation(net.stations, to)
  if (a.id === b.id) return [from, to]
  // Dijkstra. Nettet er lite, så en enkel liste holder.
  const best = new Map<string, { d: number; prev: string | null; path: LngLat[] }>([[a.id, { d: 0, prev: null, path: [] }]])
  const done = new Set<string>()
  for (;;) {
    let cur: string | null = null
    for (const [id, x] of best) if (!done.has(id) && (cur === null || x.d < best.get(cur)!.d)) cur = id
    if (cur === null || cur === b.id) break
    done.add(cur)
    for (const e of net.edges.get(cur) ?? []) {
      const d = best.get(cur)!.d + e.len
      if (d < (best.get(e.to)?.d ?? Infinity)) best.set(e.to, { d, prev: cur, path: e.path })
    }
  }
  if (!best.has(b.id)) return [from, to]
  const legs: LngLat[][] = []
  for (let id: string | null = b.id; id && best.get(id)!.prev !== null; id = best.get(id)!.prev) legs.unshift(best.get(id)!.path)
  return [from, ...legs.flat(), to]
}

/** Punkter langs veien fra `t0` til `t1`, som starter og stopper mykt. */
export function along(path: LngLat[], t0: number, t1: number, steps = 40): Pt[] {
  const cum = [0]
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + dist(path[i - 1], path[i]))
  const total = cum.at(-1)!
  const out: Pt[] = []
  let seg = 1
  for (let k = 0; k <= steps; k++) {
    const u = k / steps
    const d = ease(u) * total
    while (seg < path.length - 1 && cum[seg] < d) seg++
    const a = path[seg - 1] ?? path[0]
    const b = path[seg] ?? path[0]
    const f = total ? Math.min(1, Math.max(0, (d - cum[seg - 1]) / (cum[seg] - cum[seg - 1] || 1))) : 0
    out.push([t0 + (t1 - t0) * u, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
  }
  return out
}

/** Et spor som står stille på hvert sted fra `arrive` til `depart`, og flytter seg langs `way` mellom dem. */
function tour(stops: { pos: LngLat; arrive: number; depart: number }[], way: (a: LngLat, b: LngLat) => LngLat[], steps: number): Pt[] {
  const pts: Pt[] = []
  stops.forEach((s, i) => {
    const next = stops[i + 1]
    const depart = next ? Math.min(s.depart, next.arrive) : s.depart
    if (!pts.length || s.arrive > pts.at(-1)![0]) pts.push([s.arrive, ...s.pos])
    if (depart > s.arrive) pts.push([depart, ...s.pos])
    if (next && next.arrive > depart) pts.push(...along(way(s.pos, next.pos), depart, next.arrive, steps).slice(1, -1))
  })
  return pts
}

/**
 * Hvor spillerne var. Appen sporer ingen posisjon. Seekerne er der spørsmålene ble stilt
 * fra, og reiser kollektivt mellom stedene etter at svaret kom. Hider går mellom stedene
 * hider sto ved hvert svar (`hiderPath`, fra hiders telefon), og står stille i endgame.
 * Uten dem står hider på stasjonen sin: den hider forlot ved Move, og til slutt
 * endgame-stasjonen eller den siste som var igjen.
 */
export function replayTracks(a: ArchivedRound, data: GeoData, lastResult: Result, net = buildNet(data, a.setup.lines)): Record<string, Track> {
  const out: Record<string, Track> = {}
  const stops: { pos: LngLat; arrive: number; depart: number }[] = []
  for (const q of a.questions) {
    const p = questionPos(q)
    if (!p) continue
    const after = answeredAt(q) ?? q.time
    if (q.kind === 'thermometer') {
      // Termometeret er reisen fra start til slutt. Seekerne var ved start en stund før.
      const prev = stops.at(-1)?.depart ?? q.time - 10 * 60000
      const at = prev + (q.time - prev) * 0.4
      stops.push({ pos: q.from, arrive: at, depart: at }, { pos: q.to, arrive: q.time, depart: after })
      continue
    }
    const last = stops.at(-1)
    if (last && q.time <= last.arrive) continue
    stops.push({ pos: p, arrive: q.time, depart: after })
  }
  if (stops.length) out.seekers = { role: 'seeker', pts: tour(stops, (x, y) => route(net, x, y), 40) }

  const path = [...(a.hiderPath ?? [])].sort((x, y) => x[0] - y[0])
  if (path.length) {
    const from = Math.min(a.round.seekFrom ?? path[0][0], path[0][0])
    const end = a.round.endgame ? a.round.endgame.time : a.endedAt
    const hs = path.map((p, i) => ({ pos: [p[1], p[2]] as LngLat, arrive: i ? p[0] : from, depart: p[0] }))
    const pts = tour(hs, (x, y) => [x, y], 16)
    // I endgame står hider stille der hen var.
    const last = pts.at(-1)!
    if (a.endedAt > last[0]) pts.push([Math.max(end, last[0]), last[1], last[2]], [a.endedAt, last[1], last[2]])
    out.hider = { role: 'hider', pts: pts.filter((p, i) => i === 0 || p[0] > pts[i - 1][0]) }
    return out
  }

  const station = (id: string | null | undefined) => data.stations.find((s) => s.id === id)
  const zones: { t: number; s: Station }[] = []
  let t = a.round.seekFrom ?? roundStart(a)
  for (const m of a.round.moves ?? []) {
    const s = station(m.from)
    if (s) zones.push({ t, s }, { t: m.at, s })
    t = m.at + a.round.hidingMinutes * 60000
  }
  const last = station(a.round.endgame?.stationId) ?? (a.outcome === 'found' && lastResult.stations.length === 1 ? lastResult.stations[0] : undefined)
  if (last) zones.push({ t, s: last }, { t: a.endedAt, s: last })
  const pts = zones.filter((x, i) => i === 0 || x.t > zones[i - 1].t).map((x) => [x.t, ...stationPos(x.s)] as Pt)
  if (pts.length) out.hider = { role: 'hider', pts }
  return out
}

// ---------------------------------------------------------------- Tegning

const COLORS = {
  accent: '#d9530b',
  hider: '#1f8a4c',
  seeker: '#e8590c',
  question: '#3b6ceb',
  text: '#15181d',
  muted: '#5f6875',
  shade: 'rgba(243, 244, 246, 0.68)',
  panel: 'rgba(21, 24, 29, 0.86)',
  land: '#eef0ec',
}
const TILE = 256
const TILE_URL = 'https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png'
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const MAX_TILE_ZOOM = 17
const MAX_TILES = 900
/** Toppfeltet, og kolonnen til høyre der kortene vises. Kartet sentreres i resten. */
const HUD_TOP = 120
const SIDE = 660
const MAP_W = WIDTH - SIDE
const MAP_H = HEIGHT - HUD_TOP - 60

/** Web Mercator med 256 punkter rundt jorden på zoom 0. */
export const project = ([lng, lat]: LngLat): [number, number] => {
  const s = Math.sin((lat * Math.PI) / 180)
  return [((lng + 180) / 360) * TILE, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE]
}

interface Camera {
  x: number
  y: number
  z: number
}

/** Kameraet som viser hele boksen [minX, minY, maxX, maxY] (Mercator) i kartdelen av bildet. */
function fit(box: [number, number, number, number], maxZoom = 16): Camera {
  const w = Math.max(box[2] - box[0], 1e-6)
  const h = Math.max(box[3] - box[1], 1e-6)
  const z = Math.min(maxZoom, Math.log2(Math.min((MAP_W * 0.86) / w, (MAP_H * 0.86) / h)))
  // Kartdelen er til venstre for kortene og under toppfeltet, så midten flyttes dit.
  const scale = Math.pow(2, z)
  return { x: (box[0] + box[2]) / 2 + (WIDTH / 2 - MAP_W / 2) / scale, y: (box[1] + box[3]) / 2 + (HEIGHT / 2 - (HUD_TOP + MAP_H / 2)) / scale, z }
}

function boxOf(points: [number, number][]): [number, number, number, number] | null {
  if (!points.length) return null
  let b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [x, y] of points) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]
  return b
}

function ringsOf(area: Feature<Polygon | MultiPolygon> | null): LngLat[][] {
  if (!area) return []
  return (area.geometry.type === 'Polygon' ? area.geometry.coordinates : area.geometry.coordinates.flat()) as LngLat[][]
}

/** Alt som trengs for å tegne et bilde, regnet ut på forhånd. */
export interface Replay {
  a: ArchivedRound
  data: GeoData
  settings: Settings
  tl: Timeline
  cps: Checkpoint[]
  tracks: [string, Track, string][]
  lines: { color: string; width: number; pts: [number, number][] }[]
  stations: (Station & { xy: [number, number] })[]
  /** Kartet før noe var besvart, til kameraet ved start. */
  home: [number, number, number, number]
}

export function prepare(a: ArchivedRound, data: GeoData, settings: Settings): Replay {
  const rules = { ...settings, ...a.setup }
  const tl = timeline(a, data)
  const cps = checkpoints(a, data, rules, tl)
  const all = replayTracks(a, data, cps.at(-1)!.result)
  let n = 0
  const tracks = Object.entries(all)
    .sort(([, x], [, y]) => (x.role === y.role ? (x.pts[0]?.[0] ?? 0) - (y.pts[0]?.[0] ?? 0) : x.role === 'hider' ? 1 : -1))
    .map(([k, t]) => [k, t, t.role === 'hider' ? `Hider (${a.hider})` : k === 'seekers' ? 'Seekerne' : `Seeker ${++n}`] as [string, Track, string])
  const lines = data.lines.features
    .filter((f) => rules.lines.includes(f.properties.line))
    .map((f) => ({ color: f.properties.color, width: f.properties.mode === 'bus' ? 4 : f.properties.mode === 'tram' ? 5 : 6, pts: (f.geometry.coordinates as LngLat[]).map(project) }))
  const stations = data.stations.filter((s) => s.lines.some((l) => rules.lines.includes(l))).map((s) => ({ ...s, xy: project(stationPos(s)) }))
  const pad = (rules.zoneRadius / 111000) * (TILE / 360) * 1.6
  const b = boxOf(stations.map((s) => s.xy))!
  return { a, data, settings: rules, tl, cps, tracks, lines, stations, home: [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad] }
}

/** Det kameraet bør vise ved `t`: det mulige området og der spillerne er. */
function targetCamera(r: Replay, t: number): Camera {
  const cp = checkpointAt(r.cps, t)
  const pts: [number, number][] = []
  const left = cp.result.stations
  if (left.length && left.length < r.stations.length) {
    const pad = (r.settings.zoneRadius / 111000) * (TILE / 360) * 1.3
    for (const s of left) {
      const [x, y] = project(stationPos(s))
      pts.push([x - pad, y - pad], [x + pad, y + pad])
    }
  } else {
    pts.push([r.home[0], r.home[1]], [r.home[2], r.home[3]])
  }
  for (const [, tr] of r.tracks) {
    const p = posAt(tr, t)
    if (p) pts.push(project(p))
  }
  return fit(boxOf(pts)!)
}

/** Kameraet for hvert bilde, glidende fra det ene utsnittet til det neste. */
export function cameras(r: Replay): Camera[] {
  const frames = Math.ceil(r.tl.duration * FPS)
  const out: Camera[] = []
  let cam: Camera | null = null
  for (let i = 0; i < frames; i++) {
    const { t } = frameAt(r.tl, i / FPS)
    const target = targetCamera(r, t)
    if (!cam) cam = target
    else {
      const k = 0.07
      cam = { x: cam.x + (target.x - cam.x) * k, y: cam.y + (target.y - cam.y) * k, z: cam.z + (target.z - cam.z) * k }
    }
    out.push(cam)
  }
  return out
}

const tileZoom = (z: number) => Math.max(0, Math.min(MAX_TILE_ZOOM, Math.round(z)))

/** Flisene som dekker bildet med dette kameraet. */
function tilesFor(cam: Camera): { z: number; x: number; y: number }[] {
  const tz = tileZoom(cam.z)
  const scale = Math.pow(2, cam.z)
  const per = TILE / Math.pow(2, tz)
  const x0 = Math.floor((cam.x - WIDTH / 2 / scale) / per)
  const x1 = Math.floor((cam.x + WIDTH / 2 / scale) / per)
  const y0 = Math.floor((cam.y - HEIGHT / 2 / scale) / per)
  const y1 = Math.floor((cam.y + HEIGHT / 2 / scale) / per)
  const out = []
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ z: tz, x, y })
  return out
}

type Tiles = Map<string, HTMLImageElement | ImageBitmap>
const tileKey = (z: number, x: number, y: number) => `${z}/${x}/${y}`

/** Laster bakgrunnskartet for alle bildene. Fliser som ikke kommer, tegnes som flatt land. */
async function loadTiles(cams: Camera[], url: string, onProgress?: (f: number) => void): Promise<Tiles> {
  const wanted = new Map<string, { z: number; x: number; y: number }>()
  for (let i = 0; i < cams.length; i += 3) for (const t of tilesFor(cams[i])) wanted.set(tileKey(t.z, t.x, t.y), t)
  const list = [...wanted.entries()].slice(0, MAX_TILES)
  const tiles: Tiles = new Map()
  let done = 0
  const one = async ([key, t]: [string, { z: number; x: number; y: number }]) => {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 15000)
      const res = await fetch(url.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)), { signal: ctrl.signal })
      clearTimeout(timer)
      if (res.ok) tiles.set(key, await createImageBitmap(await res.blob()))
    } catch {
      // Uten nett blir bakgrunnen flat.
    }
    onProgress?.(++done / list.length)
  }
  const queue = [...list]
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) await one(queue.shift()!)
  }))
  return tiles
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > width && line) {
      out.push(line)
      line = word
    } else line = next
  }
  if (line) out.push(line)
  return out
}

/** Korter av teksten med … så den får plass. */
function fitText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

const clockText = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(t / 3600)
  return `${h ? `${h}:` : ''}${String(Math.floor((t % 3600) / 60)).padStart(h ? 2 : 1, '0')}:${String(t % 60).padStart(2, '0')}`
}
const timeOfDay = (t: number) => new Date(t).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })

/** Teksten på kortet nederst for en hendelse. */
function card(a: ArchivedRound, data: GeoData, cps: Checkpoint[] | null, b: Beat): { tag: string; title: string; body: string; answer?: string; count?: string; color: string } {
  const station = (id?: string | null) => data.stations.find((s) => s.id === id)?.name
  switch (b.kind) {
    case 'start':
      return { tag: 'Gjemmetid', title: `${a.hider} gjemmer seg`, body: `${a.round.hidingMinutes} minutter på å finne et gjemmested. Soner på ${a.setup.zoneRadius} m rundt stasjonene.`, color: COLORS.hider }
    case 'seek':
      return { tag: 'Leting', title: 'Letingen starter', body: 'Seekerne kan stille spørsmål.', color: COLORS.seeker }
    case 'ask':
      return { tag: `${categoryOf(b.q!)} · kl. ${timeOfDay(b.q!.time)}`, title: `Spørsmål ${b.i! + 1}`, body: describe(b.q!, data), color: COLORS.question }
    case 'answer': {
      const before = cps ? checkpointAt(cps, b.t, true).result.stations.length : 0
      const after = cps ? checkpointAt(cps, b.t).result.stations.length : 0
      return {
        tag: `${categoryOf(b.q!)} · svar kl. ${timeOfDay(b.t)}`,
        title: `Spørsmål ${b.i! + 1}`,
        body: describe(b.q!, data),
        answer: answerLabel(b.q!, b.q!.answer!),
        count: after !== before ? `${before} → ${after} stasjoner` : undefined,
        color: COLORS.question,
      }
    }
    case 'move': {
      const m = a.round.moves?.find((x) => x.at === b.t)
      return { tag: 'Kort', title: 'Move', body: `Hider bytter sone${m?.from ? ` og forlater ${station(m.from)}` : ''}. Svarene fra før teller ikke lenger.`, color: COLORS.hider }
    }
    case 'endgame':
      return { tag: 'Endgame', title: `Endgame ved ${station(a.round.endgame?.stationId) ?? 'ukjent stasjon'}`, body: 'Seekerne er i hiders sone, og hider står stille.', color: COLORS.accent }
    case 'end':
      return a.outcome === 'found'
        ? { tag: 'Ferdig', title: `${a.hider} er funnet!`, body: `Skjult i ${clockText((a.seconds ?? 0) * 1000)} · ${a.stats.asked} spørsmål.`, color: COLORS.accent }
        : { tag: 'Ferdig', title: 'Runden ble avbrutt', body: `${a.stats.asked} spørsmål stilt.`, color: COLORS.muted }
  }
}

/** Tegner bilde nummer `i` på lerretet. */
export function drawFrame(ctx: CanvasRenderingContext2D, r: Replay, cam: Camera, tiles: Tiles | null, i: number) {
  const v = i / FPS
  const { t, seg, p } = frameAt(r.tl, v)
  const beat = seg.beat
  const scale = Math.pow(2, cam.z)
  const sx = (x: number) => (x - cam.x) * scale + WIDTH / 2
  const sy = (y: number) => (y - cam.y) * scale + HEIGHT / 2
  const xy = (p: LngLat): [number, number] => {
    const [x, y] = project(p)
    return [sx(x), sy(y)]
  }

  // Bakgrunnskartet.
  ctx.fillStyle = COLORS.land
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  if (tiles) {
    const tz = tileZoom(cam.z)
    const per = TILE / Math.pow(2, tz)
    for (const tile of tilesFor(cam)) {
      const img = tiles.get(tileKey(tile.z, tile.x, tile.y))
      if (!img) continue
      const x = sx(tile.x * per)
      const y = sy(tile.y * per)
      const size = per * scale
      ctx.drawImage(img, Math.floor(x), Math.floor(y), Math.ceil(size + 1), Math.ceil(size + 1))
    }
  }

  // Ved et svar vises kartet slik det var, så området svaret peker ut, og så det nye kartet.
  const showOld = beat?.kind === 'answer' && p < 0.4
  const cp = checkpointAt(r.cps, t, showOld)
  const possible = new Set(cp.result.stations.map((s) => s.id))
  const path = (rings: LngLat[][]) => {
    ctx.beginPath()
    for (const ring of rings) ring.forEach((pt, j) => (j ? ctx.lineTo(...xy(pt)) : ctx.moveTo(...xy(pt))))
  }

  if (cp.mask) {
    path(ringsOf(cp.mask))
    ctx.fillStyle = COLORS.shade
    ctx.fill('evenodd')
  }
  if (cp.result.area && cp.mask) {
    path(ringsOf(cp.result.area))
    ctx.strokeStyle = COLORS.accent
    ctx.lineWidth = 4
    ctx.stroke()
  }

  // Linjene.
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const l of r.lines) {
    ctx.beginPath()
    l.pts.forEach(([x, y], j) => (j ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))))
    ctx.strokeStyle = l.color
    ctx.globalAlpha = 0.85
    ctx.lineWidth = l.width
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Hiders sone i endgame.
  const eg = r.a.round.endgame
  if (eg && t >= eg.time) {
    const s = r.data.stations.find((x) => x.id === eg.stationId)
    if (s) {
      const [x, y] = xy(stationPos(s))
      const rad = (r.settings.zoneRadius / (111320 * Math.cos((s.lat * Math.PI) / 180))) * (TILE / 360) * scale
      ctx.beginPath()
      ctx.arc(x, y, rad, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(217, 83, 11, 0.12)'
      ctx.fill()
      ctx.strokeStyle = COLORS.accent
      ctx.lineWidth = 3
      ctx.stroke()
    }
  }

  // Stasjonene. Er det få igjen, får de navn.
  const few = possible.size <= 10
  // Bussnett har hundrevis av holdeplasser, og de tegnes mindre.
  const dense = r.stations.length > 200
  for (const s of r.stations) {
    const on = possible.has(s.id)
    ctx.beginPath()
    ctx.arc(sx(s.xy[0]), sy(s.xy[1]), dense ? (on ? 6 : 3.5) : on ? 9 : 5.5, 0, Math.PI * 2)
    ctx.fillStyle = on ? COLORS.accent : '#ffffff'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = on ? COLORS.text : COLORS.muted
    ctx.stroke()
  }
  if (few) {
    ctx.font = '600 26px system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    for (const s of r.stations) {
      if (!possible.has(s.id)) continue
      const x = sx(s.xy[0]) + 16
      const y = sy(s.xy[1])
      ctx.lineWidth = 6
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.strokeText(s.name, x, y)
      ctx.fillStyle = COLORS.text
      ctx.fillText(s.name, x, y)
    }
  }

  // Området spørsmålet som vises peker ut.
  const waiting = beat ? undefined : pendingAt(r.tl, t)
  const q = beat?.q ?? waiting?.q
  if (q && (beat?.kind === 'ask' || showOld || waiting)) {
    const region = regionOf(q.answer === null ? q : { ...q }, r.data)
    if (region) {
      path(ringsOf(region))
      ctx.fillStyle = 'rgba(59, 108, 235, 0.14)'
      ctx.fill('evenodd')
      ctx.setLineDash([14, 10])
      ctx.strokeStyle = COLORS.question
      ctx.lineWidth = 4
      ctx.stroke()
      ctx.setLineDash([])
    }
    if (q.kind === 'thermometer') {
      ctx.beginPath()
      ctx.moveTo(...xy(q.from))
      ctx.lineTo(...xy(q.to))
      ctx.strokeStyle = COLORS.question
      ctx.lineWidth = 5
      ctx.stroke()
    }
  }

  // Stedene spørsmålene ble stilt fra.
  r.a.questions.forEach((qq, j) => {
    const pos = questionPos(qq)
    if (!pos || qq.time > t) return
    const [x, y] = xy(pos)
    const current = q?.id === qq.id
    ctx.beginPath()
    ctx.arc(x, y, current ? 19 : 14, 0, Math.PI * 2)
    ctx.fillStyle = current ? COLORS.question : 'rgba(59, 108, 235, 0.75)'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 ${current ? 20 : 16}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(j + 1), x, y + 1)
    ctx.textAlign = 'left'
  })

  // Spillerne og veien de har gått.
  for (const [, tr, label] of r.tracks) {
    const now = posAt(tr, t)
    if (!now) continue
    const color = tr.role === 'hider' ? COLORS.hider : COLORS.seeker
    ctx.beginPath()
    let started = false
    for (const pt of tr.pts) {
      if (pt[0] > t) break
      const [x, y] = xy([pt[1], pt[2]])
      if (started) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
      started = true
    }
    ctx.lineTo(...xy(now))
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.7
    ctx.lineWidth = 6
    ctx.setLineDash(tr.role === 'hider' ? [] : [2, 11])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    const [x, y] = xy(now)
    ctx.beginPath()
    ctx.arc(x, y, 17, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = 5
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.font = '700 25px system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    // Hider har merkelappen til venstre, så den ikke dekker seekerne når de er nær.
    const w = ctx.measureText(label).width
    const lx = tr.role === 'hider' ? x - 24 - w - 20 : x + 24
    roundRect(ctx, lx, y - 20, w + 20, 40, 10)
    ctx.fillStyle = color
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, lx + 10, y + 1)
  }

  drawHud(ctx, r, t, beat, p, v, frameAt(r.tl, v))
}

/** Hvor fort klokka går, som tekst: «1 s = 1 min». */
export function paceText(speed: number) {
  if (speed === 0) return '⏸ Klokka står'
  const min = speed / 60
  const amount = min < 1 ? `${Math.max(1, Math.round(speed))} s` : `${min < 10 ? min.toFixed(1).replace('.0', '').replace('.', ',') : Math.round(min)} min`
  return `${min > 1.5 ? '⏩' : '▶'} 1 s = ${amount}`
}

function drawHud(ctx: CanvasRenderingContext2D, r: Replay, t: number, beat: Beat | undefined, p: number, v: number, f: ReturnType<typeof frameAt>) {
  const { a } = r
  // Toppfeltet: hvem og hva klokka er.
  ctx.fillStyle = COLORS.panel
  ctx.fillRect(0, 0, WIDTH, HUD_TOP)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#f0732a'
  ctx.font = '700 24px system-ui, sans-serif'
  ctx.fillText(`HIDE AND SEEK ${cityOf(a.setup.city).name.toUpperCase()}`, 40, 46)
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 44px system-ui, sans-serif'
  ctx.fillText(`${a.hider} · runde ${a.nth}`, 40, 96)

  const seekFrom = a.round.seekFrom
  const hiding = seekFrom !== null && t < seekFrom
  const egOn = a.round.endgame && t >= a.round.endgame.time
  const phase = hiding ? 'Gjemmetid igjen' : egOn ? 'Endgame' : 'Leting'
  const clock = hiding ? seekFrom! - t : seekFrom !== null ? t - seekFrom : t - r.tl.start
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '600 24px system-ui, sans-serif'
  ctx.fillText(`${phase} · kl. ${timeOfDay(t)}`, WIDTH - 40, 46)
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 54px ui-monospace, Menlo, monospace'
  ctx.fillText(clockText(clock), WIDTH - 40, 100)

  // Hvor fort klokka går akkurat nå, ved siden av klokka.
  ctx.font = '700 26px system-ui, sans-serif'
  const pace = paceText(speedAt(r.tl, v))
  const clockW = (() => {
    ctx.font = '800 54px ui-monospace, Menlo, monospace'
    return ctx.measureText(clockText(clock)).width
  })()
  ctx.font = '700 26px system-ui, sans-serif'
  const pw = ctx.measureText(pace).width + 36
  const px = WIDTH - 40 - clockW - 30 - pw
  roundRect(ctx, px, 58, pw, 46, 23)
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fill()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(pace, px + 18, 82)

  // Hvor mange stasjoner som er igjen.
  const showOld = beat?.kind === 'answer' && p < 0.4
  const left = checkpointAt(r.cps, t, showOld).result.stations.length
  const chip = left === 1 ? '1 mulig stasjon' : `${left} mulige stasjoner`
  const cw = ctx.measureText(chip).width + 36
  roundRect(ctx, 40, HUD_TOP + 24, cw, 46, 23)
  ctx.fillStyle = COLORS.accent
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(chip, 58, HUD_TOP + 48)

  // Kortet til høyre: hendelsen som vises, spørsmålet som venter på svar, eller det forrige som tones ut.
  let shown: Beat | undefined = beat
  let alpha = 1
  const waiting = beat ? undefined : pendingAt(r.tl, t)
  if (!shown && waiting) shown = { t: waiting.q.time, kind: 'ask', q: waiting.q, i: waiting.i }
  if (!shown) {
    const prev = r.tl.segments[f.index - 1]?.beat
    const since = v - r.tl.segments[f.index].v0
    if (prev && since < 0.5) {
      shown = prev
      alpha = 1 - since / 0.5
    }
  } else if (beat && f.p * (f.seg.v1 - f.seg.v0) < 0.15 && r.tl.segments[f.index - 1]?.active !== true) {
    alpha = (f.p * (f.seg.v1 - f.seg.v0)) / 0.15
  }
  if (shown) {
    const c = card(r.a, r.data, r.cps, shown)
    const x0 = WIDTH - SIDE + 10
    const w = SIDE - 40
    const tw = w - 80
    ctx.globalAlpha = alpha
    ctx.font = '500 30px system-ui, sans-serif'
    const lines = wrap(ctx, c.body, tw)
    const body = lines.length > 6 ? [...lines.slice(0, 5), fitText(ctx, lines.slice(5).join(' '), tw)] : lines
    ctx.font = '800 34px system-ui, sans-serif'
    const answer = c.answer ? wrap(ctx, `Svar: ${c.answer}`, tw).slice(0, 2) : []
    const h = 124 + body.length * 40 + (answer.length ? 24 + answer.length * 42 : 0) + (c.count ? 44 : 0)
    const y0 = HEIGHT - 70 - h
    roundRect(ctx, x0, y0, w, h, 24)
    ctx.fillStyle = COLORS.panel
    ctx.fill()
    ctx.fillStyle = c.color
    ctx.fillRect(x0, y0 + 20, 8, h - 40)
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = '700 22px system-ui, sans-serif'
    ctx.fillText(fitText(ctx, c.tag.toUpperCase(), tw), x0 + 40, y0 + 46)
    ctx.fillStyle = '#ffffff'
    ctx.font = '800 38px system-ui, sans-serif'
    ctx.fillText(fitText(ctx, c.title, tw), x0 + 40, y0 + 94)
    ctx.font = '500 30px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    body.forEach((line, j) => ctx.fillText(line, x0 + 40, y0 + 140 + j * 40))
    let y = y0 + 140 + body.length * 40 + 16
    ctx.fillStyle = '#ffb27a'
    ctx.font = '800 34px system-ui, sans-serif'
    answer.forEach((line, j) => ctx.fillText(line, x0 + 40, y + 8 + j * 42))
    y += answer.length * 42
    if (c.count) {
      ctx.font = '700 28px system-ui, sans-serif'
      ctx.fillText(c.count, x0 + 40, y + 12)
    }
    ctx.globalAlpha = 1
  }

  // Tegnforklaring, kilde og fremdrift.
  ctx.textBaseline = 'middle'
  ctx.font = '600 22px system-ui, sans-serif'
  let x = 40
  const legend: [string, string][] = [
    [COLORS.hider, 'Hider'],
    [COLORS.seeker, 'Seeker'],
    [COLORS.question, 'Spørsmål'],
    [COLORS.accent, 'Mulig område'],
  ]
  roundRect(ctx, 26, HEIGHT - 60, 640, 40, 20)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fill()
  for (const [color, label] of legend) {
    ctx.beginPath()
    ctx.arc(x + 10, HEIGHT - 40, 9, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.fillStyle = COLORS.text
    ctx.fillText(label, x + 26, HEIGHT - 39)
    x += ctx.measureText(label).width + 52
  }
  ctx.textAlign = 'right'
  ctx.font = '500 18px system-ui, sans-serif'
  ctx.fillStyle = COLORS.muted
  ctx.fillText('© Kartverket', WIDTH - 30, HEIGHT - 39)
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(21,24,29,0.25)'
  ctx.fillRect(0, HEIGHT - 8, WIDTH, 8)
  ctx.fillStyle = COLORS.accent
  ctx.fillRect(0, HEIGHT - 8, (WIDTH * v) / r.tl.duration, 8)
}

// ---------------------------------------------------------------- Video

export interface Progress {
  stage: 'map' | 'tiles' | 'video'
  /** 0–1 */
  done: number
}

/**
 * Lager rundens video som MP4 (eller WebM der nettleseren ikke kan lage MP4).
 * Kartet lastes ned først, så bildene tegnes og kodes ett og ett.
 */
export async function renderReplay(a: ArchivedRound, data: GeoData, settings: Settings, onProgress?: (p: Progress) => void): Promise<Blob> {
  onProgress?.({ stage: 'map', done: 0 })
  // La siden vise fremdriften før utregningen starter.
  await new Promise((ok) => setTimeout(ok, 30))
  const r = prepare(a, data, settings)
  const cams = cameras(r)
  const tiles = await loadTiles(cams, cityOf(a.setup.city).norway ? TILE_URL : OSM_URL, (done) => onProgress?.({ stage: 'tiles', done }))

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!
  const frames = cams.length
  const draw = (i: number) => drawFrame(ctx, r, cams[i], tiles, i)

  const mb = await import('mediabunny')
  if (await mb.canEncodeVideo('avc', { width: WIDTH, height: HEIGHT, bitrate: BITRATE })) {
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
    const source = new mb.CanvasSource(canvas, { codec: 'avc', bitrate: BITRATE, keyFrameInterval: 2 })
    output.addVideoTrack(source, { frameRate: FPS })
    await output.start()
    for (let i = 0; i < frames; i++) {
      draw(i)
      await source.add(i / FPS, 1 / FPS)
      if (i % 15 === 0) onProgress?.({ stage: 'video', done: i / frames })
    }
    await output.finalize()
    onProgress?.({ stage: 'video', done: 1 })
    return new Blob([output.target.buffer!], { type: 'video/mp4' })
  }
  return recordRealtime(canvas, draw, frames, onProgress)
}

/** Reserve uten WebCodecs: spiller av bildene i sanntid og tar opp lerretet. */
async function recordRealtime(canvas: HTMLCanvasElement, draw: (i: number) => void, frames: number, onProgress?: (p: Progress) => void): Promise<Blob> {
  const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t))
  if (!type) throw new Error('Nettleseren kan ikke lage video.')
  draw(0)
  const stream = canvas.captureStream(FPS)
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: BITRATE })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const stopped = new Promise((ok) => (rec.onstop = ok))
  rec.start(1000)
  const t0 = performance.now()
  for (let i = 0; i < frames; ) {
    await new Promise((ok) => setTimeout(ok, 1000 / FPS / 2))
    const due = Math.min(frames - 1, Math.floor(((performance.now() - t0) / 1000) * FPS))
    if (due >= i) {
      draw(due)
      i = due + 1
      onProgress?.({ stage: 'video', done: i / frames })
    }
  }
  rec.stop()
  await stopped
  stream.getTracks().forEach((tr) => tr.stop())
  return new Blob(chunks, { type: type.split(';')[0] })
}
