import { useEffect, useState } from 'react'
import { BASEMAPS, depRate } from './MapView'
import { PLANNING_MINUTES, hiderSeconds } from './clock'
import { CATEGORIES, ITEMS, SIZE_RULES, enabledIds } from './form'
import { ADMIN_LEVELS, POI_TYPES, autoPlayArea, dist, hiderStation, levelAreas, stationPos, stationsInReach, type Result } from './geo'
import { NotifyToggle } from './notify'
import { allPresets, applyPreset, deletePreset, loadPresets, presetId, savePreset, usePresets } from './presets'
import { useGame, useUi, type Layer } from './store'
import { CODE_LENGTH, cleanCode, createRoom, joinRoom, leaveRoom, roomLink, useSync } from './sync'
import type { DayKey, GeoData, LngLat, RoundResult, Settings } from './types'
import { PAUSE_TEXT, PointInput, Section, useGameNow, useNow } from './ui'

const LAYERS: { key: Layer; label: string }[] = [
  { key: 'area', label: 'Mulig område' },
  { key: 'zones', label: 'Stasjonssoner' },
  { key: 'lines', label: 'Linjer' },
  { key: 'admin', label: 'Områdegrenser' },
  { key: 'poi', label: 'Steder' },
]

/** Seekerne starter endgame når de er fremme i sonen de tror hider er i. */
function EndgameControl({ result }: { result: Result }) {
  const endgame = useGame((s) => s.round.endgame)
  const setRound = useGame((s) => s.setRound)
  const [picked, setPicked] = useState('')
  const stationId = result.stations.some((s) => s.id === picked) ? picked : (result.stations[0]?.id ?? '')

  if (endgame) {
    return (
      <Section title="Endgame">
        <p className="mb-2 text-sm">
          Bare sonen ved <b>{result.stations[0]?.name ?? 'stasjonen'}</b> er gyldig. Hider står stille, så svar på nye spørsmål skjærer sonen nøyaktig.
        </p>
        {!result.area && <p className="mb-2 text-sm text-bad">Svarene utelukker hele sonen. Hider er trolig ved en annen stasjon.</p>}
        <button className="btn" onClick={() => setRound({ endgame: null })}>
          Avslutt endgame
        </button>
      </Section>
    )
  }
  return (
    <Section title="Endgame">
      <div className="flex gap-1.5">
        <select className="field" value={stationId} aria-label="Stasjon for endgame" onChange={(e) => setPicked(e.target.value)}>
          {result.stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" disabled={!stationId} onClick={() => setRound({ endgame: { stationId, time: Date.now() } })}>
          Start endgame
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">Start når dere er fremme ved stasjonen. Først da vises sonen på kartet, og hider må stå stille.</p>
    </Section>
  )
}

export function MapPanel({ data, result }: { data: GeoData; result: Result }) {
  const layers = useGame((s) => s.layers)
  const toggleLayer = useGame((s) => s.toggleLayer)
  const settings = useGame((s) => s.settings)
  const setSettings = useGame((s) => s.setSettings)
  const hiderView = useGame((s) => s.mode === 'hider')
  const endgame = useGame((s) => !!s.round.endgame)
  const lineColor = Object.fromEntries(data.lines.features.map((f) => [f.properties.line, f.properties.color]))
  const hours = [...Array(25).keys()]

  return (
    <div>
      {hiderView ? <HiderPosition data={data} /> : <EndgameControl result={result} />}
      <Section title="Kartlag">
        <div className="flex flex-wrap gap-1.5">
          {LAYERS.filter((l) => l.key !== 'zones' || (!hiderView && endgame)).map((l) => (
            <button key={l.key} className={`btn ${layers[l.key] ? 'btn-on' : ''}`} aria-pressed={layers[l.key]} onClick={() => toggleLayer(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Bakgrunnskart">
        <div className="flex gap-1.5">
          {(Object.keys(BASEMAPS) as (keyof typeof BASEMAPS)[]).map((k) => (
            <button key={k} className={`btn flex-1 ${settings.basemap === k ? 'btn-on' : ''}`} aria-pressed={settings.basemap === k} onClick={() => setSettings({ basemap: k })}>
              {BASEMAPS[k].label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Avganger">
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
        <p className="mt-1 text-xs text-muted">Styrer avganger per time i stasjonslisten og på kartet.</p>
      </Section>

      <Section title="Områdegrenser på kartet">
        <select className="field" value={settings.adminLevel} onChange={(e) => setSettings({ adminLevel: e.target.value as Settings['adminLevel'] })}>
          {ADMIN_LEVELS.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </select>
      </Section>

      {hiderView ? (
        <p className="text-sm text-muted">Som hider ser du alltid din egen sone på kartet, og bare den. Hvilke stasjoner seekerne har igjen, vises ikke.</p>
      ) : (
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
      )}
    </div>
  )
}

/** Hider setter posisjonen sin her, og velger stasjon når flere har hider i sonen. Blir på telefonen. */
function HiderPosition({ data }: { data: GeoData }) {
  const hider = useGame((s) => s.hider)
  const setHider = useGame((s) => s.setHider)
  const zoneRadius = useGame((s) => s.settings.zoneRadius)
  const gps = useGame((s) => s.hiderGps)
  const setGps = useGame((s) => s.setHiderGps)

  // Hider velger selv blant stasjonene som har hider i sonen sin. Uten et valg gjelder den nærmeste.
  const place = (pos: LngLat) => setHider({ stationId: hiderStation(data.stations, pos, zoneRadius, hider.stationId).id, pos })
  const station = hider.pos && hiderStation(data.stations, hider.pos, zoneRadius, hider.stationId)
  const reach = hider.pos ? stationsInReach(data.stations, hider.pos, zoneRadius) : []
  const away = station && hider.pos ? dist(stationPos(station), hider.pos) : 0
  return (
    <Section title="Hvor er du">
      <button className={`btn mb-3 w-full ${gps ? 'btn-on' : ''}`} aria-pressed={gps} onClick={() => setGps(!gps)}>
        {gps ? '📍 Følger GPS automatisk' : '📍 Følg GPS automatisk'}
      </button>
      <PointInput
        label="Posisjonen din"
        value={hider.pos}
        // Setter hider posisjonen selv, skal ikke GPS flytte den igjen.
        onChange={(p) => {
          setGps(false)
          place(p)
        }}
        stations={data.stations}
      />
      {station && (
        <p className={`text-xs ${away > zoneRadius ? 'text-bad' : 'text-muted'}`}>
          Stasjonen din er {station.name}.{away > zoneRadius && ` Du er ${Math.round(away)} m unna, utenfor sonen på ${zoneRadius} m.`}
        </p>
      )}
      {hider.pos && reach.length > 1 && (
        <label className="mt-3 block">
          <span className="label">Velg stasjonen som er din</span>
          <select className="field" value={station?.id ?? ''} onChange={(e) => setHider({ stationId: e.target.value, pos: hider.pos })}>
            {reach.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({Math.round(dist(stationPos(s), hider.pos!))} m)
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">Du står i sonen til flere stasjoner. Spørsmål om stasjonen din svares ut fra den du velger.</span>
        </label>
      )}
      <p className="mt-2 text-xs text-muted">Seekerne ser aldri posisjonen din. Sonen din vises alltid på kartet.</p>
    </Section>
  )
}

/** Hvem telefonen spiller som. Velges før runden og er låst mens den pågår. */
function RolePanel() {
  const mode = useGame((s) => s.mode)
  const setMode = useGame((s) => s.setMode)
  const zoneRadius = useGame((s) => s.settings.zoneRadius)
  const locked = useGame((s) => s.round.seekFrom !== null)
  return (
    <Section title="Rolle">
      <div className="flex gap-1.5">
        {(['seeker', 'hider'] as const).map((m) => (
          <button key={m} className={`btn flex-1 ${mode === m ? 'btn-primary' : ''}`} aria-pressed={mode === m} disabled={locked && mode !== m} onClick={() => setMode(m)}>
            {m === 'seeker' ? '🔍 Seeker' : '🙈 Hider'}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        {locked
          ? 'Rollen er låst til runden er ferdig.'
          : mode === 'hider'
            ? 'Du gjemmer deg. Sett posisjonen din under Kart, og svar på spørsmålene under Spørsmål. Rollen låses når runden starter.'
            : 'Du leter. Still spørsmål under Spørsmål, så dukker hiders svar opp i loggen. Rollen låses når runden starter.'}
      </p>
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
    </Section>
  )
}

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  return `${h ? `${h}:` : ''}${String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}`
}
const STATUS = { off: '', connecting: 'Kobler til…', online: 'Tilkoblet', offline: 'Frakoblet. Endringer sendes når nettet er tilbake.' }

/** Sanntidsrom: alle med samme kode ser samme logg, klokke og poengtavle. */
function RoomPanel() {
  const { room, status, error } = useSync()
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const hasGame = useGame((s) => s.questions.length > 0)

  const join = () => {
    if (hasGame && !confirm('Spørsmålene på denne telefonen erstattes av rommets. Fortsette?')) return
    void joinRoom(code)
  }

  return (
    <Section title="Rom">
      <div className="card">
        {room ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-3xl font-bold tracking-[0.2em]">{room}</span>
              <span className={`text-xs ${status === 'online' ? 'text-ok' : 'text-muted'}`} role="status">
                {status === 'online' && '● '}
                {STATUS[status]}
              </span>
            </div>
            <p className="my-2 text-xs text-muted">
              Del koden med de andre. Logg, spillområde, klokke og poengtavle er felles. Hiders gjemmested deles aldri.
            </p>
            <NotifyToggle />
            <div className="flex flex-wrap gap-1.5">
              <button
                className="btn"
                onClick={async () => {
                  await navigator.clipboard?.writeText(roomLink(room)).catch(() => {})
                  setCopied(true)
                }}
              >
                {copied ? 'Lenke kopiert' : 'Kopier lenke'}
              </button>
              <button className="btn" onClick={leaveRoom}>
                Forlat rommet
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 text-sm">Spill sammen i sanntid på flere telefoner.</p>
            <button className="btn btn-primary mb-2 w-full" onClick={() => void createRoom()}>
              Lag rom med dette spillet
            </button>
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                join()
              }}
            >
              <input
                className="field font-mono tracking-widest uppercase"
                value={code}
                onChange={(e) => setCode(cleanCode(e.target.value))}
                placeholder="Romkode"
                aria-label="Romkode"
                autoCapitalize="characters"
                autoComplete="off"
              />
              <button className="btn" disabled={code.length !== CODE_LENGTH}>
                Bli med
              </button>
            </form>
          </>
        )}
        {error && <p className="mt-2 text-xs text-bad">{error}</p>}
      </div>
    </Section>
  )
}


const total = (r: RoundResult) => r.seconds + r.bonusMinutes * 60

/** Seeker slår på posisjonsdeling ved rundestart. Hider ser bare hvor mange som deler. */
function SharePanel() {
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
          <button type="button" role="switch" aria-checked={on} className="card flex w-full cursor-pointer items-center justify-between gap-3 text-left" onClick={() => setSharePos(!on)}>
            <span className="text-sm">
              <b className="block">Del posisjonen min med hider</b>
              <span className={`text-xs ${on && room ? 'text-ok' : 'text-muted'}`}>{!on ? 'Av. Hider ser ikke hvor du er.' : room ? 'På. Hider ser deg på kartet.' : 'På, men du er ikke i et rom ennå.'}</span>
            </span>
            <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-border'}`} aria-hidden>
              <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
            </span>
          </button>
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

/** Alt som gjelder selve spillet: rom, rolle, runde og poeng. */
export function GamePanel() {
  const wall = useNow()
  const now = useGameNow()
  const g = useGame()
  const [player, setPlayer] = useState('')

  const { seekFrom, pause } = g.round
  const hiding = seekFrom !== null && now < seekFrom
  const isHider = g.mode === 'hider'
  const size = g.settings.size
  const planLeft = ((g.round.planUntil ?? 0) - wall) / 1000

  // Bare den beste runden til hver spiller teller.
  const best = new Map<string, RoundResult>()
  for (const r of g.results) if (!best.has(r.hider) || total(r) > total(best.get(r.hider)!)) best.set(r.hider, r)
  const names = [...new Set([...g.players, ...best.keys()])].sort((a, b) => (best.has(b) ? total(best.get(b)!) : -1) - (best.has(a) ? total(best.get(a)!) : -1))
  const rounds = (name: string) => g.results.filter((r) => r.hider === name).length

  return (
    <div>
      <RoomPanel />
      <RolePanel />
      <Section title="Runde">
        <div className="card text-center">
          {seekFrom === null ? (
            <>
              {planLeft > 0 && (
                <div className="mb-3 rounded-lg bg-panel-2 p-2">
                  <div className="text-xs font-semibold tracking-wide text-muted uppercase">Planleggingstid for neste hider</div>
                  <div className="text-3xl font-bold tabular-nums">{clock(planLeft)}</div>
                  <p className="text-xs text-muted">Opptil {PLANNING_MINUTES} minutter. Neste runde starter fra forrige hiders gjemmested.</p>
                </div>
              )}
              <div className="mb-3 grid grid-cols-2 gap-2 text-left">
                <label>
                  <span className="label">Hider</span>
                  <input className="field" list="players" value={g.round.hider} onChange={(e) => g.setRound({ hider: e.target.value })} placeholder="Navn" />
                  <datalist id="players">
                    {g.players.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </label>
                <label>
                  <span className="label">Gjemmetid (min)</span>
                  <input
                    className="field"
                    type="number"
                    min={1}
                    value={g.round.hidingMinutes}
                    onChange={(e) => g.setRound({ hidingMinutes: Math.max(1, +e.target.value) })}
                  />
                </label>
              </div>
              <button className="btn btn-primary w-full" onClick={g.startRound}>
                Start gjemmetid
              </button>
              <p className="mt-2 text-xs text-muted">
                Du er <b>{isHider ? 'hider' : 'seeker'}</b> på denne telefonen. Rollen kan ikke byttes etter start.
              </p>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold tracking-wide text-muted uppercase">{hiding ? 'Gjemmetid igjen' : 'Tid som hider'}</div>
              <div className={`my-1 text-5xl font-bold tabular-nums ${hiding ? '' : 'text-accent'}`}>
                {clock(hiding ? (seekFrom - now) / 1000 : hiderSeconds(g.round, g.questions, size, wall))}
              </div>
              <div className="mb-3 text-xs text-muted">{g.round.hider || 'Hider'}</div>
              {pause && (
                <p className="mb-3 rounded-lg border border-accent p-2 text-left text-sm">
                  <b className="block">{PAUSE_TEXT[pause.kind].title}</b>
                  <span className="text-xs text-muted">{PAUSE_TEXT[pause.kind].body}</span>
                </p>
              )}
              <div className="flex gap-2">
                {hiding ? (
                  <button className="btn flex-1" disabled={!!pause} onClick={() => g.setRound({ seekFrom: Date.now() })}>
                    Start letingen nå
                  </button>
                ) : (
                  <button className="btn btn-primary flex-1" disabled={!!pause} onClick={() => g.finishRound(hiderSeconds(g.round, g.questions, size, Date.now()))}>
                    Funnet!
                  </button>
                )}
                <button
                  className="btn"
                  onClick={() => {
                    if (confirm('Avbryte runden uten å lagre tiden?')) g.cancelRound()
                  }}
                >
                  Avbryt
                </button>
              </div>
              {!hiding && <p className="mt-2 text-xs text-muted">Hider er funnet når seekerne er innen ca. 1,5 m og har sett hider.</p>}
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                {pause ? (
                  <button className="btn btn-primary flex-1" onClick={g.resumeGame}>
                    Fortsett spillet
                  </button>
                ) : (
                  <>
                    <button className="btn flex-1" onClick={() => g.pauseGame('pause')}>
                      ⏸ Pause
                    </button>
                    <button
                      className="btn flex-1"
                      onClick={() => {
                        if (confirm('Starte en avtalt hvileperiode? Alle klokker står til spillet fortsetter. Reglene anbefaler minst 10 timer, og alle må tilbake til samme sted.')) g.pauseGame('rest')
                      }}
                    >
                      🌙 Hvileperiode
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </Section>

      <SharePanel />

      <Section title="Poengtavle">
        <p className="mb-1 text-xs text-muted">Den som holdt seg skjult lengst vinner. Bare den beste runden til hver spiller teller.</p>
        <ul className="mb-2 divide-y divide-border text-sm">
          {names.map((name) => (
            <li key={name} className="flex items-center justify-between py-1.5">
              <span>
                {name}
                {rounds(name) > 1 && <span className="ml-1 text-xs text-muted">beste av {rounds(name)}</span>}
              </span>
              <span className="flex items-center gap-2">
                <b className="tabular-nums">{best.has(name) ? clock(total(best.get(name)!)) : '–'}</b>
                {g.players.includes(name) && (
                  <button className="text-xs text-muted underline" onClick={() => g.removePlayer(name)}>
                    fjern
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        <form
          className="mb-3 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (player.trim()) g.addPlayer(player.trim())
            setPlayer('')
          }}
        >
          <input className="field" value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="Ny spiller" aria-label="Ny spiller" />
          <button className="btn">Legg til</button>
        </form>
        {g.players.length > 1 && (
          <div className="mb-3">
            <h3 className="label">Rekkefølge</h3>
            <p className="mb-2 text-sm">{g.players.join(' → ')}</p>
            <button className="btn" disabled={seekFrom !== null} onClick={g.shufflePlayers}>
              Trekk rekkefølge
            </button>
            <p className="mt-1 text-xs text-muted">Trekker tilfeldig hvem som gjemmer seg først, og rekkefølgen etter det.</p>
          </div>
        )}
        {g.results.length > 0 && (
          <>
            <h3 className="label">Runder</h3>
            <p className="mb-1 text-xs text-muted">Hider legger inn tidsbonusen når runden er over. ★ = spillerens beste runde.</p>
            <ul className="divide-y divide-border text-sm">
              {g.results.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between py-1.5">
                  <span className={best.get(r.hider) === r ? 'font-semibold' : ''}>
                    {i + 1}. {r.hider} {best.get(r.hider) === r && <span className="text-accent">★</span>}
                  </span>
                  <span className="flex items-center gap-2 text-muted tabular-nums">
                    {clock(r.seconds)} +
                    <input
                      className="field min-h-9! w-14! px-1.5! text-center"
                      type="number"
                      min={0}
                      value={r.bonusMinutes || ''}
                      placeholder="0"
                      aria-label={`Tidsbonus i minutter for runde ${i + 1}`}
                      onChange={(e) => g.setBonus(r.id, Math.max(0, +e.target.value || 0))}
                    />
                    min
                    <button className="text-xs underline" onClick={() => g.removeResult(r.id)}>
                      slett
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </div>
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
      {list.length === 0 && <p className="mb-2 text-sm text-muted">Ingen lagrede oppsett ennå. Sett opp spillet under, og lagre det her.</p>}
      <ul className="mb-2 flex flex-col gap-1.5">
        {list.map((p) => (
          <li key={p.id} className="card flex items-center justify-between gap-2 py-2!">
            <span className="min-w-0 text-sm">
              <b className="block truncate">{p.name}</b>
              <span className="text-xs text-muted">
                {SIZE_NAMES[p.setup.size]} · {p.setup.questions ? `${p.setup.questions.length} spørsmål` : 'standard spørsmål'} · {p.hidingMinutes} min · {p.shared ? 'delt med alle' : 'bare denne telefonen'}
              </span>
            </span>
            <span className="flex shrink-0 gap-1.5">
              <button className="btn btn-primary min-h-9!" disabled={locked} onClick={() => applyPreset(p)}>
                Bruk
              </button>
              <button
                className="btn min-h-9! text-bad"
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

export function SettingsPanel({ data, result }: { data: GeoData; result: Result }) {
  const s = useGame((x) => x.settings)
  const set = useGame((x) => x.setSettings)
  const setRound = useGame((x) => x.setRound)
  const asked = useGame((x) => x.questions.length)
  const setDraw = useUi((x) => x.setDraw)
  const locked = useGame((x) => x.round.seekFrom !== null)
  const enabled = enabledIds(s)
  const tentacles = TENTACLES_2KM.every((id) => enabled.includes(id))

  return (
    <div>
      <PresetPanel locked={locked} />
      <Section title="Spillområde">
        <p className="mb-2 text-sm">
          {s.playArea ? `Egendefinert område${asked ? '' : ` med ${result.stations.length} stasjoner`}.` : 'Hele T-banenettet.'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button className="btn btn-primary" disabled={locked} onClick={() => set({ playArea: autoPlayArea(data.stations, s) })}>
            Auto fra stasjonene
          </button>
          <button className="btn" disabled={locked} onClick={() => setDraw([])}>
            {s.playArea ? 'Tegn på nytt' : 'Tegn område på kartet'}
          </button>
          {s.playArea && (
            <button className="btn" disabled={locked} onClick={() => set({ playArea: null })}>
              Bruk hele nettet
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          «Auto» legger en ramme et par kilometer utenfor de ytterste stasjonene på linjene som er med. Trykk på nytt hvis du endrer linjer eller sonestørrelse. Stasjoner der hele sonen ligger utenfor området er utelukket fra start, og området følger med når du deler spillet.
        </p>
      </Section>

      {locked && (
        <p className="mb-5 rounded-lg border border-border bg-panel-2 p-3 text-sm">
          🔒 Spilloppsettet er låst mens runden pågår. Det er likt for alle i rommet.
        </p>
      )}
      <Section title="Spillstørrelse">
        <div className="flex gap-1.5">
          {(['S', 'M', 'L'] as const).map((k) => (
            <button
              key={k}
              className={`btn flex-1 ${s.size === k ? 'btn-on' : ''}`}
              aria-pressed={s.size === k}
              disabled={locked}
              onClick={() => {
                // Størrelsen bestemmer sone og gjemmetid etter reglene. Begge kan justeres etterpå.
                set({ size: k, zoneRadius: SIZE_RULES[k].zoneRadius, questions: null })
                setRound({ hidingMinutes: SIZE_RULES[k].hidingMinutes })
              }}
            >
              {SIZE_NAMES[k]}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          Styrer hvilke spørsmål som er med: {enabled.length} av {ITEMS.length} i dette spillet. Bilder har {s.size === 'L' ? 20 : 10} min svartid, resten 5 min. Valget setter også gjemmetiden til {SIZE_RULES[s.size].hidingMinutes} min og sonen til {SIZE_RULES[s.size].zoneRadius} m. Begge kan justeres etterpå.
        </p>
      </Section>

      {s.size === 'S' && (
        <Section title="Tentacles">
          <button
            type="button"
            role="switch"
            aria-checked={tentacles}
            disabled={locked}
            className="card flex w-full cursor-pointer items-center justify-between gap-3 text-left disabled:opacity-60"
            onClick={() => set({ questions: tentacles ? enabled.filter((id) => !TENTACLES_2KM.includes(id)) : [...enabled, ...TENTACLES_2KM] })}
          >
            <span className="text-sm">
              <b className="block">Ta med Tentacles i små spill</b>
              <span className="text-xs text-muted">Reglene har ikke Tentacles i Small. Slås det på, er spørsmålene på 2 km med: museer, biblioteker, kinoer og sykehus.</span>
            </span>
            <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${tentacles ? 'bg-accent' : 'bg-border'}`} aria-hidden>
              <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${tentacles ? 'translate-x-5' : ''}`} />
            </span>
          </button>
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

      <Section title="Linjer som er med">
        <div className="flex gap-1.5">
          {data.lines.features.map(({ properties: l }) => {
            const on = s.lines.includes(l.line)
            return (
              <button
                key={l.line}
                className={`btn w-11 ${on ? 'btn-on' : 'opacity-50'}`}
                style={{ borderBottom: `3px solid ${l.color}` }}
                aria-pressed={on}
                disabled={locked}
                title={l.name}
                onClick={() => set({ lines: on ? s.lines.filter((x) => x !== l.line) : [...s.lines, l.line].sort() })}
              >
                {l.line}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Utseende">
        <div className="flex gap-1.5">
          {Object.entries(THEMES).map(([k, v]) => (
            <button key={k} className={`btn flex-1 ${s.theme === k ? 'btn-on' : ''}`} aria-pressed={s.theme === k} onClick={() => set({ theme: k as Settings['theme'] })}>
              {v}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Data">
        <ul className="text-xs text-muted">
          <li>{data.stations.length} stasjoner og {data.lines.features.length} linjer fra Ruter GTFS</li>
          {ADMIN_LEVELS.map((l) => {
            return <li key={l.key}>{l.label}: {levelAreas(data, l.key).length || 'mangler'}</li>
          })}
          {POI_TYPES.map((t) => (
            <li key={t.key}>{t.icon} {t.label[0].toUpperCase() + t.label.slice(1)}: {data.poi[t.key]?.length ?? 'mangler'}</li>
          ))}
          <li>Kystlinje: {data.shapes.coast ? `${data.islands.length} øyer og fastlandet` : 'mangler'}</li>
          <li>Vann og elver: {data.shapes.water?.length ?? 'mangler'}</li>
          <li>Riksgrense: {data.shapes.riks ? (data.shapes.riks.length ? 'innenfor kartet' : 'utenfor kartet') : 'mangler'}</li>
        </ul>
        <p className="mt-2 text-xs text-muted">Grenser © Kartverket og Posten. Bydeler, steder, kystlinje, vann og riksgrense © OpenStreetMap-bidragsytere. Inspirert av taibeled/JetLagHideAndSeek.</p>
      </Section>
    </div>
  )
}
