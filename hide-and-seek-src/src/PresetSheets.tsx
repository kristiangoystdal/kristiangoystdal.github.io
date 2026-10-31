import { Check, ChevronLeft, ChevronRight, Copy, Flag, Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cityOf } from './cities'
import { tr } from './lang'
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
  tr(
    `${SIZE_NAMES[p.setup.size] ?? p.setup.size}, sone ${p.setup.zoneRadius} m, ${p.setup.lines.length} ${p.setup.lines.length === 1 ? 'linje' : 'linjer'}, ${p.hidingMinutes} min`,
    `${SIZE_NAMES[p.setup.size] ?? p.setup.size}, ${p.setup.zoneRadius} m zone, ${p.setup.lines.length} ${p.setup.lines.length === 1 ? 'line' : 'lines'}, ${p.hidingMinutes} min`,
  )
/** «brukt 3 ganger». */
const timesUsed = (n: number) => tr(`${n} ${n === 1 ? 'gang' : 'ganger'}`, `${n} ${n === 1 ? 'time' : 'times'}`)

/** Øverst i Oppsett-arket: åpner oversikten over oppsett andre har delt for byen. */
export function PresetEntry() {
  const city = useGame((s) => cityOf(s.settings.city).name)
  return (
    <button className="card mb-5 flex w-full cursor-pointer items-center gap-3 border-accent! text-left" data-guide="presets-entry" onClick={() => useUi.getState().setSheet('presets')}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-panel-2 text-accent" aria-hidden>
        <Users size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block font-sign">{tr('Bruk et ferdig oppsett', 'Use a ready-made setup')}</b>
        <span className="block text-sm text-muted">{tr(`Se oppsett andre har delt for ${city}`, `See setups others have shared for ${city}`)}</span>
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
    <Sheet open={open} title={current ? current.name : tr(`Ferdige oppsett for ${cityOf(city).name}`, `Ready-made setups for ${cityOf(city).name}`)} onClose={close}>
      {current ? (
        <PresetDetail p={current} data={data} back={() => setSelected(null)} done={close} />
      ) : (
        <div>
          <Segmented
            label={tr('Sortering', 'Sort')}
            value={sort}
            options={[
              { value: 'popular', label: tr('Mest brukt', 'Most used') },
              { value: 'newest', label: tr('Nyeste', 'Newest') },
            ]}
            onChange={setSort}
          />
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr('Spillstørrelse', 'Game size')}>
            {(['all', 'S', 'M', 'L'] as const).map((k) => (
              <button key={k} role="radio" aria-checked={size === k} className={`chip min-h-9! ${size === k ? 'chip-on' : ''}`} onClick={() => setSize(k)}>
                {k === 'all' ? tr('Alle', 'All') : SIZE_NAMES[k]}
              </button>
            ))}
          </div>
          <label className="relative mt-2 block">
            <Search size={18} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden />
            <input className="field pl-9!" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('Søk på navn eller beskrivelse', 'Search name or description')} aria-label={tr('Søk', 'Search')} />
          </label>
          {fetching && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted" role="status">
              <Spinner className="size-3.5!" /> {tr('Henter oppsett…', 'Loading setups…')}
            </p>
          )}
          {error && <p className="mt-3 text-sm text-bad">{error}</p>}
          {!fetching && !error && sharedCity === city && list.length === 0 && (
            <p className="mt-4 text-sm text-muted">{shared.length
                ? tr('Ingen oppsett passer med søket.', 'No setups match the search.')
                : tr(`Ingen har delt oppsett for ${cityOf(city).name} ennå. Del ditt eget nederst i Oppsett.`, `Nobody has shared a setup for ${cityOf(city).name} yet. Share your own at the bottom of Setup.`)}
            </p>
          )}
          <ul className="mt-3 divide-y divide-border rounded-[14px] border border-border bg-panel empty:hidden">
            {list.map((p) => (
              <li key={p.id}>
                <button className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left" onClick={() => setSelected(p)}>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-sign">
                      {p.name}
                      {p.mine && <span className="ml-1.5 rounded-full bg-panel-2 px-1.5 py-0.5 text-xs font-normal text-muted">{tr('ditt', 'yours')}</span>}
                    </b>
                    {p.description && <span className="line-clamp-2 block text-sm">{p.description}</span>}
                    <span className="block text-xs text-muted">
                      {summary(p)}
                      {p.uses ? `, ${tr('brukt', 'used')} ${timesUsed(p.uses)}` : ''}
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
      setMsg((e as Error).message || tr('Noe gikk galt. Prøv igjen.', 'Something went wrong. Try again.'))
    }
    setBusy('')
  }
  const sameCity = data && cityOf(p.city).id === cityOf(useGame.getState().settings.city).id

  return (
    <div>
      <button className="link mb-3 inline-flex items-center gap-1 text-sm!" onClick={back}>
        <ChevronLeft size={16} aria-hidden /> {tr('Alle oppsett', 'All setups')}
      </button>
      {p.description && <p className="mb-3 text-[15px]">{p.description}</p>}
      {sameCity ? <PresetMap p={p} data={data} /> : <p className="mb-3 rounded-[12px] bg-panel-2 p-3 text-sm text-muted">{tr(`Dette oppsettet er for ${cityOf(p.city).name}. Bruker du det, bytter appen by.`, `This setup is for ${cityOf(p.city).name}. Using it switches the city.`)}</p>}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {(
          [
            [tr('By', 'City'), cityOf(p.city).name],
            [tr('Størrelse', 'Size'), SIZE_NAMES[p.setup.size] ?? p.setup.size],
            [tr('Sone', 'Zone'), `${p.setup.zoneRadius} m`],
            [tr('Linjer', 'Lines'), p.setup.lines.join(', ') || tr('ingen', 'none')],
            [tr('Område', 'Area'), !p.setup.playArea ? tr('hele nettet', 'whole network') : p.setup.areaAuto === false ? tr('eget område', 'custom area') : tr('automatisk', 'automatic')],
            [
              tr('Spørsmål', 'Questions'),
              p.setup.questions ? tr(`${p.setup.questions.length} valgt`, `${p.setup.questions.length} chosen`) : tr(`standard for ${SIZE_NAMES[p.setup.size] ?? p.setup.size}`, `standard for ${SIZE_NAMES[p.setup.size] ?? p.setup.size}`),
            ],
            [tr('Gjemmetid', 'Hiding time'), `${p.hidingMinutes} min`],
            [tr('Brukt', 'Used'), p.uses ? timesUsed(p.uses) : tr('ikke ennå', 'not yet')],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <button
        className="btn btn-primary mt-4 w-full"
        disabled={locked}
        onClick={() => {
          applyShared(p)
          done()
        }}
      >
        {tr('Bruk dette oppsettet', 'Use this setup')}
      </button>
      {locked && <p className="mt-1 text-sm text-muted">{tr('Oppsettet er låst mens runden pågår.', 'The setup is locked while the round is running.')}</p>}
      <div className="mt-2 flex gap-1.5">
        <button
          className="btn flex-1"
          onClick={async () => {
            await navigator.clipboard?.writeText(presetLink(p.id)).catch(() => {})
            setCopied(true)
          }}
        >
          {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {copied ? tr('Lenke kopiert', 'Link copied') : tr('Kopier lenke', 'Copy link')}
        </button>
      </div>

      {p.mine ? (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="label">{tr('Ditt oppsett', 'Your setup')}</h3>
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
              <input className="field mb-2" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label={tr('Navn', 'Name')} required />
              <textarea
                className="field mb-2 min-h-20 py-2"
                value={description}
                maxLength={200}
                onChange={(e) => setDescription(e.target.value)}
                aria-label={tr('Beskrivelse', 'Description')}
                placeholder={tr('Beskrivelse (valgfritt)', 'Description (optional)')}
              />
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-accent" checked={useCurrent} onChange={(e) => setUseCurrent(e.target.checked)} />
                {tr('Erstatt innstillingene med oppsettet jeg har valgt nå', 'Replace the settings with the setup I have chosen now')}
              </label>
              <div className="flex gap-1.5">
                <button className="btn btn-primary flex-1" disabled={!name.trim() || !!busy}>
                  {busy === 'save' && <Spinner />} {tr('Lagre endringen', 'Save the change')}
                </button>
                <button type="button" className="btn" onClick={() => setEditing(false)}>
                  {tr('Avbryt', 'Cancel')}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex gap-1.5">
              <button className="btn flex-1" onClick={() => setEditing(true)}>
                {tr('Endre', 'Edit')}
              </button>
              <button
                className="btn btn-danger flex-1"
                disabled={!!busy}
                onClick={() => {
                  if (confirm(tr(`Slette «${p.name}» for alle?`, `Delete "${p.name}" for everyone?`))) void run('delete', async () => {
                    await deleteShared(p.id)
                    back()
                  })
                }}
              >
                {busy === 'delete' && <Spinner />} {tr('Slett', 'Delete')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {p.reported ? (
            <p className="text-sm text-muted">{tr('Du har rapportert dette oppsettet.', 'You have reported this setup.')}</p>
          ) : (
            <button
              className="link inline-flex items-center gap-1 text-sm!"
              disabled={!!busy}
              onClick={() => {
                const ask = tr(
                  `Rapportere «${p.name}» som upassende eller søppel? Oppsett som rapporteres av ${HIDE_AT_REPORTS} telefoner, skjules til de er sjekket.`,
                  `Report "${p.name}" as inappropriate or spam? Setups reported by ${HIDE_AT_REPORTS} phones are hidden until they have been checked.`,
                )
                if (confirm(ask)) void run('report', () => reportPreset(p.id))
              }}
            >
              <Flag size={14} aria-hidden /> {tr('Rapporter', 'Report')}
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-[12px] bg-panel-2" role="img" aria-label={tr(`Kart over oppsettet: ${stations.length} stasjoner${area ? ' og spillområdet' : ''}`, `Map of the setup: ${stations.length} stations${area ? ' and the play area' : ''}`)}>
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
      <h2 className="label">{tr('Lagre eller del dette oppsettet', 'Save or share this setup')}</h2>
      <input className="field mb-2" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={tr('Navn, f.eks. Kort runde i sentrum', 'Name, e.g. Short round downtown')} aria-label={tr('Navn på oppsettet', 'Name of the setup')} />
      <textarea
        className="field mb-2 min-h-16 py-2"
        value={description}
        maxLength={200}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={tr('Beskrivelse (valgfritt, vises når du deler)', 'Description (optional, shown when you share)')}
        aria-label={tr('Beskrivelse', 'Description')}
      />
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
          {tr('Lagre på telefonen', 'Save on this phone')}
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
              setError((e as Error).message || tr('Kunne ikke dele nå. Prøv igjen.', 'Could not share right now. Try again.'))
            }
            setBusy(false)
          }}
        >
          {busy && <Spinner />} {tr('Del med alle', 'Share with everyone')}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">{tr('Delte oppsett er anonyme. Bare du kan endre eller slette dem.', 'Shared setups are anonymous. Only you can edit or delete them.')}</p>
      {error && <p className="mt-1 text-sm text-bad">{error}</p>}
      {note && (
        <p className="mt-1 text-sm text-ok" role="status">
          {note}
        </p>
      )}
      {local.length > 0 && (
        <>
          <h3 className="label mt-4">{tr('Lagret på denne telefonen', 'Saved on this phone')}</h3>
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
                  {tr('Bruk', 'Use')}
                </button>
                <button
                  className="link text-bad!"
                  onClick={() => {
                    if (confirm(tr(`Slette «${p.name}» fra telefonen?`, `Delete "${p.name}" from this phone?`))) deleteLocal(p.id)
                  }}
                >
                  {tr('slett', 'delete')}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
