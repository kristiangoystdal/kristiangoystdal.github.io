import { create } from 'zustand'
import { announce } from './notify'
import { GAME_SETTINGS, useGame, type Round, type State } from './store'
import type { LngLat, Question, RoundResult, Settings } from './types'

// Realtime Database trenger bare adressen. Appen bruker ingen API-nøkkel, og
// tilgangen styres av reglene i database.rules.json.
const CONFIG = {
  databaseURL: 'https://jetlag-hide-and-seek-norway-default-rtdb.europe-west1.firebasedatabase.app',
}
const EMULATOR = import.meta.env.VITE_FIREBASE_EMULATOR as string | undefined

const ROOM_KEY = 'hideandseek.room'
const DEVICE_KEY = 'hideandseek.device'
export const CODE_LENGTH = 6
// Uten 0/O og 1/I/L, som er lette å forveksle når koden leses opp.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const TIMEOUT_MS = 10000

export const cleanCode = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(CODE_LENGTH)), (b) => ALPHABET[b % ALPHABET.length]).join('')

/**
 * Det som deles i et rom, slik det ligger i databasen. Lister lagres som
 * oppslag på id, så to telefoner kan legge til hver sin ting samtidig uten å
 * overskrive hverandre. Verdiene er JSON-tekst fordi Realtime Database ellers
 * kaster null-verdier og tomme lister.
 */
export interface Shared {
  questions: Record<string, string>
  results: Record<string, string>
  round: string
  setup: string
  players: string
}
/** En seekers siste kjente posisjon. `v` er farten i m/s, null når den er ukjent. */
export interface SeekerPos {
  pos: LngLat
  t: number
  v: number | null
}

/** Telefonens egen nøkkel under `seekers` i rommet. */
function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) localStorage.setItem(DEVICE_KEY, (id = Math.random().toString(36).slice(2, 10)))
  return id
}

type Synced = Pick<State, 'questions' | 'results' | 'round' | 'settings' | 'players'>
type Setup = Pick<Settings, (typeof GAME_SETTINGS)[number]>

const byId = <T extends { id: string }>(items: T[]) => Object.fromEntries(items.map((x) => [x.id, JSON.stringify(x)]))
const fromIds = <T>(map: Record<string, string> | undefined) => Object.values(map ?? {}).map((v) => JSON.parse(v) as T)

/**
 * Hiders posisjon er med vilje ikke med, så seekerne ikke kan se den.
 * Rolle, kartvalg og tema hører også til telefonen.
 */
export function toShared(s: Synced): Shared {
  const setup: Setup = { zoneRadius: s.settings.zoneRadius, lines: s.settings.lines, playArea: s.settings.playArea ?? null, size: s.settings.size, questions: s.settings.questions ?? null }
  return {
    questions: byId(s.questions),
    results: byId(s.results),
    round: JSON.stringify(s.round),
    setup: JSON.stringify(setup),
    players: JSON.stringify(s.players),
  }
}

export function fromShared(remote: Partial<Shared>, local: Synced): Synced {
  return {
    // Rekkefølgen i databasen er vilkårlig, så loggen sorteres på tidspunkt.
    questions: fromIds<Question>(remote.questions).sort((a, b) => a.time - b.time || a.id.localeCompare(b.id)),
    results: fromIds<RoundResult>(remote.results).sort((a, b) => (a.at ?? 0) - (b.at ?? 0)),
    round: remote.round ? (JSON.parse(remote.round) as Round) : local.round,
    settings: { ...local.settings, ...(remote.setup ? (JSON.parse(remote.setup) as Setup) : {}) },
    players: remote.players ? (JSON.parse(remote.players) as string[]) : local.players,
  }
}

/** Endringene fra `prev` til `next` som stier i rommet. null = slett. */
export function diff(prev: Shared, next: Shared): Record<string, string | null> {
  const patch: Record<string, string | null> = {}
  for (const key of ['questions', 'results'] as const) {
    for (const id of Object.keys(next[key])) if (prev[key][id] !== next[key][id]) patch[`${key}/${id}`] = next[key][id]
    for (const id of Object.keys(prev[key])) if (!(id in next[key])) patch[`${key}/${id}`] = null
  }
  for (const key of ['round', 'setup', 'players'] as const) if (prev[key] !== next[key]) patch[key] = next[key]
  return patch
}

const normalize = (v: Partial<Shared>): Shared => ({
  questions: v.questions ?? {},
  results: v.results ?? {},
  round: v.round ?? '',
  setup: v.setup ?? '',
  players: v.players ?? '',
})

interface SyncState {
  room: string | null
  status: 'off' | 'connecting' | 'online' | 'offline'
  error: string
  /** Seekerne som deler posisjon i rommet, per telefon. */
  seekers: Record<string, SeekerPos>
}
export const useSync = create<SyncState>(() => ({ room: null, status: 'off', error: '', seekers: {} }))

let stop: (() => void) | null = null
let sendPos: ((p: SeekerPos | null) => void) | null = null

/** Deler seekers posisjon i rommet, eller fjerner den med null. Hiders posisjon sendes aldri. */
export function shareSeekerPos(p: SeekerPos | null) {
  if (p && useGame.getState().mode !== 'seeker') return
  sendPos?.(p)
}
let emulated = false

