import { useState } from 'react'
import { CATEGORIES, KINDS, RADAR_RADII, answerLabel, answerOptions, describe, drawFor, fmtDist, formToQuestion, levelName, newForm, questionToForm, type Form } from './form'
import { ADMIN_LEVELS, FIXED_REFS, POI_TYPES, autoAnswer, hasData, nearestStation, type AutoAnswer, type Result } from './geo'
import { exportGame, gameLink, parseGame, useGame, useUi } from './store'
import type { GeoData, Question } from './types'
import { PointInput, Section } from './ui'

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

function QuestionForm({ data, form }: { data: GeoData; form: Form }) {
  const setDraft = useUi((s) => s.setDraft)
  const questions = useGame((s) => s.questions)
  const saveQuestion = useGame((s) => s.saveQuestion)
  const auto = useAutoAnswer(data)
  const isHider = useGame((s) => s.mode === 'hider')
  const set = (patch: Partial<Form>) => setDraft({ ...form, answer: null, ...patch })

  const category = KINDS.find((k) => k.kind === form.kind)!.category
  const q = formToQuestion(form)
  const options = q ? answerOptions(q, data) : []
  const missing = !hasData(form, data)

  const poiSelect = (
    <label className="mb-3 block">
      <span className="label">Type sted</span>
      <select className="field" value={form.poiType} onChange={(e) => set({ poiType: e.target.value })}>
        {POI_TYPES.map((t) => (
          <option key={t.key} value={t.key} disabled={!data.poi[t.key]?.length}>
            {t.label}
            {data.poi[t.key]?.length ? ` (${data.poi[t.key].length})` : ' (data mangler)'}
          </option>
        ))}
      </select>
    </label>
  )
  const radius = (
    <div className="mb-3">
      <span className="label">Radius</span>
      <div className="flex flex-wrap gap-1.5">
        {RADAR_RADII.map((r) => (
          <button key={r} type="button" className={`btn ${form.radiusM === r ? 'btn-on' : ''}`} onClick={() => set({ radiusM: r })}>
            {fmtDist(r)}
          </button>
        ))}
        <label className="flex items-center gap-1 text-sm">
          <input
            className="field w-20!"
            type="number"
            min={50}
            step={50}
            value={form.radiusM}
            aria-label="Egen radius i meter"
            onChange={(e) => set({ radiusM: +e.target.value })}
          />
          m
        </label>
      </div>
    </div>
  )
  const seeker = <PointInput label="Seekers posisjon" value={form.pos} onChange={(pos) => set({ pos })} stations={data.stations} />

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`btn ${c === category ? 'btn-on' : ''}`}
            onClick={() => set({ kind: KINDS.find((k) => k.category === c)!.kind })}
          >
            {c}
          </button>
        ))}
      </div>
      {category === 'Matching' && (
        <label className="mb-3 block">
          <span className="label">Hva sammenlignes</span>
          <select className="field" value={form.kind} onChange={(e) => set({ kind: e.target.value as Form['kind'] })}>
            {KINDS.filter((k) => k.category === 'Matching').map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {form.kind === 'radar' && (
        <>
          {seeker}
          {radius}
        </>
      )}
      {form.kind === 'thermometer' && (
        <>
          <PointInput label="Startpunkt" value={form.pos} onChange={(pos) => set({ pos })} stations={data.stations} />
          <PointInput label="Sluttpunkt" value={form.pos2} onChange={(pos2) => set({ pos2 })} stations={data.stations} />
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
      {form.kind === 'admin' && (
        <>
          <label className="mb-3 block">
            <span className="label">Nivå</span>
            <select className="field" value={form.level} onChange={(e) => set({ level: e.target.value as Form['level'] })}>
              {ADMIN_LEVELS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          {form.level === 'postsone' && <p className="-mt-2 mb-3 text-xs text-muted">Postsonen er de tre første sifrene i postnummeret, f.eks. 036x for 0368.</p>}
          {seeker}
        </>
      )}
      {form.kind === 'nearest' && (
        <>
          {poiSelect}
          {seeker}
        </>
      )}
      {form.kind === 'measure' && (
        <>
          <label className="mb-3 block">
            <span className="label">Avstand til</span>
            <select className="field" value={form.ref} onChange={(e) => set({ ref: e.target.value })}>
              {Object.entries(FIXED_REFS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.name}
                </option>
              ))}
              {POI_TYPES.map((t) => (
                <option key={t.key} value={t.key} disabled={!data.poi[t.key]?.length}>
                  Nærmeste {t.label.toLowerCase()}
                  {data.poi[t.key]?.length ? '' : ' (data mangler)'}
                </option>
              ))}
            </select>
          </label>
          {seeker}
        </>
      )}
      {form.kind === 'tentacles' && (
        <>
          {poiSelect}
          {seeker}
          {radius}
        </>
      )}
      {form.kind === 'photo' && (
        <label className="mb-3 block">
          <span className="label">Hva skal hider ta bilde av</span>
          <input className="field" value={form.text} onChange={(e) => set({ text: e.target.value })} placeholder="F.eks. høyeste bygning du ser" />
        </label>
      )}

      {missing && (
        <p className="mb-3 rounded-lg bg-panel-2 p-2 text-sm text-bad">
          {form.kind === 'admin' ? `Grensedata for ${levelName(form.level)} er ikke lastet inn ennå.` : 'Stedsdata for dette valget er ikke lastet inn ennå.'}
        </p>
      )}

      {q && !missing && (
        <div className="mb-3">
          <p className="mb-1 text-sm italic">«{describe(q, data)}»</p>
          <DrawNote q={q} log={questions} />
          {/* Bare hider svarer. Seeker stiller spørsmålet og venter på svaret. */}
          {isHider && <span className="label">Ditt svar</span>}
          {!isHider ? null : q.kind === 'photo' ? (
            <input className="field" value={form.answer ?? ''} onChange={(e) => setDraft({ ...form, answer: e.target.value || null })} placeholder="Notat om bildet" />
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
  const level = useGame((s) => s.settings.adminLevel)
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
        <button className="btn btn-primary flex-1" onClick={() => setDraft(newForm('radar', level, lastPos))}>
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
                    {i + 1}. {KINDS.find((k) => k.kind === q.kind)!.category} · {time(q.time)}
                  </span>
                  <span className="tabular-nums">{isHider || q.answer === null || q.kind === 'photo' ? '' : `${before} → ${after} stasjoner`}</span>
                </div>
                <p className="mt-1 text-sm">{describe(q, data)}</p>
                <div className="mt-1 -mb-2">
                  <DrawNote q={q} log={questions} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${q.answer === null ? 'text-muted' : 'text-accent'}`}>
                    {q.answer === null ? 'Venter på svar' : answerLabel(q, q.answer)}
                  </span>
                  <span className="flex gap-1.5">
                    <button className="btn min-h-9!" onClick={() => setDraft(questionToForm(q, level))}>
                      {isHider && q.answer === null ? 'Svar' : 'Rediger'}
                    </button>
                    <button className="btn min-h-9! text-bad" onClick={() => removeQuestion(q.id)} aria-label={`Slett spørsmål ${i + 1}`}>
                      Slett
                    </button>
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </Section>
      <Share />
    </div>
  )
}
