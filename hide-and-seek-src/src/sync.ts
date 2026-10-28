import { create } from 'zustand'
import { deviceId } from './device'
import { announce, announceRound, notify } from './notify'
import { GAME_SETTINGS, useGame, type ArchivedRound, type HiderPoint, type Round, type State } from './store'
import type { LngLat, Question, RoundResult, Settings } from './types'

// Realtime Database trenger bare adressen. Appen bruker ingen API-nøkkel, og
// tilgangen styres av reglene i database.rules.json.
const CONFIG = {
  databaseURL: 'https://jetlag-hide-and-seek-norway-default-rtdb.europe-west1.firebasedatabase.app',
}
const EMULATOR = import.meta.env.VITE_FIREBASE_EMULATOR as string | undefined

const ROOM_KEY = 'hideandseek.room'
export const CODE_LENGTH = 6
// Uten 0/O og 1/I/L, som er lette å forveksle når koden leses opp.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const TIMEOUT_MS = 10000
const ARCHIVE_DELAY_MS = 4000

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

/**
 * Trykket to seekere «Still spørsmål» samtidig, ligger det to ubesvarte spørsmål i rommet.
 * Det som ble stilt først står. Telefonen som stilte et av de andre, trekker sitt tilbake.
 * Alle telefoner sorterer likt, så nøyaktig ett blir stående.
 */
export function clashLosers(questions: Question[], me: string): Question[] {
  const open = questions.filter((q) => q.answer === null).sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
  return open.slice(1).filter((q) => q.by === me)
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
  const setup: Setup = { city: s.settings.city, zoneRadius: s.settings.zoneRadius, lines: s.settings.lines, playArea: s.settings.playArea ?? null, size: s.settings.size, questions: s.settings.questions ?? null }
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
      if (!first) announceRound(local.round, next.round, local.mode)
      // En annen telefon avsluttet en runde. Den lagrer runden i arkivet like etter.
      if (!first && next.results.length > local.results.length) setTimeout(() => void loadArchive(code), ARCHIVE_DELAY_MS)
      const losers = clashLosers(next.questions, deviceId())
      if (losers.length) {
        for (const q of losers) useGame.getState().removeQuestion(q.id)
        notify({ title: 'Spørsmålet ditt ble trukket tilbake', body: 'En annen seeker stilte et spørsmål samtidig. Vent på svaret på det, og still ditt etterpå.', tab: 'questions' })
      }
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
    rememberRoom(code)
    void loadArchive()
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

const RECENT_KEY = 'hideandseek.rooms'
const RECENT_LIMIT = 10
export interface RecentRoom {
  code: string
  /** Sist telefonen var i rommet. */
  at: number
}

/** Rommene telefonen har vært i, nyeste først, så man kan gå tilbake til et. */
export function recentRooms(): RecentRoom[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentRoom[]
  } catch {
    return []
  }
}
function rememberRoom(code: string) {
  const list = [{ code, at: Date.now() }, ...recentRooms().filter((r) => r.code !== code)].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // Full lagring hindrer ikke spillet.
  }
}

/**
 * Arkivet ligger utenfor selve rommet (`archive/<kode>/<runde>`), så telefonene ikke
 * laster ned alle gamle runder hver gang en seeker sender posisjonen sin.
 */
export async function saveArchive(round: ArchivedRound) {
  if (!round.room) return
  try {
    const { db, database } = await openDb()
    await withTimeout(db.set(db.ref(database, `archive/${round.room}/${round.id}`), JSON.stringify(round)))
  } catch {
    useSync.setState({ error: 'Runden er lagret på telefonen, men kunne ikke lagres i rommet.' })
  }
}

/**
 * Legger hiders punkter til runden i rommets arkiv. Runden leses og skrives i én
 * transaksjon, så det ikke overskriver noe en annen telefon skrev samtidig.
 */
export async function saveHiderPath(room: string, id: string, pts: HiderPoint[]) {
  try {
    const { db, database } = await openDb()
    await withTimeout(
      db.runTransaction(db.ref(database, `archive/${room}/${id}`), (cur: string | null) => {
        if (!cur) return cur
        const r = JSON.parse(cur) as ArchivedRound
        return (r.hiderPath?.length ?? 0) >= pts.length ? undefined : JSON.stringify({ ...r, hiderPath: pts })
      }),
    )
  } catch {
    // Punktene ligger fortsatt på telefonen og prøves igjen neste gang arkivet endres.
  }
}

/** Henter rundene i rommet som telefonen ikke har, f.eks. de en annen telefon avsluttet. */
export async function loadArchive(code = useSync.getState().room) {
  if (!code) return
  try {
    const { db, database } = await openDb()
    const snap = await withTimeout(db.get(db.ref(database, `archive/${code}`)))
    const rounds = Object.values((snap.val() ?? {}) as Record<string, string>).map((v) => JSON.parse(v) as ArchivedRound)
    if (rounds.length) useGame.getState().mergeArchive(rounds)
  } catch {
    // Uten nett vises rundene telefonen har selv.
  }
}
