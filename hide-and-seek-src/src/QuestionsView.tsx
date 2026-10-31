import { useEffect, useState } from 'react'
import { LOCALE, tr } from './lang'
import { city, transit } from './cities'
import { deadline, movedAt } from './clock'
import {
  CATEGORIES,
  ITEMS,
  PHOTO_SENT,
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
import { useDemo } from './demo'
import type { GeoData, LngLat, Question } from './types'
import { MoveInfo, PAUSE_TEXT, PointInput, Section, Spinner, fixAccuracy, locate, useGameNow, useNow } from './ui'

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
function RulesLink({ section, label = tr('Regler', 'Rules') }: { section: string; label?: string }) {
  return (
    <button type="button" className="link" onClick={() => openRules(section)}>
      📖 {label}
    </button>
  )
}

// Én formaterer for alle klokkeslett. Å lage en ny for hvert er tregt på telefonen.
const CLOCK = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const time = (t: number) => CLOCK.format(t)

/** Hiders fasitsvar på et spørsmål, eller null når appen ikke er i hider-modus. */
export function useAutoAnswer(data: GeoData) {
  const mode = useGame((s) => s.mode)
  const stationId = useGame((s) => s.hider.stationId)
  const pos = useHiderPos((s) => s.pos)
  // Tegnes på nytt når et oppslag hos Kartverket kommer tilbake.
  useLookups()
  return (q: Question): AutoAnswer | null => {
    // Hider får ikke forslag regnet ut på halve kartdata.
    if (data.loading) return null
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
      {tr('Ditt svar som hider:', 'Your answer as hider:')} <b className="text-ok">{answerLabel(q, auto.answer)}</b>
      <span className="block text-xs text-muted">{auto.detail}</span>
      {unsureAnswer(auto, accuracy) && (
        <span className="block text-xs text-bad">
          {unsureText(auto.marginM!, accuracy)} {tr('Mål opp og svar selv.', 'Measure it and answer yourself.')}
        </span>
      )}
    </p>
  )
}

/** Hvorfor svaret er usikkert. GPS-en nevnes bare når den er grunnen. */
function unsureText(marginM: number, accuracy: number | null) {
  const gps = accuracy !== null && accuracy > UNSURE_M ? tr(`, og GPS-en kan bomme med ${Math.round(accuracy)} m`, `, and the GPS can be off by ${Math.round(accuracy)} m`) : ''
  return tr(`Bare ${Math.round(marginM)} m fra motsatt svar${gps}.`, `Only ${Math.round(marginM)} m from the opposite answer${gps}.`)
}

/** Viser at hider har endret svaret, og hva det var før. */
function AnswerHistory({ q }: { q: Question }) {
  if (!q.history?.length) return null
  return (
    <p className="mt-1 text-xs text-bad">
      {tr('Svaret er endret. Tidligere:', 'The answer was changed. Before:')} {q.history.map((h) => `${answerLabel(q, h.answer)} (${tr('til kl.', 'until')} ${time(h.at)})`).join(', ')}
    </p>
  )
}

/** Nedtelling for svartiden på et ubesvart spørsmål. */
export function Countdown({ q }: { q: Question }) {
  const now = useGameNow()
  const size = useGame((s) => s.settings.size)
  if (q.answer !== null) return null
  const left = Math.round((deadline(q, size) - now) / 1000)
  if (left <= 0) return <span className="text-xs font-semibold text-bad">{tr('Svartiden er ute. Hiders klokke står stille.', "The answer time is up. The hider's clock is stopped.")}</span>
  return (
    <span className={`text-xs tabular-nums ${left < 60 ? 'font-semibold text-bad' : 'text-muted'}`}>
      ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} {tr('igjen', 'left')}
    </span>
  )
}