export const withTimeout = <T>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Fikk ikke kontakt. Sjekk nettet og prøv igjen.')), TIMEOUT_MS))])

/** Åpner databasen. Firebase lastes først når noen faktisk bruker et rom eller delte presets. */
export async function openDb() {
  const [{ initializeApp, getApps }, db] = await Promise.all([import('firebase/app'), import('firebase/database')])
  const app = getApps()[0] ?? initializeApp(CONFIG)
  const database = db.getDatabase(app)
  if (EMULATOR && !emulated) {
    const [host, port] = EMULATOR.split(':')
    db.connectDatabaseEmulator(database, host, +port)
    emulated = true
  }
  return { db, database }
}

async function connect(code: string, how: 'create' | 'join' | 'resume') {
  leaveRoom()
  useSync.setState({ room: code, status: 'connecting', error: '' })
  try {
    const { db, database } = await openDb()
    const room = db.ref(database, `rooms/${code}`)

    if (how === 'create') {
      await withTimeout(db.set(room, { ...toShared(useGame.getState()), created: db.serverTimestamp() }))
    } else if (how === 'join') {
      const created = await withTimeout(db.get(db.child(room, 'created')))
      if (!created.exists()) throw new Error(`Fant ikke rommet ${code}. Sjekk koden.`)
    }

    // Sist kjente tilstand i rommet. Lokale endringer sendes som forskjellen fra denne.
    let synced: Shared | null = null
    let applying = false
    let seenSeekers = ''
    // Posisjonen skrives for seg, så en avvist skriving aldri stopper resten av synken.
    const mine = db.child(room, `seekers/${deviceId()}`)
    sendPos = (p) => void (p ? db.set(mine, JSON.stringify(p)) : db.remove(mine)).catch(() => {})

    const push = () => {
      // Før første svar fra rommet vet vi ikke hva som er nytt, så ingenting sendes.
      if (applying || !synced) return
      const next = toShared(useGame.getState())
      const patch = diff(synced, next)
      if (Object.keys(patch).length === 0) return
      synced = next
      db.update(room, patch).catch(() => useSync.setState({ error: 'Kunne ikke lagre til rommet.' }))
    }
    const offRemote = db.onValue(room, (snap) => {
      const value = snap.val() as (Partial<Shared> & { seekers?: Record<string, string> }) | null
      if (!value) return
      const seekers = JSON.stringify(value.seekers ?? {})
      if (seekers !== seenSeekers) {
        seenSeekers = seekers
        useSync.setState({ seekers: Object.fromEntries(Object.entries(value.seekers ?? {}).map(([id, v]) => [id, JSON.parse(v) as SeekerPos])) })
      }
      const first = !synced
      const incoming = normalize(value)
      // Posisjonene oppdateres ofte. Er spillet ellers uendret, røres ikke tilstanden.
      const same = synced !== null && Object.keys(diff(synced, incoming)).length === 0
      synced = incoming
      if (same) return
      const local = useGame.getState()
      const next = fromShared(value, local)
      // Angre går tilbake til denne telefonens forrige logg. Har noen andre endret
      // loggen i mellomtiden, ville det slettet deres endringer, så angre nullstilles.
      const othersChanged = JSON.stringify(next.questions) !== JSON.stringify(local.questions)
      applying = true
      useGame.setState(othersChanged ? { ...next, past: [] } : next)
      applying = false
      // Ikke varsle om alt som lå i rommet fra før da vi koblet til.
      if (!first && othersChanged) announce(local.questions, next.questions, local.mode)
      // Sender det som eventuelt ble endret lokalt mens rommets tilstand ble lagt inn.
      push()
    })
    const offLocal = useGame.subscribe(push)
    const offStatus = db.onValue(db.ref(database, '.info/connected'), (snap) => {
      if (useSync.getState().room === code) useSync.setState({ status: snap.val() ? 'online' : 'offline' })
    })

    stop = () => {
      offRemote()
      offLocal()
      offStatus()
    }
    localStorage.setItem(ROOM_KEY, code)
  } catch (e) {
    const denied = /permission/i.test((e as Error).message)
    useSync.setState({ room: null, status: 'off', error: denied ? 'Databasen slipper ikke inn. Sikkerhetsreglene er ikke satt opp.' : (e as Error).message })
    if (how !== 'resume') localStorage.removeItem(ROOM_KEY)
  }
}

export const createRoom = () => connect(newCode(), 'create')
export const joinRoom = (code: string) => connect(cleanCode(code), 'join')

export function leaveRoom() {
  stop?.()
  stop = null
  sendPos = null
  localStorage.removeItem(ROOM_KEY)
  useSync.setState({ room: null, status: 'off', error: '', seekers: {} })
}

/** Kobler til rommet telefonen var i sist siden var åpen. */
export function resumeRoom() {
  const code = localStorage.getItem(ROOM_KEY)
  if (code && !useSync.getState().room) void connect(code, 'resume')
}

export const roomLink = (code: string) => `${location.origin}${location.pathname}#rom=${code}`
export const roomFromHash = (hash: string) => hash.match(/rom=([A-Za-z0-9]{6})\b/)?.[1].toUpperCase() ?? null
