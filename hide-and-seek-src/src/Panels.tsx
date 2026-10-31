import { Eye, Moon, MoreHorizontal, Pause } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDemo } from './demo'
import { StatsList } from './Archive'
import { CITIES, MODES, city as loadedCity, cityOf, linesOf, modeOf, modesOf, transit } from './cities'
import { BASEMAPS, depRate } from './MapView'
import { PLANNING_MINUTES, hiderSeconds, movedAt, roundStats } from './clock'
import { CATEGORIES, ITEMS, SIZE_RULES, answerLabel, describe, enabledIds, place } from './form'
import { POI_TYPES, adminLevels, autoPlayArea, canCutZone, cutsZone, dist, hiderStation, levelCount, stationPos, stationsInReach, type Result } from './geo'
import { NotifyToggle } from './notify'
import { allPresets, applyPreset, deletePreset, loadPresets, presetId, savePreset, usePresets } from './presets'
import { useGame, useHiderPos, useUi, type Layer } from './store'
import { CODE_LENGTH, cleanCode, createRoom, joinRoom, leaveRoomClean, recentRooms, roomLink, saveArchive, useSync } from './sync'
import type { DayKey, GeoData, RoundResult, Settings } from './types'
import { PAUSE_TEXT, Section, Segmented, Spinner, Switch, useGameNow, useNow } from './ui'

const LAYERS: { key: Layer; label: string }[] = [
  { key: 'area', label: 'Mulig område' },
  { key: 'zones', label: 'Stasjonssoner' },
  { key: 'lines', label: 'Linjer' },
  { key: 'admin', label: 'Områdegrenser' },
  { key: 'poi', label: 'Steder' },
]

