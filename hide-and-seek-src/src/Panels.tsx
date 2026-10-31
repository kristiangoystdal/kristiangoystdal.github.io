import { Eye, Moon, MoreHorizontal, Pause } from 'lucide-react'
import { LOCALE, chosenLang, setLang, tr } from './lang'
import { useEffect, useState } from 'react'
import { useDemo } from './demo'
import { StatsList } from './Archive'
import { CITIES, MODES, city as loadedCity, cityOf, linesOf, modeOf, modesOf, transit } from './cities'
import { BASEMAPS, depRate } from './MapView'
import { PLANNING_MINUTES, hiderSeconds, movedAt, roundStats } from './clock'
import { CATEGORIES, ITEMS, SIZE_RULES, answerLabel, describe, enabledIds, place } from './form'
import { POI_TYPES, adminLevels, autoPlayArea, canCutZone, cutsZone, dist, hiderStation, levelCount, stationPos, stationsInReach, type Result } from './geo'
import { NotifyToggle } from './notify'
import { PresetEntry, SavePreset } from './PresetSheets'
import { useGame, useHiderPos, useUi, type Layer } from './store'
import { leaveRoomClean, roomLink, saveArchive, useSync } from './sync'
import type { DayKey, GeoData, RoundResult, Settings } from './types'
import { PAUSE_TEXT, Section, Segmented, Spinner, Switch, useGameNow, useNow } from './ui'

