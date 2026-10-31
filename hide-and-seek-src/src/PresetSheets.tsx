import { Check, ChevronLeft, ChevronRight, Copy, Flag, Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cityOf } from './cities'
import { Sheet } from './Lobby'
import {
  HIDE_AT_REPORTS,
  applyLocal,
  applyShared,
  deleteLocal,
  deleteShared,
  listPresets,
  loadOne,
  loadShared,
  presetLink,
  reportPreset,
  saveLocal,
  sharePreset,
  updatePreset,
  usePresets,
  type SharedPreset,
  type Sort,
} from './presets'
import { useGame, useUi } from './store'
import type { GameSize, GeoData, LngLat } from './types'
import { Segmented, Spinner } from './ui'

const SIZE_NAMES: Record<GameSize, string> = { S: 'Small', M: 'Medium', L: 'Large' }

/** Kort beskrivelse av et oppsett: størrelse, sone, linjer og gjemmetid. */
const summary = (p: Pick<SharedPreset, 'setup' | 'hidingMinutes'>) =>
  `${SIZE_NAMES[p.setup.size] ?? p.setup.size}, sone ${p.setup.zoneRadius} m, ${p.setup.lines.length} ${p.setup.lines.length === 1 ? 'linje' : 'linjer'}, ${p.hidingMinutes} min`

/** Øverst i Oppsett-arket: åpner oversikten over oppsett andre har delt for byen. */
export function PresetEntry() {
  const city = useGame((s) => cityOf(s.settings.city).name)
  return (
    <button className="card mb-5 flex w-full cursor-pointer items-center gap-3 border-accent! text-left" data-guide="presets-entry" onClick={() => useUi.getState().setSheet('presets')}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-panel-2 text-accent" aria-hidden>
        <Users size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block font-sign">Bruk et ferdig oppsett</b>
        <span className="block text-sm text-muted">Se oppsett andre har delt for {city}</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden />
    </button>
  )
}

