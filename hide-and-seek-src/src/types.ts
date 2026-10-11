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
  /** `stations` er stasjons-id-ene i kjørerekkefølge fra den ene endestasjonen til den andre. */
  lines: FeatureCollection<LineString, { line: string; name: string; color: string; stations?: string[] }>
  admin: AdminArea[]
  /** Steder per type. Mangler nøkkelen, er dataene ikke lastet inn. Tom liste = ingen innenfor kartet. */
  poi: Record<string, Poi[]>
  /** Linjer avstand måles til. Mangler nøkkelen, er dataene ikke lastet inn. Tom liste = ingen innenfor kartet. */
  shapes: Partial<Record<ShapeKey, LngLat[][]>>
  /** Øyer i sjøen. Alt annet land regnes som fastlandet. */
  islands: Area[]
}

export type ShapeKey = 'coast' | 'water' | 'riks'

export type GameSize = 'S' | 'M' | 'L'

interface Base {
  id: string
  time: number
  /** null = stilt, men ikke besvart ennå */
  answer: string | null
  /** Når svaret kom. Brukes til å se om svartiden ble overholdt. */
  answeredAt?: number
  /** Tid spillet sto på pause mens spørsmålet var ubesvart. Legges til svartiden. */
  extraMs?: number
  /** Tidligere svar, når hider har endret svaret sitt. */
  history?: { answer: string; at: number }[]
  /** Hvilket spørsmål i regelboken dette er (id i ITEMS i form.ts). */
  item?: string
  /** Seekernes eget notat. */
  note?: string
}

export type QuestionBody =
  | { kind: 'radar'; center: LngLat; radiusM: number }
  | { kind: 'thermometer'; from: LngLat; to: LngLat; minM?: number }
  /** Eldre logger: fritt valgt linjenummer. Nye spørsmål bruker «transit». */
  | { kind: 'line'; line: string }
  /** Matching: stopper T-banen seekerne sitter på ved hiders stasjon? `next` er plassen i linjens stasjonsliste. */
  | { kind: 'transit'; line: string; dir: 1 | -1; next: number; pos?: LngLat }
  /** Measuring: avstand til kystlinjen, nærmeste vann eller riksgrensen. */
  | { kind: 'geodist'; ref: ShapeKey; pos: LngLat }
  /** Matching: er hider på samme landmasse som seeker. */
  | { kind: 'landmass'; pos: LngLat }
  | { kind: 'admin'; level: AdminLevel; pos: LngLat }
  | { kind: 'nearest'; poiType: string; pos: LngLat }
  | { kind: 'measure'; ref: string; pos: LngLat }
  | { kind: 'tentacles'; poiType: string; pos: LngLat; radiusM: number }
  | { kind: 'photo'; text: string }
  /** Matching: har hiders stasjon like langt navn som seekers nærmeste. */
  | { kind: 'namelen'; pos: LngLat }
  /** Measuring: avstand til nærmeste fylkes- eller kommunegrense. */
  | { kind: 'border'; level: 'fylke' | 'kommune'; pos: LngLat }
  /** Spørsmål appen ikke har data til å regne ut. Hider svarer selv, og svaret loggføres uten å krympe kartet. */
  | { kind: 'manual'; family: 'matching' | 'measuring'; subject: string; pos?: LngLat }

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
  /** Spillstørrelsen styrer hvilke spørsmål som er tilgjengelige. */
  size: GameSize
  /** Egendefinert spill: spørsmålene som er med (id i ITEMS). null = det spillstørrelsen gir. */
  questions?: string[] | null
  /** Hjørnene i spillområdet. null = hele T-banenettet. */
  playArea: LngLat[] | null
}

export interface RoundResult {
  id: string
  hider: string
  /** Når runden sluttet. Holder rundene i rekkefølge. */
  at?: number
  seconds: number
  /** Tidsbonus i minutter. Hider legger den inn når runden er over. */
  bonusMinutes: number
}