const LAYERS: { key: Layer; label: string }[] = [
  { key: 'area', label: tr('Mulig område', 'Possible area') },
  { key: 'zones', label: tr('Stasjonssoner', 'Station zones') },
  { key: 'lines', label: tr('Linjer', 'Lines') },
  { key: 'admin', label: tr('Områdegrenser', 'Area borders') },
  { key: 'poi', label: tr('Steder', 'Places') },
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
            {tr('Endgame ved', 'Endgame at')} <b>{target?.name ?? tr('stasjonen', 'the station')}</b>, {tr('startet kl.', 'started at')}{' '}
            {new Date(endgame.time).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })} ({tr(`${clock((now - endgame.time) / 1000)} siden`, `${clock((now - endgame.time) / 1000)} ago`)}).
          </p>
          <p className="mb-2 text-xs text-muted">
            {tr('Bare denne sonen er gyldig. Hider står stille, så alle svar på nye spørsmål skjærer sonen nøyaktig.', 'Only this zone counts. The hider stays put, so every answer to a new question cuts the zone exactly.')}
          </p>
          {earlier.length > 0 && (
            <div className="mb-2">
              <span className="label">{tr('Spørsmål fra før endgame', 'Questions from before the endgame')}</span>
              <p className="mb-1.5 text-xs text-muted">
                {tr('Velg de som også skal gjøre sonen mindre, f.eks. når dere vet at hider ikke har flyttet seg siden.', 'Pick the ones that should also shrink the zone, e.g. when you know the hider has not moved since.')}
              </p>
              <ul className="flex flex-col gap-1.5">
                {earlier.map((q) => {
                  const on = cutsZone(q, endgame)
                  return (
                    <li key={q.id}>
                      <button type="button" role="switch" aria-checked={on} className={`btn h-auto! w-full justify-between! py-1.5! text-left whitespace-normal! ${on ? 'btn-on' : ''}`} onClick={() => toggleCut(q.id)}>
                        <span className="text-xs">
                          {describe(q, data)} <b>{answerLabel(q, q.answer!)}</b>
                        </span>
                        <span className="shrink-0 text-xs">{on ? tr('✓ Skjærer sonen', '✓ Cuts the zone') : tr('Teller ikke', 'Does not count')}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {earlier.length > 1 && (
                <div className="mt-1.5 flex gap-1.5">
                  <button className="btn min-h-9! flex-1" onClick={() => setRound({ endgame: { ...endgame, include: earlier.map((q) => q.id) } })}>
                    {tr('Alle', 'All')}
                  </button>
                  <button className="btn min-h-9! flex-1" onClick={() => setRound({ endgame: { ...endgame, include: [] } })}>
                    {tr('Ingen', 'None')}
                  </button>
                </div>
              )}
            </div>
          )}
          {!result.area && (
            <p className="mb-2 text-sm text-bad">
              {tr(
                'Svarene etter endgame-start utelukker hele sonen. Hider er trolig ved en annen stasjon. Avslutt endgame og velg en annen.',
                'The answers since the endgame started rule out the whole zone. The hider is probably at another station. End the endgame and pick another.',
              )}
            </p>
          )}
          <button
            className="btn w-full"
            onClick={() => {
              if (confirm(tr('Avslutte endgame? Kartet viser igjen alle stasjonene svarene peker ut.', 'End the endgame? The map shows all the stations the answers point to again.'))) setRound({ endgame: null })
            }}
          >
            {tr('Avslutt endgame', 'End the endgame')}
          </button>
        </div>
      </Section>
    )
  }
  const blocked =
    seekFrom === null
      ? tr('Starter når runden er i gang.', 'Starts once the round is running.')
      : now < seekFrom
        ? tr('Kan startes når gjemmetiden er over.', 'Can start when the hiding time is over.')
        : pause
          ? tr('Ikke mens spillet står.', 'Not while the game is paused.')
          : null
  return (
    <Section title="Endgame">
      <div className="flex gap-1.5">
        <select className="field" value={stationId} aria-label={tr('Stasjon for endgame', 'Station for the endgame')} onChange={(e) => setPicked(e.target.value)}>
          {!stationId && <option value="">{tr('Velg stasjon…', 'Choose station…')}</option>}
          <optgroup label={`${tr('Mulige', 'Possible')} (${result.stations.length})`}>
            {result.stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={tr('Utelukket av svarene', 'Ruled out by the answers')}>
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
            const ask = tr(
              `Starte endgame ved ${name}?${out ? ' Svarene har utelukket denne stasjonen.' : ''} Hider får beskjed om å stå stille.`,
              `Start the endgame at ${name}?${out ? ' The answers have ruled out this station.' : ''} The hider is told to stay put.`,
            )
            if (confirm(ask)) setRound({ endgame: { stationId, time: Date.now() } })
          }}
        >
          {tr('Start endgame', 'Start endgame')}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        {blocked ??
          tr(
            'Start når dere er inne i sonen og har gått av transportmiddelet. Da vises sonen på kartet, og hider må stå stille.',
            'Start when you are inside the zone and have got off the vehicle. The zone then shows on the map, and the hider must stay put.',
          )}
      </p>
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
    <Section title={tr('Kartet', 'The map')}>
      <span className="label">{tr('Vis på kartet', 'Show on the map')}</span>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {LAYERS.filter((l) => l.key !== 'zones' || (!hiderView && endgame)).map((l) => (
          <button key={l.key} className={`btn ${layers[l.key] ? 'btn-on' : ''}`} aria-pressed={layers[l.key]} onClick={() => toggleLayer(l.key)}>
            {l.label}
          </button>
        ))}
      </div>
      {layers.poi && (
        <div className="mb-3 rounded-[12px] bg-panel-2 p-2.5">
          <span className="label">{tr('Steder på kartet', 'Places on the map')}</span>
          <PoiLegend data={data} />
        </div>
      )}
      <span className="label">{tr('Bakgrunnskart', 'Background map')}</span>
      <div className="mb-3">
        <Segmented label={tr('Bakgrunnskart', 'Background map')} value={settings.basemap} options={(Object.keys(BASEMAPS) as (keyof typeof BASEMAPS)[]).map((k) => ({ value: k, label: BASEMAPS[k].label }))} onChange={(basemap) => setSettings({ basemap })} />
      </div>
      <span className="label">{tr('Områdegrenser', 'Area borders')}</span>
      <select className="field mb-3" value={settings.adminLevel} aria-label={tr('Områdegrenser', 'Area borders')} onChange={(e) => setSettings({ adminLevel: e.target.value as Settings['adminLevel'] })}>
        {adminLevels().map((l) => (
          <option key={l.key} value={l.key}>
            {l.label}
          </option>
        ))}
      </select>
      <span className="label">{tr('Avganger', 'Departures')}</span>
      <div className="grid grid-cols-3 gap-1.5">
        <select className="field" value={settings.day} aria-label={tr('Dag', 'Day')} onChange={(e) => setSettings({ day: e.target.value as DayKey })}>
          {Object.entries(DAYS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="field" value={settings.hourFrom} aria-label={tr('Fra klokken', 'From hour')} onChange={(e) => setSettings({ hourFrom: +e.target.value, hourTo: Math.max(settings.hourTo, +e.target.value + 1) })}>
          {hours.slice(0, 24).map((h) => (
            <option key={h} value={h}>
              {tr('fra', 'from')} {String(h).padStart(2, '0')}
            </option>
          ))}
        </select>
        <select className="field" value={settings.hourTo} aria-label={tr('Til klokken', 'To hour')} onChange={(e) => setSettings({ hourTo: +e.target.value })}>
          {hours.slice(settings.hourFrom + 1).map((h) => (
            <option key={h} value={h}>
              {tr('til', 'to')} {String(h).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-muted">{tr('Avganger per time i stasjonslisten og på kartet.', 'Departures per hour in the station list and on the map.')}</p>
    </Section>
  )
}

/** Stasjonene svarene ikke har utelukket. Seekerne ser dem, hider gjør det aldri. */
export function PossibleStations({ data, result }: { data: GeoData; result: Result }) {
  const settings = useGame((s) => s.settings)
  const lineColor = Object.fromEntries(data.lines.features.map((f) => [f.properties.line, f.properties.color]))
  return (
    <Section title={`${tr('Mulige stasjoner', 'Possible stations')} (${result.stations.length})`}>
      {result.stations.length === 0 && <p className="text-sm text-bad">{tr('Ingen stasjoner passer med svarene. Sjekk loggen for et feil svar.', 'No stations fit the answers. Check the log for a wrong answer.')}</p>}
      <ul className="divide-y divide-border text-sm">
        {result.stations.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
            <span>{s.name}</span>
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className="tabular-nums">{depRate(s, settings.day, settings.hourFrom, settings.hourTo).toFixed(0)}/{tr('t', 'h')}</span>
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
    <Section title={tr('Hvor er du', 'Where you are')}>
      <div className="card text-sm">
        {pos ? (
          <>
            <p>
              📍 {place(pos, data.stations)}
              <span className="block text-xs text-muted">
                {tr('Fra GPS', 'From GPS')}
                {accuracy !== null ? `, ±${Math.round(accuracy)} m` : ''}, {age < 5 ? tr('akkurat nå', 'just now') : tr(`for ${age} s siden`, `${age} s ago`)}.
              </span>
            </p>
          </>
        ) : (
          <p className="text-muted">{error || tr('Venter på GPS…', 'Waiting for GPS…')}</p>
        )}
        {pos && error && <p className="mt-1 text-xs text-bad">{error}</p>}
      </div>
      {station && (
        <p className={`mt-2 text-xs ${away > zoneRadius ? 'text-bad' : 'text-muted'}`}>
          {tr(`Stasjonen din er ${station.name}.`, `Your station is ${station.name}.`)}
          {away > zoneRadius && tr(` Du er ${Math.round(away)} m unna, utenfor sonen på ${zoneRadius} m.`, ` You are ${Math.round(away)} m away, outside the ${zoneRadius} m zone.`)}
        </p>
      )}
      {pos && reach.length > 1 && (
        <label className="mt-3 block">
          <span className="label">{tr('Velg stasjonen som er din', 'Choose your station')}</span>
          <select className="field" value={station?.id ?? ''} onChange={(e) => setHider({ stationId: e.target.value })}>
            {reach.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({Math.round(dist(stationPos(s), pos))} m)
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">
            {tr('Du står i sonen til flere stasjoner. Spørsmål om stasjonen din svares ut fra den du velger.', 'You are in the zone of several stations. Questions about your station are answered from the one you choose.')}
          </span>
        </label>
      )}
      <p className="mt-2 text-xs text-muted">{tr('Posisjonen følger GPS mens appen er åpen. Den lagres ikke, og seekerne ser den aldri.', 'Your position follows GPS while the app is open. It is not saved, and the seekers never see it.')}</p>
    </Section>
  )
}


const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  return `${h ? `${h}:` : ''}${String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}`
}
const STATUS = tr(
  { off: '', connecting: 'Kobler til…', online: 'Tilkoblet', offline: 'Frakoblet. Endringer sendes når nettet er tilbake.' },
  { off: '', connecting: 'Connecting…', online: 'Connected', offline: 'Offline. Changes are sent when the connection is back.' },
)


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
      <p className="my-2 text-xs text-muted">
        {tr(
          'Del koden med de andre. Logg, spillområde, klokke og poengtavle er felles. Hiders gjemmested deles aldri.',
          "Share the code with the others. The log, play area, clock and scoreboard are shared. The hider's hiding spot is never shared.",
        )}
      </p>
      <NotifyToggle />
      <div className="flex flex-wrap gap-1.5">
        <button
          className="btn flex-1"
          onClick={async () => {
            await navigator.clipboard?.writeText(roomLink(room)).catch(() => {})
            setCopied(true)
          }}
        >
          {copied ? tr('Lenke kopiert', 'Link copied') : tr('Kopier lenke', 'Copy link')}
        </button>
        <button
          className="btn btn-danger flex-1"
          onClick={() => {
            const ask = tr(
              `Forlate rom ${room}? Rundene, poengtavlen og spillerne fra rommet fjernes fra denne telefonen. Byen og reglene beholdes. Alt ligger fortsatt i rommet, så du kan bli med igjen senere.`,
              `Leave room ${room}? The rounds, scoreboard and players from the room are removed from this phone. The city and rules are kept. Everything stays in the room, so you can join again later.`,
            )
            if (confirm(ask)) leaveRoomClean()
          }}
        >
          {tr('Forlat rommet', 'Leave the room')}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  )
}

const total = (r: RoundResult) => r.seconds + r.bonusMinutes * 60

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
          {tr('Du ble funnet', 'You were found')}
        </h2>
        <p className="mb-3 text-sm text-muted">
          {tr(`Tiden din ble ${clock(round.seconds)}. Hvor mye tidsbonus skal legges til?`, `Your time was ${clock(round.seconds)}. How much time bonus should be added?`)}
        </p>
        <label className="mb-3 block">
          <span className="label">{tr('Tidsbonus (min)', 'Time bonus (min)')}</span>
          <input className="field" type="number" min={0} inputMode="numeric" autoFocus value={minutes} placeholder="0" onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <button className="btn btn-primary w-full">{tr('Lagre', 'Save')}</button>
        <p className="mt-2 text-xs text-muted">{tr('Kan rettes etterpå på poengtavlen.', 'Can be changed later on the scoreboard.')}</p>
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
  if (!confirm(tr('Avbryte runden uten å lagre tiden? Loggen tas vare på under Tidligere runder.', 'Stop the round without saving the time? The log is kept under Earlier rounds.'))) return
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
        <span>{hiding ? tr('Gjemmetid igjen', 'Hiding time left') : tr('Tid som hider', 'Time as hider')}</span>
        <span className="flex items-center gap-3">
          {room && (
            <span className={online ? 'text-ok' : ''} title={online ? tr('Tilkoblet rom', 'Connected to room') : tr('Frakoblet', 'Offline')}>
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
                {tr('Start letingen', 'Start seeking')}
              </button>
            ) : (
              <button className="btn btn-primary" data-guide="found" disabled={!!pause} onClick={finish}>
                {tr('Hider er funnet', 'Hider found')}
              </button>
            )}
            <button className={`btn px-2.5! ${more ? 'btn-on' : ''}`} aria-label={tr('Flere valg', 'More options')} aria-expanded={more} onClick={() => setMore(!more)}>
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
              {tr('Fortsett spillet', 'Resume the game')}
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
                  const ask = tr(
                    'Starte en avtalt hvileperiode? Alle klokker står til spillet fortsetter. Reglene anbefaler minst 10 timer, og alle må tilbake til samme sted.',
                    'Start an agreed rest period? All clocks stop until the game resumes. The rules recommend at least 10 hours, and everyone must return to the same place.',
                  )
                  if (confirm(ask)) g.pauseGame('rest')
                }}
              >
                <Moon size={18} aria-hidden /> {tr('Hvileperiode', 'Rest period')}
              </button>
            </div>
          )}
          {!hiding && (
            <details className="card">
              <summary className="cursor-pointer font-sign font-semibold">{tr('Statistikk for runden', 'Round statistics')}</summary>
              <div className="mt-2">
                <StatsList stats={roundStats(g.round, g.questions, g.settings.size, wall)} />
              </div>
            </details>
          )}
          <button className="btn btn-danger" onClick={cancel}>
            {tr('Avbryt runden', 'Stop the round')}
          </button>
          <p className="text-sm text-muted">{tr('Hider er funnet når seekerne er innen ca. 1,5 m og har sett hider.', 'The hider is found when the seekers are within about 1.5 m and have seen the hider.')}</p>
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
      <span className="label">{tr('Runden er ferdig', 'The round is over')}</span>
      <p className="text-sm">
        <b>{last.hider}</b> {tr('holdt seg skjult i', 'stayed hidden for')} <b className="tabular-nums">{clock(total(last))}</b>
        {last.bonusMinutes ? <span className="text-muted">{tr(` (med ${last.bonusMinutes} min bonus)`, ` (with ${last.bonusMinutes} min bonus)`)}</span> : null}.
      </p>
      {round.hider && (
        <p className="mt-1 text-sm">
          {tr('Neste hider:', 'Next hider:')} <b>{round.hider}</b>
        </p>
      )}
      {planLeft > 0 && (
        <div className="mt-2 rounded-lg bg-panel-2 p-2 text-center">
          <div className="text-xs font-semibold tracking-wide text-muted uppercase">{tr('Planleggingstid for neste hider', 'Planning time for the next hider')}</div>
          <div className="text-3xl font-bold tabular-nums">{clock(planLeft)}</div>
          <p className="text-xs text-muted">
            {tr(`Opptil ${PLANNING_MINUTES} minutter. Neste runde starter fra forrige hiders gjemmested.`, `Up to ${PLANNING_MINUTES} minutes. The next round starts from the last hider's hiding spot.`)}
          </p>
        </div>
      )}
    </div>
  )
}
const RECENT_RESULT_MS = 2 * 3600000



