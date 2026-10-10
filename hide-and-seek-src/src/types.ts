import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from 'geojson'

/** [lengdegrad, breddegrad], samme rekkefølge som GeoJSON. */
export type LngLat = [number, number]
export type DayKey = 'wk' | 'sa' | 'su'
export type AdminLevel = 'fylke' | 'kommune' | 'bydel' | 'postsone' | 'postnummer'
export type Area = Feature<Polygon | MultiPolygon>

export interface Station {
  id: string
  name: string
  lat: number
  lon: number
  lines: string[]
  dep: Record<DayKey, number[]>
}

export type AdminArea = Feature<Polygon | MultiPolygon, { name: string; level: AdminLevel }>

export interface Poi {
  name: string
  pos: LngLat
}

export interface GeoData {
  stations: Station[]
  lines: FeatureCollection<LineString, { line: string; name: string; color: string }>
  admin: AdminArea[]
  poi: Record<string, Poi[]>
}

interface Base {
  id: string
  time: number
  /** null = stilt, men ikke besvart ennå */
  answer: string | null
}

export type QuestionBody =
  | { kind: 'radar'; center: LngLat; radiusM: number }
  | { kind: 'thermometer'; from: LngLat; to: LngLat }
  | { kind: 'line'; line: string }
  | { kind: 'admin'; level: AdminLevel; pos: LngLat }
  | { kind: 'nearest'; poiType: string; pos: LngLat }
  | { kind: 'measure'; ref: string; pos: LngLat }
  | { kind: 'tentacles'; poiType: string; pos: LngLat; radiusM: number }
  | { kind: 'photo'; text: string }

export type Question = Base & QuestionBody
export type Kind = Question['kind']

export interface Settings {
  zoneRadius: number
  lines: string[]
  day: DayKey
  hourFrom: number
  hourTo: number
  adminLevel: AdminLevel
  theme: 'auto' | 'light' | 'dark'
  basemap: 'clean' | 'standard' | 'satellite'
  /** Hjørnene i spillområdet. null = hele T-banenettet. */
  playArea: LngLat[] | null
}

export interface RoundResult {
  id: string
  hider: string
  seconds: number
  /** Tidsbonus fra hiders fysiske kort, lagt inn for hånd etter runden. */
  bonusMinutes: number
}
