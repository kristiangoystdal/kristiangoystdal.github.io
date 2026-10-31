import { BookOpen, ChevronLeft, ChevronRight, Compass, Gamepad2, Play, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CITIES } from './cities'
import { useDemo } from './demo'
import { answerLabel, categoryOf, describe, place } from './form'
import { SCRIPTS, nextStep, prevStep, startGuide, stopGuide, useGuide } from './guide'
import { goToStep, startShowcase, stepsOf, stopShowcase, useShowcase, type SimGame } from './showcase'
import { Spinner } from './ui'
import { useUi } from './store'
import { setTestMode, useTestMode } from './testmode'
import type { GeoData, Question, Station } from './types'

const CHECK_MS = 400
const MARK = 'guide-target'

/** Rammen rundt det steget handler om, i skjermkoordinater. null = ingenting å peke på. */
type Spot = { x: number; y: number; w: number; h: number } | null

/** Markerer knappen steget handler om, finner rammen rundt den, og går videre når steget er gjort. */
function useStepEffects(): Spot {
  const script = useGuide((s) => s.script)
  const step = useGuide((s) => s.step)
  const [spot, setSpot] = useState<Spot>(null)
  useEffect(() => {
    setSpot(null)
    if (!script) return
    const current = SCRIPTS[script][step]
    if (!current) return
    // Etter at steget er tegnet, så knappene det peker på finnes.
    const enter = setTimeout(() => current.enter?.(), 50)
    let scrolled = false
    const marked = new Set<Element>()
    const tick = () => {
      if (current.done?.()) return nextStep()
      if (!current.target) return setSpot(null)
      let first: Element | null = null
      for (const el of document.querySelectorAll(`[data-guide="${current.target}"]`)) {
        if (!(el as HTMLElement).offsetParent && el.tagName !== 'MAIN') continue
        el.classList.add(MARK)
        marked.add(el)
        first ??= el
        if (!scrolled) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          scrolled = true
        }
      }
      const r = first?.getBoundingClientRect()
      setSpot((old) => {
        if (!r || r.width === 0) return null
        const next = { x: r.left, y: r.top, w: r.width, h: r.height }
        return old && old.x === next.x && old.y === next.y && old.w === next.w && old.h === next.h ? old : next
      })
    }
    tick()
    const timer = setInterval(tick, CHECK_MS)
    // Rammen følger med når panelet rulles.
    const onScroll = () => requestAnimationFrame(tick)
    addEventListener('scroll', onScroll, true)
    return () => {
      clearTimeout(enter)
      clearInterval(timer)
      removeEventListener('scroll', onScroll, true)
      for (const el of marked) el.classList.remove(MARK)
    }
  }, [script, step])
  return spot
}

const SPOT_PAD = 6

/** Demper resten av skjermen rundt det steget handler om. Stopper ikke trykk, så man kan gjøre det steget ber om. */
function Spotlight({ spot }: { spot: Spot }) {
  if (!spot) return null
  return (
    <div
      className="pointer-events-none fixed z-[1400] rounded-[12px] transition-[left,top,width,height] duration-200 motion-reduce:transition-none"
      style={{ left: spot.x - SPOT_PAD, top: spot.y - SPOT_PAD, width: spot.w + SPOT_PAD * 2, height: spot.h + SPOT_PAD * 2, boxShadow: '0 0 0 9999px rgb(8 12 24 / 0.5)' }}
      aria-hidden
    />
  )
}

/** Fremdrift som en tynn linje øverst i arket. */
function Progress({ n, at }: { n: number; at: number }) {
  return (
    <span className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-[16px] bg-border" aria-hidden>
      <span className="block h-full bg-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((at + 1) / n) * 100}%` }} />
    </span>
  )
}

/** Arket som guider og simulerte spill vises i: nederst i kartet, rett over panelet. */
function DockedSheet({ label, children, progress }: { label: string; children: React.ReactNode; progress?: { n: number; at: number } }) {
  const box = useRef<HTMLDivElement>(null)
  // Kartet får vite hvor mye arket dekker, så det kan zoome stasjonene inn over det.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => useUi.setState({ mapInset: el.offsetHeight + 8 }))
    ro.observe(el)
    return () => {
      ro.disconnect()
      useUi.setState({ mapInset: 0 })
    }
  }, [])
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[1500] flex justify-center md:inset-x-auto md:right-4 md:bottom-4 md:w-96" role="dialog" aria-label={label} aria-live="polite">
      <div ref={box} className="pointer-events-auto relative w-full rounded-[16px] border border-border bg-panel px-3 pt-3.5 pb-3 shadow-2xl">
        {progress && <Progress {...progress} />}
        {children}
      </div>
    </div>
  )
}