/** Poengtavlen: beste tid for hver spiller, og alle rundene med tidsbonus. */
export function Scoreboard() {
  const g = useGame()
  const best = new Map<string, RoundResult>()
  for (const r of g.results) if (!best.has(r.hider) || total(r) > total(best.get(r.hider)!)) best.set(r.hider, r)
  const names = [...new Set([...g.players, ...best.keys()])].sort((a, b) => (best.has(b) ? total(best.get(b)!) : -1) - (best.has(a) ? total(best.get(a)!) : -1))
  const rounds = (name: string) => g.results.filter((r) => r.hider === name).length
  if (!names.length) return null
  return (
    <Section title={tr('Poengtavle', 'Scoreboard')}>
      <p className="mb-1 text-xs text-muted">{tr('Den som holdt seg skjult lengst vinner. Bare den beste runden til hver spiller teller.', "Whoever stayed hidden longest wins. Only each player's best round counts.")}</p>
      <ul className="mb-2 divide-y divide-border text-sm">
        {names.map((name) => (
          <li key={name} className="flex items-center justify-between py-1.5">
            <span>
              {name}
              {rounds(name) > 1 && <span className="ml-1 text-xs text-muted">{tr(`beste av ${rounds(name)}`, `best of ${rounds(name)}`)}</span>}
            </span>
            <b className="tabular-nums">{best.has(name) ? clock(total(best.get(name)!)) : '–'}</b>
          </li>
        ))}
      </ul>
      {g.results.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium">
            {tr('Alle runder', 'All rounds')} ({g.results.length})
          </summary>
          <p className="my-1 text-xs text-muted">{tr('Hider legger inn tidsbonusen når runden er over. ★ = spillerens beste runde.', "The hider enters the time bonus when the round is over. ★ = the player's best round.")}</p>
          <ul className="divide-y divide-border text-sm">
            {g.results.map((r, i) => (
              <li key={r.id} className="py-1.5">
                <div className="flex items-center justify-between">
                  <span className={best.get(r.hider) === r ? 'font-semibold' : ''}>
                    {i + 1}. {r.hider}
                    {rounds(r.hider) > 1 && <span className="text-xs text-muted"> ({tr(`${g.results.slice(0, i + 1).filter((x) => x.hider === r.hider).length}. runde`, `round ${g.results.slice(0, i + 1).filter((x) => x.hider === r.hider).length}`)})</span>}{' '}
                    {best.get(r.hider) === r && <span className="text-accent">★</span>}
                  </span>
                  <span className="flex items-center gap-2 text-muted tabular-nums">
                    {clock(r.seconds)} +
                    <input className="field min-h-9! w-14! px-1.5! text-center" type="number" min={0} value={r.bonusMinutes || ''} placeholder="0" aria-label={tr(`Tidsbonus i minutter for runde ${i + 1}`, `Time bonus in minutes for round ${i + 1}`)} onChange={(e) => g.setBonus(r.id, Math.max(0, +e.target.value || 0))} />
                    min
                    <button
                      className="link text-bad!"
                      onClick={() => {
                        if (confirm(tr(`Slette runde ${i + 1} (${r.hider}) fra poengtavlen?`, `Delete round ${i + 1} (${r.hider}) from the scoreboard?`))) g.removeResult(r.id)
                      }}
                    >
                      {tr('slett', 'delete')}
                    </button>
                  </span>
                </div>
                {r.stats && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted">
                      {r.stats.asked} {tr('spørsmål', 'questions')}
                      {r.stats.endgameSec !== null ? ` · endgame ${clock(r.stats.endgameSec)}` : ''}
                      {r.at ? ` · ${new Date(r.at).toLocaleString(LOCALE, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
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
    <Section title={tr('By', 'City')}>
      <div className="flex flex-wrap gap-1.5">
        {CITIES.map((c) => (
          <button
            key={c.id}
            className={`btn flex-1 ${current === c.id ? 'btn-on' : ''}`}
            aria-pressed={current === c.id}
            disabled={locked}
            onClick={() => {
              const ask = tr(
                `Bytte til ${c.name}? Spillområde, linjevalg og spørsmålsutvalg nullstilles, og alle i rommet får samme by.`,
                `Switch to ${c.name}? The play area, lines and question selection are reset, and everyone in the room gets the same city.`,
              )
              if (current !== c.id && confirm(ask)) setCity(c.id)
            }}
          >
            {c.name}
            <span className="text-xs text-muted">{c.modes.map((m, i) => (i ? MODES[m].name.toLowerCase() : MODES[m].name)).join(', ')}</span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        {tr('Hver by har sitt eget kollektivnett og sine egne kartdata.', 'Each city has its own transit network and map data.')}
      </p>
    </Section>
  )
}

const SIZE_NAMES = { S: 'Small', M: 'Medium', L: 'Large' }
/** Tentacles-spørsmålene reglene har fra Medium og opp. */
const TENTACLES_2KM = ITEMS.filter((i) => i.category === 'Tentacles' && i.sizes.includes('M')).map((i) => i.id)
const DAYS: Record<DayKey, string> = tr({ wk: 'Hverdag', sa: 'Lørdag', su: 'Søndag' }, { wk: 'Weekday', sa: 'Saturday', su: 'Sunday' })
const THEMES: Record<Settings['theme'], string> = tr({ auto: 'Følg systemet', light: 'Lys', dark: 'Mørk' }, { auto: 'Follow system', light: 'Light', dark: 'Dark' })

/** `all`: alle linjene i byen, også de som ikke er med, så de kan slås på igjen. */
/** Kort oppsummering av spillreglene, til lobbysteget når det er lukket. */
export function useRulesSummary() {
  const s = useGame((x) => x.settings)
  const lines = s.lines.length
  return tr(
    `${cityOf(s.city).name}, ${SIZE_NAMES[s.size]}, sone ${s.zoneRadius} m, ${lines} ${lines === 1 ? 'linje' : 'linjer'}${!s.playArea ? ', hele nettet' : s.areaAuto === false ? ', eget område' : ''}`,
    `${cityOf(s.city).name}, ${SIZE_NAMES[s.size]}, ${s.zoneRadius} m zone, ${lines} ${lines === 1 ? 'line' : 'lines'}${!s.playArea ? ', whole network' : s.areaAuto === false ? ', custom area' : ''}`,
  )
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
      <PresetEntry />
      <CityPicker locked={locked} />
      <Section title={tr('Spillområde', 'Play area')}>
        <p className="mb-2 text-sm">
          {!s.playArea
            ? tr(`Hele ${transit().whole}.`, `All of ${transit().whole}.`)
            : s.areaAuto !== false
              ? tr('Automatisk rundt stasjonene på linjene som er med.', 'Automatic around the stations on the lines in play.')
              : tr(`Eget område${asked ? '' : ` med ${result.stations.length} stasjoner`}.`, `Custom area${asked ? '' : ` with ${result.stations.length} stations`}.`)}
        </p>
        <Segmented
          label={tr('Spillområde', 'Play area')}
          disabled={locked}
          value={!s.playArea ? 'all' : s.areaAuto !== false ? 'auto' : 'own'}
          options={[
            { value: 'auto', label: tr('Automatisk', 'Automatic') },
            { value: 'own', label: s.playArea && s.areaAuto === false ? tr('Tegn på nytt', 'Redraw') : tr('Tegn selv', 'Draw') },
            { value: 'all', label: tr('Hele nettet', 'Whole network') },
          ]}
          onChange={(v) => {
            if (v === 'auto') set({ areaAuto: true, playArea: autoPlayArea(all.stations, s) })
            else if (v === 'all') set({ areaAuto: false, playArea: null })
            else setDraw([])
          }}
        />
        <p className="mt-1 text-sm text-muted">
          {tr(
            'Automatisk legger en ramme et par kilometer utenfor de ytterste stasjonene, og følger med når linjer eller sone endres.',
            'Automatic draws a frame a couple of kilometers outside the outermost stations, and follows along when lines or the zone change.',
          )}
        </p>
      </Section>

      {locked && (
        <p className="mb-5 rounded-lg border border-border bg-panel-2 p-3 text-sm">
          {tr('🔒 Spilloppsettet er låst mens runden pågår. Det er likt for alle i rommet.', '🔒 The setup is locked while the round is running. It is the same for everyone in the room.')}
        </p>
      )}
      <Section title={tr('Spillstørrelse', 'Game size')}>
        <Segmented
          label={tr('Spillstørrelse', 'Game size')}
          value={s.size}
          disabled={locked}
          options={(['S', 'M', 'L'] as const).map((k) => ({ value: k, label: SIZE_NAMES[k], detail: tr(`sone ${SIZE_RULES[k].zoneRadius} m`, `${SIZE_RULES[k].zoneRadius} m zone`) }))}
          onChange={(k) => {
            // Størrelsen bestemmer sone og gjemmetid etter reglene. Begge kan justeres etterpå.
            set({ size: k, zoneRadius: SIZE_RULES[k].zoneRadius, questions: null })
            setRound({ hidingMinutes: SIZE_RULES[k].hidingMinutes })
          }}
        />
        <p className="mt-1 text-xs text-muted">
          {tr(
            `Styrer hvilke spørsmål som er med: ${enabled.length} av ${ITEMS.length} i dette spillet. Bilder har ${s.size === 'L' ? 20 : 10} min svartid, resten 5 min. Valget setter også gjemmetiden til ${SIZE_RULES[s.size].hidingMinutes} min og sonen til ${SIZE_RULES[s.size].zoneRadius} m. Begge kan justeres etterpå.`,
            `Decides which questions are in play: ${enabled.length} of ${ITEMS.length} in this game. Photos have ${s.size === 'L' ? 20 : 10} min to answer, the rest 5 min. It also sets the hiding time to ${SIZE_RULES[s.size].hidingMinutes} min and the zone to ${SIZE_RULES[s.size].zoneRadius} m. Both can be adjusted afterwards.`,
          )}
        </p>
      </Section>

      {s.size === 'S' && (
        <Section title="Tentacles">
          <Switch
            on={tentacles}
            disabled={locked}
            title={tr('Ta med Tentacles i små spill', 'Include Tentacles in small games')}
            detail={tr(
              'Reglene har ikke Tentacles i Small. Slås det på, er spørsmålene på 2 km med: museer, biblioteker, kinoer og sykehus.',
              'The rules have no Tentacles in Small. Turned on, the 2 km questions are included: museums, libraries, movie theaters and hospitals.',
            )}
            onChange={() => set({ questions: tentacles ? enabled.filter((id) => !TENTACLES_2KM.includes(id)) : [...enabled, ...TENTACLES_2KM] })}
          />
        </Section>
      )}

      <Section title={tr('Tilpass spørsmål', 'Customize questions')}>
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium">
            {s.questions
              ? tr(`Egendefinert utvalg: ${enabled.length} av ${ITEMS.length}`, `Custom selection: ${enabled.length} of ${ITEMS.length}`)
              : tr(`Standard for ${SIZE_NAMES[s.size]}: ${enabled.length} av ${ITEMS.length}`, `Standard for ${SIZE_NAMES[s.size]}: ${enabled.length} of ${ITEMS.length}`)}
          </summary>
          <p className="my-2 text-xs text-muted">
            {tr(
              'Kryss av for spørsmålene som skal være med. Utvalget gjelder for alle i rommet. Bytter du spillstørrelse, går utvalget tilbake til standard.',
              'Tick the questions that should be in play. The selection applies to everyone in the room. Changing the game size resets it to the standard.',
            )}
          </p>
          {s.questions && (
            <button className="btn mb-2" disabled={locked} onClick={() => set({ questions: null })}>
              {tr(`Tilbake til standard for ${SIZE_NAMES[s.size]}`, `Back to the standard for ${SIZE_NAMES[s.size]}`)}
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
                    {c} <span className="font-normal text-muted">{tr(`${on} av ${all.length}`, `${on} of ${all.length}`)}</span>
                  </b>
                  <span className="flex gap-1.5">
                    <button type="button" className="btn min-h-9!" onClick={() => set({ questions: [...new Set([...enabled, ...ids])] })}>
                      {tr('Alle', 'All')}
                    </button>
                    <button type="button" className="btn min-h-9!" onClick={() => set({ questions: enabled.filter((id) => !ids.includes(id)) })}>
                      {tr('Ingen', 'None')}
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

      <Section title={`${tr('Sonestørrelse', 'Zone size')}: ${s.zoneRadius} m`}>
        <input
          className="w-full accent-accent"
          type="range"
          min={250}
          max={1000}
          step={50}
          value={s.zoneRadius}
          aria-label={tr('Sonestørrelse i meter', 'Zone size in meters')}
          disabled={locked}
          onChange={(e) => set({ zoneRadius: +e.target.value })}
        />
        <p className="text-xs text-muted">{tr('Hvor langt fra stasjonen hider kan gjemme seg.', 'How far from the station the hider may hide.')}</p>
      </Section>

      <Section title={city.modes.length > 1 ? tr('Kollektiv og linjer som er med', 'Transit and lines in play') : tr('Linjer som er med', 'Lines in play')}>
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
                    <span className="text-xs text-muted">{tr(`${mine.length} linjer`, `${mine.length} lines`)}</span>
                  </button>
                )
              })}
            </div>
            <p className="mb-3 text-xs text-muted">{tr('Slå av og på et helt transportmiddel. Under kan enkeltlinjer velges bort.', 'Turn a whole mode of transport on or off. Below, single lines can be left out.')}</p>
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
        {s.lines.length === 0 && <p className="text-xs text-bad">{tr('Ingen linjer er med. Velg minst én.', 'No lines are in play. Choose at least one.')}</p>}
      </Section>

      <SavePreset />
    </div>
  )
}

/** Innstillinger for appen på denne telefonen, og hvor dataene kommer fra. Endrer ikke spillet. */
export function AppInfo({ data }: { data: GeoData | null }) {
  const s = useGame((x) => x.settings)
  const set = useGame((x) => x.setSettings)
  return (
    <div>
      <Section title={tr('Utseende', 'Appearance')}>
        <Segmented label={tr('Tema', 'Theme')} value={s.theme} options={Object.entries(THEMES).map(([k, v]) => ({ value: k as Settings['theme'], label: v }))} onChange={(theme) => set({ theme })} />
      </Section>
      <Section title={tr('Språk', 'Language')}>
        <Segmented
          label={tr('Språk', 'Language')}
          guide="language"
          value={chosenLang() ?? 'auto'}
          options={[
            { value: 'auto', label: tr('Som telefonen', 'Like the phone') },
            { value: 'nb', label: 'Norsk' },
            { value: 'en', label: 'English' },
          ]}
          onChange={(v) => setLang(v === 'auto' ? null : v)}
        />
        <p className="mt-1 text-xs text-muted">
          {tr('Appen lastes på nytt når språket byttes. Regelboken er bare på norsk foreløpig.', 'The app reloads when the language changes. The rulebook is only in Norwegian for now.')}
        </p>
      </Section>
      <DataInfo data={data} />
      <Privacy />
    </div>
  )
}

/** Hva appen lagrer, hvor og hvor lenge. Kort, og bare det som faktisk skjer. */
function Privacy() {
  return (
    <Section title={tr('Personvern', 'Privacy')}>
      <details className="card">
        <summary className="cursor-pointer text-sm">{tr('Hva appen lagrer, og hvor lenge', 'What the app stores, and for how long')}</summary>
        <div className="mt-2 space-y-2 text-sm text-muted">
          {tr(
            [
              ['På telefonen:', 'spillet ditt, oppsett og tidligere runder ligger i nettleseren på denne telefonen, og forsvinner hvis du sletter nettstedsdata.'],
              ['I et rom:', 'spørsmål og svar, klokken, spillerne (navnene dere skriver inn), oppsettet og ferdige runder lagres i Firebase (Google) i Belgia, så alle i rommet ser det samme.'],
              [
                'Posisjoner:',
                'et spørsmål inneholder stedet seekeren sto da det ble stilt, fordi svaret regnes ut fra det. Ingen løpende posisjon sendes. Hiders posisjon brukes bare på hiders telefon til å regne ut svarene, og sendes ikke mens runden pågår. Når runden er over, legges stedene hider sto ved hvert svar til i rundens arkiv, så reprisen kan vise ruten.',
              ],
              ['Hvor lenge:', 'rom og tidligere runder blir liggende, så dere kan gå tilbake til dem senere. Vil du ha et rom slettet, si fra.'],
              ['Andre tjenester:', 'kartbildene hentes fra Kartverket og OpenStreetMap. Spørsmålene om høyde og gate sender ett punkt til Kartverket. Appen har ingen reklame, sporing eller informasjonskapsler.'],
            ],
            [
              ['On the phone:', 'your game, setups and earlier rounds are stored in the browser on this phone, and disappear if you clear site data.'],
              ['In a room:', 'questions and answers, the clock, the players (the names you enter), the setup and finished rounds are stored in Firebase (Google) in Belgium, so everyone in the room sees the same.'],
              [
                'Positions:',
                'a question contains where the seeker stood when it was asked, because the answer is worked out from it. No live position is sent. The hider\'s position is only used on the hider\'s phone to work out the answers, and is not sent while the round is running. When the round is over, the places the hider stood at each answer are added to the round\'s archive, so the replay can show the route.',
              ],
              ['How long:', 'rooms and earlier rounds are kept, so you can go back to them later. If you want a room deleted, let us know.'],
              ['Other services:', 'the map images come from Kartverket and OpenStreetMap. The questions about height and street send one point to Kartverket. The app has no ads, tracking or cookies.'],
            ],
          ).map(([head, body]) => (
            <p key={head}>
              <b className="font-sign text-text">{head}</b> {body}
            </p>
          ))}
          <p>
            {tr('Spørsmål eller ønske om sletting:', 'Questions or deletion requests:')}{' '}
            <a className="link text-sm!" href="https://github.com/kristiangoystdal/kristiangoystdal.github.io/issues" target="_blank" rel="noreferrer">
              {tr('meld fra på GitHub', 'tell us on GitHub')}
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
  if (!types.length) return <p className="text-sm text-muted">{data.loading ? tr('Stedene lastes…', 'Loading places…') : tr('Ingen steder i kartdataene.', 'No places in the map data.')}</p>
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
      const wait = data.loading ? tr('lastes', 'loading') : tr('mangler', 'missing')
      const areas = adminLevels().map((l) => `${l.label.toLowerCase()} ${levelCount(data, l.key) || wait}`)
      const places = POI_TYPES.filter((t) => data.poi[t.key]?.length).map((t) => `${t.label} ${data.poi[t.key]!.length}`)
      const coast = data.shapes.coast ? tr(`${data.islands.length} øyer`, `${data.islands.length} islands`) : tr(`kystlinje ${wait}`, `coastline ${wait}`)
      const water = data.shapes.water ? tr(`${data.shapes.water.length} vann og elver`, `${data.shapes.water.length} lakes and rivers`) : tr(`vann ${wait}`, `water ${wait}`)
      const riks = data.shapes.riks ? (data.shapes.riks.length ? tr('riksgrensen innenfor kartet', 'international border on the map') : tr('riksgrensen utenfor kartet', 'international border off the map')) : ''
      const modes = city.modes.map((m) => MODES[m].name.toLowerCase()).join(', ')
      setStats({
        summary: tr(
          `${data.stations.length} stasjoner, ${data.lines.features.length} linjer, ${places.length || 'ingen'} typer steder`,
          `${data.stations.length} stations, ${data.lines.features.length} lines, ${places.length || 'no'} kinds of places`,
        ),
        groups: [
          {
            title: tr('Kollektiv', 'Transit'),
            text: tr(`${data.stations.length} stasjoner og ${data.lines.features.length} linjer (${modes}) fra Entur.`, `${data.stations.length} stations and ${data.lines.features.length} lines (${modes}) from Entur.`),
          },
          { title: tr('Områder', 'Areas'), text: `${areas.join(', ')}.` },
          { title: tr('Kyst og vann', 'Coast and water'), text: `${[coast, water, riks].filter(Boolean).join(', ')}.` },
        ],
      })
    })
    return () => cancel(id)
  }, [data])
  return (
    <Section title={tr('Kartdata', 'Map data')}>
      <details className="card">
        <summary className="flex cursor-pointer items-center gap-2 text-sm">
          {!stats ? (
            <span className="flex items-center gap-2 text-muted" role="status">
              <Spinner className="size-3.5!" /> {data ? tr('Teller det som er i kartdataene…', 'Counting what is in the map data…') : tr('Laster kartdataene…', 'Loading the map data…')}
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
                <b className="font-sign">{tr('Steder', 'Places')}</b> <span className="text-muted">{tr('(ikonene på kartet når Steder er slått på)', '(the icons on the map when Places is on)')}</span>
                <div className="mt-1">
                  <PoiLegend data={data} />
                </div>
              </div>
            )}
            {data?.loading && <p className="text-xs text-muted">{tr('Resten av kartdataene lastes. Tallene oppdateres av seg selv.', 'The rest of the map data is loading. The numbers update by themselves.')}</p>}
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          {tr(
            'Grenser © Kartverket og Posten. Bydeler, steder, kystlinje, vann og riksgrense © OpenStreetMap-bidragsytere. Inspirert av taibeled/JetLagHideAndSeek.',
            'Borders © Kartverket and Posten. Boroughs, places, coastline, water and international border © OpenStreetMap contributors. Inspired by taibeled/JetLagHideAndSeek.',
          )}
        </p>
      </details>
    </Section>
  )
}