/** Oversikten over delte oppsett for byen som er valgt, og detaljene for ett av dem. */
export function PresetsSheet({ data }: { data: GeoData | null }) {
  const open = useUi((s) => s.sheet === 'presets')
  const city = useGame((s) => s.settings.city)
  const { shared, sharedCity, fetching, error, open: linked } = usePresets()
  const [sort, setSort] = useState<Sort>('popular')
  const [size, setSize] = useState<GameSize | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SharedPreset | null>(null)

  // Hentes hver gang oversikten åpnes, så tellingen er fersk. Det som alt er hentet, vises imens.
  useEffect(() => {
    if (open) void loadShared(city)
  }, [open, city])
  // Et oppsett fra en lenke åpnes rett i detaljene, også om det er for en annen by.
  useEffect(() => {
    if (!open || !linked) return
    usePresets.setState({ open: null })
    void loadOne(linked).then((p) => setSelected(p ?? null))
  }, [open, linked])
  useEffect(() => {
    if (!open) setSelected(null)
  }, [open])

  const close = () => useUi.getState().setSheet(null)
  const list = sharedCity === city ? listPresets(shared, sort, { size: size === 'all' ? null : size, query }) : []
  const current = selected && (shared.find((p) => p.id === selected.id) ?? selected)

  return (
    <Sheet open={open} title={current ? current.name : `Ferdige oppsett for ${cityOf(city).name}`} onClose={close}>
      {current ? (
        <PresetDetail p={current} data={data} back={() => setSelected(null)} done={close} />
      ) : (
        <div>
          <Segmented
            label="Sortering"
            value={sort}
            options={[
              { value: 'popular', label: 'Mest brukt' },
              { value: 'newest', label: 'Nyeste' },
            ]}
            onChange={setSort}
          />
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Spillstørrelse">
            {(['all', 'S', 'M', 'L'] as const).map((k) => (
              <button key={k} role="radio" aria-checked={size === k} className={`chip min-h-9! ${size === k ? 'chip-on' : ''}`} onClick={() => setSize(k)}>
                {k === 'all' ? 'Alle' : SIZE_NAMES[k]}
              </button>
            ))}
          </div>
          <label className="relative mt-2 block">
            <Search size={18} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden />
            <input className="field pl-9!" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk på navn eller beskrivelse" aria-label="Søk" />
          </label>
          {fetching && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted" role="status">
              <Spinner className="size-3.5!" /> Henter oppsett…
            </p>
          )}
          {error && <p className="mt-3 text-sm text-bad">{error}</p>}
          {!fetching && !error && sharedCity === city && list.length === 0 && (
            <p className="mt-4 text-sm text-muted">{shared.length ? 'Ingen oppsett passer med søket.' : `Ingen har delt oppsett for ${cityOf(city).name} ennå. Del ditt eget nederst i Oppsett.`}</p>
          )}
          <ul className="mt-3 divide-y divide-border rounded-[14px] border border-border bg-panel empty:hidden">
            {list.map((p) => (
              <li key={p.id}>
                <button className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left" onClick={() => setSelected(p)}>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-sign">
                      {p.name}
                      {p.mine && <span className="ml-1.5 rounded-full bg-panel-2 px-1.5 py-0.5 text-xs font-normal text-muted">ditt</span>}
                    </b>
                    {p.description && <span className="line-clamp-2 block text-sm">{p.description}</span>}
                    <span className="block text-xs text-muted">
                      {summary(p)}
                      {p.uses ? `, brukt ${p.uses} ${p.uses === 1 ? 'gang' : 'ganger'}` : ''}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  )
}

/** Ett delt oppsett: kart, innstillinger og det man kan gjøre med det. */
function PresetDetail({ p, data, back, done }: { p: SharedPreset; data: GeoData | null; back: () => void; done: () => void }) {
  const locked = useGame((s) => s.round.seekFrom !== null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(p.name)
  const [description, setDescription] = useState(p.description)
  const [useCurrent, setUseCurrent] = useState(false)
  const run = async (what: string, f: () => Promise<unknown>) => {
    setBusy(what)
    setMsg('')
    try {
      await f()
    } catch (e) {
      setMsg((e as Error).message || 'Noe gikk galt. Prøv igjen.')
    }
    setBusy('')
  }
  const sameCity = data && cityOf(p.city).id === cityOf(useGame.getState().settings.city).id

  return (
    <div>
      <button className="link mb-3 inline-flex items-center gap-1 text-sm!" onClick={back}>
        <ChevronLeft size={16} aria-hidden /> Alle oppsett
      </button>
      {p.description && <p className="mb-3 text-[15px]">{p.description}</p>}
      {sameCity ? <PresetMap p={p} data={data} /> : <p className="mb-3 rounded-[12px] bg-panel-2 p-3 text-sm text-muted">Dette oppsettet er for {cityOf(p.city).name}. Bruker du det, bytter appen by.</p>}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">By</dt>
        <dd>{cityOf(p.city).name}</dd>
        <dt className="text-muted">Størrelse</dt>
        <dd>{SIZE_NAMES[p.setup.size] ?? p.setup.size}</dd>
        <dt className="text-muted">Sone</dt>
        <dd>{p.setup.zoneRadius} m</dd>
        <dt className="text-muted">Linjer</dt>
        <dd>{p.setup.lines.join(', ') || 'ingen'}</dd>
        <dt className="text-muted">Område</dt>
        <dd>{!p.setup.playArea ? 'hele nettet' : p.setup.areaAuto === false ? 'eget område' : 'automatisk'}</dd>
        <dt className="text-muted">Spørsmål</dt>
        <dd>{p.setup.questions ? `${p.setup.questions.length} valgt` : `standard for ${SIZE_NAMES[p.setup.size] ?? p.setup.size}`}</dd>
        <dt className="text-muted">Gjemmetid</dt>
        <dd>{p.hidingMinutes} min</dd>
        <dt className="text-muted">Brukt</dt>
        <dd>{p.uses ? `${p.uses} ${p.uses === 1 ? 'gang' : 'ganger'}` : 'ikke ennå'}</dd>
      </dl>
      <button
        className="btn btn-primary mt-4 w-full"
        disabled={locked}
        onClick={() => {
          applyShared(p)
          done()
        }}
      >
        Bruk dette oppsettet
      </button>
      {locked && <p className="mt-1 text-sm text-muted">Oppsettet er låst mens runden pågår.</p>}
      <div className="mt-2 flex gap-1.5">
        <button
          className="btn flex-1"
          onClick={async () => {
            await navigator.clipboard?.writeText(presetLink(p.id)).catch(() => {})
            setCopied(true)
          }}
        >
          {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {copied ? 'Lenke kopiert' : 'Kopier lenke'}
        </button>
      </div>

      {p.mine ? (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="label">Ditt oppsett</h3>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void run('save', async () => {
                  await updatePreset(p.id, { name, description, useCurrent })
                  setEditing(false)
                })
              }}
            >
              <input className="field mb-2" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Navn" required />
              <textarea className="field mb-2 min-h-20 py-2" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} aria-label="Beskrivelse" placeholder="Beskrivelse (valgfritt)" />
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-accent" checked={useCurrent} onChange={(e) => setUseCurrent(e.target.checked)} />
                Erstatt innstillingene med oppsettet jeg har valgt nå
              </label>
              <div className="flex gap-1.5">
                <button className="btn btn-primary flex-1" disabled={!name.trim() || !!busy}>
                  {busy === 'save' && <Spinner />} Lagre endringen
                </button>
                <button type="button" className="btn" onClick={() => setEditing(false)}>
                  Avbryt
                </button>
              </div>
            </form>
          ) : (
            <div className="flex gap-1.5">
              <button className="btn flex-1" onClick={() => setEditing(true)}>
                Endre
              </button>
              <button
                className="btn btn-danger flex-1"
                disabled={!!busy}
                onClick={() => {
                  if (confirm(`Slette «${p.name}» for alle?`)) void run('delete', async () => {
                    await deleteShared(p.id)
                    back()
                  })
                }}
              >
                {busy === 'delete' && <Spinner />} Slett
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {p.reported ? (
            <p className="text-sm text-muted">Du har rapportert dette oppsettet.</p>
          ) : (
            <button
              className="link inline-flex items-center gap-1 text-sm!"
              disabled={!!busy}
              onClick={() => {
                if (confirm(`Rapportere «${p.name}» som upassende eller søppel? Oppsett som rapporteres av ${HIDE_AT_REPORTS} telefoner, skjules til de er sjekket.`)) void run('report', () => reportPreset(p.id))
              }}
            >
              <Flag size={14} aria-hidden /> Rapporter
            </button>
          )}
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-bad">{msg}</p>}
    </div>
  )
}

/** Et lite kart over oppsettet: stasjonene på linjene som er med, i linjenes farger, og spillområdet. */
function PresetMap({ p, data }: { p: SharedPreset; data: GeoData }) {
  const lines = new Set(p.setup.lines)
  const stations = data.stations.filter((s) => s.lines.some((l) => lines.has(l)))
  const color = Object.fromEntries(data.lines.features.map((f) => [f.properties.line, f.properties.color]))
  const area = p.setup.playArea
  const pts: LngLat[] = [...stations.map((s): LngLat => [s.lon, s.lat]), ...(area ?? [])]
  if (!pts.length) return null
  const lons = pts.map((q) => q[0])
  const lats = pts.map((q) => q[1])
  const [w0, e0, s0, n0] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)]
  // Lengdegrader er kortere jo lenger nord, så kartet strekkes ikke på bredden.
  const k = Math.cos((((s0 + n0) / 2) * Math.PI) / 180)
  const W = 320
  const pad = 10
  const spanX = Math.max((e0 - w0) * k, 1e-4)
  const spanY = Math.max(n0 - s0, 1e-4)
  const H = Math.min(220, Math.max(120, (W - 2 * pad) * (spanY / spanX) + 2 * pad))
  const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY)
  const x = (lon: number) => pad + (lon - w0) * k * scale + (W - 2 * pad - spanX * scale) / 2
  const y = (lat: number) => H - pad - (lat - s0) * scale - (H - 2 * pad - spanY * scale) / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-[12px] bg-panel-2" role="img" aria-label={`Kart over oppsettet: ${stations.length} stasjoner${area ? ' og spillområdet' : ''}`}>
      {area && <polygon points={area.map(([a, b]) => `${x(a)},${y(b)}`).join(' ')} fill="none" stroke="currentColor" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 3" />}
      {stations.map((s) => (
        <circle key={s.id} cx={x(s.lon)} cy={y(s.lat)} r={stations.length > 200 ? 1.6 : 2.6} fill={color[s.lines.find((l) => lines.has(l))!] ?? 'currentColor'} />
      ))}
    </svg>
  )
}

/** Nederst i Oppsett-arket: lagre oppsettet på telefonen eller dele det med alle, og oppsettene som er lagret. */
export function SavePreset() {
  const { local, note } = usePresets()
  const locked = useGame((s) => s.round.seekFrom !== null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ok = !!name.trim()
  return (
    <section className="mb-5 border-t border-border pt-4">
      <h2 className="label">Lagre eller del dette oppsettet</h2>
      <input className="field mb-2" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Navn, f.eks. Kort runde i sentrum" aria-label="Navn på oppsettet" />
      <textarea className="field mb-2 min-h-16 py-2" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="Beskrivelse (valgfritt, vises når du deler)" aria-label="Beskrivelse" />
      <div className="flex gap-1.5">
        <button
          className="btn flex-1"
          disabled={!ok}
          onClick={() => {
            saveLocal(name)
            setName('')
            setDescription('')
          }}
        >
          Lagre på telefonen
        </button>
        <button
          className="btn flex-1"
          disabled={!ok || busy}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              await sharePreset(name, description)
              setName('')
              setDescription('')
            } catch (e) {
              setError((e as Error).message || 'Kunne ikke dele nå. Prøv igjen.')
            }
            setBusy(false)
          }}
        >
          {busy && <Spinner />} Del med alle
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">Delte oppsett er anonyme. Bare du kan endre eller slette dem.</p>
      {error && <p className="mt-1 text-sm text-bad">{error}</p>}
      {note && (
        <p className="mt-1 text-sm text-ok" role="status">
          {note}
        </p>
      )}
      {local.length > 0 && (
        <>
          <h3 className="label mt-4">Lagret på denne telefonen</h3>
          <ul className="divide-y divide-border rounded-[14px] border border-border bg-panel">
            {local.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-sign">{p.name}</b>
                  <span className="block text-xs text-muted">
                    {cityOf(p.setup.city).name}, {summary(p)}
                  </span>
                </span>
                <button className="btn min-h-9!" disabled={locked} onClick={() => applyLocal(p)}>
                  Bruk
                </button>
                <button
                  className="link text-bad!"
                  onClick={() => {
                    if (confirm(`Slette «${p.name}» fra telefonen?`)) deleteLocal(p.id)
                  }}
                >
                  slett
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
