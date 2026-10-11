import { useState } from 'react'
import { deadline } from './clock'
import {
  CATEGORIES,
  ITEMS,
  answerLabel,
  answerOptions,
  available,
  categoryOf,
  describe,
  fmtDist,
  formToQuestion,
  isUsed,
  itemOf,
  itemsFor,
  newForm,
  questionToForm,
  responseMinutes,
  switchItem,
  usedKeys,
  type Form,
} from './form'
import { ANSWER_CANT, ANSWER_NULL, METRO_LINES, autoAnswer, dist, hasData, hiderStation, nearestStation, shrinks, type AutoAnswer, type Result } from './geo'
import { exportGame, gameLink, parseGame, useGame, useUi } from './store'
import type { GeoData, LngLat, Question } from './types'
import { PAUSE_TEXT, PointInput, Section, locate, useGameNow } from './ui'

const UNSURE_M = 30
const time = (t: number) => new Date(t).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })

/** Hiders fasitsvar på et spørsmål, eller null når appen ikke er i hider-modus. */
export function useAutoAnswer(data: GeoData) {
  const mode = useGame((s) => s.mode)
  const hider = useGame((s) => s.hider)
  return (q: Question): AutoAnswer | null => {
    if (mode !== 'hider' || !hider.pos) return null
    const station = data.stations.find((s) => s.id === hider.stationId) ?? nearestStation(data.stations, hider.pos)
    return autoAnswer(q, { pos: hider.pos, station }, data)
  }
}

export function AutoHint({ q, auto }: { q: Question; auto: AutoAnswer }) {
  return (
    <p className="mt-2 rounded-lg bg-panel-2 p-2 text-sm">
      Ditt svar som hider: <b className="text-ok">{answerLabel(q, auto.answer)}</b>
      <span className="block text-xs text-muted">{auto.detail}</span>
      {auto.marginM !== undefined && auto.marginM < UNSURE_M && (
        <span className="block text-xs text-bad">Bare {Math.round(auto.marginM)} m fra motsatt svar. Mål opp selv før du svarer.</span>
      )}
    </p>
  )
}

/** Viser at hider har endret svaret, og hva det var før. */
function AnswerHistory({ q }: { q: Question }) {
  if (!q.history?.length) return null
  return (
    <p className="mt-1 text-xs text-bad">
      Svaret er endret. Tidligere: {q.history.map((h) => `${answerLabel(q, h.answer)} (til kl. ${time(h.at)})`).join(', ')}
    </p>
  )
}

/** Nedtelling for svartiden på et ubesvart spørsmål. */
export function Countdown({ q }: { q: Question }) {
  const now = useGameNow()
  const size = useGame((s) => s.settings.size)
  if (q.answer !== null) return null
  const left = Math.round((deadline(q, size) - now) / 1000)
  if (left <= 0) return <span className="text-xs font-semibold text-bad">Svartiden er ute. Hiders klokke står stille.</span>
  return (
    <span className={`text-xs tabular-nums ${left < 60 ? 'font-semibold text-bad' : 'text-muted'}`}>
      ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} igjen
    </span>
  )
}

/** Hvorfor et nytt spørsmål ikke kan stilles akkurat nå, eller null når det er lov. */
function useBlocked(exceptId?: string) {
  const pause = useGame((s) => s.round.pause)
  const open = useGame((s) => s.questions.some((q) => q.answer === null && q.id !== exceptId))
  if (pause) return `${PAUSE_TEXT[pause.kind].title}. Ingen spørsmål før spillet fortsetter.`
  if (open) return 'Bare ett spørsmål om gangen. Vent til det forrige er besvart.'
  return null
}

