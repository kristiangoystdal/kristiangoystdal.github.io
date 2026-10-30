import { useEffect, useState } from 'react'
import { city, transit } from './cities'
import { deadline, movedAt } from './clock'
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
  lockedBy,
  newForm,
  questionKey,
  questionToForm,
  randomSwap,
  responseMinutes,
  switchItem,
  usedKeys,
  type Category,
  type Form,
  type Item,
  type Locks,
} from './form'
import { ANSWER_CANT, ANSWER_NULL, ANSWER_RANDOM, ANSWER_VETO, METRO_LINES, SEALEVEL_ITEM, STREET_ITEM, autoAnswer, canCutZone, cutsZone, dist, hasData, byHand, hiderStation, informs, nearestStation, shrinks, unsureAnswer, UNSURE_M, type AutoAnswer, type Result } from './geo'
import { fetchLookup, lookup, useLookups } from './online'
import { exportGame, gameLink, parseGame, useGame, useHiderPos, useUi } from './store'
import type { GeoData, LngLat, Question } from './types'
import { MoveInfo, PAUSE_TEXT, PointInput, Section, fixAccuracy, locate, useGameNow, useNow } from './ui'

/** Kortene som stenger spørsmål. Hver for seg, så Zustand ikke lager et nytt objekt ved hver endring. */
function useLocks(): Locks {
  const drained = useGame((s) => s.round.drained)
  const spotty = useGame((s) => s.round.spotty)
  return { drained, spotty }
}

/** Der seeker sto da spørsmålet ble stilt. */
const posOf = (q: Question): LngLat | null => ('pos' in q && q.pos ? q.pos : 'center' in q ? q.center : 'to' in q ? q.to : null)

const openRules = (section: string) => useUi.getState().setRules(section)

/** Lenke til regelavsnittet. */
function RulesLink({ section, label = 'Regler' }: { section: string; label?: string }) {
  return (
    <button type="button" className="cursor-pointer text-xs text-muted underline" onClick={() => openRules(section)}>
      📖 {label}
    </button>
  )
}

const time = (t: number) => new Date(t).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })

/** Hiders fasitsvar på et spørsmål, eller null når appen ikke er i hider-modus. */
export function useAutoAnswer(data: GeoData) {
  const mode = useGame((s) => s.mode)
  const stationId = useGame((s) => s.hider.stationId)
  const pos = useHiderPos((s) => s.pos)
  // Tegnes på nytt når et oppslag hos Kartverket kommer tilbake.
  useLookups()
  return (q: Question): AutoAnswer | null => {
    if (mode !== 'hider' || !pos) return null
    const station = data.stations.find((s) => s.id === stationId) ?? nearestStation(data.stations, pos)
    return autoAnswer(q, { pos, station }, data, lookup)
  }
}

/** Henter det et spørsmål trenger fra Kartverket for begge posisjonene. */
async function prefetch(q: Question, hider: LngLat) {
  const kind = q.item === SEALEVEL_ITEM ? 'height' : q.item === STREET_ITEM ? 'street' : null
  if (!kind || q.kind !== 'manual' || !q.pos || !city().norway) return
  await Promise.all([fetchLookup(kind, hider), fetchLookup(kind, q.pos)])
}
const online = (q: Question) => city().norway && (q.item === SEALEVEL_ITEM || q.item === STREET_ITEM)

/** `accuracy`: hvor mye GPS-en kan bomme, i meter. Bommer den mer enn marginen, er svaret usikkert. */
export function AutoHint({ q, auto, accuracy = null }: { q: Question; auto: AutoAnswer; accuracy?: number | null }) {
  return (
    <p className="mt-2 rounded-lg bg-panel-2 p-2 text-sm">
      Ditt svar som hider: <b className="text-ok">{answerLabel(q, auto.answer)}</b>
      <span className="block text-xs text-muted">{auto.detail}</span>
      {unsureAnswer(auto, accuracy) && <span className="block text-xs text-bad">{unsureText(auto.marginM!, accuracy)} Mål opp og svar selv.</span>}
    </p>
  )
}

