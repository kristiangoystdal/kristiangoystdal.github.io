import { useState } from 'react'
import {
  CATEGORIES,
  answerLabel,
  answerOptions,
  categoryOf,
  describe,
  drawFor,
  fmtDist,
  formToQuestion,
  itemOf,
  itemsFor,
  newForm,
  questionToForm,
  responseMinutes,
  switchItem,
  usedKeys,
  type Form,
} from './form'
import { autoAnswer, dist, hasData, nearestStation, type AutoAnswer, type Result } from './geo'
import { exportGame, gameLink, parseGame, useGame, useUi } from './store'
import type { GeoData, Question } from './types'
import { PointInput, Section, useNow } from './ui'

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

/** Hvor mange kort hider trekker for spørsmålet. Uthevet når det er en gjentakelse. */
export function DrawNote({ q, log }: { q: Question; log: Question[] }) {
  const d = drawFor(q, log)
  return <p className={`mb-2 text-xs ${d.repeat ? 'font-semibold text-accent' : 'text-muted'}`}>🂠 {d.text}</p>
}

/** Nedtelling for svartiden på et ubesvart spørsmål. */
export function Countdown({ q }: { q: Question }) {
  const now = useNow()
  const size = useGame((s) => s.settings.size)
  if (q.answer !== null) return null
  const left = Math.round((q.time + responseMinutes(q, size) * 60000 - now) / 1000)
  if (left <= 0) return <span className="text-xs font-semibold text-bad">Svartiden er ute</span>
  return (
    <span className={`text-xs tabular-nums ${left < 60 ? 'font-semibold text-bad' : 'text-muted'}`}>
      ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} igjen
    </span>
  )
}

function QuestionForm({ data, form }: { data: GeoData; form: Form }) {
  const setDraft = useUi((s) => s.setDraft)
  const questions = useGame((s) => s.questions)
  const size = useGame((s) => s.settings.size)
  const saveQuestion = useGame((s) => s.saveQuestion)
  const auto = useAutoAnswer(data)
  const isHider = useGame((s) => s.mode === 'hider')
  const set = (patch: Partial<Form>) => setDraft({ ...form, answer: null, ...patch })

  const item = itemOf(form.item)!
  const items = itemsFor(item.category, size)
  const groups = [...new Set(items.map((i) => i.group))]
  // Merker hvilke spørsmål som alt er stilt, så man ser hva som er igjen.
  const used = usedKeys(questions.filter((x) => x.id !== form.id))
  const isUsed = (id: string) => [...used].some((k) => k === id || k.startsWith(`${id}:`))
  const q = formToQuestion(form)
  const options = q ? answerOptions(q, data) : []
  const missing = !hasData(form, data)
  const walked = form.pos && form.pos2 ? dist(form.pos, form.pos2) : 0

  const seeker = <PointInput label="Seekers posisjon" value={form.pos} onChange={(pos) => set({ pos })} stations={data.stations} />

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const first = itemsFor(c, size)[0]
          return (
            <button key={c} type="button" className={`btn ${c === item.category ? 'btn-on' : ''}`} disabled={!first} onClick={() => first && setDraft(switchItem(form, first))}>
              {c}
            </button>
          )
        })}
      </div>
      {itemsFor('Tentacles', size).length === 0 && <p className="-mt-1 mb-3 text-xs text-muted">Tentacles er ikke med i små spill.</p>}

      <label className="mb-3 block">
        <span className="label">Spørsmål</span>
        <select className="field" value={item.id} onChange={(e) => setDraft(switchItem(form, itemOf(e.target.value)!))}>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {items
                .filter((i) => i.group === g)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {isUsed(i.id) ? '✓ ' : ''}
                    {i.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">✓ = stilt før. Stilles det på nytt, trekker hider to ganger.</span>
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
      {form.kind === 'line' && (
        <div className="mb-3">
          <span className="label">Linje</span>
          <div className="flex gap-1.5">
            {data.lines.features.map((f) => (
              <button
                key={f.properties.line}
                type="button"
                className={`btn w-11 ${form.line === f.properties.line ? 'btn-on' : ''}`}
                style={{ borderBottom: `3px solid ${f.properties.color}` }}
                onClick={() => set({ line: f.properties.line })}
              >
                {f.properties.line}
              </button>
            ))}
          </div>
        </div>
      )}
      {['admin', 'nearest', 'measure', 'namelen', 'border', 'tentacles'].includes(form.kind) && seeker}
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
          <DrawNote q={q} log={questions} />
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
          {auto(q) && <AutoHint q={q} auto={auto(q)!} />}
        </div>
      )}

      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1"
          disabled={!q || missing}
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
  const size = useGame((s) => s.settings.size)
  const setNote = useGame((s) => s.setNote)
  const isHider = useGame((s) => s.mode === 'hider')

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

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button className="btn btn-primary flex-1" onClick={() => setDraft(newForm(itemsFor('Radar', size)[0], lastPos))}>
          + Nytt spørsmål
        </button>
        <button className="btn" onClick={undo} disabled={!canUndo}>
          Angre
        </button>
      </div>
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
                  <span className="tabular-nums">{isHider || q.answer === null || q.kind === 'photo' ? '' : `${before} → ${after} stasjoner`}</span>
                </div>
                <p className="mt-1 text-sm">{describe(q, data)}</p>
                {itemOf(q.item)?.rules && <p className="mt-1 text-xs text-muted">Krav: {itemOf(q.item)!.rules}</p>}
                <div className="mt-1 -mb-2">
                  <DrawNote q={q} log={questions} />
                </div>
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
                    <button className="btn min-h-9!" onClick={() => setDraft(questionToForm(q))}>
                      {isHider && q.answer === null ? 'Svar' : 'Rediger'}
                    </button>
                    <button className="btn min-h-9! text-bad" onClick={() => removeQuestion(q.id)} aria-label={`Slett spørsmål ${i + 1}`}>
                      Slett
                    </button>
                  </span>
                </div>
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
      <Share />
    </div>
  )
}
