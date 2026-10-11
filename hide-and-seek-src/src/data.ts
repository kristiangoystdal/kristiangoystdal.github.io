import type { Feature, Geometry } from 'geojson'
import { POI_TYPES, stationPos } from './geo'
import type { Area, GeoData, LngLat, Poi, ShapeKey } from './types'

const url = (path: string) => `${import.meta.env.BASE_URL}data/${path}`
const SHAPES: ShapeKey[] = ['coast', 'water', 'riks']

async function optional<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(url(path))
    return res.ok ? ((await res.json()) as T) : null
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

/** Stasjoner og linjer må finnes. Grenser, steder og linjedata er valgfrie: mangler filen, slås spørsmålstypen av. */
export async function loadData(): Promise<GeoData> {
  const [stations, lines, admin, shapes, pois] = await Promise.all([
    fetch(url('stations.json')).then((r) => r.json()),
    fetch(url('lines.geojson')).then((r) => r.json()),
    optional<{ features: GeoData['admin'] }>('admin.geojson'),
    Promise.all(SHAPES.map((k) => optional<{ features: Feature[] }>(`${k}.geojson`))),
    Promise.all(POI_TYPES.map((t) => optional<{ features: { properties: { name: string }; geometry: { coordinates: [number, number] } }[] }>(`poi/${t.key}.geojson`))),
  ])
  const [coast, water, riks] = shapes
  const poi: Record<string, Poi[]> = {}
  POI_TYPES.forEach((t, i) => {
    const fc = pois[i]
    if (fc) poi[t.key] = fc.features.map((f) => ({ name: f.properties.name, pos: f.geometry.coordinates }))
  })
  // Reglene regner T-bane som jernbanestasjon i Measuring.
  ;(poi.jernbanestasjon ??= []).push(...(stations.stations as GeoData['stations']).map((s) => ({ name: `${s.name} (T-bane)`, pos: stationPos(s) })))

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