function QuestionForm({ data, form }: { data: GeoData; form: Form }) {
  const rules = useGame((s) => s.settings)
  const setDraft = useUi((s) => s.setDraft)
  const questions = useGame((s) => s.questions)
  const size = useGame((s) => s.settings.size)
  const saveQuestion = useGame((s) => s.saveQuestion)
  const auto = useAutoAnswer(data)
  const isHider = useGame((s) => s.mode === 'hider')
  const endgame = useGame((s) => !!s.round.endgame)
  const lines = useGame((s) => s.settings.lines)
  const waiting = useBlocked(form.id)
  const set = (patch: Partial<Form>) => setDraft({ ...form, answer: null, ...patch })

  const item = itemOf(form.item)!
  const items = itemsFor(item.category, rules)
  const groups = [...new Set(items.map((i) => i.group))]
  // Merker hvilke spørsmål som alt er stilt, så man ser hva som er igjen.
  const used = usedKeys(questions.filter((x) => x.id !== form.id))
  const q = formToQuestion(form)
  // Hider som legger inn spørsmål og svar samlet, er ikke bundet av køen.
  const blocked = !form.id && !(isHider && form.answer !== null) ? waiting : null
  const route = data.lines.features.find((f) => f.properties.line === form.line)?.properties.stations ?? []
  const stationName = (id?: string) => data.stations.find((x) => x.id === id)?.name ?? ''
  const special = [ANSWER_NULL, ...(form.kind === 'photo' && endgame ? [ANSWER_CANT] : [])]
  const options = q ? answerOptions(q, data) : []
  const missing = !hasData(form, data)
  const walked = form.pos && form.pos2 ? dist(form.pos, form.pos2) : 0

  // Kollektivlinje: neste stopp foreslås fra der seeker er, som stasjonen på linjen nærmest posisjonen.
  const nextStop = (line: string, pos: LngLat | null) => {
    const order = data.lines.features.find((f) => f.properties.line === line)?.properties.stations ?? []
    const near = pos && nearestStation(data.stations.filter((x) => order.includes(x.id)), pos)
    return near ? Math.max(0, order.indexOf(near.id)) : 0
  }
  const seeker = (
    <PointInput
      label="Seekers posisjon"
      value={form.pos}
      onChange={(pos) => set(form.kind === 'transit' ? { pos, next: nextStop(form.line, pos) } : { pos })}
      stations={data.stations}
    />
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const first = itemsFor(c, rules)[0]
          return (
            <button key={c} type="button" className={`btn ${c === item.category ? 'btn-on' : ''}`} disabled={!first} onClick={() => first && setDraft(switchItem(form, first))}>
              {c}
            </button>
          )
        })}
      </div>
      {itemsFor('Tentacles', rules).length === 0 && <p className="-mt-1 mb-3 text-xs text-muted">Tentacles er ikke med i dette spillet. Det kan slås på under Oppsett.</p>}

      <label className="mb-3 block">
        <span className="label">Spørsmål</span>
        <select className="field" value={item.id} onChange={(e) => setDraft(switchItem(form, itemOf(e.target.value)!))}>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {items
                .filter((i) => i.group === g)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {isUsed(used, i.id) ? '✓ ' : ''}
                    {i.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">✓ = stilt før.</span>
      </label>

      {form.kind === 'radar' && (
        <>
          {seeker}
          {item.id === 'r-choose' && (
            <label className="mb-3 block">
              <span className="label">Avstand i meter</span>
              <input className="field" type="number" min={50} step={50} value={form.radiusM} onChange={(e) => set({ radiusM: +e.target.value })} />
            </label>
          )}
        </>
      )}
      {form.kind === 'thermometer' && (
        <>
          <PointInput label="Startpunkt" value={form.pos} onChange={(pos) => set({ pos })} stations={data.stations} />
          <PointInput label="Sluttpunkt" value={form.pos2} onChange={(pos2) => set({ pos2 })} stations={data.stations} />
          {walked > 0 && walked < form.radiusM && (
            <p className="mb-3 text-xs text-bad">
              Du har bare flyttet deg {fmtDist(walked)}. Dette spørsmålet krever minst {fmtDist(form.radiusM)}.
            </p>
          )}
        </>
      )}
      {form.kind === 'transit' && (
        <>
          {seeker}
          <p className="mb-3 rounded-lg bg-panel-2 p-2 text-xs text-muted">Kan bare stilles mens dere er om bord og i bevegelse. Svaret er ja hvis T-banen dere sitter på stopper ved hiders stasjon på resten av turen.</p>
          <div className="mb-3">
            <span className="label">Linje</span>
            <div className="flex gap-1.5">
              {data.lines.features
                .filter((f) => lines.includes(f.properties.line))
                .map((f) => (
                  <button
                    key={f.properties.line}
                    type="button"
                    className={`btn w-11 ${form.line === f.properties.line ? 'btn-on' : ''}`}
                    style={{ borderBottom: `3px solid ${f.properties.color}` }}
                    onClick={() => set({ line: f.properties.line, next: nextStop(f.properties.line, form.pos) })}
                  >
                    {f.properties.line}
                  </button>
                ))}
            </div>
          </div>
          <div className="mb-3">
            <span className="label">Retning</span>
            <div className="flex gap-1.5">
              {([1, -1] as const).map((d) => (
                <button key={d} type="button" className={`btn flex-1 ${form.dir === d ? 'btn-on' : ''}`} onClick={() => set({ dir: d })}>
                  mot {stationName(d === 1 ? route.at(-1) : route[0])}
                </button>
              ))}
            </div>
          </div>
          <label className="mb-3 block">
            <span className="label">Neste stopp</span>
            <select className="field" value={form.next} onChange={(e) => set({ next: +e.target.value })}>
              {route.map((id, i) => (
                <option key={i} value={i}>
                  {stationName(id)}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {['admin', 'nearest', 'measure', 'namelen', 'border', 'tentacles', 'geodist', 'landmass', 'manual'].includes(form.kind) && seeker}
      {(form.kind === 'nearest' || form.kind === 'measure' || (form.kind === 'tentacles' && form.poiType !== METRO_LINES)) && (
        <p className="-mt-2 mb-3 text-xs text-muted">
          Stedene er hentet fra OpenStreetMap og kan avvike fra kartappen dere bruker. Er dere uenige om hva som teller, sender seekerne et skjermbilde til hider.
        </p>
      )}
      {form.kind === 'admin' && form.level === 'postsone' && (
        <p className="-mt-2 mb-3 text-xs text-muted">Postsonen er de tre første sifrene i postnummeret, f.eks. 036x for 0368.</p>
      )}
      {form.kind === 'manual' && (
        <p className="mb-3 rounded-lg bg-panel-2 p-2 text-xs text-muted">
          Appen har ikke data til å regne ut dette. Hider svarer selv, og svaret loggføres uten at kartet krymper.
        </p>
      )}
      {item.rules && (
        <p className="mb-3 rounded-lg bg-panel-2 p-2 text-sm">
          <b>Krav til bildet:</b> {item.rules}
        </p>
      )}

      {missing && <p className="mb-3 rounded-lg bg-panel-2 p-2 text-sm text-bad">Dataene for dette spørsmålet er ikke lastet inn.</p>}

      {q && !missing && (
        <div className="mb-3">
          <p className="mb-1 text-sm italic">«{describe(q, data)}»</p>
          <p className="mb-2 text-xs text-muted">Svartid: {responseMinutes(q, size)} min</p>
          {/* Bare hider svarer. Seeker stiller spørsmålet og venter på svaret. */}
          {isHider && <span className="label">Ditt svar</span>}
          {!isHider ? null : q.kind === 'photo' ? (
            <input className="field" value={form.answer ?? ''} onChange={(e) => setDraft({ ...form, answer: e.target.value || null })} placeholder="Notat om bildet, f.eks. «sendt»" />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {options.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`btn ${form.answer === a ? 'btn-primary' : ''}`}
                  onClick={() => setDraft({ ...form, answer: form.answer === a ? null : a })}
                >
                  {answerLabel(q, a)}
                </button>
              ))}
            </div>
          )}
          {isHider && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {special.map((a) => (
                <button key={a} type="button" className={`btn ${form.answer === a ? 'btn-primary' : ''}`} onClick={() => setDraft({ ...form, answer: form.answer === a ? null : a })}>
                  {answerLabel(q, a)}
                </button>
              ))}
            </div>
          )}
          {auto(q) && <AutoHint q={q} auto={auto(q)!} />}
        </div>
      )}
      {blocked && <p className="mb-3 rounded-lg bg-panel-2 p-2 text-sm text-bad">{blocked}</p>}

      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1"
          disabled={!q || missing || !!blocked}
          onClick={() => {
            const { id, time: _t, answer, ...body } = q!
            saveQuestion(body as never, answer, form.id)
            setDraft(null)
          }}
        >
          {form.id ? 'Lagre endring' : isHider && form.answer !== null ? 'Lagre med svar' : 'Still spørsmål'}
        </button>
        <button className="btn" onClick={() => setDraft(null)}>
          Avbryt
        </button>
      </div>
    </div>
  )
}

/** Hiders visning av spørsmålene: svar med posisjonen, eller for hånd der appen ikke kan regne. */
function HiderQuestions({ data }: { data: GeoData }) {
  const questions = useGame((s) => s.questions)
  const answerQuestion = useGame((s) => s.answerQuestion)
  const setHider = useGame((s) => s.setHider)
  const hasPos = useGame((s) => s.hider.pos !== null)
  const endgame = useGame((s) => !!s.round.endgame)
  const auto = useAutoAnswer(data)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const answer = (q: Question, value: string | null) => answerQuestion(q.id, value)

  /** Henter posisjonen på nytt og svarer ut fra der hider står akkurat nå. */
  const answerFromGps = async (q: Question) => {
    setBusy(q.id)
    setError('')
    try {
      const pos = await locate()
      // Stasjonen hider har valgt gjelder så lenge hider står i sonen dens.
      const { hider, settings } = useGame.getState()
      const station = hiderStation(data.stations, pos, settings.zoneRadius, hider.stationId)
      setHider({ stationId: station.id, pos })
      const a = autoAnswer(q, { pos, station }, data)
      if (a) answer(q, a.answer)
      else setError('Dette spørsmålet kan ikke regnes ut. Svar selv.')
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy('')
  }

  return (
    <>
      {!hasPos && <p className="mb-3 text-xs text-muted">Appen henter posisjonen din når du svarer. Du kan også sette den selv under Hider.</p>}
      {endgame && (
        <p className="mb-5 rounded-lg border border-accent p-3 text-sm">
          <b>Endgame er startet.</b> Seekerne er i en sone. Er det din, må du stå stille der du er.
          <span className="mt-1 block text-xs text-muted">
            Gjemmestedet må være innen ca. 3 m fra en vei eller sti, og offentlig tilgjengelig hele spilletiden. Står du et sted som ikke er lov, går du straks til nærmeste lovlige sted.
          </span>
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
                <Countdown q={q} />
                {q.answer !== null && (
                  <p className="text-sm">
                    Du svarte: <b className="text-accent">{answerLabel(q, q.answer)}</b>
                    {/* Trykket hider feil, kan svaret trekkes og gis på nytt. Seekerne ser at det er endret. */}
                    <button className="ml-2 text-xs text-muted underline" onClick={() => answer(q, null)}>
                      angre svaret
                    </button>
                  </p>
                )}
                <AnswerHistory q={q} />
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
                {q.answer === null && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button className="btn" onClick={() => answer(q, ANSWER_NULL)} title="Det spørsmålet handler om finnes ikke innenfor kartet">
                        Nullsvar
                      </button>
                      {q.kind === 'photo' && endgame && (
                        <button className="btn" onClick={() => answer(q, ANSWER_CANT)}>
                          Kan ikke svare
                        </button>
                      )}
                    </div>
                )}
              </li>
            )
          })}
        </ul>
      </Section>
    </>
  )
}

