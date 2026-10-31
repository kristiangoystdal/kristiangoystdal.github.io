import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GAME_SETTINGS, useGame } from './store'
import { openDb, withTimeout } from './sync'
import type { GameSize, Settings } from './types'

/**
 * Spilloppsett: alt som er felles for et spill (by, størrelse, linjer, sone, område, spørsmål)
 * pluss gjemmetiden. De kan lagres på telefonen eller deles med alle som bruker appen.
 *
 * Delte oppsett ligger under `presets/<id>` i databasen med eier (den anonyme kontoen til
 * telefonen som delte det), og kan bare endres og slettes av eieren (se database.rules.json).
 * Alle kan telle bruk og rapportere. Et oppsett med tre rapporter skjules for andre enn eieren.
 */
export type Setup = Pick<Settings, (typeof GAME_SETTINGS)[number]>

/** Et oppsett lagret på denne telefonen. Virker også uten nett. */
export interface LocalPreset {
  id: string
  name: string
  setup: Setup
  hidingMinutes: number
  savedAt: number
}

/** Et oppsett delt med alle, slik oversikten viser det. */
export interface SharedPreset {
  id: string
  name: string
  description: string
  city: string
  setup: Setup
  hidingMinutes: number
  created: number
  uses: number
  reports: number
  /** Delt fra denne telefonen. */
  mine: boolean
  /** Denne telefonen har rapportert det. */
  reported: boolean
}

/** Så mange rapporter fra ulike telefoner før et oppsett skjules. */
export const HIDE_AT_REPORTS = 3
/** Så mange oppsett hver telefon kan dele. */
export const MAX_SHARED = 10

interface PresetState {
  local: LocalPreset[]
  /** Delte oppsett for byen som er hentet sist. */
  shared: SharedPreset[]
  sharedCity: string | null
  fetching: boolean
  error: string
  note: string
  /** Det delte oppsettet som ble brukt sist, og oppsettet slik det var da. Teller bruk når en runde startes uten endringer. */
  applied: { id: string; key: string } | null
  /** Når hvert delt oppsett sist ble telt fra denne telefonen (dato). Hver telefon teller ett oppsett én gang per dag. */
  counted: Record<string, string>
  /** Et oppsett fra en lenke (#oppsett=<id>) som skal åpnes i oversikten. */
  open: string | null
}

export const usePresets = create<PresetState>()(
  persist(
    (): PresetState => ({ local: [], shared: [], sharedCity: null, fetching: false, error: '', note: '', applied: null, counted: {}, open: null }),
    { name: 'hideandseek.presets', partialize: (s) => ({ local: s.local, applied: s.applied, counted: s.counted }) },
  ),
)

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => ALPHABET[b % ALPHABET.length]).join('')

/** Oppsettet slik det står nå. */
export function currentSetup(s: Pick<ReturnType<typeof useGame.getState>, 'settings' | 'round'> = useGame.getState()): { setup: Setup; hidingMinutes: number } {
  const setup = Object.fromEntries(GAME_SETTINGS.map((k) => [k, s.settings[k] ?? null])) as Setup
  return { setup, hidingMinutes: s.round.hidingMinutes }
}

/** Nøkkel for å se om to oppsett er like. Rekkefølgen på linjer og spørsmål betyr ikke noe. */
export function setupKey(setup: Setup, hidingMinutes: number): string {
  const norm: Record<string, unknown> = { ...setup, lines: [...(setup.lines ?? [])].sort(), questions: setup.questions ? [...setup.questions].sort() : null, areaAuto: setup.areaAuto !== false }
  return JSON.stringify([GAME_SETTINGS.map((k) => norm[k] ?? null), hidingMinutes])
}

export const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10)

/** Skal en runde som startes nå, telles som bruk av det delte oppsettet som ble valgt? Gir id-en, eller null. */
export function shouldCount(applied: PresetState['applied'], key: string, counted: Record<string, string>, day: string): string | null {
  if (!applied || applied.key !== key) return null
  return counted[applied.id] === day ? null : applied.id
}

/** Synlig i oversikten: ikke rapportert av for mange, med mindre det er ditt eget. */
export const visible = (p: SharedPreset) => p.mine || p.reports < HIDE_AT_REPORTS

