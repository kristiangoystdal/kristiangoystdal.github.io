import { tr } from './lang'
import type { AdminLevel, GeoData, Mode } from './types'

export type { Mode }

/** Ordene i tekstene for et transportmiddel. */
export interface ModeWords {
  /** F.eks. «T-bane». Merker nettets stopp blant jernbanestasjonene: « (T-bane)». */
  name: string
  /** Hele nettet, f.eks. «T-banenettet». */
  whole: string
  /** Ett stopp, f.eks. «T-banestasjon». */
  stop: string
  /** Flere stopp, f.eks. «T-banestasjoner». */
  stops: string
  /** En linje, f.eks. «T-banelinje». */
  line: string
  /** Flere linjer, f.eks. «T-banelinjer». */
  lines: string
  /** Det seekerne sitter på, f.eks. «T-banen». */
  vehicle: string
  /** Teller stoppene som jernbanestasjoner i Measuring? Bare T-banen gjør det. */
  rail: boolean
}

const MODES_NB: Record<Mode, ModeWords> = {
  metro: { name: 'T-bane', whole: 'T-banenettet', stop: 'T-banestasjon', stops: 'T-banestasjoner', line: 'T-banelinje', lines: 'T-banelinjer', vehicle: 'T-banen', rail: true },
  tram: { name: 'Trikk', whole: 'trikkenettet', stop: 'trikkeholdeplass', stops: 'trikkeholdeplasser', line: 'trikkelinje', lines: 'trikkelinjer', vehicle: 'trikken', rail: false },
  lightrail: { name: 'Bybane', whole: 'Bybanen', stop: 'bybanestopp', stops: 'bybanestopp', line: 'bybanelinje', lines: 'bybanelinjer', vehicle: 'Bybanen', rail: false },
  bus: { name: 'Buss', whole: 'bussnettet', stop: 'bussholdeplass', stops: 'bussholdeplasser', line: 'busslinje', lines: 'busslinjer', vehicle: 'bussen', rail: false },
}
const MODES_EN: Record<Mode, ModeWords> = {
  metro: { name: 'Metro', whole: 'the metro network', stop: 'metro station', stops: 'metro stations', line: 'metro line', lines: 'metro lines', vehicle: 'the train', rail: true },
  tram: { name: 'Tram', whole: 'the tram network', stop: 'tram stop', stops: 'tram stops', line: 'tram line', lines: 'tram lines', vehicle: 'the tram', rail: false },
  lightrail: { name: 'Light rail', whole: 'the light rail', stop: 'light rail stop', stops: 'light rail stops', line: 'light rail line', lines: 'light rail lines', vehicle: 'the light rail', rail: false },
  bus: { name: 'Bus', whole: 'the bus network', stop: 'bus stop', stops: 'bus stops', line: 'bus line', lines: 'bus lines', vehicle: 'the bus', rail: false },
}
export const MODES = tr(MODES_NB, MODES_EN)
/** Ordene når flere transportmidler er med. */
const MIXED_NB: ModeWords = { name: 'Kollektiv', whole: 'kollektivnettet', stop: 'holdeplass', stops: 'holdeplasser', line: 'linje', lines: 'linjer', vehicle: 'det', rail: false }
const MIXED: ModeWords = tr(MIXED_NB, { name: 'Transit', whole: 'the transit network', stop: 'stop', stops: 'stops', line: 'line', lines: 'lines', vehicle: 'the vehicle', rail: false })

/**
 * En by appen kan spilles i. Alt som er ulikt fra by til by står her, og
 * kartdataene ligger i `public/data/<id>/`, bygget av scriptene med samme id
 * i `scripts/cities.json`. Ny by: legg den til begge steder og bygg dataene
 * (se README).
 */
export interface City {
  id: string
  name: string
  /** Transportmidlene i dataene, i den rekkefølgen de vises. */
  modes: Mode[]
  /** Det som er med når byen velges. Resten kan slås på under Oppsett. */
  defaultModes: Mode[]
  /** Ytre ramme for alt som regnes ut, [vest, sør, øst, nord]. Må dekke hele nettet med god margin. */
  bounds: [number, number, number, number]
  /** Områdenivåene dataene har, grovest først. Spørsmål om andre nivåer slås av. */
  adminLevels: { key: AdminLevel; label: string }[]
  /** Kartverkets API-er for høyde og adresser finnes bare i Norge. Uten dem svarer hider selv. */
  norway: boolean
  /** Har byen høyhastighetsbane? Uten er svaret på det spørsmålet alltid nullsvar. */
  highSpeed: boolean
}

/**
 * Områdenivåene i bussbyene, bygget av build_admin_norway i scripts/fetch_geodata.py.
 * Fylke er ikke med: hele nettet ligger i ett fylke, så svaret ville alltid vært ja.
 */