function Share() {
  const importGame = useGame((s) => s.importGame)
  const newGame = useGame((s) => s.newGame)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  const copy = async (what: 'link' | 'json') => {
    const game = exportGame(useGame.getState())
    const value = what === 'link' ? gameLink(game) : JSON.stringify(game)
    try {
      await navigator.clipboard.writeText(value)
      setMsg(what === 'link' ? 'Lenke kopiert' : 'JSON kopiert')
    } catch {
      setText(value)
      setMsg('Kunne ikke kopiere automatisk. Kopier teksten under.')
    }
  }
  const load = () => {
    try {
      const game = parseGame(text)
      importGame(game)
      setText('')
      setMsg(`Importerte ${game.questions.length} spørsmål`)
    } catch {
      setMsg('Dette er ikke et gyldig spill')
    }
  }

  return (
    <details className="card mt-4">
      <summary className="cursor-pointer text-sm font-medium">Del, importer eller start på nytt</summary>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button className="btn" onClick={() => copy('link')}>
          Kopier lenke
        </button>
        <button className="btn" onClick={() => copy('json')}>
          Kopier JSON
        </button>
      </div>
      <textarea className="field mt-2 h-20 py-2 font-mono text-xs!" value={text} onChange={(e) => setText(e.target.value)} placeholder="Lim inn JSON fra en annen spiller" />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button className="btn" onClick={load} disabled={!text.trim()}>
          Importer
        </button>
        <button
          className="btn text-bad"
          onClick={() => {
            if (confirm('Slette alle spørsmål og starte en ny runde? Poengtavlen beholdes.')) newGame()
          }}
        >
          Nytt spill
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </details>
  )
}