export type Sort = 'popular' | 'newest'
export interface Filter {
  size: GameSize | null
  query: string
}

/** Oversikten: synlige oppsett, filtrert på størrelse og søk, sortert etter bruk eller alder. */
export function listPresets(all: SharedPreset[], sort: Sort, filter: Filter): SharedPreset[] {
  const q = filter.query.trim().toLowerCase()
  return all
    .filter(visible)
    .filter((p) => !filter.size || p.setup.size === filter.size)
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    .sort((a, b) => (sort === 'popular' ? b.uses - a.uses || b.created - a.created : b.created - a.created) || a.name.localeCompare(b.name, 'nb'))
}

export interface Stored {
  owner: string
  name: string
  description?: string
  city: string
  setup: string
  hidingMinutes: number
  created: number
  updated?: number
  uses?: number
  reports?: Record<string, boolean>
}

/** Fra databasen til det oversikten viser. Ugyldige oppsett hoppes over. */
export function fromStored(id: string, v: Stored, uid: string | null): SharedPreset | null {
  try {
    const setup = JSON.parse(v.setup) as Setup
    if (!setup || typeof v.name !== 'string') return null
    return {
      id,
      name: v.name,
      description: v.description ?? '',
      city: v.city,
      setup,
      hidingMinutes: v.hidingMinutes,
      created: v.created,
      uses: v.uses ?? 0,
      reports: Object.keys(v.reports ?? {}).length,
      mine: !!uid && v.owner === uid,
      reported: !!uid && !!v.reports?.[uid],
    }
  } catch {
    return null
  }
}

const offline = 'Fikk ikke kontakt med databasen. Sjekk nettet og prøv igjen.'

/** Henter de delte oppsettene for en by. Det som alt er hentet, vises imens. */
export async function loadShared(city: string) {
  usePresets.setState({ fetching: true, error: '' })
  try {
    const { db, database, uid } = await openDb()
    const q = db.query(db.ref(database, 'presets'), db.orderByChild('city'), db.equalTo(city), db.limitToFirst(500))
    const snap = await withTimeout(db.get(q))
    const shared = Object.entries((snap.val() ?? {}) as Record<string, Stored>)
      .map(([id, v]) => fromStored(id, v, uid))
      .filter((p): p is SharedPreset => !!p)
    usePresets.setState({ shared, sharedCity: city })
  } catch {
    usePresets.setState({ error: offline })
  }
  usePresets.setState({ fetching: false })
}

/** Henter ett delt oppsett, f.eks. fra en lenke. */
export async function loadOne(id: string): Promise<SharedPreset | null> {
  try {
    const { db, database, uid } = await openDb()
    const snap = await withTimeout(db.get(db.ref(database, `presets/${id}`)))
    return snap.exists() ? fromStored(id, snap.val() as Stored, uid) : null
  } catch {
    return null
  }
}

/** Deler oppsettet slik det står nå med alle. Gir id-en, eller kaster med en feilmelding brukeren kan lese. */
export async function sharePreset(name: string, description: string): Promise<string> {
  const { db, database, uid } = await openDb()
  if (!uid) throw new Error('Kunne ikke logge inn. Sjekk nettet og prøv igjen.')
  const mine = await withTimeout(db.get(db.query(db.ref(database, 'presets'), db.orderByChild('owner'), db.equalTo(uid), db.limitToFirst(MAX_SHARED + 1))))
  if (Object.keys(mine.val() ?? {}).length >= MAX_SHARED) throw new Error(`Du har delt ${MAX_SHARED} oppsett. Slett et av dem for å dele et nytt.`)
  const { setup, hidingMinutes } = currentSetup()
  const id = newId()
  const value: Stored = { owner: uid, name: name.trim().slice(0, 40), city: setup.city, setup: JSON.stringify(setup), hidingMinutes, created: Date.now() }
  if (description.trim()) value.description = description.trim().slice(0, 200)
  await withTimeout(db.set(db.ref(database, `presets/${id}`), value))
  const shown = fromStored(id, value, uid)!
  usePresets.setState((s) => ({
    note: `«${value.name}» er delt med alle.`,
    applied: { id, key: setupKey(setup, hidingMinutes) },
    shared: s.sharedCity === setup.city ? [...s.shared, shown] : s.shared,
  }))
  return id
}