/** Hvorfor svaret er usikkert. GPS-en nevnes bare når den er grunnen. */
function unsureText(marginM: number, accuracy: number | null) {
  const gps = accuracy !== null && accuracy > UNSURE_M ? `, og GPS-en kan bomme med ${Math.round(accuracy)} m` : ''
  return `Bare ${Math.round(marginM)} m fra motsatt svar${gps}.`
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
  const locks = useLocks()
  const set = (patch: Partial<Form>) => setDraft({ ...form, answer: null, ...patch })

  const item = itemOf(form.item)!
  const lock = lockedBy(item, locks)
  const items = itemsFor(item.category, rules)
  const groups = [...new Set(items.map((i) => i.group))]
  // Merker hvilke spørsmål som alt er stilt, så man ser hva som er igjen.
  const used = usedKeys(questions.filter((x) => x.id !== form.id))
  const q = formToQuestion(form)
  // Samme spørsmål stilt før i runden. Randomize teller ikke, for da ble det ikke stilt.
  const repeats = q ? questions.filter((x) => x.id !== form.id && x.answer !== ANSWER_RANDOM && questionKey(x) === questionKey(q)) : []
  const repeatText = repeats.length
    ? `Dette spørsmålet er stilt ${repeats.length === 1 ? 'før' : `${repeats.length} ganger før`} i runden (sist kl. ${time(repeats.at(-1)!.time)}). Stilles det igjen, koster det ${repeats.length + 1} ganger så mye: hider trekker ${repeats.length + 1} ganger hver for seg.`
    : ''
  // Hider som legger inn spørsmål og svar samlet, er ikke bundet av køen.
  const blocked = lock && !form.id ? `Dette spørsmålet er stengt av ${lock} resten av runden.` : !form.id && !(isHider && form.answer !== null) ? waiting : null
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
  // Nytt spørsmål fra seeker: posisjonen hentes fra GPS med en gang. Har seeker valgt et punkt selv i mellomtiden, står det.
  const [locating, setLocating] = useState(!form.id && !isHider)
  useEffect(() => {
    if (form.id || isHider) return
    const start = useUi.getState().draft?.pos ?? null
    locate()
      .then((pos) => {
        const d = useUi.getState().draft
        if (!d || d.id || d.pos !== start) return
        setDraft({ ...d, answer: null, pos, ...(d.kind === 'transit' ? { next: nextStop(d.line, pos) } : {}) })
      })
      .catch(() => {})
      .finally(() => setLocating(false))
    // Bare når skjemaet åpnes, ikke når spørsmålet byttes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const seeker = (
    <>
      <PointInput
        label="Seekers posisjon"
        value={form.pos}
        onChange={(pos) => set(form.kind === 'transit' ? { pos, next: nextStop(form.line, pos) } : { pos })}
        stations={data.stations}
      />
      {locating && <p className="-mt-2 mb-3 text-xs text-muted">Henter posisjonen din fra GPS…</p>}
    </>
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const first = itemsFor(c, rules).find((i) => !lockedBy(i, locks))
          return (
            <button key={c} type="button" className={`btn ${c === item.category ? 'btn-on' : ''}`} disabled={!first} onClick={() => first && setDraft(switchItem(form, first))}>
              {c}
            </button>
          )
        })}
      </div>
      {itemsFor('Tentacles', rules).length === 0 && <p className="-mt-1 mb-3 text-xs text-muted">Tentacles er ikke med i dette spillet. Det kan slås på under Oppsett.</p>}
      {locks.spotty && <p className="-mt-1 mb-3 text-xs text-muted">{locks.spotty} er slått ut av Spotty Memory.</p>}

      {/* Knapper i stedet for en nedtrekksliste: telefonene viser ikke farger i en liste, og stilte spørsmål skal stå i rødt. */}
      <div className="mb-3" role="radiogroup" aria-label="Spørsmål">
        <span className="label">Spørsmål</span>
        {groups.map((g) => (
          <div key={g} className="mb-2">
            {groups.length > 1 && <span className="mb-1 block text-xs text-muted">{g}</span>}
            <div className="flex flex-wrap gap-1.5">
              {items
                .filter((i) => i.group === g)
                .map((i) => {
                  const asked = isUsed(used, i.id)
                  const on = i.id === item.id
                  return (
                    <button
                      key={i.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`btn min-h-9! whitespace-normal! py-1 text-left ${on ? 'btn-primary' : asked ? 'text-bad!' : ''}`}
                      disabled={!!lockedBy(i, locks)}
                      onClick={() => setDraft(switchItem(form, i))}
                    >
                      {asked ? '✓ ' : ''}
                      {i.label}
                      {lockedBy(i, locks) ? ` (${lockedBy(i, locks)})` : ''}
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
        <span className="flex justify-between text-xs text-muted">
          <span>
            <span className="text-bad">Rød ✓</span> = stilt før.{isUsed(used, item.id) && <b className="text-bad"> Dette er stilt før.</b>}
          </span>
          <RulesLink section={item.category.toLowerCase()} label={`Regler for ${item.category}`} />
        </span>
      </div>

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
          {locating && <p className="-mt-2 mb-3 text-xs text-muted">Henter posisjonen din fra GPS…</p>}
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
          <p className="mb-3 rounded-lg bg-panel-2 p-2 text-xs text-muted">Kan bare stilles mens dere er om bord og i bevegelse. Svaret er ja hvis {transit().vehicle} dere sitter på stopper ved hiders stasjon på resten av turen.</p>
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
          {city().norway && (item.id === STREET_ITEM || item.id === SEALEVEL_ITEM)
            ? 'Hiders app slår opp svaret hos Kartverket, og hider bekrefter det. Svaret loggføres uten at kartet krymper.'
            : 'Appen har ikke data til å regne ut dette. Hider svarer selv, og svaret loggføres uten at kartet krymper.'}
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
      {repeatText && !form.id && (
        <p className="mb-3 rounded-lg border border-bad p-2 text-sm text-bad" role="alert">
          <b className="block">Stilt før</b>
          {repeatText}
        </p>
      )}
      {blocked && <p className="mb-3 rounded-lg bg-panel-2 p-2 text-sm text-bad">{blocked}</p>}

      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1"
          disabled={!q || missing || !!blocked}
          onClick={() => {
            if (repeatText && !form.id && !confirm(`${repeatText}\n\nStille det på nytt?`)) return
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
  const hasPos = useHiderPos((s) => s.pos !== null)
  const gpsError = useHiderPos((s) => s.error)
  const accuracy = useHiderPos((s) => s.accuracy)
  // Spørsmål der hider svarer selv: GPS svarte ikke, svaret var usikkert, eller hider valgte det.
  const [manual, setManual] = useState<string[]>([])
  const openManual = (id: string) => setManual((m) => (m.includes(id) ? m : [...m, id]))
  const endgame = useGame((s) => !!s.round.endgame)
  const auto = useAutoAnswer(data)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const rules = useGame((s) => s.settings)
  const locks = useLocks()
  const answer = (q: Question, value: string | null) => answerQuestion(q.id, value)
  /**
   * Hider velger svaret selv. Er det et annet enn appen regner ut, spørres det først,
   * og seekerne ser at svaret er gitt for hånd.
   */
  const answerByHand = (q: Question, value: string, suggested?: string) => {
    if (suggested !== undefined && suggested !== value && !confirm(`Appen regner ut «${answerLabel(q, suggested)}» fra der du står. Svare «${answerLabel(q, value)}» likevel? Seekerne ser at du svarte selv.`)) return
    answerQuestion(q.id, value, undefined, byHand(q.kind, value, suggested))
  }

  const veto = (q: Question) => {
    if (confirm('Spille Veto? Seekerne får ikke svar, og spørsmålet regnes som stilt. Du trekker ingen kort for det.')) answer(q, ANSWER_VETO)
  }
  const randomize = (q: Question) => {
    const swap = randomSwap(q, questions, rules, locks)
    if (!swap) return
    if (confirm(`Spille Randomize? Seekerne må stille «${swap.label}» (${swap.category}) i stedet, og dette spørsmålet regnes ikke som stilt.`)) answerQuestion(q.id, ANSWER_RANDOM, swap.id)
  }

  /**
   * Henter posisjonen på nytt og svarer ut fra der hider står akkurat nå, ikke der
   * GPS sist meldte. Får telefonen ikke posisjon, svarer hider selv.
   */
  const answerFromGps = async (q: Question, shown?: string) => {
    setBusy(q.id)
    setError('')
    try {
      let pos: LngLat
      try {
        pos = await locate({ fresh: true })
      } catch (e) {
        openManual(q.id)
        throw new Error(`${(e as Error).message} Svar selv ut fra der du står.`)
      }
      // Stasjonen hider har valgt gjelder så lenge hider står i sonen dens.
      const { hider, settings } = useGame.getState()
      const station = hiderStation(data.stations, pos, settings.zoneRadius, hider.stationId)
      useHiderPos.setState({ pos, t: Date.now(), error: '' })
      setHider({ stationId: station.id })
      await prefetch(q, pos)
      const a = autoAnswer(q, { pos, station }, data, lookup)
      // Står hider nærmere grensen for motsatt svar enn GPS-en bommer med, kan appen ikke vite svaret.
      const accuracy = fixAccuracy()
      const unsure = !!a && unsureAnswer(a, accuracy)
      if (a && !unsure) {
        answer(q, a.answer)
        if (shown !== undefined && shown !== a.answer) setError(`Du har flyttet deg, så svaret ble «${answerLabel(q, a.answer)}» ut fra der du står nå.`)
      } else if (a) {
        openManual(q.id)
        setError(`${unsureText(a.marginM!, accuracy)} Appen svarer ikke for deg, men tror «${answerLabel(q, a.answer)}». Mål opp og velg svaret selv.`)
      } else {
        openManual(q.id)
        setError(online(q) ? 'Fikk ikke svar fra Kartverket. Sjekk nettet, eller svar selv.' : 'Dette spørsmålet kan ikke regnes ut. Svar selv.')
      }
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy('')
  }

  return (
    <>
      {!hasPos && <p className="mb-3 text-xs text-muted">{gpsError || 'Venter på GPS. Appen henter posisjonen din når du svarer.'}</p>}
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
          {/* Det hider skal svare på står øverst, resten med det nyeste først. */}
          {[...questions.filter((q) => q.answer === null), ...questions.filter((q) => q.answer !== null).reverse()].map((q) => {
            // Et svar som er gitt, gjaldt der hider sto da. Flytter hider seg senere, skal det ikke foreslås et nytt.
            // Feiltrykk rettes med «angre svaret».
            const open = q.answer === null
            const a = open ? auto(q) : null
            return (
              <li key={q.id} className="card">
                <p className="mb-1 text-sm">{describe(q, data)}</p>
                {itemOf(q.item)?.rules && <p className="mb-1 text-xs">Krav til bildet: {itemOf(q.item)!.rules}</p>}
                <Countdown q={q} />
                {q.answer !== null && (
                  <p className="text-sm">
                    Du svarte: <b className="text-accent">{answerLabel(q, q.answer)}</b>
                    {q.manual && <span className="ml-1 text-xs text-muted">(selv)</span>}
                    {q.swap && <span className="block text-xs text-muted">Seekerne skal stille «{itemOf(q.swap)?.label}» i stedet.</span>}
                    {/* Trykket hider feil, kan svaret trekkes og gis på nytt. Seekerne ser at det er endret. */}
                    <button className="ml-2 text-xs text-muted underline" onClick={() => answer(q, null)}>
                      angre svaret
                    </button>
                  </p>
                )}
                <AnswerHistory q={q} />
                {a && <AutoHint q={q} auto={a} accuracy={accuracy} />}
                {!open ? null : q.kind === 'photo' ? (
                  (
                    <div className="mt-2">
                      <p className="mb-2 text-xs text-muted">Send bildet til seekerne på melding, og kvitter her.</p>
                      <button className="btn btn-primary" onClick={() => answer(q, 'Bilde sendt')}>
                        Bilde sendt
                      </button>
                    </div>
                  )
                ) : q.kind === 'manual' ? (
                  <div className="mt-2">
                    <p className="mb-2 text-xs text-muted">
                      {a ? 'Forslaget er hentet fra Kartverket. Sjekk at det stemmer, og svar:' : online(q) ? 'Henter fra Kartverket… Du kan også svare selv:' : 'Appen kan ikke regne ut dette. Svar selv:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {answerOptions(q, data).map((o) => (
                        <button key={o} className={`btn ${a?.answer === o ? 'btn-primary' : ''}`} onClick={() => answerByHand(q, o, a?.answer)}>
                          {answerLabel(q, o)}
                        </button>
                      ))}
                      {online(q) && (
                        <button className="btn" disabled={busy === q.id} onClick={() => answerFromGps(q)}>
                          {busy === q.id ? 'Henter…' : 'Svar med posisjonen min nå'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    {/* Svaret regnes alltid ut på nytt fra der hider står når knappen trykkes. Forslaget over er bare en forhåndsvisning. */}
                    <button className="btn btn-primary w-full" disabled={busy === q.id} onClick={() => answerFromGps(q, a?.answer)}>
                      {busy === q.id ? 'Henter posisjonen din…' : a && unsureAnswer(a, accuracy) ? 'Sjekk posisjonen på nytt' : a ? `Svar: ${answerLabel(q, a.answer)}` : 'Svar med posisjonen min nå'}
                    </button>
                    <p className="mt-1 text-xs text-muted">Posisjonen hentes på nytt når du trykker, så svaret gjelder der du står akkurat da.</p>
                    {/* Er forslaget alt usikkert, vises valgene med en gang. */}
                    {manual.includes(q.id) || (a && unsureAnswer(a, accuracy)) ? (
                      <>
                        <p className="mt-2 mb-1 text-xs text-muted">Svar selv ut fra der du står. Seekerne ser at svaret er gitt for hånd.</p>
                        <div className="flex flex-wrap gap-1.5">
                          {answerOptions(q, data).map((o) => (
                            <button key={o} className="btn" onClick={() => answerByHand(q, o, a?.answer)}>
                              {answerLabel(q, o)}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      // Appen kan ta feil: GPS-en bommer, eller et sted mangler i kartdataene. Da gjelder virkeligheten.
                      <button className="mt-1 text-xs text-muted underline" onClick={() => openManual(q.id)}>
                        Stemmer ikke svaret? Svar selv
                      </button>
                    )}
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
                      <button className="btn" onClick={() => veto(q)} title="Kortet Veto: seekerne får ikke svar">
                        🚫 Veto
                      </button>
                      <button
                        className="btn"
                        disabled={!randomSwap(q, questions, rules, locks)}
                        onClick={() => randomize(q)}
                        title={randomSwap(q, questions, rules, locks) ? 'Kortet Randomize: et annet spørsmål i samme kategori stilles i stedet' : 'Ingen ustilte spørsmål igjen i denne kategorien'}
                      >
                        🎲 Randomize
                      </button>
                    </div>
                )}
              </li>
            )
          })}
        </ul>
      </Section>
      <HiderCards data={data} />
    </>
  )
}

/** Kortene som stenger spørsmål resten av runden. Vises for alle. */
function LocksNotice() {
  const { drained, spotty } = useLocks()
  if (!drained?.length && !spotty) return null
  return (
    <div className="mb-4 rounded-lg border border-accent p-3 text-sm">
      {!!drained?.length && (
        <p>
          <b>Drained Brain:</b> {drained.map((id) => `${itemOf(id)?.label} (${itemOf(id)?.category})`).join(', ')} kan ikke stilles resten av runden.
        </p>
      )}
      {spotty && (
        <p className={drained?.length ? 'mt-1' : ''}>
          <b>Spotty Memory:</b> {spotty} er slått ut.
        </p>
      )}
    </div>
  )
}

const DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

/**
 * Kortene hider spiller utenom et svar. Kortstokken er fysisk, så appen holder
 * ikke styr på hånden, bare på det kortene gjør med spillet.
 */
function HiderCards({ data }: { data: GeoData }) {
  const now = useNow()
  const round = useGame((s) => s.round)
  const rules = useGame((s) => s.settings)
  const stationId = useGame((s) => s.hider.stationId)
  const pos = useHiderPos((s) => s.pos)
  const setRound = useGame((s) => s.setRound)
  const playMove = useGame((s) => s.playMove)
  const resumeGame = useGame((s) => s.resumeGame)
  const [picks, setPicks] = useState(['', '', ''])

  // Før runden vises bare hva som finnes, så hider vet hvor kortene er.
  if (round.seekFrom === null) {
    return (
      <Section title="Kort">
        <p className="card text-sm text-muted">
          Move, Drained Brain og Spotty Memory spilles her, og Veto og Randomize på hvert spørsmål, når runden er startet under Spill. <RulesLink section="kort" label="Alle kort" />
        </p>
      </Section>
    )
  }
  const seeking = now >= round.seekFrom
  const moving = round.pause?.kind === 'move'
  const station = data.stations.find((x) => x.id === stationId) ?? (pos ? nearestStation(data.stations, pos) : null)
  const moveBlocked = !seeking ? 'Kan spilles når letingen har startet.' : round.endgame ? 'Kan ikke spilles i endgame.' : round.pause ? 'Spillet står allerede.' : null

  const move = () => {
    const where = station ? `Seekerne får vite at du forlot ${station.name}.` : 'Si fra til seekerne hvilken stasjon du forlot.'
    if (confirm(`Spille Move? Klokken din står i opptil ${round.hidingMinutes} min mens du finner en ny sone, og seekerne må bli stående. Kast hele hånden. ${where}`)) playMove(station?.id ?? null)
  }

  const items = ITEMS.filter((i) => available(i, rules))
  const chosen = picks.filter(Boolean).map((id) => itemOf(id)!)
  const sameCategory = new Set(chosen.map((i) => i.category)).size < chosen.length
  const roll = () => setRound({ spotty: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)] })

  return (
    <Section title="Kort">
      <div className="flex flex-col gap-2">
        <div className="card">
          <div className="flex items-baseline justify-between gap-2">
            <b className="text-sm">🧳 Move</b>
            <RulesLink section="kort" />
          </div>
          {moving ? (
            <>
              <p className="mt-1 text-sm">Finn en ny sone. Klokken din står, og seekerne kan ikke stille spørsmål.</p>
              <MoveInfo stations={data.stations} />
              <button className="btn btn-primary mt-2 w-full" onClick={resumeGame}>
                Jeg er i ny sone
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted">Ny sone. Klokken din står i opptil {round.hidingMinutes} min, og kartet til seekerne starter på nytt.</p>
              <button className="btn mt-2 w-full" disabled={!!moveBlocked} onClick={move}>
                Spill Move
              </button>
              {moveBlocked && <p className="mt-1 text-xs text-muted">{moveBlocked}</p>}
            </>
          )}
        </div>

        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold">🧠 Drained Brain{round.drained?.length ? ' (aktiv)' : ''}</summary>
          {round.drained?.length ? (
            <>
              <p className="mt-2 text-sm">Stengt resten av runden: {round.drained.map((id) => itemOf(id)?.label).join(', ')}.</p>
              <button className="btn mt-2" onClick={() => setRound({ drained: [] })}>
                Fjern
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 mb-2 text-xs text-muted">Velg spørsmålene kortet stenger, i ulike kategorier. De kan ikke stilles resten av runden, heller ikke mot økt kostnad.</p>
              {picks.map((v, n) => (
                <select key={n} className="field mb-1.5" value={v} aria-label={`Spørsmål ${n + 1}`} onChange={(e) => setPicks(picks.map((p, m) => (m === n ? e.target.value : p)))}>
                  <option value="">Spørsmål {n + 1}…</option>
                  {CATEGORIES.map((c) => (
                    <optgroup key={c} label={c}>
                      {items
                        .filter((i) => i.category === c)
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              ))}
              {sameCategory && <p className="mb-1.5 text-xs text-bad">Spørsmålene må være i ulike kategorier.</p>}
              <button
                className="btn w-full"
                disabled={!chosen.length || sameCategory}
                onClick={() => {
                  setRound({ drained: chosen.map((i) => i.id) })
                  setPicks(['', '', ''])
                }}
              >
                Spill Drained Brain
              </button>
            </>
          )}
        </details>

        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold">🎲 Spotty Memory{round.spotty ? ` (${round.spotty} slått ut)` : ''}</summary>
          <p className="mt-2 mb-2 text-xs text-muted">
            En terning avgjør hvilken kategori som er slått ut: {CATEGORIES.map((c, n) => `${n + 1} ${c}`).join(', ')}. Kast på nytt når kortet sier det.
          </p>
          {round.spotty && (
            <p className="mb-2 text-sm">
              {DICE[CATEGORIES.indexOf(round.spotty as Category)]} <b>{round.spotty}</b> er slått ut.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button className="btn flex-1" onClick={roll}>
              {round.spotty ? 'Kast på nytt' : 'Kast terning'}
            </button>
            <select className="field w-auto! flex-1" value={round.spotty ?? ''} aria-label="Velg kategori selv" onChange={(e) => setRound({ spotty: e.target.value || null })}>
              <option value="">{round.spotty ? 'Ingen (fjern)' : 'Eller velg selv…'}</option>
              {CATEGORIES.map((c, n) => (
                <option key={c} value={c}>
                  {n + 1}: {c}
                </option>
              ))}
            </select>
          </div>
        </details>
        <p className="text-xs text-muted">
          Veto og Randomize spiller du på spørsmålet du skal svare på. Andre kort spilles utenfor appen.{' '}
          <button type="button" className="cursor-pointer text-xs text-muted underline" onClick={() => useUi.getState().setTab('map')}>
            📏 Mål avstand for en forbannelse
          </button>{' '}
          <RulesLink section="kort" label="Alle kort" />
        </p>
      </div>
    </Section>
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
  const locks = useLocks()
  const since = useGame((s) => movedAt(s.round))
  const endgame = useGame((s) => s.round.endgame ?? null)
  const toggleCut = useGame((s) => s.toggleEndgameCut)
  const toggleIgnored = useGame((s) => s.toggleIgnored)
  const open = (item: Item | undefined) => item && !lockedBy(item, locks)

  if (draft) {
    return (
      <Section title={draft.id ? 'Rediger spørsmål' : 'Nytt spørsmål'}>
        <QuestionForm data={data} form={draft} />
      </Section>
    )
  }

  // Nytt spørsmål starter der seeker sto sist.
  const last = questions.findLast((q) => posOf(q) !== null)
  const lastPos = last ? posOf(last) : null
  const total = data.stations.length
  // Radar er vanligst å åpne med. Er det tatt ut av spillet eller stengt av et kort, brukes det første som kan stilles.
  const first = itemsFor('Radar', rules).find(open) ?? ITEMS.find((i) => available(i, rules) && open(i))

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
      <LocksNotice />
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
                    <span className="tabular-nums">
                      {q.time < since
                        ? 'Før Move, teller ikke'
                        : q.ignored
                          ? 'Ikke brukt på kartet'
                          : isHider || !shrinks(q) || q.kind === 'photo'
                          ? ''
                          : endgame && q.time >= endgame.time
                            ? canCutZone(q)
                              ? 'Skjærer endgame-sonen'
                              : ''
                            : `${before} → ${after} stasjoner`}
                    </span>
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
                  {q.answer === ANSWER_RANDOM && q.swap && (
                    <div className="mt-2 rounded-lg bg-panel-2 p-2 text-sm">
                      Hider spilte Randomize. Still dette i stedet: <b>«{itemOf(q.swap)?.label}»</b> ({itemOf(q.swap)?.category})
                      {!questions.some((x) => x.time > q.time && x.item === q.swap) && (
                        <button className="btn btn-primary mt-2 w-full" disabled={!!blocked || !open(itemOf(q.swap))} onClick={() => setDraft(newForm(itemOf(q.swap)!, posOf(q) ?? lastPos))}>
                          Still «{itemOf(q.swap)?.label}»
                        </button>
                      )}
                    </div>
                  )}
                  {/* I endgame velger seekerne om spørsmål fra før skal gjøre sonen mindre. */}
                  {!isHider && endgame && q.time < endgame.time && q.time >= since && canCutZone(q) && (
                    <button type="button" role="switch" aria-checked={cutsZone(q, endgame)} className={`btn mt-2 min-h-9! w-full ${cutsZone(q, endgame) ? 'btn-on' : ''}`} onClick={() => toggleCut(q.id)}>
                      {cutsZone(q, endgame) ? '✓ Skjærer endgame-sonen' : 'Bruk i endgame-sonen'}
                    </button>
                  )}
                  {q.answer === ANSWER_VETO && <p className="mt-1 text-xs text-muted">Hider spilte Veto. Spørsmålet regnes som stilt.</p>}
                  {q.manual && <p className="mt-1 text-xs text-muted">Hider svarte selv i stedet for å bruke appens utregning.</p>}
                  <AnswerHistory q={q} />
                  {/* Er et svar feil, kan seekerne ta det ut av kartet. Spørsmålet regnes fortsatt som stilt. */}
                  {!isHider && informs(q) && q.kind !== 'photo' && q.kind !== 'manual' && q.time >= since && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!q.ignored}
                      className="mt-1 text-xs text-muted underline"
                      onClick={() => {
                        if (q.ignored || confirm('Ta svaret ut av kartet? Bruk det når dere tror svaret er feil. Spørsmålet regnes fortsatt som stilt, og kan tas inn igjen.')) toggleIgnored(q.id)
                      }}
                    >
                      {q.ignored ? 'Bruk svaret på kartet igjen' : 'Ta svaret ut av kartet'}
                    </button>
                  )}
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
