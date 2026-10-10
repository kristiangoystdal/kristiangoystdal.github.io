import { useState } from 'react'
import { BASEMAPS, depRate } from './MapView'
import { AutoHint, Countdown, DrawNote, useAutoAnswer } from './QuestionsView'
import { CATEGORIES, DRAWS, ITEMS, MAX_HAND, answerLabel, answerOptions, describe, itemOf } from './form'
import { ADMIN_LEVELS, POI_TYPES, autoAnswer, autoPlayArea, dist, levelAreas, nearestStation, stationPos, type Result } from './geo'
import { NotifyToggle } from './notify'
import { useGame, useUi, type Layer } from './store'
import { CODE_LENGTH, cleanCode, createRoom, joinRoom, leaveRoom, roomLink, useSync } from './sync'
import type { DayKey, GeoData, LngLat, Question, Settings } from './types'
import { PointInput, Section, locate, useNow } from './ui'

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
      <p className="mt-1 text-xs text-muted">Start når dere er fremme i sonen. Da er bare den sonen gyldig, og hider må stå stille.</p>
    </Section>
  )
}

export function MapPanel({ data, result }: { data: GeoData; result: Result }) {
  const layers = useGame((s) => s.layers)
  const toggleLayer = useGame((s) => s.toggleLayer)
  const settings = useGame((s) => s.settings)
  const setSettings = useGame((s) => s.setSettings)
  const hiderView = useGame((s) => s.mode === 'hider')
  const lineColor = Object.fromEntries(data.lines.features.map((f) => [f.properties.line, f.properties.color]))

  return (
    <div>
      {!hiderView && <EndgameControl result={result} />}
      <Section title="Kartlag">
        <div className="flex flex-wrap gap-1.5">
          {LAYERS.map((l) => (
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
      {hiderView ? (
        <p className="text-sm text-muted">Som hider ser du bare din egen sone på kartet. Hvilke stasjoner seekerne har igjen, vises ikke.</p>
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

export function HiderPanel({ data }: { data: GeoData }) {
  const mode = useGame((s) => s.mode)
  const setMode = useGame((s) => s.setMode)
  const hider = useGame((s) => s.hider)
  const setHider = useGame((s) => s.setHider)
  const questions = useGame((s) => s.questions)
  const saveQuestion = useGame((s) => s.saveQuestion)
  const zoneRadius = useGame((s) => s.settings.zoneRadius)
  const locked = useGame((s) => s.round.seekFrom !== null)
  const endgame = useGame((s) => !!s.round.endgame)
  const auto = useAutoAnswer(data)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  // Hiders stasjon er alltid den nærmeste, så den følger posisjonen.
  const place = (pos: LngLat) => setHider({ stationId: nearestStation(data.stations, pos).id, pos })
  const station = hider.pos && nearestStation(data.stations, hider.pos)
  const away = station && hider.pos ? dist(stationPos(station), hider.pos) : 0
  const answer = (q: Question, value: string) => {
    const { id, time: _t, answer: _a, ...body } = q
    saveQuestion(body as never, value, id)
  }

  /** Henter posisjonen på nytt og svarer ut fra der hider står akkurat nå. */
  const answerFromGps = async (q: Question) => {
    setBusy(q.id)
    setError('')
    try {
      const pos = await locate()
      place(pos)
      const a = autoAnswer(q, { pos, station: nearestStation(data.stations, pos) }, data)
      if (a) answer(q, a.answer)
      else setError('Dette spørsmålet kan ikke regnes ut. Svar selv under Spørsmål.')
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy('')
  }

  return (
    <div>
      <Section title="Rolle">
        <div className="flex gap-1.5">
          {(['seeker', 'hider'] as const).map((m) => (
            <button key={m} className={`btn flex-1 ${mode === m ? 'btn-primary' : ''}`} aria-pressed={mode === m} disabled={locked && mode !== m} onClick={() => setMode(m)}>
              {m === 'seeker' ? 'Seeker' : 'Hider'}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {locked
            ? 'Rollen er låst til runden er ferdig.'
            : mode === 'hider'
              ? 'Gjemmestedet ditt blir på denne telefonen. Seekerne ser det aldri. Rollen låses når runden starter.'
              : 'Velg hider før runden starter hvis det er du som gjemmer deg. Rollen låses når runden starter.'}
        </p>
        {mode === 'seeker' && (
          <p className="mt-2 text-sm">Som seeker stiller du spørsmål under Spørsmål. Hider svarer fra sin telefon, og svaret dukker opp i loggen din.</p>
        )}
      </Section>

      {mode === 'hider' && (
        <>
          <Section title="Hvor er du">
            <PointInput label="Posisjonen din" value={hider.pos} onChange={place} stations={data.stations} />
            {station && (
              <p className={`text-xs ${away > zoneRadius ? 'text-bad' : 'text-muted'}`}>
                Stasjonen din er {station.name}.{away > zoneRadius && ` Du er ${Math.round(away)} m unna, utenfor sonen på ${zoneRadius} m.`}
              </p>
            )}
          </Section>

          {endgame && (
            <p className="mb-5 rounded-lg border border-accent p-3 text-sm">
              <b>Endgame er startet.</b> Seekerne er i en sone. Er det din, må du stå stille der du er.
            </p>
          )}
          <Section title="Spørsmål til deg">
            {questions.length === 0 && <p className="text-sm text-muted">Ingen spørsmål ennå. De dukker opp her når seekerne stiller dem.</p>}
            {error && <p className="mb-2 text-xs text-bad">{error}</p>}
            <ul className="flex flex-col gap-2">
              {questions.map((q) => {
                const a = auto(q)
                return (
                  <li key={q.id} className="card">
                    <p className="mb-1 text-sm">{describe(q, data)}</p>
                    {itemOf(q.item)?.rules && <p className="mb-1 text-xs">Krav til bildet: {itemOf(q.item)!.rules}</p>}
                    <DrawNote q={q} log={questions} />
                    <Countdown q={q} />
                    {q.answer !== null && (
                      <p className="text-sm">
                        Du svarte: <b className="text-accent">{answerLabel(q, q.answer)}</b>
                      </p>
                    )}
                    {a && q.answer !== a.answer && <AutoHint q={q} auto={a} />}
                    {q.kind === 'photo' ? (
                      q.answer === null && (
                        <div className="mt-2">
                          <p className="mb-2 text-xs text-muted">Send bildet til seekerne på melding, og kvitter her.</p>
                          <button className="btn btn-primary" onClick={() => answer(q, 'Bilde sendt')}>
                            Bilde sendt
                          </button>
                        </div>
                      )
                    ) : q.kind === 'manual' ? (
                      <div className="mt-2">
                        <p className="mb-2 text-xs text-muted">Appen kan ikke regne ut dette. Svar selv:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {answerOptions(q, data).map((o) => (
                            <button key={o} className={`btn ${q.answer === o ? 'btn-primary' : ''}`} onClick={() => answer(q, o)}>
                              {answerLabel(q, o)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a && q.answer !== a.answer && (
                          <button className="btn btn-primary" onClick={() => answer(q, a.answer)}>
                            Svar: {answerLabel(q, a.answer)}
                          </button>
                        )}
                        <button className="btn" disabled={busy === q.id} onClick={() => answerFromGps(q)}>
                          {busy === q.id ? 'Henter posisjon…' : q.answer === null ? 'Svar med posisjonen min nå' : 'Svar på nytt med posisjonen min'}
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Section>

          <Section title="Regler for hider">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Du må være innenfor {zoneRadius} m fra stasjonen din når gjemmetiden er over.</li>
              <li>Avstander regnes i luftlinje fra der du faktisk står, ikke fra stasjonen.</li>
              <li>Står du nær en grense, varsler appen. Da bør du måle selv før du svarer.</li>
              <li>Fotospørsmål har ingen fasit i appen. Svaret loggføres som notat.</li>
            </ul>
          </Section>
        </>
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


export function RoundPanel() {
  const now = useNow()
  const g = useGame()
  const [player, setPlayer] = useState('')

  const { seekFrom } = g.round
  const hiding = seekFrom !== null && now < seekFrom
  const isHider = g.mode === 'hider'
  const totals = new Map<string, number>()
  for (const r of g.results) totals.set(r.hider, (totals.get(r.hider) ?? 0) + r.seconds + r.bonusMinutes * 60)
  for (const p of g.players) if (!totals.has(p)) totals.set(p, 0)

  return (
    <div>
      <RoomPanel />
      <Section title="Runde">
        <div className="card text-center">
          {seekFrom === null ? (
            <>
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
              <button className="btn btn-primary w-full" onClick={() => g.setRound({ seekFrom: Date.now() + g.round.hidingMinutes * 60000 })}>
                Start gjemmetid
              </button>
              <p className="mt-2 text-xs text-muted">
                Du er <b>{isHider ? 'hider' : 'seeker'}</b> på denne telefonen. Rollen kan ikke byttes etter start.
              </p>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold tracking-wide text-muted uppercase">{hiding ? 'Gjemmetid igjen' : 'Tid som hider'}</div>
              <div className={`my-1 text-5xl font-bold tabular-nums ${hiding ? '' : 'text-accent'}`}>{clock(Math.abs(now - seekFrom) / 1000)}</div>
              <div className="mb-3 text-xs text-muted">
                {g.round.hider || 'Hider'}
              </div>
              <div className="flex gap-2">
                {hiding ? (
                  <button className="btn flex-1" onClick={() => g.setRound({ seekFrom: Date.now() })}>
                    Start letingen nå
                  </button>
                ) : (
                  <button className="btn btn-primary flex-1" onClick={() => g.finishRound((Date.now() - seekFrom) / 1000)}>
                    Funnet!
                  </button>
                )}
                <button
                  className="btn"
                  onClick={() => {
                    if (confirm('Avbryte runden uten å lagre tiden?')) g.setRound({ seekFrom: null })
                  }}
                >
                  Avbryt
                </button>
              </div>
            </>
          )}
        </div>
      </Section>

      <Section title="Kort">
        <p className="mb-2 text-xs text-muted">
          Kortene er fysiske. For hvert spørsmål hider svarer på, trekker hider så mange kort og beholder noen av dem:
        </p>
        <ul className="divide-y divide-border text-sm">
          {CATEGORIES.map((c) => (
            <li key={c} className="flex justify-between py-1.5">
              <span>{c}</span>
              <span className="text-muted">
                trekk {DRAWS[c].draw}, behold {DRAWS[c].keep}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Maks {MAX_HAND} kort på hånden. Stilles akkurat samme spørsmål på nytt, trekker hider to ganger. Loggen viser hva som gjelder for hvert spørsmål. Hider har 5 min på å svare, og lengre på bilder.
        </p>
      </Section>

      <Section title="Poengtavle">
        <ul className="mb-2 divide-y divide-border text-sm">
          {[...totals].sort((a, b) => b[1] - a[1]).map(([name, sec]) => (
            <li key={name} className="flex items-center justify-between py-1.5">
              <span>{name}</span>
              <span className="flex items-center gap-2">
                <b className="tabular-nums">{clock(sec)}</b>
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
        {g.results.length > 0 && (
          <>
            <h3 className="label">Runder</h3>
            <p className="mb-1 text-xs text-muted">Legg inn tidsbonusen fra hiders kort når runden er over.</p>
            <ul className="divide-y divide-border text-sm">
              {g.results.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between py-1.5">
                  <span>
                    {i + 1}. {r.hider}
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

const DAYS: Record<DayKey, string> = { wk: 'Hverdag', sa: 'Lørdag', su: 'Søndag' }
const THEMES: Record<Settings['theme'], string> = { auto: 'Følg systemet', light: 'Lys', dark: 'Mørk' }

export function SettingsPanel({ data, result }: { data: GeoData; result: Result }) {
  const s = useGame((x) => x.settings)
  const set = useGame((x) => x.setSettings)
  const asked = useGame((x) => x.questions.length)
  const setDraw = useUi((x) => x.setDraw)
  const hours = [...Array(25).keys()]

  return (
    <div>
      <Section title="Spillområde">
        <p className="mb-2 text-sm">
          {s.playArea ? `Egendefinert område${asked ? '' : ` med ${result.stations.length} stasjoner`}.` : 'Hele T-banenettet.'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button className="btn btn-primary" onClick={() => set({ playArea: autoPlayArea(data.stations, s) })}>
            Auto fra stasjonene
          </button>
          <button className="btn" onClick={() => setDraw([])}>
            {s.playArea ? 'Tegn på nytt' : 'Tegn område på kartet'}
          </button>
          {s.playArea && (
            <button className="btn" onClick={() => set({ playArea: null })}>
              Bruk hele nettet
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          «Auto» legger en ramme rundt sonene til alle stasjoner på linjene som er med. Trykk på nytt hvis du endrer linjer eller sonestørrelse. Stasjoner der hele sonen ligger utenfor området er utelukket fra start, og området følger med når du deler spillet.
        </p>
      </Section>

      <Section title="Spillstørrelse">
        <div className="flex gap-1.5">
          {(['S', 'M', 'L'] as const).map((k) => (
            <button key={k} className={`btn flex-1 ${s.size === k ? 'btn-on' : ''}`} aria-pressed={s.size === k} onClick={() => set({ size: k })}>
              {{ S: 'Small', M: 'Medium', L: 'Large' }[k]}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          Styrer hvilke spørsmål som er med: {ITEMS.filter((i) => i.sizes.includes(s.size)).length} av {ITEMS.length} i dette spillet. Bilder har {s.size === 'L' ? 20 : 10} min svartid, resten 5 min.
        </p>
      </Section>

      <Section title={`Sonestørrelse: ${s.zoneRadius} m`}>
        <input className="w-full accent-accent" type="range" min={250} max={1000} step={50} value={s.zoneRadius} aria-label="Sonestørrelse i meter" onChange={(e) => set({ zoneRadius: +e.target.value })} />
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
                title={l.name}
                onClick={() => set({ lines: on ? s.lines.filter((x) => x !== l.line) : [...s.lines, l.line].sort() })}
              >
                {l.line}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Avganger">
        <div className="grid grid-cols-3 gap-1.5">
          <select className="field" value={s.day} aria-label="Dag" onChange={(e) => set({ day: e.target.value as DayKey })}>
            {Object.entries(DAYS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select className="field" value={s.hourFrom} aria-label="Fra klokken" onChange={(e) => set({ hourFrom: +e.target.value, hourTo: Math.max(s.hourTo, +e.target.value + 1) })}>
            {hours.slice(0, 24).map((h) => (
              <option key={h} value={h}>
                fra {String(h).padStart(2, '0')}
              </option>
            ))}
          </select>
          <select className="field" value={s.hourTo} aria-label="Til klokken" onChange={(e) => set({ hourTo: +e.target.value })}>
            {hours.slice(s.hourFrom + 1).map((h) => (
              <option key={h} value={h}>
                til {String(h).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-muted">Styrer avganger per time i stasjonslisten og på kartet.</p>
      </Section>

      <Section title="Områdegrenser på kartet">
        <select className="field" value={s.adminLevel} onChange={(e) => set({ adminLevel: e.target.value as Settings['adminLevel'] })}>
          {ADMIN_LEVELS.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </select>
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
            <li key={t.key}>{t.label}: {data.poi[t.key]?.length || 'mangler'}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Grenser © Kartverket og Posten. Bydeler og steder © OpenStreetMap-bidragsytere. Inspirert av taibeled/JetLagHideAndSeek.</p>
      </Section>
    </div>
  )
}
