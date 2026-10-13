import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GAME_SETTINGS, useGame } from './store'
import { openDb, withTimeout } from './sync'
import type { Settings } from './types'

/** Et lagret spilloppsett: alt som er felles for et spill, pluss gjemmetiden. */
export interface Preset {
  id: string
  name: string
  setup: Pick<Settings, (typeof GAME_SETTINGS)[number]>
  hidingMinutes: number
  savedAt: number
}

interface PresetState {
  /** Lagret på denne telefonen. Virker også uten nett. */
  local: Preset[]
  /** Delt med alle som bruker appen. Hentes fra databasen. */
  shared: Preset[]
  note: string
}

export const usePresets = create<PresetState>()(
  persist(() => ({ local: [] as Preset[], shared: [] as Preset[], note: '' }), { name: 'hideandseek.presets', partialize: (s) => ({ local: s.local }) }),
)

/** Navnet som nøkkel: «Oslo sentrum, kveld» blir «oslo-sentrum-kveld». */
export const presetId = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

/** Oppsettet slik det står nå, som et preset med dette navnet. */
export function presetOf(name: string, s: Pick<ReturnType<typeof useGame.getState>, 'settings' | 'round'>): Preset {
  const setup = Object.fromEntries(GAME_SETTINGS.map((k) => [k, s.settings[k] ?? null])) as Preset['setup']
  return { id: presetId(name), name: name.trim(), setup, hidingMinutes: s.round.hidingMinutes, savedAt: Date.now() }
}

/** Alle presets, de delte først. Finnes samme navn begge steder, vises det nyeste. */
export function allPresets(s: Pick<PresetState, 'local' | 'shared'>): (Preset & { shared: boolean })[] {
  const byId = new Map<string, Preset & { shared: boolean }>()
  for (const p of s.shared) byId.set(p.id, { ...p, shared: true })
  for (const p of s.local) {
    const other = byId.get(p.id)
    if (!other || p.savedAt > other.savedAt) byId.set(p.id, { ...p, shared: !!other && other.savedAt >= p.savedAt })
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

const presetsRef = async (id?: string) => {
  const { db, database } = await openDb()
  return { db, at: db.ref(database, id ? `presets/${id}` : 'presets') }
}

/** Henter de delte presetene. Uten nett beholdes de som alt er hentet. */
export async function loadPresets() {
  try {
    const { db, at } = await presetsRef()
    const snap = await withTimeout(db.get(at))
    const shared = Object.values((snap.val() ?? {}) as Record<string, string>).map((v) => JSON.parse(v) as Preset)
    usePresets.setState({ shared })
  } catch {
    // Listen på telefonen virker uansett.
  }
}

/** Lagrer oppsettet på telefonen og deler det med alle. Deling som feiler, stopper ikke lagringen. */
export async function savePreset(name: string) {
  const preset = presetOf(name, useGame.getState())
  if (!preset.id) return
  usePresets.setState((s) => ({ local: [...s.local.filter((p) => p.id !== preset.id), preset], note: `«${preset.name}» er lagret.` }))
  try {
    const { db, at } = await presetsRef(preset.id)
    await withTimeout(db.set(at, JSON.stringify(preset)))
    usePresets.setState((s) => ({ shared: [...s.shared.filter((p) => p.id !== preset.id), preset], note: `«${preset.name}» er lagret og delt med alle.` }))
  } catch {
    usePresets.setState({ note: `«${preset.name}» er lagret på denne telefonen, men kunne ikke deles nå.` })
  }
}

export async function deletePreset(id: string) {
  usePresets.setState((s) => ({ local: s.local.filter((p) => p.id !== id), note: '' }))
  try {
    const { db, at } = await presetsRef(id)
    await withTimeout(db.remove(at))
    usePresets.setState((s) => ({ shared: s.shared.filter((p) => p.id !== id) }))
  } catch {
    usePresets.setState({ note: 'Fjernet fra denne telefonen, men kunne ikke fjernes for alle nå.' })
  }
}

/** Setter spilloppsettet og gjemmetiden fra et preset. Gjør ingenting mens en runde pågår. */
export function applyPreset(preset: Preset) {
  const game = useGame.getState()
  if (game.round.seekFrom !== null) return
  game.setSettings(preset.setup)
  game.setRound({ hidingMinutes: preset.hidingMinutes })
  usePresets.setState({ note: `Bruker «${preset.name}».` })
}