function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="-m-1 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-panel-2" aria-label={label} onClick={onClick}>
      <X size={18} aria-hidden />
    </button>
  )
}

/** Omvisningen og demoen: ett kort steg om gangen, i et ark nederst i kartet. */
export function GuideOverlay({ stations }: { stations: Station[] }) {
  const spot = useStepEffects()
  const script = useGuide((s) => s.script)
  const step = useGuide((s) => s.step)
  const picking = useUi((s) => !!s.pick || !!s.draw)
  const demo = useDemo((s) => s.kind === 'demo')
  // Guiden tegnes på nytt jevnlig, så teksten følger med (f.eks. hvor mange stasjoner som er igjen).
  const [, redraw] = useState(0)
  useEffect(() => {
    if (!script) return
    const t = setInterval(() => redraw((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [script])
  if (!script || picking) return null
  const steps = SCRIPTS[script]
  const s = steps[step]
  if (!s) return null
  const last = step === steps.length - 1
  const waiting = !!s.done && !s.done()

  return (
    <>
      <Spotlight spot={spot} />
      <DockedSheet label="Guide" progress={{ n: steps.length, at: step }}>
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-[17px] leading-tight font-bold">{s.title}</h2>
          <span className="board pt-0.5 text-sm text-muted" aria-label={`Steg ${step + 1} av ${steps.length}`}>
            {step + 1}/{steps.length}
          </span>
          {!last && <CloseButton onClick={stopGuide} label={script === 'demo' ? 'Avslutt demoen' : 'Avslutt omvisningen'} />}
        </div>
        <p className="mt-1 text-[15px] leading-snug">{s.body()}</p>
        {demo && s.position && <DemoPosition stations={stations} />}
        <div className="mt-2.5 flex gap-1.5">
          {step > 0 && (
            <button className="btn px-3!" aria-label="Forrige steg" onClick={prevStep}>
              <ChevronLeft size={20} aria-hidden />
            </button>
          )}
          {last && script === 'tour' ? (
            <>
              <button className="btn flex-1" onClick={stopGuide}>
                Ferdig
              </button>
              <button className="btn btn-primary flex-1" onClick={() => startGuide('demo')}>
                Spill demorunde
              </button>
            </>
          ) : last ? (
            <button className="btn btn-primary flex-1" onClick={stopGuide}>
              Avslutt demoen
            </button>
          ) : waiting ? (
            <button className="btn flex-1" onClick={nextStep}>
              Hopp over
            </button>
          ) : (
            <button className="btn btn-primary flex-1" onClick={nextStep}>
              {step === 0 ? 'Start' : 'Neste'} <ChevronRight size={18} aria-hidden />
            </button>
          )}
        </div>
      </DockedSheet>
    </>
  )
}

/** I demoen velger seeker selv hvor hen står, ved å trykke på kartet. */
function DemoPosition({ stations }: { stations: Station[] }) {
  const pos = useTestMode((s) => s.pos)
  const setPick = useUi((s) => s.setPick)
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-panel-2 p-2 text-xs">
      <span>📍 Du står {pos ? place(pos, stations) : 'ingen steder ennå'}</span>
      <button className="btn min-h-9!" data-guide="move-me" onClick={() => setPick({ label: 'Hvor står du', done: (p) => setTestMode({ pos: p }) })}>
        Flytt meg
      </button>
    </div>
  )
}

/** Starter omvisningen, demoen eller et simulert spill. Avslutter det som eventuelt går fra før. */
function learn(what: 'tour' | 'demo' | { city: string }) {
  if (typeof what === 'object') {
    useGuide.setState({ script: null, seen: true })
    useUi.getState().setSheet(null)
    startShowcase(what.city)
    return
  }
  useShowcase.setState({ city: null, sim: null, step: 0, error: '' })
  startGuide(what)
}

/** En rad i listen over måter å lære appen på. */
function LearnRow({ icon, title, detail, onClick, guide }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void; guide?: string }) {
  return (
    <button className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left" data-guide={guide} onClick={onClick}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-panel-2 text-accent" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block font-sign">{title}</b>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden />
    </button>
  )
}

/** Måtene å lære appen på: demo, omvisning, reglene og simulerte spill i hver by. */
export function LearnButtons() {
  const sandbox = useDemo((s) => s.active)
  return (
    <div>
      <div className="divide-y divide-border rounded-[14px] border border-border bg-panel">
        <LearnRow icon={<Gamepad2 size={20} />} title="Spill en demorunde" detail="Du leter etter en datastyrt hider i Oslo. Ca. 5 minutter." onClick={() => learn('demo')} />
        <LearnRow icon={<Compass size={20} />} title="Ta en omvisning" detail="Hva knappene i lobbyen gjør. Under ett minutt." guide="learn-tour" onClick={() => learn('tour')} />
        <LearnRow icon={<BookOpen size={20} />} title="Les reglene" detail="Hele regelboken, med spørsmål og kort." onClick={() => useUi.getState().setRules('')} />
      </div>
      <h3 className="label mt-5">Se et ferdig spill</h3>
      <p className="mb-2 text-sm text-muted">Bla gjennom en runde spørsmål for spørsmål, og se hvordan kartet krymper.</p>
      <div className="grid grid-cols-2 gap-1.5">
        {CITIES.map((c) => (
          <button key={c.id} className="btn justify-start! gap-2!" onClick={() => learn({ city: c.id })}>
            <Play size={16} className="text-accent" aria-hidden /> {c.name}
          </button>
        ))}
      </div>
      {sandbox && (
        <button className="btn btn-danger mt-4 w-full" onClick={() => (useShowcase.getState().city ? stopShowcase() : stopGuide())}>
          Avslutt og gå tilbake til spillet mitt
        </button>
      )}
    </div>
  )
}

/** I hjelpepanelet: de samme knappene. */
export function HelpButtons() {
  return (
    <section className="mb-5">
      <h3 className="label">Lær appen</h3>
      <LearnButtons />
    </section>
  )
}

/** Kort forklaring av hver spørsmålstype, til de simulerte spillene. */
const KIND_TIPS: Partial<Record<Question['kind'], string>> = {
  radar: 'Radar: er hider innenfor en sirkel rundt seekerne? Begge svar fjerner en stor del av kartet.',
  thermometer: 'Termometer: seekerne reiser et stykke. Kom de nærmere hider (varmere) eller lenger unna (kaldere)? Kartet deles på midten mellom de to stedene.',
  admin: 'Matching: er hider i samme område som seekerne? Ja gir bare det området, nei fjerner det.',
  nearest: 'Matching: har hider samme nærmeste sted av denne typen som seekerne?',
  geodist: 'Measuring: er hider nærmere eller lenger fra kysten enn seekerne er?',
  measure: 'Measuring: er hider nærmere eller lenger fra nærmeste sted av denne typen enn seekerne er?',
  transit: 'Matching: stopper transportmiddelet seekerne sitter på ved hiders stasjon?',
}

/** Kort navn på kategorien, til tidslinjen i de simulerte spillene. */
const SHORT: Record<string, string> = { Radar: 'R', Thermometer: 'T', Matching: 'Ma', Measuring: 'Me', Photos: 'F', Tentacles: 'Te' }

/**
 * Det simulerte spillet: et ark nederst i kartet med en tidslinje over spørsmålene. Trykk på et
 * spørsmål for å hoppe dit, eller bla med pilene. Kartet viser runden slik den sto etter det steget.
 */
export function ShowcaseCard({ data }: { data: GeoData }) {
  const cityId = useShowcase((s) => s.city)
  const sim = useShowcase((s) => s.sim)
  const step = useShowcase((s) => s.step)
  const error = useShowcase((s) => s.error)
  const ready = useShowcase((s) => s.ready)
  const busy = useShowcase((s) => s.busy)
  const picking = useUi((s) => !!s.pick || !!s.draw)
  if (!cityId || picking) return null
  const cityName = CITIES.find((c) => c.id === cityId)?.name ?? cityId
  const n = sim?.questions.length ?? 0
  const total = sim ? stepsOf(sim) : 0
  const q = sim && step >= 1 && step <= n ? sim.questions[step - 1] : null
  const before = sim ? (step <= 1 ? sim.total : sim.left[step - 2]) : 0
  const after = sim && step >= 1 ? sim.left[Math.min(step, n) - 1] : 0

  return (
    <DockedSheet label="Simulert spill">
      <div className="mb-2 flex items-center gap-2">
        <span className="sign px-2 py-0.5 text-sm">Reprise</span>
        <span className="flex-1 font-sign text-sm text-muted">Simulert spill i {cityName}</span>
        <CloseButton onClick={stopShowcase} label="Avslutt det simulerte spillet" />
      </div>
      {!sim ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted">
          {error || (
            <>
              <Spinner /> Henter spillet…
            </>
          )}
        </p>
      ) : (
        <>
          <Timeline sim={sim} step={step} busy={busy} />
          {step === 0 && (
            <>
              <h2 className="mt-2 text-lg leading-tight font-bold">En datastyrt hider har gjemt seg</h2>
              <p className="mt-1 text-[15px] leading-snug">
                Hen er ved én av {sim.total} stasjoner. Seekerne starter ved {sim.start}. Bla med pilene og se hvordan hvert svar krymper kartet.
              </p>
            </>
          )}
          {q && (
            <>
              <div className="mt-2 flex items-end justify-between gap-3">
                <h2 className="text-lg leading-tight font-bold">
                  {categoryOf(q)}
                  <span className="block text-sm font-normal text-muted">Spørsmål {step} av {n}</span>
                </h2>
                <span className="board shrink-0 text-right text-lg leading-none" aria-label={`${before} til ${after} stasjoner igjen`}>
                  <span className="text-muted">{before}</span> → <b className="text-accent">{after}</b>
                </span>
              </div>
              <p className="mt-1 text-[15px] leading-snug">{describe(q, data)}</p>
              <p className="mt-1.5 flex items-center gap-2 text-sm">
                Hider svarte <span className="sign px-2 py-0.5 text-[15px]">{answerLabel(q, q.answer!)}</span>
              </p>
              {KIND_TIPS[q.kind] && <p className="mt-1 text-sm text-muted">{KIND_TIPS[q.kind]}</p>}
            </>
          )}
          {step > n && (
            <>
              <h2 className="mt-2 text-lg leading-tight font-bold">Endgame ved {sim.hider.name}</h2>
              <p className="mt-1 text-[15px] leading-snug">
                {after === 1 ? 'Med én stasjon igjen reiser seekerne dit' : `Med ${after} stasjoner igjen velger seekerne den mest sannsynlige, reiser dit`} og starter endgame. Hider var ved {sim.hider.name}. I et ekte spill leter seekerne nå i sonen til de ser hider.
              </p>
            </>
          )}
          {ready < n && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted" role="status">
              <Spinner className="size-3!" /> Forbereder stegene ({ready}/{n})
            </p>
          )}
          <div className="mt-3 flex gap-1.5">
            <button className="btn px-3!" aria-label="Forrige" disabled={step === 0 || busy} onClick={() => goToStep(step - 1)}>
              <ChevronLeft size={20} aria-hidden />
            </button>
            {step < total - 1 ? (
              <button className="btn btn-primary flex-1" disabled={busy} onClick={() => goToStep(step + 1)}>
                {busy ? <Spinner /> : null}
                Neste <ChevronRight size={18} aria-hidden />
              </button>
            ) : (
              <button className="btn btn-primary flex-1" onClick={stopShowcase}>
                Ferdig
              </button>
            )}
          </div>
        </>
      )}
    </DockedSheet>
  )
}

