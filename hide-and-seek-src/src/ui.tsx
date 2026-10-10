import { useEffect, useState } from 'react'
import { place } from './form'
import { stationPos } from './geo'
import { useUi } from './store'
import type { LngLat, Station } from './types'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
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
