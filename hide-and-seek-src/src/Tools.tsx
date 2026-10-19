import { useEffect, useState } from 'react'
import { fmtDist } from './form'
import { dist } from './geo'
import { useGame, useHiderPos } from './store'
import { useSync } from './sync'
import type { LngLat, Station } from './types'
import { PointInput, Section, locate, rememberFix } from './ui'

const RADAR_CHIPS = [500, 1000, 2000, 5000, 10000]
const THERMO_CHIPS = [500, 1000, 5000, 15000]

/** Avstand skrevet inn i km, lagret i meter. */
function Distance({ value, chips, onChange }: { value: number; chips: number[]; onChange: (m: number) => void }) {
  const [text, setText] = useState(String(value / 1000).replace('.', ','))
  useEffect(() => setText(String(value / 1000).replace('.', ',')), [value])
  return (
    <div className="mb-3">
      <span className="label">Avstand</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((m) => (
          <button key={m} type="button" className={`btn ${value === m ? 'btn-on' : ''}`} onClick={() => onChange(m)}>
            {fmtDist(m)}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-sm">
          <input
            className="field w-20!"
            // Tekstfelt, ikke tallfelt: norske tastaturer gir komma, som tallfelt ikke alltid godtar.
            type="text"
            inputMode="decimal"
            value={text}
            aria-label="Avstand i km"
            onChange={(e) => {
              setText(e.target.value)
              const km = parseFloat(e.target.value.replace(',', '.'))
              if (km > 0) onChange(Math.round(km * 1000))
            }}
          />
          km
        </label>
      </div>
    </div>
  )
}

/**
 * Hvor langt seekerne er fra et punkt, for hider. Seekerne ser hverandre på
 * kartet, men aldri hider, så for seeker vises bare egen avstand.
 */
function SeekerDistances({ center, radiusM }: { center: LngLat; radiusM: number }) {
  const seekers = useSync((s) => s.seekers)
  const list = Object.values(seekers)
  if (!list.length) return <p className="text-xs text-muted">Ingen seekere deler posisjon akkurat nå.</p>
  return (
    <ul className="text-sm">
      {list
        .map((s) => ({ d: dist(center, s.pos), t: s.t }))
        .sort((a, b) => a.d - b.d)
        .map((s, i) => (
          <li key={i} className="flex justify-between py-0.5">
            <span>
              Seeker {i + 1} <span className="text-xs text-muted">kl. {new Date(s.t).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
            <span className={s.d <= radiusM ? 'font-semibold text-ok' : 'font-semibold text-bad'}>
              {fmtDist(s.d)} · {s.d <= radiusM ? 'innenfor' : 'utenfor'}
            </span>
          </li>
        ))}
    </ul>
  )
}

function Radar({ stations }: { stations: Station[] }) {
  const radar = useGame((s) => s.tools.radar)
  const setTools = useGame((s) => s.setTools)
  const isHider = useGame((s) => s.mode === 'hider')
  const hiderPos = useHiderPos((s) => s.pos)
  const [me, setMe] = useState<LngLat | null>(null)

  if (!radar) {
    return (
      <button className="btn w-full" onClick={() => setTools({ radar: { center: isHider ? hiderPos : null, radiusM: 1000 } })}>
        📡 Egen radar
      </button>
    )
  }
  const set = (patch: Partial<NonNullable<typeof radar>>) => setTools({ radar: { ...radar, ...patch } })
  const mine = radar.center && (isHider ? hiderPos : me)
  return (
    <div className="card">
      <div className="mb-2 flex items-baseline justify-between">
        <b className="text-sm">📡 Egen radar</b>
        <button className="text-xs text-muted underline" onClick={() => setTools({ radar: null })}>
          Fjern
        </button>
      </div>
      <PointInput label="Midten" value={radar.center} onChange={(center) => set({ center })} stations={stations} />
      <Distance value={radar.radiusM} chips={RADAR_CHIPS} onChange={(radiusM) => set({ radiusM })} />
      {radar.center && (
        <>
          {isHider && <SeekerDistances center={radar.center} radiusM={radar.radiusM} />}
          {mine ? (
            <p className="mt-1 text-sm">
              Du er {fmtDist(dist(radar.center, mine))} fra midten, <b>{dist(radar.center, mine) <= radar.radiusM ? 'innenfor' : 'utenfor'}</b>.
            </p>
          ) : (
            !isHider && (
              <button className="btn mt-1" onClick={() => locate().then(setMe, () => {})}>
                Hvor er jeg i forhold til den?
              </button>
            )
          )}
        </>
      )}
    </div>
  )
}

function Thermometer({ stations }: { stations: Station[] }) {
  const thermo = useGame((s) => s.tools.thermo)
  const setTools = useGame((s) => s.setTools)
  const [error, setError] = useState('')

  if (!thermo) {
    return (
      <button className="btn w-full" onClick={() => setTools({ thermo: { start: null, at: null, minM: 1000 } })}>
        🌡️ Eget termometer
      </button>
    )
  }
  const set = (patch: Partial<NonNullable<typeof thermo>>) => setTools({ thermo: { ...thermo, ...patch } })
  const start = async () => {
    setError('')
    try {
      const p = await locate()
      set({ start: p, at: p })
    } catch (e) {
      setError((e as Error).message)
    }
  }
  const gone = thermo.start && thermo.at ? dist(thermo.start, thermo.at) : 0
  const done = gone >= thermo.minM
  return (
    <div className="card">
      <div className="mb-2 flex items-baseline justify-between">
        <b className="text-sm">🌡️ Eget termometer</b>
        <button className="text-xs text-muted underline" onClick={() => setTools({ thermo: null })}>
          Fjern
        </button>
      </div>
      <Distance value={thermo.minM} chips={THERMO_CHIPS} onChange={(minM) => set({ minM })} />
      <button className="btn btn-primary mb-2 w-full" onClick={start}>
        {thermo.start ? 'Start på nytt her' : 'Start her'}
      </button>
      {error && <p className="mb-2 text-xs text-bad">{error}</p>}
      <PointInput label="Startpunkt" value={thermo.start} onChange={(p) => set({ start: p })} stations={stations} />
      {thermo.start && (
        <>
          <div className="mb-1 h-2 overflow-hidden rounded-full bg-panel-2">
            <div className={`h-full ${done ? 'bg-ok' : 'bg-accent'}`} style={{ width: `${Math.min(100, (gone / thermo.minM) * 100)}%` }} />
          </div>
          <p className="text-sm">
            {done ? (
              <b className="text-ok">✓ Nådd: {fmtDist(gone)} i luftlinje.</b>
            ) : (
              <>
                {fmtDist(gone)} av {fmtDist(thermo.minM)} i luftlinje. {fmtDist(thermo.minM - gone)} igjen.
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-muted">Oppdateres fra GPS mens appen er åpen.</p>
        </>
      )}
    </div>
  )
}

/** Radar og termometer med fritt valgt avstand, til kostnaden for forbannelser og lignende. */
export function ToolsPanel({ stations }: { stations: Station[] }) {
  return (
    <Section title="Måleverktøy">
      <p className="mb-2 text-xs text-muted">Til kostnaden for forbannelser og lignende. Teller ikke som spørsmål, krymper ikke kartet og vises bare på denne telefonen.</p>
      <div className="flex flex-col gap-2">
        <Radar stations={stations} />
        <Thermometer stations={stations} />
      </div>
    </Section>
  )
}

/** Termometeret følger GPS mens det er startet, uansett hvilken fane som er åpen. */
export function useThermoGps() {
  const on = useGame((s) => !!s.tools.thermo?.start)
  useEffect(() => {
    if (!on || !navigator.geolocation) return
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const at: LngLat = [p.coords.longitude, p.coords.latitude]
        rememberFix(at)
        const { tools, setTools } = useGame.getState()
        if (tools.thermo) setTools({ thermo: { ...tools.thermo, at } })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [on])
}