/** Tidslinjen: start, ett punkt per spørsmål og endgame. Trykk for å hoppe dit. */
function Timeline({ sim, step, busy }: { sim: SimGame; step: number; busy: boolean }) {
  const n = sim.questions.length
  const row = useRef<HTMLDivElement>(null)
  // Steget du er på holdes synlig når tidslinjen er bredere enn skjermen.
  // Nyere nettlesere returnerer et løfte fra scrollIntoView. React tåler bare en funksjon tilbake, derav void.
  useEffect(() => void row.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), [step])
  // Steget du er på har hele navnet. De andre er forkortet, så hele runden får plass.
  const items = [{ key: 's', label: 'Start', full: 'Start' }, ...sim.questions.map((q, i) => ({ key: q.id, label: SHORT[categoryOf(q)] ?? String(i + 1), full: categoryOf(q) })), { key: 'e', label: 'Slutt', full: 'Endgame' }]
  return (
    <div ref={row} className="-mx-1 flex items-center overflow-x-auto px-1 py-1 [scrollbar-width:none]" role="tablist" aria-label="Steg i runden">
      {items.map((it, i) => {
        const at = i === step
        const done = i < step
        return (
          <div key={it.key} className="flex shrink-0 items-center">
            {i > 0 && <span className={`h-0.5 w-2 ${i <= step ? 'bg-accent' : 'bg-border'}`} aria-hidden />}
            <button
              role="tab"
              aria-selected={at}
              aria-label={i === 0 ? 'Start' : i > n ? 'Endgame' : `Spørsmål ${i}: ${categoryOf(sim.questions[i - 1])}`}
              disabled={busy}
              className={`grid h-7 min-w-7 cursor-pointer place-items-center rounded-full px-1.5 font-sign text-xs font-bold ${at ? 'bg-accent text-accent-text' : done ? 'bg-accent/20 text-accent' : 'border border-border bg-panel text-muted'}`}
              onClick={() => goToStep(i)}
            >
              {at ? it.full : it.label}
            </button>
          </div>
        )
      })}
    </div>
  )
}