export default function QuestionsView({ data, result }: { data: GeoData; result: Result }) {
  const draft = useUi((s) => s.draft)
  const setDraft = useUi((s) => s.setDraft)
  const questions = useGame((s) => s.questions)
  const canUndo = useGame((s) => s.past.length > 0)
  const undo = useGame((s) => s.undo)
  const removeQuestion = useGame((s) => s.removeQuestion)
  const setNote = useGame((s) => s.setNote)
  const isHider = useGame((s) => s.mode === 'hider')
  const blocked = useBlocked()
  const rules = useGame((s) => s.settings)

  if (draft) {
    return (
      <Section title={draft.id ? 'Rediger spørsmål' : 'Nytt spørsmål'}>
        <QuestionForm data={data} form={draft} />
      </Section>
    )
  }

  // Nytt spørsmål starter der seeker sto sist.
  const last = questions.findLast((q) => 'pos' in q || 'center' in q || 'to' in q)
  const lastPos = !last ? null : 'pos' in last ? last.pos : 'center' in last ? last.center : 'to' in last ? last.to : null
  const total = data.stations.length
  // Radar er vanligst å åpne med. Er det tatt ut av spillet, brukes det første som er med.
  const first = itemsFor('Radar', rules)[0] ?? ITEMS.find((i) => available(i, rules))

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button className={`btn flex-1 ${isHider ? '' : 'btn-primary'}`} disabled={!first || (!isHider && !!blocked)} onClick={() => first && setDraft(newForm(first, lastPos ?? null))}>
          {isHider ? '+ Legg inn spørsmål selv' : '+ Nytt spørsmål'}
        </button>
        <button className="btn" onClick={undo} disabled={!canUndo}>
          Angre
        </button>
      </div>
      {!isHider && blocked && <p className="-mt-2 mb-4 text-xs text-muted">{blocked}</p>}
      {isHider ? (
        <HiderQuestions data={data} />
      ) : (
        <Section title={`Spørsmålslogg (${questions.length})`}>
          {questions.length === 0 && <p className="text-sm text-muted">Ingen spørsmål ennå. Seeker stiller spørsmål, hider svarer, og hvert svar krymper området hider kan være i.</p>}
          <ol className="flex flex-col gap-2">
            {questions.map((q, i) => {
              const before = i === 0 ? total : result.steps[i - 1].count
              const after = result.steps[i]?.count ?? before
              return (
                <li key={q.id} className="card">
                  <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
                    <span>
                      {i + 1}. {categoryOf(q)} · {time(q.time)}
                    </span>
                    <span className="tabular-nums">{isHider || !shrinks(q) || q.kind === 'photo' ? '' : `${before} → ${after} stasjoner`}</span>
                  </div>
                  <p className="mt-1 text-sm">{describe(q, data)}</p>
                  {itemOf(q.item)?.rules && <p className="mt-1 text-xs text-muted">Krav: {itemOf(q.item)!.rules}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${q.answer === null ? 'text-muted' : 'text-accent'}`}>
                      {q.answer === null ? 'Venter på svar' : answerLabel(q, q.answer)}
                      {q.answer === null && (
                        <span className="ml-2">
                          <Countdown q={q} />
                        </span>
                      )}
                    </span>
                    <span className="flex gap-1.5">
                      {/* Trykket seeker feil, kan spørsmålet rettes eller slettes helt til hider har svart. Etter det er det låst. */}
                      <button className="btn min-h-9!" disabled={q.answer !== null} onClick={() => setDraft(questionToForm(q))}>
                        Rediger
                      </button>
                      <button className="btn min-h-9! text-bad" disabled={q.answer !== null} onClick={() => removeQuestion(q.id)} aria-label={`Slett spørsmål ${i + 1}`}>
                        Slett
                      </button>
                    </span>
                  </div>
                  <AnswerHistory q={q} />
                  {!isHider && (
                    <input
                      className="field mt-2 min-h-9! text-sm!"
                      value={q.note ?? ''}
                      onChange={(e) => setNote(q.id, e.target.value)}
                      placeholder="Notat"
                      aria-label={`Notat til spørsmål ${i + 1}`}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </Section>
      )}
      <Share />
    </div>
  )
}
