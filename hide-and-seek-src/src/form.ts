import { ADMIN_LEVELS, FIXED_REFS, NEGATIVE, POI_TYPES, POSITIVE, areaAt, dist, nearestPoi, nearestStation, stationPos } from './geo'
import type { AdminLevel, GeoData, Kind, LngLat, Question, QuestionBody, Station } from './types'

/** Skjemaet for et spørsmål: flatt og med valgfrie punkter, så det kan være halvferdig. */
export interface Form {
  id?: string
  kind: Kind
  pos: LngLat | null
  /** Bare termometer: punktet seeker gikk til. */
  pos2: LngLat | null
  radiusM: number
  line: string
  level: AdminLevel
  poiType: string
  ref: string
  text: string
  answer: string | null
}

export const KINDS: { kind: Kind; category: string; label: string }[] = [
  { kind: 'radar', category: 'Radar', label: 'Radar' },
  { kind: 'thermometer', category: 'Thermometer', label: 'Termometer' },
  { kind: 'line', category: 'Matching', label: 'Samme linje' },
  { kind: 'admin', category: 'Matching', label: 'Samme område' },
  { kind: 'nearest', category: 'Matching', label: 'Samme nærmeste sted' },
  { kind: 'measure', category: 'Measuring', label: 'Måling' },
  { kind: 'tentacles', category: 'Tentacles', label: 'Tentacles' },
  { kind: 'photo', category: 'Photos', label: 'Foto' },
]
export const CATEGORIES = [...new Set(KINDS.map((k) => k.category))]
export const RADAR_RADII = [500, 1000, 2000, 5000, 10000]

export const newForm = (kind: Kind, level: AdminLevel, pos: LngLat | null): Form => ({
  kind,
  pos,
  pos2: null,
  radiusM: kind === 'tentacles' ? 2000 : 1000,
  line: '1',
  level,
  poiType: POI_TYPES[0].key,
  ref: 'slottet',
  text: '',
  answer: null,
})

export function formToBody(f: Form): QuestionBody | null {
  switch (f.kind) {
    case 'radar':
      return f.pos && f.radiusM > 0 ? { kind: 'radar', center: f.pos, radiusM: f.radiusM } : null
    case 'thermometer':
      return f.pos && f.pos2 ? { kind: 'thermometer', from: f.pos, to: f.pos2 } : null
    case 'line':
      return { kind: 'line', line: f.line }
    case 'admin':
      return f.pos && { kind: 'admin', level: f.level, pos: f.pos }
    case 'nearest':
      return f.pos && { kind: 'nearest', poiType: f.poiType, pos: f.pos }
    case 'measure':
      return f.pos && { kind: 'measure', ref: f.ref, pos: f.pos }
    case 'tentacles':
      return f.pos && f.radiusM > 0 ? { kind: 'tentacles', poiType: f.poiType, pos: f.pos, radiusM: f.radiusM } : null
    case 'photo':
      return f.text.trim() ? { kind: 'photo', text: f.text.trim() } : null
  }
}

export function questionToForm(q: Question, level: AdminLevel): Form {
  const f = newForm(q.kind, level, null)
  const body: Partial<Form> =
    q.kind === 'radar'
      ? { pos: q.center, radiusM: q.radiusM }
      : q.kind === 'thermometer'
        ? { pos: q.from, pos2: q.to }
        : q
  return { ...f, ...body, id: q.id, answer: q.answer }
}

export const formToQuestion = (f: Form): Question | null => {
  const body = formToBody(f)
  return body && { ...body, id: f.id ?? 'draft', time: 0, answer: f.answer }
}

export const fmtDist = (d: number) => (d >= 1000 ? `${+(d / 1000).toFixed(d % 1000 ? 1 : 0)} km` : `${Math.round(d)} m`)
export const poiLabel = (key: string) => POI_TYPES.find((t) => t.key === key)?.label ?? key
export const refLabel = (key: string) => FIXED_REFS[key]?.name ?? `nærmeste ${poiLabel(key).toLowerCase()}`
export const levelLabel = (key: AdminLevel) => ADMIN_LEVELS.find((l) => l.key === key)!.label

/** Beskriver et punkt ut fra nærmeste stasjon. */
export function place(pos: LngLat, stations: Station[]) {
  const s = nearestStation(stations, pos)
  const d = dist(stationPos(s), pos)
  return d < 60 ? s.name : `${fmtDist(d)} fra ${s.name}`
}

export function describe(q: Question, data: GeoData): string {
  switch (q.kind) {
    case 'radar':
      return `Er du innenfor ${fmtDist(q.radiusM)} fra meg? (${place(q.center, data.stations)})`
    case 'thermometer':
      return `Jeg gikk ${fmtDist(dist(q.from, q.to))}: ${place(q.from, data.stations)} → ${place(q.to, data.stations)}. Varmere eller kaldere?`
    case 'line':
      return `Er stasjonen din på linje ${q.line}?`
    case 'admin': {
      const a = areaAt(data, q.level, q.pos)
      return `Er du i samme ${levelLabel(q.level).toLowerCase()} som meg?${a ? ` (${a.properties.name})` : ''}`
    }
    case 'nearest': {
      const p = nearestPoi(data.poi[q.poiType] ?? [], q.pos)
      return `Har vi samme nærmeste ${poiLabel(q.poiType).toLowerCase()}?${p ? ` (min: ${p.name})` : ''}`
    }
    case 'measure':
      return `Er du nærmere ${refLabel(q.ref)} enn meg? (${place(q.pos, data.stations)})`
    case 'tentacles':
      return `Hvilken ${poiLabel(q.poiType).toLowerCase()} innen ${fmtDist(q.radiusM)} fra meg er du nærmest? (${place(q.pos, data.stations)})`
    case 'photo':
      return `Foto: ${q.text}`
  }
}

const ANSWER_LABELS: Record<string, string> = {
  in: 'Innenfor',
  out: 'Utenfor',
  warmer: 'Varmere',
  colder: 'Kaldere',
  yes: 'Ja',
  no: 'Nei',
  closer: 'Nærmere',
  further: 'Lenger unna',
  outside: 'Utenfor radius',
}
export const answerLabel = (q: Pick<Question, 'kind'>, answer: string) =>
  q.kind === 'photo' ? answer : (ANSWER_LABELS[answer] ?? answer)

/** Svarene hider kan gi. Tom liste = fritekst. */
export function answerOptions(q: Question, data: GeoData): string[] {
  switch (q.kind) {
    case 'line':
    case 'admin':
    case 'nearest':
      return ['yes', 'no']
    case 'tentacles':
      return [...(data.poi[q.poiType] ?? []).filter((p) => dist(p.pos, q.pos) <= q.radiusM).map((p) => p.name), 'outside']
    case 'photo':
      return []
    default:
      return [POSITIVE[q.kind], NEGATIVE[q.kind]]
  }
}