const BUS_LEVELS: City['adminLevels'] = [
  { key: 'kommune', label: tr('Kommune', 'Municipality') },
  { key: 'bydel', label: tr('Bydel (kommune der det ikke er bydeler)', 'Borough (municipality where there are none)') },
  { key: 'postsone', label: tr('Postsone (3 første siffer)', 'Postal zone (first 3 digits)') },
  { key: 'postnummer', label: tr('Postnummer', 'Postcode') },
]
/** Bussene i Trondheim går bare i Trondheim kommune. */
const ONE_KOMMUNE = BUS_LEVELS.filter((l) => l.key !== 'kommune')
const NORWAY = { norway: true, highSpeed: false }

export const CITIES: City[] = [
  {
    id: 'oslo',
    name: 'Oslo',
    // Bussen er bare linje 20 (Skøyen–Galgeberg). Flere linjer legges til i scripts/cities.json.
    modes: ['metro', 'tram', 'bus'],
    defaultModes: ['metro'],
    bounds: [10.2, 59.7, 11.25, 60.2],
    adminLevels: [
      { key: 'fylke', label: tr('Fylke', 'County') },
      { key: 'kommune', label: tr('Kommune', 'Municipality') },
      { key: 'bydel', label: tr('Bydel', 'Borough') },
      { key: 'postsone', label: tr('Postsone (3 første siffer)', 'Postal zone (first 3 digits)') },
      { key: 'postnummer', label: tr('Postnummer', 'Postcode') },
    ],
    ...NORWAY,
  },
  { id: 'bergen', name: 'Bergen', modes: ['lightrail', 'bus'], defaultModes: ['lightrail', 'bus'], bounds: [4.8, 60.0, 5.9, 60.7], adminLevels: BUS_LEVELS, ...NORWAY },
  { id: 'stavanger', name: 'Stavanger', modes: ['bus'], defaultModes: ['bus'], bounds: [5.3, 58.6, 6.2, 59.3], adminLevels: BUS_LEVELS, ...NORWAY },
  { id: 'trondheim', name: 'Trondheim', modes: ['tram', 'bus'], defaultModes: ['tram', 'bus'], bounds: [9.9, 63.2, 10.9, 63.6], adminLevels: ONE_KOMMUNE, ...NORWAY },
]

export const DEFAULT_CITY = CITIES[0].id
export const cityOf = (id: string | undefined) => CITIES.find((c) => c.id === id) ?? CITIES[0]

/**
 * Byen som er lastet inn. Settes av `loadData`, så tekster og geometri kan bruke
 * den uten at byen må sendes gjennom hver funksjon. Én by er lastet om gangen.
 */
let current: City = CITIES[0]
export const city = () => current
export const setCity = (c: City) => void (current = c)

/** Transportmidlene som er med i spillet. Settes av appen når linjevalget endres. */
let active: Mode[] = []
export const setActiveModes = (modes: Mode[]) => void (active = modes)

/** Ordene for det som er med i spillet: ett transportmiddel har egne ord, flere deler «holdeplass» og «linje». */
export function transit(): ModeWords {
  const modes = active.length ? active : current.defaultModes
  return modes.length === 1 ? MODES[modes[0]] : MIXED
}

/** De norske ordene, til regelboken, som bare er på norsk foreløpig. */
export function transitNb(): ModeWords {
  const modes = active.length ? active : current.defaultModes
  return modes.length === 1 ? MODES_NB[modes[0]] : MIXED_NB
}
export const modeWordsNb = (m: Mode) => MODES_NB[m]

/** Transportmiddelet i byen som teller som jernbane, om noen. Gjelder uansett hva som er med i spillet. */
export const railMode = () => current.modes.find((m) => MODES[m].rail) ?? null

/** Merket stoppene i nettet får blant jernbanestasjonene, f.eks. « (T-bane)». */
export const networkSuffix = () => {
  const m = railMode()
  return m ? ` (${MODES[m].name})` : ''
}

/** Transportmiddelet til en linje. Eldre data uten `mode` hører til byens første. */
export const modeOf = (f: GeoData['lines']['features'][number]): Mode => f.properties.mode ?? current.modes[0]

/** Transportmidlene som har minst én valgt linje. */
export const modesOf = (data: Pick<GeoData, 'lines'>, lines: string[]): Mode[] =>
  current.modes.filter((m) => data.lines.features.some((f) => modeOf(f) === m && lines.includes(f.properties.line)))

/** Linjene som hører til transportmidlene. */
export const linesOf = (data: Pick<GeoData, 'lines'>, modes: Mode[]): string[] =>
  data.lines.features.filter((f) => modes.includes(modeOf(f))).map((f) => f.properties.line)
