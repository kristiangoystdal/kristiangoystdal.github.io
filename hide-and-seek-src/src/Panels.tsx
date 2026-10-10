import { useState } from 'react'
import { BASEMAPS, depRate } from './MapView'
import { AutoHint, useAutoAnswer } from './QuestionsView'
import { answerLabel, describe, place } from './form'
import { ADMIN_LEVELS, POI_TYPES, autoPlayArea, levelAreas, stationPos, type Result } from './geo'
import { MAX_CARDS, useGame, useUi, type Layer } from './store'
import type { Card, DayKey, GeoData, Settings } from './types'
import { PointInput, Section, useNow } from './ui'

const LAYERS: { key: Layer; label: string }[] = [
  { key: 'area', label: 'Mulig område' },
  { key: 'zones', label: 'Stasjonssoner' },
  { key: 'lines', label: 'Linjer' },
  { key: 'admin', label: 'Områdegrenser' },
  { key: 'poi', label: 'Steder' },
]

export function MapPanel({ data, result }: { data: GeoData; result: Result }) {
  const layers = useGame((s) => s.layers)
  const toggleLayer = useGame((s) => s.toggleLayer)
  const settings = useGame((s) => s.settings)
  const setSettings = useGame((s) => s.setSettings)
  const lineColor = Object.fromEntries(data.lines.features.map((f) => [f.properties.line, f.properties.color]))

  return (
    <div>
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
  const auto = useAutoAnswer(data)

  return (
    <div>
      <Section title="Rolle">
        <div className="flex gap-1.5">
          {(['seeker', 'hider'] as const).map((m) => (
            <button key={m} className={`btn flex-1 ${mode === m ? 'btn-primary' : ''}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'seeker' ? 'Seeker' : 'Hider'}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {mode === 'hider'
            ? 'Posisjonen din lagres bare på denne telefonen og blir ikke med når du deler spillet.'
            : 'Bytt til hider når det er du som gjemmer deg. Da regner appen ut svarene dine.'}
        </p>
      </Section>

      {mode === 'hider' && (
        <>
          <Section title="Hvor gjemmer du deg">
            <label className="mb-3 block">
              <span className="label">Stasjon</span>
              <select
                className="field"
                value={hider.stationId ?? ''}
                onChange={(e) => {
                  const s = data.stations.find((x) => x.id === e.target.value)
                  setHider(s ? { stationId: s.id, pos: stationPos(s) } : { stationId: null, pos: null })
                }}
              >
                <option value="">Velg stasjon…</option>
                {data.stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {hider.stationId && (
              <PointInput label="Nøyaktig gjemmested" value={hider.pos} onChange={(pos) => setHider({ ...hider, pos })} stations={data.stations} />
            )}
            {hider.pos && hider.stationId && !place(hider.pos, data.stations).includes(data.stations.find((s) => s.id === hider.stationId)!.name) && (
              <p className="text-xs text-bad">Gjemmestedet ligger nærmere en annen stasjon enn den du har valgt.</p>
            )}
          </Section>

          <Section title="Svarene dine">
            {!hider.pos && <p className="text-sm text-muted">Velg stasjon for å få svarene regnet ut.</p>}
            {hider.pos && questions.length === 0 && (
              <p className="text-sm text-muted">Legg inn spørsmålene seekerne stiller under Spørsmål, eller importer loggen deres.</p>
            )}
            <ul className="flex flex-col gap-2">
              {hider.pos &&
                questions.map((q) => {
                  const a = auto(q)
                  const wrong = a && q.answer !== null && q.answer !== a.answer
                  return (
                    <li key={q.id} className="card">
                      <p className="text-sm">{describe(q, data)}</p>
                      {a ? <AutoHint q={q} auto={a} /> : <p className="mt-2 text-xs text-muted">Kan ikke regnes ut. Svar selv.</p>}
                      {wrong && <p className="mt-1 text-xs text-bad">I loggen står det «{answerLabel(q, q.answer!)}».</p>}
                      {a && q.answer !== a.answer && (
                        <button
                          className="btn mt-2 min-h-9!"
                          onClick={() => {
                            const { id, time: _t, answer: _a, ...body } = q
                            saveQuestion(body as never, a.answer, id)
                          }}
                        >
                          Før inn svaret
                        </button>
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
const CARD_TYPES: Record<Card['type'], string> = { curse: 'Curse', bonus: 'Tidsbonus', powerup: 'Powerup' }

export function RoundPanel() {
  const now = useNow()
  const g = useGame()
  const [player, setPlayer] = useState('')
  const [card, setCard] = useState<Omit<Card, 'id'>>({ type: 'bonus', name: '', minutes: 5 })

  const { seekFrom } = g.round
  const hiding = seekFrom !== null && now < seekFrom
  const bonus = g.cards.filter((c) => c.type === 'bonus').reduce((sum, c) => sum + c.minutes, 0)
  const totals = new Map<string, number>()
  for (const r of g.results) totals.set(r.hider, (totals.get(r.hider) ?? 0) + r.seconds + r.bonusMinutes * 60)
  for (const p of g.players) if (!totals.has(p)) totals.set(p, 0)

  return (
    <div>
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
            </>
          ) : (
            <>
              <div className="text-xs font-semibold tracking-wide text-muted uppercase">{hiding ? 'Gjemmetid igjen' : 'Tid som hider'}</div>
              <div className={`my-1 text-5xl font-bold tabular-nums ${hiding ? '' : 'text-accent'}`}>{clock(Math.abs(now - seekFrom) / 1000)}</div>
              <div className="mb-3 text-xs text-muted">
                {g.round.hider || 'Hider'}
                {bonus > 0 && ` · +${bonus} min i tidsbonus på hånden`}
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

      <Section title={`Kort på hånden (${g.cards.length}/${MAX_CARDS})`}>
        <ul className="mb-2 flex flex-col gap-1.5">
          {g.cards.map((c) => (
            <li key={c.id} className="card flex items-center justify-between gap-2 py-2!">
              <span className="text-sm">
                <span className="text-xs text-muted">{CARD_TYPES[c.type]}</span>
                <br />
                {c.type === 'bonus' ? `+${c.minutes} min` : c.name || CARD_TYPES[c.type]}
              </span>
              <button className="btn min-h-9!" onClick={() => g.removeCard(c.id)}>
                {c.type === 'bonus' ? 'Kast' : 'Spill / kast'}
              </button>
            </li>
          ))}
        </ul>
        {g.cards.length >= MAX_CARDS ? (
          <p className="text-xs text-bad">Hånden er full. Spill eller kast et kort før du trekker nytt.</p>
        ) : (
          <div className="flex gap-1.5">
            <select className="field w-auto!" value={card.type} aria-label="Korttype" onChange={(e) => setCard({ ...card, type: e.target.value as Card['type'] })}>
              {Object.entries(CARD_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {card.type === 'bonus' ? (
              <input className="field" type="number" min={1} value={card.minutes} aria-label="Minutter" onChange={(e) => setCard({ ...card, minutes: Math.max(1, +e.target.value) })} />
            ) : (
              <input className="field" value={card.name} aria-label="Kortnavn" placeholder="Navn på kortet" onChange={(e) => setCard({ ...card, name: e.target.value })} />
            )}
            <button
              className="btn"
              onClick={() => {
                g.addCard(card)
                setCard({ ...card, name: '' })
              }}
            >
              Legg til
            </button>
          </div>
        )}
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
            <ul className="divide-y divide-border text-sm">
              {g.results.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between py-1.5">
                  <span>
                    {i + 1}. {r.hider}
                  </span>
                  <span className="flex items-center gap-2 text-muted tabular-nums">
                    {clock(r.seconds)}
                    {r.bonusMinutes > 0 && ` + ${r.bonusMinutes} min`}
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

      <Section title="Nivå for «samme område»">
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