/** Seekerne starter endgame når de er fremme i sonen de tror hider er i. */
export function EndgameControl({ data, result }: { data: GeoData; result: Result }) {
  const now = useNow()
  const endgame = useGame((s) => s.round.endgame)
  const seekFrom = useGame((s) => s.round.seekFrom)
  const pause = useGame((s) => s.round.pause)
  const setRound = useGame((s) => s.setRound)
  const lines = useGame((s) => s.settings.lines)
  const questions = useGame((s) => s.questions)
  const since = useGame((s) => movedAt(s.round))
  const toggleCut = useGame((s) => s.toggleEndgameCut)
  const [picked, setPicked] = useState('')
  const active = data.stations.filter((s) => s.lines.some((l) => lines.includes(l)))
  // Stasjonene svarene peker ut står først. De andre kan også velges, i tilfelle et svar var feil.
  const others = active.filter((s) => !result.stations.includes(s)).sort((a, b) => a.name.localeCompare(b.name, 'nb'))
  const stationId = active.some((s) => s.id === picked) ? picked : (result.stations[0]?.id ?? '')

  if (endgame) {
    const target = data.stations.find((s) => s.id === endgame.stationId)
    // Spørsmål fra før endgame gjelder der hider sto da, og hider kan ha flyttet seg i sonen siden. Seekerne velger selv hvilke som skal telle.
    const earlier = questions.filter((q) => q.time < endgame.time && q.time >= since && canCutZone(q))
    return (
      <Section title="Endgame">
        <div className="card border-accent!">
          <p className="mb-1 text-sm">
            Endgame ved <b>{target?.name ?? 'stasjonen'}</b>, startet kl. {new Date(endgame.time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} ({clock((now - endgame.time) / 1000)} siden).
          </p>
          <p className="mb-2 text-xs text-muted">Bare denne sonen er gyldig. Hider står stille, så alle svar på nye spørsmål skjærer sonen nøyaktig.</p>
          {earlier.length > 0 && (
            <div className="mb-2">
              <span className="label">Spørsmål fra før endgame</span>
              <p className="mb-1.5 text-xs text-muted">Velg de som også skal gjøre sonen mindre, f.eks. når dere vet at hider ikke har flyttet seg siden.</p>
              <ul className="flex flex-col gap-1.5">
                {earlier.map((q) => {
                  const on = cutsZone(q, endgame)
                  return (
                    <li key={q.id}>
                      <button type="button" role="switch" aria-checked={on} className={`btn h-auto! w-full justify-between! py-1.5! text-left whitespace-normal! ${on ? 'btn-on' : ''}`} onClick={() => toggleCut(q.id)}>
                        <span className="text-xs">
                          {describe(q, data)} <b>{answerLabel(q, q.answer!)}</b>
                        </span>
                        <span className="shrink-0 text-xs">{on ? '✓ Skjærer sonen' : 'Teller ikke'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {earlier.length > 1 && (
                <div className="mt-1.5 flex gap-1.5">
                  <button className="btn min-h-9! flex-1" onClick={() => setRound({ endgame: { ...endgame, include: earlier.map((q) => q.id) } })}>
                    Alle
                  </button>
                  <button className="btn min-h-9! flex-1" onClick={() => setRound({ endgame: { ...endgame, include: [] } })}>
                    Ingen
                  </button>
                </div>
              )}
            </div>
          )}
          {!result.area && <p className="mb-2 text-sm text-bad">Svarene etter endgame-start utelukker hele sonen. Hider er trolig ved en annen stasjon. Avslutt endgame og velg en annen.</p>}
          <button
            className="btn w-full"
            onClick={() => {
              if (confirm('Avslutte endgame? Kartet viser igjen alle stasjonene svarene peker ut.')) setRound({ endgame: null })
            }}
          >
            Avslutt endgame
          </button>
        </div>
      </Section>
    )
  }
  const blocked = seekFrom === null ? 'Starter når runden er i gang.' : now < seekFrom ? 'Kan startes når gjemmetiden er over.' : pause ? 'Ikke mens spillet står.' : null
  return (
    <Section title="Endgame">
      <div className="flex gap-1.5">
        <select className="field" value={stationId} aria-label="Stasjon for endgame" onChange={(e) => setPicked(e.target.value)}>
          {!stationId && <option value="">Velg stasjon…</option>}
          <optgroup label={`Mulige (${result.stations.length})`}>
            {result.stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Utelukket av svarene">
            {others.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </select>
        <button
          className="btn btn-primary"
          data-guide="endgame-start"
          disabled={!stationId || !!blocked}
          onClick={() => {
            const name = data.stations.find((s) => s.id === stationId)?.name
            const out = !result.stations.some((s) => s.id === stationId)
            if (confirm(`Starte endgame ved ${name}?${out ? ' Svarene har utelukket denne stasjonen.' : ''} Hider får beskjed om å stå stille.`)) setRound({ endgame: { stationId, time: Date.now() } })
          }}
        >
          Start endgame
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">{blocked ?? 'Start når dere er inne i sonen og har gått av transportmiddelet. Da vises sonen på kartet, og hider må stå stille.'}</p>
    </Section>
  )
}

/** Hvordan kartet ser ut på denne telefonen: lag, bakgrunn, avganger og områdegrenser. Endrer ikke spillet. */
export function MapOptions({ data }: { data: GeoData }) {
  const layers = useGame((s) => s.layers)
  const toggleLayer = useGame((s) => s.toggleLayer)
  const settings = useGame((s) => s.settings)
  const setSettings = useGame((s) => s.setSettings)
  const hiderView = useGame((s) => s.mode === 'hider')
  const endgame = useGame((s) => !!s.round.endgame)
  const hours = [...Array(25).keys()]
  return (
    <Section title="Kartet">
      <span className="label">Vis på kartet</span>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {LAYERS.filter((l) => l.key !== 'zones' || (!hiderView && endgame)).map((l) => (
          <button key={l.key} className={`btn ${layers[l.key] ? 'btn-on' : ''}`} aria-pressed={layers[l.key]} onClick={() => toggleLayer(l.key)}>
            {l.label}
          </button>
        ))}
      </div>
      {layers.poi && (
        <div className="mb-3 rounded-[12px] bg-panel-2 p-2.5">
          <span className="label">Steder på kartet</span>
          <PoiLegend data={data} />
        </div>
      )}
      <span className="label">Bakgrunnskart</span>
      <div className="mb-3">
        <Segmented label="Bakgrunnskart" value={settings.basemap} options={(Object.keys(BASEMAPS) as (keyof typeof BASEMAPS)[]).map((k) => ({ value: k, label: BASEMAPS[k].label }))} onChange={(basemap) => setSettings({ basemap })} />
      </div>
      <span className="label">Områdegrenser</span>
      <select className="field mb-3" value={settings.adminLevel} aria-label="Områdegrenser" onChange={(e) => setSettings({ adminLevel: e.target.value as Settings['adminLevel'] })}>
        {adminLevels().map((l) => (
          <option key={l.key} value={l.key}>
            {l.label}
          </option>
        ))}
      </select>
      <span className="label">Avganger</span>
      <div className="grid grid-cols-3 gap-1.5">
        <select className="field" value={settings.day} aria-label="Dag" onChange={(e) => setSettings({ day: e.target.value as DayKey })}>
          {Object.entries(DAYS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="field" value={settings.hourFrom} aria-label="Fra klokken" onChange={(e) => setSettings({ hourFrom: +e.target.value, hourTo: Math.max(settings.hourTo, +e.target.value + 1) })}>
          {hours.slice(0, 24).map((h) => (
            <option key={h} value={h}>
              fra {String(h).padStart(2, '0')}
            </option>
          ))}
        </select>
        <select className="field" value={settings.hourTo} aria-label="Til klokken" onChange={(e) => setSettings({ hourTo: +e.target.value })}>
          {hours.slice(settings.hourFrom + 1).map((h) => (
            <option key={h} value={h}>
              til {String(h).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-muted">Avganger per time i stasjonslisten og på kartet.</p>
    </Section>
  )
}

/** Stasjonene svarene ikke har utelukket. Seekerne ser dem, hider gjør det aldri. */
export function PossibleStations({ data, result }: { data: GeoData; result: Result }) {
  const settings = useGame((s) => s.settings)
  const lineColor = Object.fromEntries(data.lines.features.map((f) => [f.properties.line, f.properties.color]))
  return (
    <Section title={`Mulige stasjoner (${result.stations.length})`}>
      {result.stations.length === 0 && <p className="text-sm text-bad">Ingen stasjoner passer med svarene. Sjekk loggen for et feil svar.</p>}
      <ul className="divide-y divide-border text-sm">
        {result.stations.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
            <span>{s.name}</span>
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className="tabular-nums">{depRate(s, settings.day, settings.hourFrom, settings.hourTo).toFixed(0)}/t</span>
              <span className="flex gap-0.5">
                {s.lines.map((l) => (
                  <span key={l} className="grid size-5 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: lineColor[l] }}>
                    {l}
                  </span>
                ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** Hvor hider er, rett fra GPS. Hider velger stasjon når flere har hider i sonen. Posisjonen lagres ikke. */
export function HiderPosition({ data }: { data: GeoData }) {
  const now = useNow()
  const stationId = useGame((s) => s.hider.stationId)
  const setHider = useGame((s) => s.setHider)
  const zoneRadius = useGame((s) => s.settings.zoneRadius)
  const { pos, t, accuracy, error } = useHiderPos()

  const station = pos && hiderStation(data.stations, pos, zoneRadius, stationId)
  const reach = pos ? stationsInReach(data.stations, pos, zoneRadius) : []
  const away = station && pos ? dist(stationPos(station), pos) : 0
  const age = Math.round((now - t) / 1000)
  return (
    <Section title="Hvor er du">
      <div className="card text-sm">
        {pos ? (
          <>
            <p>
              📍 {place(pos, data.stations)}
              <span className="block text-xs text-muted">
                Fra GPS{accuracy !== null ? `, ±${Math.round(accuracy)} m` : ''}, {age < 5 ? 'akkurat nå' : `for ${age} s siden`}.
              </span>
            </p>
          </>
        ) : (
          <p className="text-muted">{error || 'Venter på GPS…'}</p>
        )}
        {pos && error && <p className="mt-1 text-xs text-bad">{error}</p>}
      </div>
      {station && (
        <p className={`mt-2 text-xs ${away > zoneRadius ? 'text-bad' : 'text-muted'}`}>
          Stasjonen din er {station.name}.{away > zoneRadius && ` Du er ${Math.round(away)} m unna, utenfor sonen på ${zoneRadius} m.`}
        </p>
      )}
      {pos && reach.length > 1 && (
        <label className="mt-3 block">
          <span className="label">Velg stasjonen som er din</span>
          <select className="field" value={station?.id ?? ''} onChange={(e) => setHider({ stationId: e.target.value })}>
            {reach.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({Math.round(dist(stationPos(s), pos))} m)
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">Du står i sonen til flere stasjoner. Spørsmål om stasjonen din svares ut fra den du velger.</span>
        </label>
      )}
      <p className="mt-2 text-xs text-muted">Posisjonen følger GPS mens appen er åpen. Den lagres ikke, og seekerne ser den aldri.</p>
    </Section>
  )
}

/** Hvem denne telefonen spiller som. Velges før runden og er låst mens den pågår. */
export function RolePicker() {
  const mode = useGame((s) => s.mode)
  const setMode = useGame((s) => s.setMode)
  const zoneRadius = useGame((s) => s.settings.zoneRadius)
  const locked = useGame((s) => s.round.seekFrom !== null)
  return (
    <div>
      <span className="label">Denne telefonen er</span>
      <Segmented
        label="Denne telefonen er"
        guide="role"
        value={mode}
        disabled={locked}
        options={[
          { value: 'seeker', label: '🔍 Seeker', detail: 'leter' },
          { value: 'hider', label: '🙈 Hider', detail: 'gjemmer seg' },
        ]}
        onChange={setMode}
      />
      <p className="mt-1 text-xs text-muted">{locked ? 'Rollen er låst til runden er ferdig.' : mode === 'hider' ? 'Du svarer på spørsmålene. Posisjonen din følger GPS og deles aldri.' : 'Du stiller spørsmål, og hiders svar krymper kartet.'}</p>
      {mode === 'hider' && (
        <details className="card mt-2">
          <summary className="cursor-pointer text-sm font-medium">Regler for hider</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Du må være innenfor {zoneRadius} m fra stasjonen din når gjemmetiden er over.</li>
            <li>Avstander regnes i luftlinje fra der du faktisk står, ikke fra stasjonen.</li>
            <li>Står du nær en grense, varsler appen. Da bør du måle selv før du svarer.</li>
            <li>Fotospørsmål har ingen fasit i appen. Svaret loggføres som notat.</li>
            <li>Svarer du ikke innen svartiden, står klokken din til svaret kommer.</li>
            <li>I endgame må gjemmestedet være innen ca. 3 m fra en vei eller sti, og offentlig tilgjengelig hele spilletiden.</li>
            <li>Seekerne som deler posisjon, vises som oransje punkter på kartet ditt.</li>
          </ul>
        </details>
      )}
    </div>
  )
}

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  return `${h ? `${h}:` : ''}${String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}`
}
const STATUS = { off: '', connecting: 'Kobler til…', online: 'Tilkoblet', offline: 'Frakoblet. Endringer sendes når nettet er tilbake.' }

/** Sanntidsrom: alle med samme kode ser samme logg, klokke og poengtavle. */
export function RoomSetup() {
  const { room, error } = useSync()
  const [code, setCode] = useState('')
  const hasGame = useGame((s) => s.questions.length > 0)
  // Leses på nytt når man forlater et rom, så det dukker opp i listen.
  const recent = room ? [] : recentRooms()
  const join = (c: string) => {
    if (hasGame && !confirm('Spørsmålene på denne telefonen erstattes av rommets. Fortsette?')) return
    void joinRoom(c)
  }

  if (room) return <RoomInfo />
  return (
    <div>
      <p className="mb-2 text-sm">Spiller dere på flere telefoner? Da deler dere logg, klokke og poengtavle i et rom. Spiller dere på én telefon, kan dere hoppe over dette.</p>
      <button className="btn btn-primary mb-2 w-full" data-guide="create-room" onClick={() => void createRoom()}>
        Opprett rom
      </button>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          join(code)
        }}
      >
        <input className="field font-mono tracking-widest uppercase" value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="Romkode" aria-label="Romkode" autoCapitalize="characters" autoComplete="off" />
        <button className="btn" disabled={code.length !== CODE_LENGTH}>
          Bli med
        </button>
      </form>
      {recent.length > 0 && (
        <div className="mt-3">
          <span className="label">Tidligere rom</span>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((r) => (
              <button key={r.code} className="btn min-h-9! font-mono" title={`Sist brukt ${new Date(r.at).toLocaleString('nb-NO')}`} onClick={() => join(r.code)}>
                {r.code}
                <span className="font-sans text-xs text-muted">{new Date(r.at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Gå tilbake til et rom for å se poengtavlen og rundene der.</p>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  )
}

/** Rommet telefonen er i: koden, om den er tilkoblet, og lenke til de andre. */
export function RoomInfo() {
  const { room, status, error } = useSync()
  const [copied, setCopied] = useState(false)
  if (!room) return null
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-3xl font-bold tracking-[0.2em]">{room}</span>
        <span className={`text-xs ${status === 'online' ? 'text-ok' : 'text-muted'}`} role="status">
          {status === 'online' && '● '}
          {STATUS[status]}
        </span>
      </div>
      <p className="my-2 text-xs text-muted">Del koden med de andre. Logg, spillområde, klokke og poengtavle er felles. Hiders gjemmested deles aldri.</p>
      <NotifyToggle />
      <div className="flex flex-wrap gap-1.5">
        <button
          className="btn flex-1"
          onClick={async () => {
            await navigator.clipboard?.writeText(roomLink(room)).catch(() => {})
            setCopied(true)
          }}
        >
          {copied ? 'Lenke kopiert' : 'Kopier lenke'}
        </button>
        <button
          className="btn btn-danger flex-1"
          onClick={() => {
            if (confirm(`Forlate rom ${room}? Rundene, poengtavlen og spillerne fra rommet fjernes fra denne telefonen. Byen og reglene beholdes. Alt ligger fortsatt i rommet, så du kan bli med igjen senere.`)) leaveRoomClean()
          }}
        >
          Forlat rommet
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  )
}

const total = (r: RoundResult) => r.seconds + r.bonusMinutes * 60

/** Seeker slår på posisjonsdeling ved rundestart. Hider ser bare hvor mange som deler. */
export function SharePanel() {
  const room = useSync((s) => s.room)
  const sharing = useSync((s) => Object.keys(s.seekers).length)
  const isHider = useGame((s) => s.mode === 'hider')
  const on = useGame((s) => s.sharePos)
  const setSharePos = useGame((s) => s.setSharePos)
  return (
    <Section title="Posisjonsdeling">
      {isHider ? (
        <p className="text-sm">
          {!room ? 'Dere må være i et rom for at seekerne skal kunne dele posisjon.' : sharing ? `${sharing} ${sharing === 1 ? 'seeker deler' : 'seekere deler'} posisjon. De vises som oransje punkter på kartet.` : 'Ingen seekere deler posisjon ennå.'}
          <span className="mt-1 block text-xs text-muted">Din posisjon deles aldri.</span>
        </p>
      ) : (
        <>
          <Switch on={on} onChange={setSharePos} title="Del posisjonen min med hider" detail={<span className={on && room ? 'text-ok' : ''}>{!on ? 'Av. Hider ser ikke hvor du er.' : room ? 'På. Hider ser deg på kartet.' : 'På, men du er ikke i et rom ennå.'}</span>} />
          <p className="mt-1 text-xs text-muted">Reglene sier at hider skal kunne følge seekerne hele runden. Posisjonen sendes bare i et rom, og bare mens appen er åpen på skjermen.</p>
        </>
      )}
    </Section>
  )
}

const ASK_BONUS_MS = 30 * 60000

/** Når hider er funnet, spør hiders telefon om tidsbonusen som skal legges til tiden. */
export function BonusPrompt() {
  const round = useGame((s) => {
    const last = s.results.at(-1)
    // Har en annen telefon alt lagt inn bonusen, spørres det ikke igjen.
    const mine = s.mode === 'hider' && s.round.seekFrom === null && last && last.id !== s.bonusAsked && !last.bonusMinutes
    return mine && Date.now() - (last.at ?? 0) < ASK_BONUS_MS ? last : null
  })
  const answerBonus = useGame((s) => s.answerBonus)
  const [minutes, setMinutes] = useState('')
  if (!round) return null
  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal aria-labelledby="bonus-title">
      <form
        className="card w-full max-w-sm shadow-xl"
        onSubmit={(e) => {
          e.preventDefault()
          answerBonus(round.id, Math.max(0, +minutes || 0))
          setMinutes('')
        }}
      >
        <h2 id="bonus-title" className="mb-1 text-lg font-bold">
          Du ble funnet
        </h2>
        <p className="mb-3 text-sm text-muted">Tiden din ble {clock(round.seconds)}. Hvor mye tidsbonus skal legges til?</p>
        <label className="mb-3 block">
          <span className="label">Tidsbonus (min)</span>
          <input className="field" type="number" min={0} inputMode="numeric" autoFocus value={minutes} placeholder="0" onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <button className="btn btn-primary w-full">Lagre</button>
        <p className="mt-2 text-xs text-muted">Kan rettes etterpå under Spill.</p>
      </form>
    </div>
  )
}

/** Avslutter runden: hider er funnet. Lagrer runden i arkivet, også i rommet. */
function finish() {
  const g = useGame.getState()
  g.finishRound(hiderSeconds(g.round, g.questions, g.settings.size, Date.now()), useSync.getState().room)
  void saveArchive(useGame.getState().archive.at(-1)!)
}

function cancel() {
  if (!confirm('Avbryte runden uten å lagre tiden? Loggen tas vare på under Tidligere runder.')) return
  const before = useGame.getState().archive.at(-1)?.id
  useGame.getState().cancelRound(useSync.getState().room)
  const last = useGame.getState().archive.at(-1)
  if (last && last.id !== before) void saveArchive(last)
}

/** Klokken som en avgangstavle: én flis per siffer, kolon mellom. */
function BoardClock({ seconds, accent }: { seconds: number; accent: boolean }) {
  // Alltid to sifre for minuttene, så flisene ikke hopper når tiden passerer 10 minutter.
  const t = Math.max(0, Math.floor(seconds))
  const h = Math.floor(t / 3600)
  const text = `${h ? `${h}:` : ''}${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  return (
    <span className="flex items-center gap-0.5" role="timer" aria-label={text}>
      {text.split('').map((c, i) =>
        c === ':' ? (
          <span key={i} className="board px-0.5 text-2xl text-muted" aria-hidden>
            :
          </span>
        ) : (
          <span key={i} className={`board-tile h-11 w-7.5 text-[28px] ${accent ? 'bg-accent! text-accent-text!' : ''}`} aria-hidden>
            {c}
          </span>
        ),
      )}
    </span>
  )
}

/** Øverst på spillskjermen: klokken, hvem som gjemmer seg, og hovedhandlingen for fasen runden er i. */
export function RoundBar() {
  const wall = useNow()
  const now = useGameNow()
  const g = useGame()
  const room = useSync((s) => s.room)
  const online = useSync((s) => s.status === 'online')
  const replay = useDemo((s) => s.kind === 'showcase')
  const [more, setMore] = useState(false)
  const { seekFrom, pause } = g.round
  if (seekFrom === null) return null
  // Klokken tikker hvert sekund. Trykker noen «Start letingen», skal gjemmetiden forsvinne med en gang, ikke ved neste tikk.
  const hiding = now < seekFrom && (!!pause || Date.now() < seekFrom)
  const seconds = hiding ? (seekFrom - now) / 1000 : hiderSeconds(g.round, g.questions, g.settings.size, wall)
  return (
    <div className="mb-3 border-b border-border pb-3" data-guide="round-bar">
      <div className="mb-1.5 flex items-center justify-between gap-2 font-sign text-sm text-muted">
        <span>{hiding ? 'Gjemmetid igjen' : 'Tid som hider'}</span>
        <span className="flex items-center gap-3">
          {room && (
            <span className={online ? 'text-ok' : ''} title={online ? 'Tilkoblet rom' : 'Frakoblet'}>
              {online ? '●' : '○'} <span className="board">{room}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-semibold text-hide">
            <Eye size={15} aria-hidden /> {g.round.hider || 'Hider'}
          </span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <BoardClock seconds={seconds} accent={!hiding} />
        {!replay && (
          <span className="flex gap-1.5">
            {hiding ? (
              <button className="btn btn-primary" disabled={!!pause} onClick={() => g.setRound({ seekFrom: Date.now() })}>
                Start letingen
              </button>
            ) : (
              <button className="btn btn-primary" data-guide="found" disabled={!!pause} onClick={finish}>
                Hider er funnet
              </button>
            )}
            <button className={`btn px-2.5! ${more ? 'btn-on' : ''}`} aria-label="Flere valg" aria-expanded={more} onClick={() => setMore(!more)}>
              <MoreHorizontal size={20} aria-hidden />
            </button>
          </span>
        )}
      </div>
      {pause && (
        <div className="mt-2 rounded-[12px] border border-accent p-2.5 text-sm">
          <b className="block font-sign">{PAUSE_TEXT[pause.kind].title}</b>
          <span className="text-muted">{PAUSE_TEXT[pause.kind].body}</span>
          {pause.kind !== 'move' && !replay && (
            <button className="btn btn-primary mt-2 w-full" onClick={g.resumeGame}>
              Fortsett spillet
            </button>
          )}
        </div>
      )}
      {more && !replay && (
        <div className="mt-2 flex flex-col gap-1.5">
          {!pause && (
            <div className="grid grid-cols-2 gap-1.5">
              <button className="btn" onClick={() => g.pauseGame('pause')}>
                <Pause size={18} aria-hidden /> Pause
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (confirm('Starte en avtalt hvileperiode? Alle klokker står til spillet fortsetter. Reglene anbefaler minst 10 timer, og alle må tilbake til samme sted.')) g.pauseGame('rest')
                }}
              >
                <Moon size={18} aria-hidden /> Hvileperiode
              </button>
            </div>
          )}
          {!hiding && (
            <details className="card">
              <summary className="cursor-pointer font-sign font-semibold">Statistikk for runden</summary>
              <div className="mt-2">
                <StatsList stats={roundStats(g.round, g.questions, g.settings.size, wall)} />
              </div>
            </details>
          )}
          <button className="btn btn-danger" onClick={cancel}>
            Avbryt runden
          </button>
          <p className="text-sm text-muted">Hider er funnet når seekerne er innen ca. 1,5 m og har sett hider.</p>
        </div>
      )}
    </div>
  )
}

/** Lobbyen: siste runde som ble spilt, og planleggingstiden før neste. */
export function LastResult() {
  const wall = useNow()
  const last = useGame((s) => s.results.at(-1))
  const round = useGame((s) => s.round)
  const planLeft = ((round.planUntil ?? 0) - wall) / 1000
  if (!last || wall - (last.at ?? 0) > RECENT_RESULT_MS) return null
  return (
    <div className="card mb-3 border-accent!" role="status">
      <span className="label">Runden er ferdig</span>
      <p className="text-sm">
        <b>{last.hider}</b> holdt seg skjult i <b className="tabular-nums">{clock(total(last))}</b>
        {last.bonusMinutes ? <span className="text-muted"> (med {last.bonusMinutes} min bonus)</span> : null}.
      </p>
      {round.hider && <p className="mt-1 text-sm">Neste hider: <b>{round.hider}</b></p>}
      {planLeft > 0 && (
        <div className="mt-2 rounded-lg bg-panel-2 p-2 text-center">
          <div className="text-xs font-semibold tracking-wide text-muted uppercase">Planleggingstid for neste hider</div>
          <div className="text-3xl font-bold tabular-nums">{clock(planLeft)}</div>
          <p className="text-xs text-muted">Opptil {PLANNING_MINUTES} minutter. Neste runde starter fra forrige hiders gjemmested.</p>
        </div>
      )}
    </div>
  )
}
const RECENT_RESULT_MS = 2 * 3600000

/** Lobbysteg: spillerne, rekkefølgen, hvem som gjemmer seg nå, og rollen til denne telefonen. */
export function Players() {
  const g = useGame()
  const [player, setPlayer] = useState('')
  return (
    <div>
      {g.players.length > 0 && (
        <ul className="mb-2 divide-y divide-border text-sm">
          {g.players.map((name) => (
            <li key={name} className="flex items-center justify-between py-1.5">
              <span>
                {name}
                {name === g.round.hider && <span className="ml-1 text-xs text-accent">gjemmer seg</span>}
              </span>
              <span className="flex gap-3">
                {name !== g.round.hider && (
                  <button className="link" onClick={() => g.setRound({ hider: name })}>
                    gjem seg
                  </button>
                )}
                <button className="link" onClick={() => g.removePlayer(name)}>
                  fjern
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mb-3 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          const name = player.trim()
          if (!name) return
          g.addPlayer(name)
          // Den første spilleren gjemmer seg til noen velger annet.
          if (!g.round.hider) g.setRound({ hider: name })
          setPlayer('')
        }}
      >
        <input className="field" value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="Navn" aria-label="Ny spiller" data-guide="add-player" />
        <button className="btn" disabled={!player.trim()}>
          Legg til
        </button>
      </form>
      {g.players.length > 1 && (
        <div className="mb-3">
          <span className="label">Rekkefølge</span>
          <p className="mb-2 text-sm">{g.players.join(' → ')}</p>
          <button className="btn" onClick={g.shufflePlayers}>
            🎲 Trekk rekkefølge
          </button>
          <p className="mt-1 text-xs text-muted">Trekker tilfeldig hvem som gjemmer seg først, og rekkefølgen etter det.</p>
        </div>
      )}
      {g.players.length === 0 && (
        <label className="mb-3 block">
          <span className="label">Hvem gjemmer seg</span>
          <input className="field" value={g.round.hider} onChange={(e) => g.setRound({ hider: e.target.value })} placeholder="Navn" />
        </label>
      )}
      <RolePicker />
    </div>
  )
}

/** Lobbysteg: gjemmetiden og knappen som starter runden. */
export function StartRound() {
  const g = useGame()
  const lines = g.settings.lines.length
  const problem = !lines ? 'Velg minst én linje under By og regler.' : null
  return (
    <div>
      <label className="mb-3 block">
        <span className="label">Gjemmetid (min)</span>
        <input className="field" type="number" min={1} inputMode="numeric" value={g.round.hidingMinutes} onChange={(e) => g.setRound({ hidingMinutes: Math.max(1, +e.target.value) })} />
      </label>
      <button className="btn btn-primary w-full" data-guide="start-round" disabled={!!problem} onClick={g.startRound}>
        Start runden
      </button>
      <p className={`mt-2 text-xs ${problem ? 'text-bad' : 'text-muted'}`}>
        {problem ?? (
          <>
            {g.round.hider ? <><b>{g.round.hider}</b> gjemmer seg. </> : null}Denne telefonen er <b>{g.mode === 'hider' ? 'hider' : 'seeker'}</b>. Rollen kan ikke byttes etter start.
          </>
        )}
      </p>
    </div>
  )
}

/** Poengtavlen: beste tid for hver spiller, og alle rundene med tidsbonus. */
export function Scoreboard() {
  const g = useGame()
  const best = new Map<string, RoundResult>()
  for (const r of g.results) if (!best.has(r.hider) || total(r) > total(best.get(r.hider)!)) best.set(r.hider, r)
  const names = [...new Set([...g.players, ...best.keys()])].sort((a, b) => (best.has(b) ? total(best.get(b)!) : -1) - (best.has(a) ? total(best.get(a)!) : -1))
  const rounds = (name: string) => g.results.filter((r) => r.hider === name).length
  if (!names.length) return null
  return (
    <Section title="Poengtavle">
      <p className="mb-1 text-xs text-muted">Den som holdt seg skjult lengst vinner. Bare den beste runden til hver spiller teller.</p>
      <ul className="mb-2 divide-y divide-border text-sm">
        {names.map((name) => (
          <li key={name} className="flex items-center justify-between py-1.5">
            <span>
              {name}
              {rounds(name) > 1 && <span className="ml-1 text-xs text-muted">beste av {rounds(name)}</span>}
            </span>
            <b className="tabular-nums">{best.has(name) ? clock(total(best.get(name)!)) : '–'}</b>
          </li>
        ))}
      </ul>
      {g.results.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium">Alle runder ({g.results.length})</summary>
          <p className="my-1 text-xs text-muted">Hider legger inn tidsbonusen når runden er over. ★ = spillerens beste runde.</p>
          <ul className="divide-y divide-border text-sm">
            {g.results.map((r, i) => (
              <li key={r.id} className="py-1.5">
                <div className="flex items-center justify-between">
                  <span className={best.get(r.hider) === r ? 'font-semibold' : ''}>
                    {i + 1}. {r.hider}
                    {rounds(r.hider) > 1 && <span className="text-xs text-muted"> ({g.results.slice(0, i + 1).filter((x) => x.hider === r.hider).length}. runde)</span>}{' '}
                    {best.get(r.hider) === r && <span className="text-accent">★</span>}
                  </span>
                  <span className="flex items-center gap-2 text-muted tabular-nums">
                    {clock(r.seconds)} +
                    <input className="field min-h-9! w-14! px-1.5! text-center" type="number" min={0} value={r.bonusMinutes || ''} placeholder="0" aria-label={`Tidsbonus i minutter for runde ${i + 1}`} onChange={(e) => g.setBonus(r.id, Math.max(0, +e.target.value || 0))} />
                    min
                    <button
                      className="link text-bad!"
                      onClick={() => {
                        if (confirm(`Slette runde ${i + 1} (${r.hider}) fra poengtavlen?`)) g.removeResult(r.id)
                      }}
                    >
                      slett
                    </button>
                  </span>
                </div>
                {r.stats && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted">
                      {r.stats.asked} spørsmål{r.stats.endgameSec !== null ? ` · endgame ${clock(r.stats.endgameSec)}` : ''}
                      {r.at ? ` · ${new Date(r.at).toLocaleString('nb-NO', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                    </summary>
                    <div className="mt-1 mb-1 rounded-lg bg-panel-2 p-2">
                      <StatsList stats={r.stats} />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Section>
  )
}

/** Byen spillet foregår i. Kartdata, stasjoner og linjer følger byen, og valget deles i rommet. */
function CityPicker({ locked }: { locked: boolean }) {
  const current = useGame((s) => s.settings.city)
  const setCity = useGame((s) => s.setCity)
  return (
    <Section title="By">
      <div className="flex flex-wrap gap-1.5">
        {CITIES.map((c) => (
          <button
            key={c.id}
            className={`btn flex-1 ${current === c.id ? 'btn-on' : ''}`}
            aria-pressed={current === c.id}
            disabled={locked}
            onClick={() => {
              if (current !== c.id && confirm(`Bytte til ${c.name}? Spillområde, linjevalg og spørsmålsutvalg nullstilles, og alle i rommet får samme by.`)) setCity(c.id)
            }}
          >
            {c.name}
            <span className="text-xs text-muted">{c.modes.map((m, i) => (i ? MODES[m].name.toLowerCase() : MODES[m].name)).join(', ')}</span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        {CITIES.length === 1 ? 'Flere byer kommer. Hver by har sitt eget kollektivnett og sine egne kartdata.' : 'Hver by har sitt eget kollektivnett og sine egne kartdata.'}
      </p>
    </Section>
  )
}

/** Lagrede spilloppsett: spørsmål, størrelse, sone, linjer, spillområde og gjemmetid. */
function PresetPanel({ locked }: { locked: boolean }) {
  const presets = usePresets()
  const [name, setName] = useState('')
  const list = allPresets(presets)
  useEffect(() => void loadPresets(), [])

  return (
    <Section title="Lagrede oppsett">
      {presets.fetching && (
        <p className="mb-2 flex items-center gap-2 text-sm text-muted" role="status">
          <Spinner className="size-3.5!" /> Henter delte oppsett…
        </p>
      )}
      {list.length === 0 && !presets.fetching && <p className="mb-2 text-sm text-muted">Ingen lagrede oppsett ennå. Sett opp spillet over, og lagre det her.</p>}
      <ul className="mb-2 flex flex-col gap-1.5">
        {list.map((p) => (
          <li key={p.id} className="card flex items-center justify-between gap-2 py-2!">
            <span className="min-w-0 text-sm">
              <b className="block truncate">{p.name}</b>
              <span className="text-xs text-muted">
                {SIZE_NAMES[p.setup.size]}, {p.setup.questions ? `${p.setup.questions.length} spørsmål` : 'standard spørsmål'}, {p.hidingMinutes} min, {p.shared ? 'delt med alle' : 'bare denne telefonen'}
              </span>
            </span>
            <span className="flex shrink-0 gap-1.5">
              <button className="btn min-h-9!" disabled={locked} onClick={() => applyPreset(p)}>
                Bruk
              </button>
              <button
                className="link text-bad! min-h-9"
                aria-label={`Slett ${p.name}`}
                onClick={() => {
                  if (confirm(`Slette «${p.name}»? ${p.shared ? 'Det fjernes for alle.' : ''}`)) void deletePreset(p.id)
                }}
              >
                Slett
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          if (list.some((p) => p.id === presetId(name)) && !confirm(`Det finnes alt et oppsett med navnet «${name.trim()}». Erstatte det?`)) return
          void savePreset(name)
          setName('')
        }}
      >
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn på oppsettet" aria-label="Navn på oppsettet" maxLength={40} />
        <button className="btn" disabled={!presetId(name)}>
          Lagre
        </button>
      </form>
      {presets.note && (
        <p className="mt-1 text-xs text-muted" role="status">
          {presets.note}
        </p>
      )}
      <p className="mt-1 text-xs text-muted">Lagrer spørsmålsutvalg, størrelse, sone, linjer, spillområde og gjemmetid. Oppsettet deles med alle som bruker appen, og hvem som helst kan endre eller slette det.</p>
    </Section>
  )
}

const SIZE_NAMES = { S: 'Small', M: 'Medium', L: 'Large' }
/** Tentacles-spørsmålene reglene har fra Medium og opp. */
const TENTACLES_2KM = ITEMS.filter((i) => i.category === 'Tentacles' && i.sizes.includes('M')).map((i) => i.id)
const DAYS: Record<DayKey, string> = { wk: 'Hverdag', sa: 'Lørdag', su: 'Søndag' }
const THEMES: Record<Settings['theme'], string> = { auto: 'Følg systemet', light: 'Lys', dark: 'Mørk' }

/** `all`: alle linjene i byen, også de som ikke er med, så de kan slås på igjen. */
/** Kort oppsummering av spillreglene, til lobbysteget når det er lukket. */
export function useRulesSummary() {
  const s = useGame((x) => x.settings)
  const lines = s.lines.length
  return `${cityOf(s.city).name}, ${SIZE_NAMES[s.size]}, sone ${s.zoneRadius} m, ${lines} ${lines === 1 ? 'linje' : 'linjer'}${!s.playArea ? ', hele nettet' : s.areaAuto === false ? ', eget område' : ''}`
}

/** Spillreglene: by, størrelse, linjer, sone, område og spørsmål. Felles for alle i rommet, låst under runden. */
export function RulesPanel({ all, result }: { data: GeoData; all: GeoData; result: Result }) {
  const s = useGame((x) => x.settings)
  const set = useGame((x) => x.setSettings)
  const setRound = useGame((x) => x.setRound)
  const asked = useGame((x) => x.questions.length)
  const setDraw = useUi((x) => x.setDraw)
  const locked = useGame((x) => x.round.seekFrom !== null)
  const enabled = enabledIds(s)
  const tentacles = TENTACLES_2KM.every((id) => enabled.includes(id))
  // Byen kartdataene er lastet for. Den kan henge litt etter valget rett etter et bytte.
  const city = loadedCity()
  const activeModes = modesOf(all, s.lines)

  return (
    <div>
      <CityPicker locked={locked} />
      <Section title="Spillområde">
        <p className="mb-2 text-sm">
          {!s.playArea ? `Hele ${transit().whole}.` : s.areaAuto !== false ? 'Automatisk rundt stasjonene på linjene som er med.' : `Eget område${asked ? '' : ` med ${result.stations.length} stasjoner`}.`}
        </p>
        <Segmented
          label="Spillområde"
          disabled={locked}
          value={!s.playArea ? 'all' : s.areaAuto !== false ? 'auto' : 'own'}
          options={[
            { value: 'auto', label: 'Automatisk' },
            { value: 'own', label: s.playArea && s.areaAuto === false ? 'Tegn på nytt' : 'Tegn selv' },
            { value: 'all', label: 'Hele nettet' },
          ]}
          onChange={(v) => {
            if (v === 'auto') set({ areaAuto: true, playArea: autoPlayArea(all.stations, s) })
            else if (v === 'all') set({ areaAuto: false, playArea: null })
            else setDraw([])
          }}
        />
        <p className="mt-1 text-sm text-muted">Automatisk legger en ramme et par kilometer utenfor de ytterste stasjonene, og følger med når linjer eller sone endres.</p>
      </Section>

      {locked && (
        <p className="mb-5 rounded-lg border border-border bg-panel-2 p-3 text-sm">
          🔒 Spilloppsettet er låst mens runden pågår. Det er likt for alle i rommet.
        </p>
      )}
      <Section title="Spillstørrelse">
        <Segmented
          label="Spillstørrelse"
          value={s.size}
          disabled={locked}
          options={(['S', 'M', 'L'] as const).map((k) => ({ value: k, label: SIZE_NAMES[k], detail: `sone ${SIZE_RULES[k].zoneRadius} m` }))}
          onChange={(k) => {
            // Størrelsen bestemmer sone og gjemmetid etter reglene. Begge kan justeres etterpå.
            set({ size: k, zoneRadius: SIZE_RULES[k].zoneRadius, questions: null })
            setRound({ hidingMinutes: SIZE_RULES[k].hidingMinutes })
          }}
        />
        <p className="mt-1 text-xs text-muted">
          Styrer hvilke spørsmål som er med: {enabled.length} av {ITEMS.length} i dette spillet. Bilder har {s.size === 'L' ? 20 : 10} min svartid, resten 5 min. Valget setter også gjemmetiden til {SIZE_RULES[s.size].hidingMinutes} min og sonen til {SIZE_RULES[s.size].zoneRadius} m. Begge kan justeres etterpå.
        </p>
      </Section>

      {s.size === 'S' && (
        <Section title="Tentacles">
          <Switch
            on={tentacles}
            disabled={locked}
            title="Ta med Tentacles i små spill"
            detail="Reglene har ikke Tentacles i Small. Slås det på, er spørsmålene på 2 km med: museer, biblioteker, kinoer og sykehus."
            onChange={() => set({ questions: tentacles ? enabled.filter((id) => !TENTACLES_2KM.includes(id)) : [...enabled, ...TENTACLES_2KM] })}
          />
        </Section>
      )}

      <Section title="Tilpass spørsmål">
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium">
            {s.questions ? `Egendefinert utvalg: ${enabled.length} av ${ITEMS.length}` : `Standard for ${SIZE_NAMES[s.size]}: ${enabled.length} av ${ITEMS.length}`}
          </summary>
          <p className="my-2 text-xs text-muted">Kryss av for spørsmålene som skal være med. Utvalget gjelder for alle i rommet. Bytter du spillstørrelse, går utvalget tilbake til standard.</p>
          {s.questions && (
            <button className="btn mb-2" disabled={locked} onClick={() => set({ questions: null })}>
              Tilbake til standard for {SIZE_NAMES[s.size]}
            </button>
          )}
          {CATEGORIES.map((c) => {
            const all = ITEMS.filter((i) => i.category === c)
            const on = all.filter((i) => enabled.includes(i.id)).length
            const ids = all.map((i) => i.id)
            return (
              <fieldset key={c} className="mt-3 border-t border-border pt-2" disabled={locked}>
                <legend className="sr-only">{c}</legend>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <b className="text-sm">
                    {c} <span className="font-normal text-muted">{on} av {all.length}</span>
                  </b>
                  <span className="flex gap-1.5">
                    <button type="button" className="btn min-h-9!" onClick={() => set({ questions: [...new Set([...enabled, ...ids])] })}>
                      Alle
                    </button>
                    <button type="button" className="btn min-h-9!" onClick={() => set({ questions: enabled.filter((id) => !ids.includes(id)) })}>
                      Ingen
                    </button>
                  </span>
                </div>
                <ul>
                  {all.map((i) => (
                    <li key={i.id}>
                      <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-accent"
                          checked={enabled.includes(i.id)}
                          onChange={(e) => set({ questions: e.target.checked ? [...enabled, i.id] : enabled.filter((id) => id !== i.id) })}
                        />
                        <span>
                          {i.label} <span className="text-xs text-muted">{i.group}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )
          })}
        </details>
      </Section>

      <Section title={`Sonestørrelse: ${s.zoneRadius} m`}>
        <input className="w-full accent-accent" type="range" min={250} max={1000} step={50} value={s.zoneRadius} aria-label="Sonestørrelse i meter" disabled={locked} onChange={(e) => set({ zoneRadius: +e.target.value })} />
        <p className="text-xs text-muted">Hvor langt fra stasjonen hider kan gjemme seg.</p>
      </Section>

      <Section title={city.modes.length > 1 ? 'Kollektiv og linjer som er med' : 'Linjer som er med'}>
        {city.modes.length > 1 && (
          <>
            <div className="mb-1 flex flex-wrap gap-1.5">
              {city.modes.map((m) => {
                const on = activeModes.includes(m)
                const mine = linesOf(all, [m])
                return (
                  <button
                    key={m}
                    className={`btn flex-1 ${on ? 'btn-on' : ''}`}
                    aria-pressed={on}
                    disabled={locked}
                    onClick={() => set({ lines: on ? s.lines.filter((l) => !mine.includes(l)) : [...new Set([...s.lines, ...mine])] })}
                  >
                    {MODES[m].name}
                    <span className="text-xs text-muted">{mine.length} linjer</span>
                  </button>
                )
              })}
            </div>
            <p className="mb-3 text-xs text-muted">Slå av og på et helt transportmiddel. Under kan enkeltlinjer velges bort.</p>
          </>
        )}
        {city.modes.map((m) => {
          const feats = all.lines.features.filter((f) => modeOf(f) === m)
          if (!feats.length) return null
          return (
            <div key={m} className="mb-2">
              {city.modes.length > 1 && <span className="label">{MODES[m].name}</span>}
              <div className="flex flex-wrap gap-1.5">
                {feats.map(({ properties: l }) => {
                  const on = s.lines.includes(l.line)
                  return (
                    <button
                      key={l.line}
                      className={`btn min-w-11 px-2! ${on ? 'btn-on' : 'opacity-50'}`}
                      style={{ borderBottom: `3px solid ${l.color}` }}
                      aria-pressed={on}
                      disabled={locked}
                      title={l.name}
                      onClick={() => set({ lines: on ? s.lines.filter((x) => x !== l.line) : [...s.lines, l.line] })}
                    >
                      {l.line}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        {s.lines.length === 0 && <p className="text-xs text-bad">Ingen linjer er med. Velg minst én.</p>}
      </Section>

      <PresetPanel locked={locked} />
    </div>
  )
}

/** Innstillinger for appen på denne telefonen, og hvor dataene kommer fra. Endrer ikke spillet. */
export function AppInfo({ data }: { data: GeoData | null }) {
  const s = useGame((x) => x.settings)
  const set = useGame((x) => x.setSettings)
  return (
    <div>
      <Section title="Utseende">
        <Segmented label="Tema" value={s.theme} options={Object.entries(THEMES).map(([k, v]) => ({ value: k as Settings['theme'], label: v }))} onChange={(theme) => set({ theme })} />
      </Section>
      <DataInfo data={data} />
      <Privacy />
    </div>
  )
}

/** Hva appen lagrer, hvor og hvor lenge. Kort, og bare det som faktisk skjer. */
function Privacy() {
  return (
    <Section title="Personvern">
      <details className="card">
        <summary className="cursor-pointer text-sm">Hva appen lagrer, og hvor lenge</summary>
        <div className="mt-2 space-y-2 text-sm text-muted">
          <p>
            <b className="font-sign text-text">På telefonen:</b> spillet ditt, oppsett og tidligere runder ligger i nettleseren på denne telefonen, og forsvinner hvis du sletter nettstedsdata.
          </p>
          <p>
            <b className="font-sign text-text">I et rom:</b> spørsmål og svar, klokken, spillerne (navnene dere skriver inn), oppsettet og ferdige runder lagres i Firebase (Google) i Belgia, så alle i rommet ser det samme. Deler en seeker posisjonen sin, lagres den siste posisjonen i rommet. Hiders posisjon sendes aldri.
          </p>
          <p>
            <b className="font-sign text-text">Hvor lenge:</b> rom og tidligere runder blir liggende, så dere kan gå tilbake til dem senere. Vil du ha et rom slettet, si fra.
          </p>
          <p>
            <b className="font-sign text-text">Andre tjenester:</b> kartbildene hentes fra Kartverket og OpenStreetMap. Spørsmålene om høyde og gate sender ett punkt til Kartverket. Appen har ingen reklame, sporing eller informasjonskapsler.
          </p>
          <p>
            Spørsmål eller ønske om sletting:{' '}
            <a className="link text-sm!" href="https://github.com/kristiangoystdal/kristiangoystdal.github.io/issues" target="_blank" rel="noreferrer">
              meld fra på GitHub
            </a>
            .
          </p>
        </div>
      </details>
    </Section>
  )
}

/** Tegnforklaring for stedene på kartet: ikonet, hva det er, og hvor mange det finnes. */
export function PoiLegend({ data }: { data: GeoData }) {
  const types = POI_TYPES.filter((t) => data.poi[t.key]?.length)
  if (!types.length) return <p className="text-sm text-muted">{data.loading ? 'Stedene lastes…' : 'Ingen steder i kartdataene.'}</p>
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
      {types.map((t) => (
        <li key={t.key} className="flex min-w-0 items-start gap-1.5 py-0.5">
          <span className="w-5 shrink-0 text-center" aria-hidden>
            {t.icon}
          </span>
          <span className="min-w-0 flex-1 leading-snug">
            {t.label[0].toUpperCase() + t.label.slice(1)}
          </span>
          <span className="shrink-0 text-muted tabular-nums">{data.poi[t.key]!.length}</span>
        </li>
      ))}
    </ul>
  )
}

/** Oversikten over kartdataene, gruppert. */
type DataStats = { summary: string; groups: { title: string; text: string }[] }

/**
 * Hva kartdataene inneholder, som én lukket linje med detaljer under. Tallene regnes ut i bakgrunnen
 * etter at arket er åpnet, så innstillingene kan brukes med en gang, og oppdateres når resten av dataene kommer.
 */
function DataInfo({ data }: { data: GeoData | null }) {
  const [stats, setStats] = useState<DataStats | null>(null)
  useEffect(() => {
    setStats(null)
    if (!data) return
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 50))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const id = idle(() => {
      const city = loadedCity()
      const wait = data.loading ? 'lastes' : 'mangler'
      const areas = adminLevels().map((l) => `${l.label.toLowerCase()} ${levelCount(data, l.key) || wait}`)
      const places = POI_TYPES.filter((t) => data.poi[t.key]?.length).map((t) => `${t.label} ${data.poi[t.key]!.length}`)
      const coast = data.shapes.coast ? `${data.islands.length} øyer` : `kystlinje ${wait}`
      const water = data.shapes.water ? `${data.shapes.water.length} vann og elver` : `vann ${wait}`
      const riks = data.shapes.riks ? (data.shapes.riks.length ? 'riksgrensen innenfor kartet' : 'riksgrensen utenfor kartet') : ''
      setStats({
        summary: `${data.stations.length} stasjoner, ${data.lines.features.length} linjer, ${places.length || 'ingen'} typer steder`,
        groups: [
          { title: 'Kollektiv', text: `${data.stations.length} stasjoner og ${data.lines.features.length} linjer (${city.modes.map((m) => MODES[m].name.toLowerCase()).join(', ')}) fra Entur.` },
          { title: 'Områder', text: `${areas.join(', ')}.` },
          { title: 'Kyst og vann', text: `${[coast, water, riks].filter(Boolean).join(', ')}.` },
        ],
      })
    })
    return () => cancel(id)
  }, [data])
  return (
    <Section title="Kartdata">
      <details className="card">
        <summary className="flex cursor-pointer items-center gap-2 text-sm">
          {!stats ? (
            <span className="flex items-center gap-2 text-muted" role="status">
              <Spinner className="size-3.5!" /> {data ? 'Teller det som er i kartdataene…' : 'Laster kartdataene…'}
            </span>
          ) : (
            <span className="flex-1">{stats.summary}</span>
          )}
          {data?.loading && stats && <Spinner className="size-3.5! text-muted" />}
        </summary>
        {stats && (
          <div className="mt-2 space-y-1.5 text-sm">
            {stats.groups.map((g) => (
              <p key={g.title}>
                <b className="font-sign">{g.title}:</b> <span className="text-muted">{g.text}</span>
              </p>
            ))}
            {data && (
              <div>
                <b className="font-sign">Steder</b> <span className="text-muted">(ikonene på kartet når Steder er slått på)</span>
                <div className="mt-1">
                  <PoiLegend data={data} />
                </div>
              </div>
            )}
            {data?.loading && <p className="text-xs text-muted">Resten av kartdataene lastes. Tallene oppdateres av seg selv.</p>}
          </div>
        )}
        <p className="mt-2 text-xs text-muted">Grenser © Kartverket og Posten. Bydeler, steder, kystlinje, vann og riksgrense © OpenStreetMap-bidragsytere. Inspirert av taibeled/JetLagHideAndSeek.</p>
      </details>
    </Section>
  )
}
