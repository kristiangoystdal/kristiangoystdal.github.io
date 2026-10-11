import { useEffect, useState } from 'react'
import { gameNow, waitingForAnswer, type PauseKind } from './clock'
import { place } from './form'
import { stationPos } from './geo'
import { useGame, useUi } from './store'
import type { LngLat, Station } from './types'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** Tiden spillets klokker viser. Står stille mens spillet er på pause. */
export function useGameNow() {
  const pause = useGame((s) => s.round.pause)
  return gameNow({ pause }, useNow())
}

export const PAUSE_TEXT: Record<PauseKind, { title: string; body: string }> = {
  pause: { title: '⏸ Spillet er på pause', body: 'Alle klokker står. Alle blir stående der de er til spillet fortsetter.' },
  rest: { title: '🌙 Hvileperiode', body: 'Alle klokker står. Før spillet fortsetter må alle tilbake til nøyaktig samme sted.' },
}

/** Det alle må vite akkurat nå: pause, eller at hiders klokke står fordi svartiden er ute. */
export function GameStatus() {
  const now = useGameNow()
  const pause = useGame((s) => s.round.pause)
  const running = useGame((s) => s.round.seekFrom !== null)
  const waiting = useGame((s) => running && waitingForAnswer(s.questions, s.settings.size, now))
  if (!running || (!pause && !waiting)) return null
  const text = pause ? PAUSE_TEXT[pause.kind] : { title: 'Hiders klokke står stille', body: 'Svartiden er ute. Klokken starter igjen når svaret kommer.' }
  return (
    <div className="card pointer-events-auto border-accent! px-3! py-2! text-sm shadow-lg" role="status">
      <b className="block">{text.title}</b>
      <span className="text-xs text-muted">{text.body}</span>
    </div>
  )
}

export function locate(): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Nettleseren støtter ikke posisjon'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.longitude, p.coords.latitude]),
      () => reject(new Error('Fikk ikke hentet posisjonen. Sjekk at nettsiden har lov til å bruke den.')),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  })
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="label">{title}</h2>
      {children}
    </section>
  )
}

/** Velg et punkt: trykk på kartet, bruk GPS eller velg en stasjon. */
export function PointInput(props: { label: string; value: LngLat | null; onChange: (p: LngLat) => void; stations: Station[] }) {
  const { label, value, onChange, stations } = props
  const setPick = useUi((s) => s.setPick)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const gps = async () => {
    setBusy(true)
    setError('')
    try {
      onChange(await locate())
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <div className="mb-3">
      <span className="label">{label}</span>
      <div className="mb-1.5 text-sm">{value ? place(value, stations) : <span className="text-muted">Ikke valgt</span>}</div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="btn" onClick={() => setPick({ label, done: onChange })}>
          Velg på kart
        </button>
        <button type="button" className="btn" onClick={gps} disabled={busy}>
          {busy ? 'Henter…' : 'Min posisjon'}
        </button>
        <select
          className="field w-auto! flex-1"
          value=""
          aria-label={`${label}: velg stasjon`}
          onChange={(e) => {
            const s = stations.find((x) => x.id === e.target.value)
            if (s) onChange(stationPos(s))
          }}
        >
          <option value="">Stasjon…</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  )
}