/** Eieren endrer navn og beskrivelse, og eventuelt selve oppsettet til det som står nå. */
export async function updatePreset(id: string, change: { name: string; description: string; useCurrent: boolean }) {
  const { db, database } = await openDb()
  const fields: Record<string, unknown> = { name: change.name.trim().slice(0, 40), description: change.description.trim().slice(0, 200), updated: Date.now() }
  if (change.useCurrent) {
    const { setup, hidingMinutes } = currentSetup()
    Object.assign(fields, { setup: JSON.stringify(setup), hidingMinutes, city: setup.city })
  }
  await withTimeout(db.update(db.ref(database, `presets/${id}`), fields))
  const fresh = await loadOne(id)
  if (fresh) usePresets.setState((s) => ({ shared: s.shared.map((p) => (p.id === id ? fresh : p)), note: 'Endringen er lagret.' }))
}

export async function deleteShared(id: string) {
  const { db, database } = await openDb()
  await withTimeout(db.remove(db.ref(database, `presets/${id}`)))
  usePresets.setState((s) => ({ shared: s.shared.filter((p) => p.id !== id), note: 'Oppsettet er slettet.' }))
}

export async function reportPreset(id: string) {
  const { db, database, uid } = await openDb()
  if (!uid) throw new Error('Kunne ikke logge inn. Sjekk nettet og prøv igjen.')
  await withTimeout(db.set(db.ref(database, `presets/${id}/reports/${uid}`), true))
  usePresets.setState((s) => ({ shared: s.shared.map((p) => (p.id === id ? { ...p, reported: true, reports: p.reports + 1 } : p)), note: 'Takk. Oppsettet er rapportert.' }))
}

/** Bruker et delt oppsett: setter spilloppsettet og gjemmetiden. Gjør ingenting mens en runde pågår. */
export function applyShared(p: SharedPreset) {
  const game = useGame.getState()
  if (game.round.seekFrom !== null) return
  game.setSettings(p.setup)
  game.setRound({ hidingMinutes: p.hidingMinutes })
  usePresets.setState({ applied: { id: p.id, key: setupKey(p.setup, p.hidingMinutes) }, note: `Bruker «${p.name}».` })
}

/** Teller bruk når en runde startes med et delt oppsett som ikke er endret etterpå. Én gang per telefon per dag. */
export async function countUse() {
  const { applied, counted } = usePresets.getState()
  const { setup, hidingMinutes } = currentSetup()
  const id = shouldCount(applied, setupKey(setup, hidingMinutes), counted, today())
  if (!id) return
  usePresets.setState((s) => ({ counted: { ...s.counted, [id]: today() } }))
  try {
    const { db, database } = await openDb()
    await withTimeout(db.runTransaction(db.ref(database, `presets/${id}/uses`), (n: number | null) => (n ?? 0) + 1))
  } catch {
    // Telling er ikke viktig nok til å plage noen med en feilmelding.
  }
}

/** Lenke som åpner et delt oppsett i oversikten. */
export const presetLink = (id: string) => `${location.origin}${location.pathname}#oppsett=${id}`
export const presetFromHash = (hash: string) => hash.match(/oppsett=([a-z0-9]{8,24})\b/)?.[1] ?? null

/** Lagrer oppsettet slik det står nå på denne telefonen. */
export function saveLocal(name: string) {
  const { setup, hidingMinutes } = currentSetup()
  const p: LocalPreset = { id: newId(), name: name.trim().slice(0, 40), setup, hidingMinutes, savedAt: Date.now() }
  usePresets.setState((s) => ({ local: [...s.local.filter((x) => x.name !== p.name), p], note: `«${p.name}» er lagret på telefonen.` }))
}

export function deleteLocal(id: string) {
  usePresets.setState((s) => ({ local: s.local.filter((p) => p.id !== id) }))
}

export function applyLocal(p: LocalPreset) {
  const game = useGame.getState()
  if (game.round.seekFrom !== null) return
  game.setSettings(p.setup)
  game.setRound({ hidingMinutes: p.hidingMinutes })
  usePresets.setState({ applied: null, note: `Bruker «${p.name}».` })
}
