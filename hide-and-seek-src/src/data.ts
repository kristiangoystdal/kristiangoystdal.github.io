import { POI_TYPES } from './geo'
import type { GeoData, Poi } from './types'

const url = (path: string) => `${import.meta.env.BASE_URL}data/${path}`

async function optional<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(url(path))
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

/** Stasjoner og linjer må finnes. Grenser og steder er valgfrie: mangler filen, slås spørsmålstypen av. */
export async function loadData(): Promise<GeoData> {
  const [stations, lines, admin, ...pois] = await Promise.all([
    fetch(url('stations.json')).then((r) => r.json()),
    fetch(url('lines.geojson')).then((r) => r.json()),
    optional<{ features: GeoData['admin'] }>('admin.geojson'),
    ...POI_TYPES.map((t) => optional<{ features: { properties: { name: string }; geometry: { coordinates: [number, number] } }[] }>(`poi/${t.key}.geojson`)),
  ])
  const poi: Record<string, Poi[]> = {}
  POI_TYPES.forEach((t, i) => {
    poi[t.key] = (pois[i]?.features ?? []).map((f) => ({ name: f.properties.name, pos: f.geometry.coordinates }))
  })
  return { stations: stations.stations, lines, admin: admin?.features ?? [], poi }
}
