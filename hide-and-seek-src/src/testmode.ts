import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LngLat } from './types'

/**
 * Testmodus: posisjonen velges på kartet i stedet for fra GPS, så appen kan prøves uten å
 * være der. Telefonens `navigator.geolocation` byttes ut, så alt som bruker posisjonen
 * (hiders svar, seekernes deling, termometeret, «bruk GPS») virker uten endringer.
 * Bare på denne telefonen.
 */
export interface TestMode {
  on: boolean
  /** Der telefonen later som den står. null = ikke valgt ennå. */
  pos: LngLat | null
  /** Hvor mye den falske GPS-en sier at den kan bomme, i meter. */
  accuracy: number
}

export const useTestMode = create<TestMode>()(persist((): TestMode => ({ on: false, pos: null, accuracy: 5 }), { name: 'hideandseek.test' }))

export const setTestMode = (patch: Partial<TestMode>) => useTestMode.setState(patch)

/** Lager en posisjon slik nettleseren gir den. */
export function fakePosition(pos: LngLat, accuracy: number, timestamp = Date.now()): GeolocationPosition {
  const coords = { latitude: pos[1], longitude: pos[0], accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null }
  return { coords: { ...coords, toJSON: () => coords }, timestamp, toJSON: () => ({ coords, timestamp }) } as GeolocationPosition
}

const NO_POS = 2
function fakeError(message: string): GeolocationPositionError {
  return { code: NO_POS, message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError
}
const NOT_PICKED = 'Testmodus: velg hvor du står på kartet.'
const NO_GPS = 'Nettleseren støtter ikke posisjon.'

interface Watch {
  ok: PositionCallback
  err?: PositionErrorCallback | null
  opts?: PositionOptions
  /** Id-en hos den ekte GPS-en mens testmodus er av. */
  real: number | null
}

/**
 * En `Geolocation` som gir testposisjonen når testmodus er på, og ellers sender videre til
 * den ekte. Følginger som går, bytter kilde når testmodus slås av eller på.
 */
export function createGeolocation(real: Geolocation | undefined, store = useTestMode): Geolocation {
  const watches = new Map<number, Watch>()
  let next = 1
  const emit = (w: Watch) => {
    const { pos, accuracy } = store.getState()
    if (pos) w.ok(fakePosition(pos, accuracy))
    else w.err?.(fakeError(NOT_PICKED))
  }
  const connect = (w: Watch) => {
    if (store.getState().on) {
      if (w.real !== null) real?.clearWatch(w.real)
      w.real = null
      // Asynkront, som en ekte GPS.
      setTimeout(() => watches.has(idOf(w)) && store.getState().on && emit(w), 0)
    } else if (w.real === null) {
      if (real) w.real = real.watchPosition(w.ok, w.err, w.opts)
      else w.err?.(fakeError(NO_GPS))
    }
  }
  const idOf = (w: Watch) => [...watches].find(([, x]) => x === w)?.[0] ?? -1

  let last = store.getState()
  store.subscribe((s) => {
    const changed = s.on !== last.on || s.pos !== last.pos || s.accuracy !== last.accuracy
    last = s
    if (!changed) return
    for (const w of watches.values()) connect(w)
  })

  return {
    getCurrentPosition(ok, err, opts) {
      if (!store.getState().on) {
        if (real) return real.getCurrentPosition(ok, err, opts)
        return void setTimeout(() => err?.(fakeError(NO_GPS)), 0)
      }
      setTimeout(() => emit({ ok, err, real: null }), 0)
    },
    watchPosition(ok, err, opts) {
      const id = next++
      const w: Watch = { ok, err, opts, real: null }
      watches.set(id, w)
      connect(w)
      return id
    },
    clearWatch(id) {
      const w = watches.get(id)
      if (!w) return
      if (w.real !== null) real?.clearWatch(w.real)
      watches.delete(id)
    },
  }
}

/** Bytter ut nettleserens GPS. Kalles én gang når appen starter. */
export function installTestMode() {
  if (typeof navigator === 'undefined') return
  const geo = createGeolocation(navigator.geolocation)
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true })
}
