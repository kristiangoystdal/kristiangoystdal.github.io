import { create } from 'zustand'
import type { LngLat } from './types'

/**
 * Oppslag i Kartverkets åpne API-er for det appen ikke har data til selv:
 * høyde over havet og nærmeste gate. Begge er gratis, uten nøkkel, og tillater
 * kall fra nettleseren. Uten nett svarer hider selv som før.
 */
export type LookupKind = 'height' | 'street'

export type Lookup =
  | { status: 'loading' }
  | { status: 'error' }
  /** Meter over havet. */
  | { status: 'ok'; height: number }
  /** Gatenavnene i nærheten, nærmeste først, med avstand i meter. */
  | { status: 'ok'; streets: { name: string; d: number }[] }

const HEIGHT_URL = 'https://ws.geonorge.no/hoydedata/v1/punkt'
const ADDRESS_URL = 'https://ws.geonorge.no/adresser/v1/punktsok'
const STREET_RADIUS_M = 300
const TIMEOUT_MS = 8000

// Fire desimaler er ca. 10 m. Nærmere enn det gir samme svar, og samme oppslag kan brukes igjen.
const keyOf = (kind: LookupKind, p: LngLat) => `${kind}:${p[0].toFixed(4)},${p[1].toFixed(4)}`

export const useLookups = create<Record<string, Lookup>>(() => ({}))

const metres = (a: LngLat, b: LngLat) => {
  const rad = Math.PI / 180
  const x = (b[0] - a[0]) * rad * Math.cos(((a[1] + b[1]) / 2) * rad)
  const y = (b[1] - a[1]) * rad
  return Math.hypot(x, y) * 6371000
}

async function getJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

async function fetchHeight(p: LngLat): Promise<Lookup> {
  const json = await getJson(`${HEIGHT_URL}?koordsys=4258&ost=${p[0]}&nord=${p[1]}&geojson=false`)
  const z = json?.punkter?.[0]?.z
  return typeof z === 'number' ? { status: 'ok', height: z } : { status: 'error' }
}

/** Gatene til adressene rundt punktet. En gate er så nær som den nærmeste adressen i den. */
async function fetchStreets(p: LngLat): Promise<Lookup> {
  const json = await getJson(
    `${ADDRESS_URL}?lat=${p[1]}&lon=${p[0]}&radius=${STREET_RADIUS_M}&treffPerSide=100&filtrer=adresser.adressenavn,adresser.representasjonspunkt`,
  )
  const best = new Map<string, number>()
  for (const a of json?.adresser ?? []) {
    const pt = a.representasjonspunkt
    if (!a.adressenavn || !pt) continue
    const d = metres(p, [pt.lon, pt.lat])
    if (d < (best.get(a.adressenavn) ?? Infinity)) best.set(a.adressenavn, d)
  }
  const streets = [...best].map(([name, d]) => ({ name, d })).sort((a, b) => a.d - b.d)
  return { status: 'ok', streets }
}

/** Henter oppslaget, eller gir det som alt er hentet. En tidligere feil prøves på nytt. */
export function fetchLookup(kind: LookupKind, p: LngLat): Promise<Lookup> {
  const key = keyOf(kind, p)
  const have = useLookups.getState()[key]
  if (have?.status === 'ok') return Promise.resolve(have)
  const running = inflight.get(key)
  if (running) return running
  useLookups.setState({ [key]: { status: 'loading' } })
  const job = (kind === 'height' ? fetchHeight(p) : fetchStreets(p))
    .catch((): Lookup => ({ status: 'error' }))
    .then((v) => {
      inflight.delete(key)
      useLookups.setState({ [key]: v })
      return v
    })
  inflight.set(key, job)
  return job
}
const inflight = new Map<string, Promise<Lookup>>()

/**
 * Oppslaget slik det står nå. Mangler det, hentes det i bakgrunnen, og alle som
 * bruker `useLookups` tegnes på nytt når svaret kommer.
 */
export function lookup(kind: LookupKind, p: LngLat): Lookup | undefined {
  const have = useLookups.getState()[keyOf(kind, p)]
  // Ikke endre tilstanden midt i en tegning. En feil prøves ikke på nytt her, ellers ville
  // appen spurt i ring uten nett. «Svar med posisjonen min» prøver igjen.
  if (!have) queueMicrotask(() => !useLookups.getState()[keyOf(kind, p)] && void fetchLookup(kind, p))
  return have
}
