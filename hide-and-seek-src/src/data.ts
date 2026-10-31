import type { Feature, Geometry } from 'geojson'
import { cityOf, modeOf, networkSuffix, railMode, setCity } from './cities'
import { POI_TYPES, setBounds, stationPos } from './geo'
import type { Area, GeoData, LngLat, Poi, ShapeKey } from './types'

const SHAPES: ShapeKey[] = ['coast', 'water', 'riks']

/** Leser en datafil for byen. null = filen finnes ikke. */
export type Reader = (path: string) => Promise<unknown | null>

/** Henter filene fra nettsiden. Testene leser dem fra disk i stedet. */
const fromWeb =
  (cityId: string): Reader =>
  async (path) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/${cityId}/${path}`)
      return res.ok ? await res.json() : null
    } catch {
      return null
    }
  }

/** Alle linjene i en geometri. Flater blir til omrisset sitt. */
function outlines(g: Geometry): LngLat[][] {
  switch (g.type) {
    case 'LineString':
      return [g.coordinates as LngLat[]]
    case 'MultiLineString':
    case 'Polygon':
      return g.coordinates as LngLat[][]
    case 'MultiPolygon':
      return g.coordinates.flat() as LngLat[][]
    default:
      return []
  }
}

/**
 * Det appen trenger for å vise seg: stasjonene og linjene. Små filer, så lobbyen og kartet
 * kommer fort. Resten hentes med `loadData` like etterpå.
 */
export async function loadCore(cityId: string, read: Reader = fromWeb(cityOf(cityId).id)): Promise<GeoData> {
  const c = cityOf(cityId)
  const [stations, lines] = (await Promise.all([read('stations.json'), read('lines.geojson')])) as [{ stations: GeoData['stations'] } | null, GeoData['lines'] | null]
  if (!stations || !lines) throw new Error(`Mangler stasjoner eller linjer for ${c.name}`)
  setCity(c)
  setBounds(c.bounds)
  return { loading: true, stations: stations.stations, lines, admin: [], poi: railPoi(stations.stations, lines), shapes: {}, islands: [] }
}

/** Reglene regner T-banestasjonene som jernbanestasjoner i Measuring. Trikk, Bybanen og buss gjør det ikke. */
function railPoi(stations: GeoData['stations'], lines: GeoData['lines']): Record<string, Poi[]> {
  const rail = railMode()
  const railLines = new Set(lines.features.filter((f) => rail && modeOf(f) === rail).map((f) => f.properties.line))
  const railStations = stations.filter((s) => s.lines.some((l) => railLines.has(l)))
  return railStations.length ? { jernbanestasjon: railStations.map((s) => ({ name: `${s.name}${networkSuffix()}`, pos: stationPos(s) })) } : {}
}

/**
 * Kartdataene for en by, fra `public/data/<by>/`. Stasjoner og linjer må finnes.
 * Grenser, steder og linjedata er valgfrie: mangler filen, slås spørsmålstypen av.
 * Byen blir den som gjelder for tekster og geometri (`city()` og `BOUNDS`).
 */
export async function loadData(cityId: string, read: Reader = fromWeb(cityOf(cityId).id)): Promise<GeoData> {
  const c = cityOf(cityId)
  const need = async <T>(path: string) => {
    const v = await read(path)
    if (!v) throw new Error(`Mangler ${path} for ${c.name}`)
    return v as T
  }
  const optional = async <T>(path: string) => (await read(path)) as T | null
  const [stations, lines, admin, shapes, pois] = await Promise.all([
    need<{ stations: GeoData['stations'] }>('stations.json'),
    need<GeoData['lines']>('lines.geojson'),
    optional<{ features: GeoData['admin'] }>('admin.geojson'),
    Promise.all(SHAPES.map((k) => optional<{ features: Feature[] }>(`${k}.geojson`))),
    Promise.all(POI_TYPES.map((t) => optional<{ features: { properties: { name: string }; geometry: { coordinates: [number, number] } }[] }>(`poi/${t.key}.geojson`))),
  ])
  setCity(c)
  setBounds(c.bounds)
  const [coast, water, riks] = shapes
  const poi: Record<string, Poi[]> = {}
  POI_TYPES.forEach((t, i) => {
    const fc = pois[i]
    if (fc) poi[t.key] = fc.features.map((f) => ({ name: f.properties.name, pos: f.geometry.coordinates }))
  })
  for (const [k, list] of Object.entries(railPoi(stations.stations, lines))) (poi[k] ??= []).push(...list)

  const loaded = [coast, water, riks].map((fc, i) => [SHAPES[i], fc?.features.flatMap((f) => outlines(f.geometry))] as const).filter(([, lines]) => lines)
  return {
    stations: stations.stations,
    lines,
    admin: admin?.features ?? [],
    poi,
    shapes: Object.fromEntries(loaded),
    // Lukkede kystringer er øyer.
    islands: (coast?.features ?? []).filter((f) => f.geometry.type === 'Polygon') as Area[],
  }
}