/** Hvorfor et nytt spørsmål ikke kan stilles akkurat nå, eller null når det er lov. */
function useBlocked(exceptId?: string) {
  const pause = useGame((s) => s.round.pause)
  const open = useGame((s) => s.questions.some((q) => q.answer === null && q.id !== exceptId))
  if (pause) return `${PAUSE_TEXT[pause.kind].title}. ${tr('Ingen spørsmål før spillet fortsetter.', 'No questions until the game resumes.')}`
  if (open) return tr('Bare ett spørsmål om gangen. Vent til det forrige er besvart.', 'Only one question at a time. Wait until the last one is answered.')
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
    ? tr(
        `Dette spørsmålet er stilt ${repeats.length === 1 ? 'før' : `${repeats.length} ganger før`} i runden (sist kl. ${time(repeats.at(-1)!.time)}). Stilles det igjen, koster det ${repeats.length + 1} ganger så mye: hider trekker ${repeats.length + 1} ganger hver for seg.`,
        `This question has been asked ${repeats.length === 1 ? 'before' : `${repeats.length} times before`} this round (last at ${time(repeats.at(-1)!.time)}). Asking it again costs ${repeats.length + 1} times as much: the hider draws ${repeats.length + 1} times separately.`,
      )
    : ''
  // Hider som legger inn spørsmål og svar samlet, er ikke bundet av køen.
  const blocked = lock && !form.id ? tr(`Dette spørsmålet er stengt av ${lock} resten av runden.`, `This question is blocked by ${lock} for the rest of the round.`) : !form.id && !(isHider && form.answer !== null) ? waiting : null
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
        label={tr('Seekers posisjon', "Seeker's position")}
        value={form.pos}
        onChange={(pos) => set(form.kind === 'transit' ? { pos, next: nextStop(form.line, pos) } : { pos })}
        stations={data.stations}
      />
      {locating && <p className="-mt-2 mb-3 text-xs text-muted">{tr('Henter posisjonen din fra GPS…', 'Getting your position from GPS…')}</p>}
    </>
  )

  return (
    <div data-guide="question-form">
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
      {itemsFor('Tentacles', rules).length === 0 && <p className="-mt-1 mb-3 text-xs text-muted">{tr('Tentacles er ikke med i dette spillet. Det kan slås på under Oppsett.', 'Tentacles is not in this game. It can be turned on under Setup.')}</p>}
      {locks.spotty && <p className="-mt-1 mb-3 text-xs text-muted">{tr(`${locks.spotty} er slått ut av Spotty Memory.`, `${locks.spotty} is knocked out by Spotty Memory.`)}</p>}

      {/* Knapper i stedet for en nedtrekksliste: telefonene viser ikke farger i en liste, og stilte spørsmål skal stå i rødt. */}
      <div className="mb-3" role="radiogroup" aria-label={tr('Spørsmål', 'Question')}>
        <span className="label">{tr('Spørsmål', 'Question')}</span>
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
            <span className="text-bad">{tr('Rød ✓', 'Red ✓')}</span> = {tr('stilt før.', 'asked before.')}
            {isUsed(used, item.id) && <b className="text-bad">{tr(' Dette er stilt før.', ' This was asked before.')}</b>}
          </span>
          <RulesLink section={item.category.toLowerCase()} label={tr(`Regler for ${item.category}`, `Rules for ${item.category}`)} />
        </span>
      </div>

      {form.kind === 'radar' && (
        <>
          {seeker}
          {item.id === 'r-choose' && (
            <label className="mb-3 block">
              <span className="label">{tr('Avstand i meter', 'Distance in meters')}</span>
              <input className="field" type="number" min={50} step={50} value={form.radiusM} onChange={(e) => set({ radiusM: +e.target.value })} />
            </label>
          )}
        </>
      )}
      {form.kind === 'thermometer' && (
        <>
          <PointInput label={tr('Startpunkt', 'Start point')} value={form.pos} onChange={(pos) => set({ pos })} stations={data.stations} />
          {locating && <p className="-mt-2 mb-3 text-xs text-muted">{tr('Henter posisjonen din fra GPS…', 'Getting your position from GPS…')}</p>}
          <PointInput label={tr('Sluttpunkt', 'End point')} value={form.pos2} onChange={(pos2) => set({ pos2 })} stations={data.stations} />
          {walked > 0 && walked < form.radiusM && (
            <p className="mb-3 text-xs text-bad">
              {tr(`Du har bare flyttet deg ${fmtDist(walked)}. Dette spørsmålet krever minst ${fmtDist(form.radiusM)}.`, `You have only moved ${fmtDist(walked)}. This question needs at least ${fmtDist(form.radiusM)}.`)}
            </p>
          )}
        </>
      )}
      {form.kind === 'transit' && (
        <>
          {seeker}
          <p className="mb-3 rounded-lg bg-panel-2 p-2 text-xs text-muted">
            {tr(
              `Kan bare stilles mens dere er om bord og i bevegelse. Svaret er ja hvis ${transit().vehicle} dere sitter på stopper ved hiders stasjon på resten av turen.`,
              `Can only be asked while you are on board and moving. The answer is yes if ${transit().vehicle} you are on stops at the hider's station during the rest of the trip.`,
            )}
          </p>
          <div className="mb-3">
            <span className="label">{tr('Linje', 'Line')}</span>
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
            <span className="label">{tr('Retning', 'Direction')}</span>
            <div className="flex gap-1.5">
              {([1, -1] as const).map((d) => (
                <button key={d} type="button" className={`btn flex-1 ${form.dir === d ? 'btn-on' : ''}`} onClick={() => set({ dir: d })}>
                  {tr('mot', 'towards')} {stationName(d === 1 ? route.at(-1) : route[0])}
                </button>
              ))}
            </div>
          </div>
          <label className="mb-3 block">
            <span className="label">{tr('Neste stopp', 'Next stop')}</span>
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
          {tr(
            'Stedene er hentet fra OpenStreetMap og kan avvike fra kartappen dere bruker. Er dere uenige om hva som teller, sender seekerne et skjermbilde til hider.',
            'The places come from OpenStreetMap and may differ from the map app you use. If you disagree about what counts, the seekers send the hider a screenshot.',
          )}
        </p>
      )}
      {form.kind === 'admin' && form.level === 'postsone' && (
        <p className="-mt-2 mb-3 text-xs text-muted">{tr('Postsonen er de tre første sifrene i postnummeret, f.eks. 036x for 0368.', 'The postal zone is the first three digits of the postcode, e.g. 036x for 0368.')}</p>
      )}
      {form.kind === 'manual' && (
        <p className="mb-3 rounded-lg bg-panel-2 p-2 text-xs text-muted">
          {city().norway && (item.id === STREET_ITEM || item.id === SEALEVEL_ITEM)
            ? tr('Hiders app slår opp svaret hos Kartverket, og hider bekrefter det. Svaret loggføres uten at kartet krymper.', "The hider's app looks up the answer from Kartverket, and the hider confirms it. The answer is logged without shrinking the map.")
            : tr('Appen har ikke data til å regne ut dette. Hider svarer selv, og svaret loggføres uten at kartet krymper.', 'The app has no data to work this out. The hider answers, and the answer is logged without shrinking the map.')}
        </p>
      )}
      {item.rules && (
        <p className="mb-3 rounded-lg bg-panel-2 p-2 text-sm">
          <b>{tr('Krav til bildet:', 'Photo requirements:')}</b> {item.rules}
        </p>
      )}

      {missing &&
        (data.loading ? (
          // Grenser, kyst, vann og steder kommer like etter stasjonene. Skjemaet blir klart av seg selv.
          <p className="mb-3 flex items-center gap-2 rounded-lg bg-panel-2 p-2 text-sm text-muted" role="status">
            <Spinner className="size-3.5!" /> {tr('Kartdataene dette spørsmålet trenger, lastes…', 'Loading the map data this question needs…')}
          </p>
        ) : (
          <p className="mb-3 rounded-lg bg-panel-2 p-2 text-sm text-bad">{tr('Byen har ikke data til dette spørsmålet.', 'The city has no data for this question.')}</p>
        ))}

      {q && !missing && (
        <div className="mb-3">
          <p className="mb-1 text-sm italic">«{describe(q, data)}»</p>
          <p className="mb-2 text-xs text-muted">
            {tr('Svartid:', 'Answer time:')} {responseMinutes(q, size)} min
          </p>
          {/* Bare hider svarer. Seeker stiller spørsmålet og venter på svaret. */}
          {isHider && <span className="label">{tr('Ditt svar', 'Your answer')}</span>}
          {!isHider ? null : q.kind === 'photo' ? (
            <input className="field" value={form.answer ?? ''} onChange={(e) => setDraft({ ...form, answer: e.target.value || null })} placeholder={tr('Notat om bildet, f.eks. «sendt»', 'Note about the photo, e.g. "sent"')} />
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
          <b className="block">{tr('Stilt før', 'Asked before')}</b>
          {repeatText}
        </p>
      )}
      {blocked && <p className="mb-3 rounded-lg bg-panel-2 p-2 text-sm text-bad">{blocked}</p>}

      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1"
          data-guide="ask"
          disabled={!q || missing || !!blocked}
          onClick={() => {
            if (repeatText && !form.id && !confirm(`${repeatText}\n\n${tr('Stille det på nytt?', 'Ask it again?')}`)) return
            const { id, time: _t, answer, ...body } = q!
            saveQuestion(body as never, answer, form.id)
            setDraft(null)
          }}
        >
          {form.id ? tr('Lagre endring', 'Save change') : isHider && form.answer !== null ? tr('Lagre med svar', 'Save with answer') : tr('Still spørsmål', 'Ask question')}
        </button>
        <button className="btn" onClick={() => setDraft(null)}>
          {tr('Avbryt', 'Cancel')}
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
    const ask = tr(
      `Appen regner ut «${answerLabel(q, suggested ?? '')}» fra der du står. Svare «${answerLabel(q, value)}» likevel? Seekerne ser at du svarte selv.`,
      `The app works out "${answerLabel(q, suggested ?? '')}" from where you stand. Answer "${answerLabel(q, value)}" anyway? The seekers see that you answered yourself.`,
    )
    if (suggested !== undefined && suggested !== value && !confirm(ask)) return
    answerQuestion(q.id, value, undefined, byHand(q.kind, value, suggested))
  }

  const veto = (q: Question) => {
    if (confirm(tr('Spille Veto? Seekerne får ikke svar, og spørsmålet regnes som stilt. Du trekker ingen kort for det.', 'Play Veto? The seekers get no answer, and the question counts as asked. You draw no cards for it.'))) answer(q, ANSWER_VETO)
  }
  const randomize = (q: Question) => {
    const swap = randomSwap(q, questions, rules, locks)
    if (!swap) return
    const ask = tr(
      `Spille Randomize? Seekerne må stille «${swap.label}» (${swap.category}) i stedet, og dette spørsmålet regnes ikke som stilt.`,
      `Play Randomize? The seekers must ask "${swap.label}" (${swap.category}) instead, and this question does not count as asked.`,
    )
    if (confirm(ask)) answerQuestion(q.id, ANSWER_RANDOM, swap.id)
  }

  /**
   * Henter posisjonen på nytt og svarer ut fra der hider står akkurat nå, ikke der
   * GPS sist meldte. Får telefonen ikke posisjon, svarer hider selv.
   */
  const answerFromGps = async (q: Question, shown?: string) => {
    if (data.loading) return setError(tr('Kartdataene lastes fortsatt. Prøv igjen om et øyeblikk.', 'The map data is still loading. Try again in a moment.'))
    setBusy(q.id)
    setError('')
    try {
      let pos: LngLat
      try {
        pos = await locate({ fresh: true })
      } catch (e) {
        openManual(q.id)
        throw new Error(`${(e as Error).message} ${tr('Svar selv ut fra der du står.', 'Answer yourself from where you stand.')}`)
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
        if (shown !== undefined && shown !== a.answer)
          setError(tr(`Du har flyttet deg, så svaret ble «${answerLabel(q, a.answer)}» ut fra der du står nå.`, `You have moved, so the answer became "${answerLabel(q, a.answer)}" from where you stand now.`))
      } else if (a) {
        openManual(q.id)
        setError(
          `${unsureText(a.marginM!, accuracy)} ` +
            tr(`Appen svarer ikke for deg, men tror «${answerLabel(q, a.answer)}». Mål opp og velg svaret selv.`, `The app will not answer for you, but thinks "${answerLabel(q, a.answer)}". Measure it and pick the answer yourself.`),
        )
      } else {
        openManual(q.id)
        setError(online(q) ? tr('Fikk ikke svar fra Kartverket. Sjekk nettet, eller svar selv.', 'No answer from Kartverket. Check your connection, or answer yourself.') : tr('Dette spørsmålet kan ikke regnes ut. Svar selv.', 'This question cannot be worked out. Answer yourself.'))
      }
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy('')
  }

  return (
    <>
      {data.loading && (
        <p className="mb-3 flex items-center gap-2 text-sm text-muted" role="status">
          <Spinner className="size-3.5!" /> {tr('Kartdataene lastes. Svarforslagene kommer straks.', 'The map data is loading. The suggested answers come soon.')}
        </p>
      )}
      {!hasPos && <p className="mb-3 text-xs text-muted">{gpsError || tr('Venter på GPS. Appen henter posisjonen din når du svarer.', 'Waiting for GPS. The app gets your position when you answer.')}</p>}
      {endgame && (
        <p className="mb-5 rounded-lg border border-accent p-3 text-sm">
          <b>{tr('Endgame er startet.', 'The endgame has started.')}</b> {tr('Seekerne er i en sone. Er det din, må du stå stille der du er.', 'The seekers are in a zone. If it is yours, you must stay put where you are.')}
          <span className="mt-1 block text-xs text-muted">
            {tr(
              'Gjemmestedet må være innen ca. 3 m fra en vei eller sti, og offentlig tilgjengelig hele spilletiden. Står du et sted som ikke er lov, går du straks til nærmeste lovlige sted.',
              'The hiding spot must be within about 3 m of a road or path, and publicly accessible the whole game. If you are somewhere that is not allowed, go straight to the nearest allowed place.',
            )}
          </span>
        </p>
      )}
      <Section title={tr('Spørsmål til deg', 'Questions for you')}>
        {questions.length === 0 && <p className="text-sm text-muted">{tr('Ingen spørsmål ennå. De dukker opp her når seekerne stiller dem.', 'No questions yet. They show up here when the seekers ask them.')}</p>}
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
                {itemOf(q.item)?.rules && (
                  <p className="mb-1 text-xs">
                    {tr('Krav til bildet:', 'Photo requirements:')} {itemOf(q.item)!.rules}
                  </p>
                )}
                <Countdown q={q} />
                {q.answer !== null && (
                  <p className="text-sm">
                    {tr('Du svarte:', 'You answered:')} <b className="text-accent">{answerLabel(q, q.answer)}</b>
                    {q.manual && <span className="ml-1 text-xs text-muted">{tr('(selv)', '(by hand)')}</span>}
                    {q.swap && <span className="block text-xs text-muted">{tr(`Seekerne skal stille «${itemOf(q.swap)?.label}» i stedet.`, `The seekers must ask "${itemOf(q.swap)?.label}" instead.`)}</span>}
                    {/* Trykket hider feil, kan svaret trekkes og gis på nytt. Seekerne ser at det er endret. */}
                    <button className="link ml-2" onClick={() => answer(q, null)}>
                      {tr('angre svaret', 'undo answer')}
                    </button>
                  </p>
                )}
                <AnswerHistory q={q} />
                {a && <AutoHint q={q} auto={a} accuracy={accuracy} />}
                {!open ? null : q.kind === 'photo' ? (
                  (
                    <div className="mt-2">
                      <p className="mb-2 text-xs text-muted">{tr('Send bildet til seekerne på melding, og kvitter her.', 'Send the photo to the seekers by message, and confirm here.')}</p>
                      <button className="btn btn-primary" onClick={() => answer(q, PHOTO_SENT)}>
                        {answerLabel(q, PHOTO_SENT)}
                      </button>
                    </div>
                  )
                ) : q.kind === 'manual' ? (
                  <div className="mt-2">
                    <p className="mb-2 text-xs text-muted">
                      {a
                        ? tr('Forslaget er hentet fra Kartverket. Sjekk at det stemmer, og svar:', 'The suggestion comes from Kartverket. Check that it is right, and answer:')
                        : online(q)
                          ? tr('Henter fra Kartverket… Du kan også svare selv:', 'Loading from Kartverket… You can also answer yourself:')
                          : tr('Appen kan ikke regne ut dette. Svar selv:', 'The app cannot work this out. Answer yourself:')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {answerOptions(q, data).map((o) => (
                        <button key={o} className={`btn ${a?.answer === o ? 'btn-primary' : ''}`} onClick={() => answerByHand(q, o, a?.answer)}>
                          {answerLabel(q, o)}
                        </button>
                      ))}
                      {online(q) && (
                        <button className="btn" disabled={busy === q.id} onClick={() => answerFromGps(q)}>
                          {busy === q.id ? tr('Henter…', 'Loading…') : tr('Svar med posisjonen min nå', 'Answer with my position now')}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    {/* Svaret regnes alltid ut på nytt fra der hider står når knappen trykkes. Forslaget over er bare en forhåndsvisning. */}
                    <button className="btn btn-primary w-full" disabled={busy === q.id} onClick={() => answerFromGps(q, a?.answer)}>
                      {busy === q.id
                        ? tr('Henter posisjonen din…', 'Getting your position…')
                        : a && unsureAnswer(a, accuracy)
                          ? tr('Sjekk posisjonen på nytt', 'Check the position again')
                          : a
                            ? `${tr('Svar', 'Answer')}: ${answerLabel(q, a.answer)}`
                            : tr('Svar med posisjonen min nå', 'Answer with my position now')}
                    </button>
                    <p className="mt-1 text-xs text-muted">{tr('Posisjonen hentes på nytt når du trykker, så svaret gjelder der du står akkurat da.', 'Your position is fetched again when you tap, so the answer is for where you stand right then.')}</p>
                    {/* Er forslaget alt usikkert, vises valgene med en gang. */}
                    {manual.includes(q.id) || (a && unsureAnswer(a, accuracy)) ? (
                      <>
                        <p className="mt-2 mb-1 text-xs text-muted">{tr('Svar selv ut fra der du står. Seekerne ser at svaret er gitt for hånd.', 'Answer yourself from where you stand. The seekers see that the answer was given by hand.')}</p>
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
                      <button className="link mt-1" onClick={() => openManual(q.id)}>
                        {tr('Stemmer ikke svaret? Svar selv', 'Answer wrong? Answer yourself')}
                      </button>
                    )}
                  </div>
                )}
                {q.answer === null && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button className="btn" onClick={() => answer(q, ANSWER_NULL)} title={tr('Det spørsmålet handler om finnes ikke innenfor kartet', 'What the question asks about does not exist on the map')}>
                        {tr('Nullsvar', 'Null answer')}
                      </button>
                      {q.kind === 'photo' && endgame && (
                        <button className="btn" onClick={() => answer(q, ANSWER_CANT)}>
                          {tr('Kan ikke svare', 'Cannot answer')}
                        </button>
                      )}
                      <button className="btn" onClick={() => veto(q)} title={tr('Kortet Veto: seekerne får ikke svar', 'The Veto card: the seekers get no answer')}>
                        🚫 Veto
                      </button>
                      <button
                        className="btn"
                        disabled={!randomSwap(q, questions, rules, locks)}
                        onClick={() => randomize(q)}
                        title={
                          randomSwap(q, questions, rules, locks)
                            ? tr('Kortet Randomize: et annet spørsmål i samme kategori stilles i stedet', 'The Randomize card: another question in the same category is asked instead')
                            : tr('Ingen ustilte spørsmål igjen i denne kategorien', 'No unasked questions left in this category')
                        }
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
          <b>Drained Brain:</b> {drained.map((id) => `${itemOf(id)?.label} (${itemOf(id)?.category})`).join(', ')} {tr('kan ikke stilles resten av runden.', 'cannot be asked for the rest of the round.')}
        </p>
      )}
      {spotty && (
        <p className={drained?.length ? 'mt-1' : ''}>
          <b>Spotty Memory:</b> {spotty} {tr('er slått ut.', 'is knocked out.')}
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
      <Section title={tr('Kort', 'Cards')}>
        <p className="card text-sm text-muted">
          {tr(
            'Move, Drained Brain og Spotty Memory spilles her, og Veto og Randomize på hvert spørsmål, når runden er startet.',
            'Move, Drained Brain and Spotty Memory are played here, and Veto and Randomize on each question, once the round has started.',
          )}{' '}
          <RulesLink section="kort" label={tr('Alle kort', 'All cards')} />
        </p>
      </Section>
    )
  }
  const seeking = now >= round.seekFrom
  const moving = round.pause?.kind === 'move'
  const station = data.stations.find((x) => x.id === stationId) ?? (pos ? nearestStation(data.stations, pos) : null)
  const moveBlocked = !seeking
    ? tr('Kan spilles når letingen har startet.', 'Can be played once the seeking has started.')
    : round.endgame
      ? tr('Kan ikke spilles i endgame.', 'Cannot be played in the endgame.')
      : round.pause
        ? tr('Spillet står allerede.', 'The game is already paused.')
        : null

  const move = () => {
    const where = station ? tr(`Seekerne får vite at du forlot ${station.name}.`, `The seekers are told that you left ${station.name}.`) : tr('Si fra til seekerne hvilken stasjon du forlot.', 'Tell the seekers which station you left.')
    const ask = tr(
      `Spille Move? Klokken din står i opptil ${round.hidingMinutes} min mens du finner en ny sone, og seekerne må bli stående. Kast hele hånden. ${where}`,
      `Play Move? Your clock stops for up to ${round.hidingMinutes} min while you find a new zone, and the seekers must stay where they are. Discard your whole hand. ${where}`,
    )
    if (confirm(ask)) playMove(station?.id ?? null)
  }

  const items = ITEMS.filter((i) => available(i, rules))
  const chosen = picks.filter(Boolean).map((id) => itemOf(id)!)
  const sameCategory = new Set(chosen.map((i) => i.category)).size < chosen.length
  const roll = () => setRound({ spotty: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)] })

  return (
    <Section title={tr('Kort', 'Cards')}>
      <div className="flex flex-col gap-2">
        <div className="card">
          <div className="flex items-baseline justify-between gap-2">
            <b className="text-sm">🧳 Move</b>
            <RulesLink section="kort" />
          </div>
          {moving ? (
            <>
              <p className="mt-1 text-sm">{tr('Finn en ny sone. Klokken din står, og seekerne kan ikke stille spørsmål.', 'Find a new zone. Your clock is stopped, and the seekers cannot ask questions.')}</p>
              <MoveInfo stations={data.stations} />
              <button className="btn btn-primary mt-2 w-full" onClick={resumeGame}>
                {tr('Jeg er i ny sone', 'I am in a new zone')}
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted">
                {tr(`Ny sone. Klokken din står i opptil ${round.hidingMinutes} min, og kartet til seekerne starter på nytt.`, `New zone. Your clock stops for up to ${round.hidingMinutes} min, and the seekers' map starts over.`)}
              </p>
              <button className="btn mt-2 w-full" disabled={!!moveBlocked} onClick={move}>
                {tr('Spill Move', 'Play Move')}
              </button>
              {moveBlocked && <p className="mt-1 text-xs text-muted">{moveBlocked}</p>}
            </>
          )}
        </div>

        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold">🧠 Drained Brain{round.drained?.length ? tr(' (aktiv)', ' (active)') : ''}</summary>
          {round.drained?.length ? (
            <>
              <p className="mt-2 text-sm">
                {tr('Stengt resten av runden:', 'Blocked for the rest of the round:')} {round.drained.map((id) => itemOf(id)?.label).join(', ')}.
              </p>
              <button className="btn mt-2" onClick={() => setRound({ drained: [] })}>
                {tr('Fjern', 'Remove')}
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 mb-2 text-xs text-muted">
                {tr(
                  'Velg spørsmålene kortet stenger, i ulike kategorier. De kan ikke stilles resten av runden, heller ikke mot økt kostnad.',
                  'Pick the questions the card blocks, in different categories. They cannot be asked for the rest of the round, not even at extra cost.',
                )}
              </p>
              {picks.map((v, n) => (
                <select key={n} className="field mb-1.5" value={v} aria-label={`${tr('Spørsmål', 'Question')} ${n + 1}`} onChange={(e) => setPicks(picks.map((p, m) => (m === n ? e.target.value : p)))}>
                  <option value="">
                    {tr('Spørsmål', 'Question')} {n + 1}…
                  </option>
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
              {sameCategory && <p className="mb-1.5 text-xs text-bad">{tr('Spørsmålene må være i ulike kategorier.', 'The questions must be in different categories.')}</p>}
              <button
                className="btn w-full"
                disabled={!chosen.length || sameCategory}
                onClick={() => {
                  setRound({ drained: chosen.map((i) => i.id) })
                  setPicks(['', '', ''])
                }}
              >
                {tr('Spill Drained Brain', 'Play Drained Brain')}
              </button>
            </>
          )}
        </details>

        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold">🎲 Spotty Memory{round.spotty ? tr(` (${round.spotty} slått ut)`, ` (${round.spotty} knocked out)`) : ''}</summary>
          <p className="mt-2 mb-2 text-xs text-muted">
            {tr(
              `En terning avgjør hvilken kategori som er slått ut: ${CATEGORIES.map((c, n) => `${n + 1} ${c}`).join(', ')}. Kast på nytt når kortet sier det.`,
              `A die decides which category is knocked out: ${CATEGORIES.map((c, n) => `${n + 1} ${c}`).join(', ')}. Roll again when the card says so.`,
            )}
          </p>
          {round.spotty && (
            <p className="mb-2 text-sm">
              {DICE[CATEGORIES.indexOf(round.spotty as Category)]} <b>{round.spotty}</b> {tr('er slått ut.', 'is knocked out.')}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button className="btn flex-1" onClick={roll}>
              {round.spotty ? tr('Kast på nytt', 'Roll again') : tr('Kast terning', 'Roll the die')}
            </button>
            <select className="field w-auto! flex-1" value={round.spotty ?? ''} aria-label={tr('Velg kategori selv', 'Choose category yourself')} onChange={(e) => setRound({ spotty: e.target.value || null })}>
              <option value="">{round.spotty ? tr('Ingen (fjern)', 'None (remove)') : tr('Eller velg selv…', 'Or choose yourself…')}</option>
              {CATEGORIES.map((c, n) => (
                <option key={c} value={c}>
                  {n + 1}: {c}
                </option>
              ))}
            </select>
          </div>
        </details>
        <p className="text-xs text-muted">
          {tr('Veto og Randomize spiller du på spørsmålet du skal svare på. Andre kort spilles utenfor appen.', 'You play Veto and Randomize on the question you are answering. Other cards are played outside the app.')}{' '}
          <button type="button" className="link" onClick={() => useUi.getState().setTab('tools')}>
            {tr('📏 Mål avstand for en forbannelse', '📏 Measure distance for a curse')}
          </button>{' '}
          <RulesLink section="kort" label={tr('Alle kort', 'All cards')} />
        </p>
      </div>
    </Section>
  )
}

/** Del spillet som lenke eller JSON, importer et, eller start på nytt. Ligger i lobbyen. */
export function ShareGame() {
  const importGame = useGame((s) => s.importGame)
  const newGame = useGame((s) => s.newGame)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  const copy = async (what: 'link' | 'json') => {
    const game = exportGame(useGame.getState())
    const value = what === 'link' ? gameLink(game) : JSON.stringify(game)
    try {
      await navigator.clipboard.writeText(value)
      setMsg(what === 'link' ? tr('Lenke kopiert', 'Link copied') : tr('JSON kopiert', 'JSON copied'))
    } catch {
      setText(value)
      setMsg(tr('Kunne ikke kopiere automatisk. Kopier teksten under.', 'Could not copy automatically. Copy the text below.'))
    }
  }
  const load = () => {
    try {
      const game = parseGame(text)
      importGame(game)
      setText('')
      setMsg(tr(`Importerte ${game.questions.length} spørsmål`, `Imported ${game.questions.length} questions`))
    } catch {
      setMsg(tr('Dette er ikke et gyldig spill', 'This is not a valid game'))
    }
  }

  return (
    <details className="card mt-4">
      <summary className="cursor-pointer text-sm font-medium">{tr('Del, importer eller start på nytt', 'Share, import or start over')}</summary>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button className="btn" onClick={() => copy('link')}>
          {tr('Kopier lenke', 'Copy link')}
        </button>
        <button className="btn" onClick={() => copy('json')}>
          {tr('Kopier JSON', 'Copy JSON')}
        </button>
      </div>
      <textarea className="field mt-2 h-20 py-2 font-mono text-xs!" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr('Lim inn JSON fra en annen spiller', 'Paste JSON from another player')} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button className="btn" onClick={load} disabled={!text.trim()}>
          {tr('Importer', 'Import')}
        </button>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm(tr('Slette alle spørsmål og starte en ny runde? Poengtavlen beholdes.', 'Delete all questions and start a new round? The scoreboard is kept.'))) newGame()
          }}
        >
          {tr('Nytt spill', 'New game')}
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
  // Reprise av et simulert spill: loggen vises, men kan ikke endres.
  const replay = useDemo((s) => s.kind === 'showcase')
  // I gjemmetiden er «Start letingen» hovedknappen, ikke nytt spørsmål.
  const now = useGameNow()
  const hidingNow = useGame((s) => s.round.seekFrom !== null && now < s.round.seekFrom && (!!s.round.pause || Date.now() < s.round.seekFrom))
  const open = (item: Item | undefined) => item && !lockedBy(item, locks)

  if (draft) {
    return (
      <Section title={draft.id ? tr('Rediger spørsmål', 'Edit question') : tr('Nytt spørsmål', 'New question')}>
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
      {!replay && !(hidingNow && !isHider) && <div className="mb-4 flex gap-2">
        <button className={`btn flex-1 ${isHider || hidingNow ? '' : 'btn-primary'}`} data-guide="new-question" disabled={!first || (!isHider && !!blocked)} onClick={() => first && setDraft(newForm(first, lastPos ?? null))}>
          {isHider ? tr('+ Legg inn spørsmål selv', '+ Enter a question yourself') : tr('+ Nytt spørsmål', '+ New question')}
        </button>
        <button className="btn" onClick={undo} disabled={!canUndo}>
          {tr('Angre', 'Undo')}
        </button>
      </div>}
      {!isHider && blocked && <p className="-mt-2 mb-4 text-xs text-muted">{blocked}</p>}
      <LocksNotice />
      {isHider ? (
        <HiderQuestions data={data} />
      ) : (
        <Section title={`${tr('Spørsmålslogg', 'Question log')} (${questions.length})`}>
          {questions.length === 0 && (
            <p className="text-sm text-muted">
              {tr('Ingen spørsmål ennå. Seeker stiller spørsmål, hider svarer, og hvert svar krymper området hider kan være i.', 'No questions yet. The seeker asks, the hider answers, and each answer shrinks the area the hider can be in.')}
            </p>
          )}
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
                        ? tr('Før Move, teller ikke', 'Before Move, does not count')
                        : q.ignored
                          ? tr('Ikke brukt på kartet', 'Not used on the map')
                          : isHider || !shrinks(q) || q.kind === 'photo'
                          ? ''
                          : endgame && q.time >= endgame.time
                            ? canCutZone(q)
                              ? tr('Skjærer endgame-sonen', 'Cuts the endgame zone')
                              : ''
                            : `${before} → ${after} ${tr('stasjoner', 'stations')}`}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{describe(q, data)}</p>
                  {itemOf(q.item)?.rules && (
                    <p className="mt-1 text-xs text-muted">
                      {tr('Krav:', 'Requirements:')} {itemOf(q.item)!.rules}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${q.answer === null ? 'text-muted' : 'text-accent'}`}>
                      {q.answer === null ? tr('Venter på svar', 'Waiting for answer') : answerLabel(q, q.answer)}
                      {q.answer === null && (
                        <span className="ml-2">
                          <Countdown q={q} />
                        </span>
                      )}
                    </span>
                    {!replay && <span className="flex gap-1.5">
                      {/* Trykket seeker feil, kan spørsmålet rettes eller slettes helt til hider har svart. Etter det er det låst. */}
                      <button className="btn min-h-9!" disabled={q.answer !== null} onClick={() => setDraft(questionToForm(q))}>
                        {tr('Rediger', 'Edit')}
                      </button>
                      <button className="btn btn-danger min-h-9!" disabled={q.answer !== null} onClick={() => removeQuestion(q.id)} aria-label={tr(`Slett spørsmål ${i + 1}`, `Delete question ${i + 1}`)}>
                        {tr('Slett', 'Delete')}
                      </button>
                    </span>}
                  </div>
                  {q.answer === ANSWER_RANDOM && q.swap && (
                    <div className="mt-2 rounded-lg bg-panel-2 p-2 text-sm">
                      {tr('Hider spilte Randomize. Still dette i stedet:', 'The hider played Randomize. Ask this instead:')} <b>«{itemOf(q.swap)?.label}»</b> ({itemOf(q.swap)?.category})
                      {!questions.some((x) => x.time > q.time && x.item === q.swap) && (
                        <button className="btn btn-primary mt-2 w-full" disabled={!!blocked || !open(itemOf(q.swap))} onClick={() => setDraft(newForm(itemOf(q.swap)!, posOf(q) ?? lastPos))}>
                          {tr('Still', 'Ask')} «{itemOf(q.swap)?.label}»
                        </button>
                      )}
                    </div>
                  )}
                  {/* I endgame velger seekerne om spørsmål fra før skal gjøre sonen mindre. */}
                  {!isHider && !replay && endgame && q.time < endgame.time && q.time >= since && canCutZone(q) && (
                    <button type="button" role="switch" aria-checked={cutsZone(q, endgame)} className={`btn mt-2 min-h-9! w-full ${cutsZone(q, endgame) ? 'btn-on' : ''}`} onClick={() => toggleCut(q.id)}>
                      {cutsZone(q, endgame) ? tr('✓ Skjærer endgame-sonen', '✓ Cuts the endgame zone') : tr('Bruk i endgame-sonen', 'Use in the endgame zone')}
                    </button>
                  )}
                  {q.answer === ANSWER_VETO && <p className="mt-1 text-xs text-muted">{tr('Hider spilte Veto. Spørsmålet regnes som stilt.', 'The hider played Veto. The question counts as asked.')}</p>}
                  {q.manual && <p className="mt-1 text-xs text-muted">{tr('Hider svarte selv i stedet for å bruke appens utregning.', "The hider answered by hand instead of using the app's calculation.")}</p>}
                  <AnswerHistory q={q} />
                  {/* Er et svar feil, kan seekerne ta det ut av kartet. Spørsmålet regnes fortsatt som stilt. */}
                  {!isHider && !replay && informs(q) && q.kind !== 'photo' && q.kind !== 'manual' && q.time >= since && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!q.ignored}
                      className="link mt-1"
                      onClick={() => {
                        const ask = tr(
                          'Ta svaret ut av kartet? Bruk det når dere tror svaret er feil. Spørsmålet regnes fortsatt som stilt, og kan tas inn igjen.',
                          'Take the answer off the map? Use this when you think the answer is wrong. The question still counts as asked, and can be put back.',
                        )
                        if (q.ignored || confirm(ask)) toggleIgnored(q.id)
                      }}
                    >
                      {q.ignored ? tr('Bruk svaret på kartet igjen', 'Use the answer on the map again') : tr('Ta svaret ut av kartet', 'Take the answer off the map')}
                    </button>
                  )}
                  {!isHider && !replay && (
                    <input
                      className="field mt-2 min-h-9! text-sm!"
                      value={q.note ?? ''}
                      onChange={(e) => setNote(q.id, e.target.value)}
                      placeholder={tr('Notat', 'Note')}
                      aria-label={tr(`Notat til spørsmål ${i + 1}`, `Note for question ${i + 1}`)}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </Section>
      )}
    </div>
  )
}
