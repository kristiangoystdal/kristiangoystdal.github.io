import { useEffect, useState, type ReactNode } from 'react'
import { gameNow, waitingForAnswer, type PauseKind } from './clock'
import { place } from './form'
import { stationPos } from './geo'
import { PANEL_DEFAULT, PANEL_HIDE, PANEL_MAX, useGame, usePanel, useUi } from './store'
import { useTestMode } from './testmode'
import type { LngLat, Station } from './types'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** Tiden spillets klokker viser. Står stille mens spillet er på pause. */
export function useGameNow() {
  const pause = useGame((s) => s.round.pause)
  return gameNow({ pause }, useNow())
}

export const PAUSE_TEXT: Record<PauseKind, { title: string; body: string }> = {
  pause: { title: '⏸ Spillet er på pause', body: 'Alle klokker står. Alle blir stående der de er til spillet fortsetter.' },
  rest: { title: '🌙 Hvileperiode', body: 'Alle klokker står. Før spillet fortsetter må alle tilbake til nøyaktig samme sted.' },
  move: { title: '🧳 Hider har spilt Move', body: 'Hiders klokke står mens hider finner en ny sone. Seekerne blir stående og kan ikke stille spørsmål.' },
}

/** Tid igjen som m:ss, eller h:mm:ss. */
export const left = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(t / 3600)
  const mm = String(Math.floor((t % 3600) / 60)).padStart(h ? 2 : 1, '0')
  return `${h ? `${h}:` : ''}${mm}:${String(t % 60).padStart(2, '0')}`
}

/** Hvor lenge Move varer, og hvilken stasjon hider forlot. */
export function MoveInfo({ stations }: { stations: Station[] }) {
  const now = useNow()
  const pause = useGame((s) => s.round.pause)
  const from = useGame((s) => s.round.moves?.at(-1)?.from)
  if (pause?.kind !== 'move') return null
  const name = stations.find((x) => x.id === from)?.name
  return (
    <span className="block text-xs">
      {pause.until && <>Ny sone innen {left(pause.until - now)}. </>}
      {name ? (
        <>
          Hider forlot <b>{name}</b>.
        </>
      ) : (
        'Hider sier fra hvilken stasjon som ble forlatt.'
      )}
    </span>
  )
}

/** Det alle må vite akkurat nå: pause, eller at hiders klokke står fordi svartiden er ute. */
export function GameStatus({ stations }: { stations: Station[] }) {
  const now = useGameNow()
  const pause = useGame((s) => s.round.pause)
  const running = useGame((s) => s.round.seekFrom !== null)
  const waiting = useGame((s) => running && waitingForAnswer(s.questions, s.settings.size, now))
  if (!running || (!pause && !waiting)) return null
  const text = pause ? PAUSE_TEXT[pause.kind] : { title: 'Hiders klokke står stille', body: 'Svartiden er ute. Klokken starter igjen når svaret kommer.' }
  return (
    <div className="card pointer-events-auto border-accent! px-3! py-2! text-sm shadow-lg" role="status">
      <b className="block">{text.title}</b>
      <span className="text-xs text-muted">{text.body}</span>
      <MoveInfo stations={stations} />
    </div>
  )
}

/** Siste posisjon fra en GPS-følging som alt går (posisjonsdeling, hider, termometer). */
let lastFix: { pos: LngLat; t: number; accuracy: number | null } | null = null
const FRESH_MS = 10000
const USABLE_MS = 120000
export const rememberFix = (pos: LngLat, accuracy: number | null = null) => void (lastFix = { pos, t: Date.now(), accuracy })
// Slås demoens falske GPS av eller på, eller flyttes den, gjelder ikke den forrige posisjonen lenger.
useTestMode.subscribe((s, prev) => {
  if (s.on === prev.on && s.pos === prev.pos && s.accuracy === prev.accuracy) return
  lastFix = s.on && s.pos ? { pos: s.pos, t: Date.now(), accuracy: s.accuracy } : null
})
/** Hvor nøyaktig siste posisjon er, i meter. null = ukjent. */
export const fixAccuracy = () => lastFix?.accuracy ?? null

/** Med `fresh` brukes bare en posisjon fra de siste sekundene. */
const NOW_MS = 3000

/**
 * Henter posisjonen. Følger telefonen alt GPS, brukes den siste posisjonen derfra,
 * og den er også reserven hvis et nytt GPS-kall ikke svarer.
 * `fresh`: posisjonen skal gjelde akkurat nå, f.eks. når hider svarer. Da brukes
 * ingen gammel posisjon i stedet, og kallet feiler heller.
 */
export function locate({ fresh = false } = {}): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (lastFix && Date.now() - lastFix.t < (fresh ? NOW_MS : FRESH_MS)) return resolve(lastFix.pos)
    if (!navigator.geolocation) return reject(new Error('Nettleseren støtter ikke posisjon'))
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos: LngLat = [p.coords.longitude, p.coords.latitude]
        rememberFix(pos, p.coords.accuracy)
        resolve(pos)
      },
      () =>
        !fresh && lastFix && Date.now() - lastFix.t < USABLE_MS
          ? resolve(lastFix.pos)
          : reject(new Error('Fikk ikke hentet posisjonen. Sjekk at nettsiden har lov til å bruke den.')),
      { enableHighAccuracy: true, timeout: fresh ? 10000 : 15000, maximumAge: fresh ? 0 : 5000 },
    )
  })
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="label">{title}</h2>
      {children}
    </section>
  )
}

/** Velg et punkt: trykk på kartet, bruk GPS eller velg en stasjon. */
export function PointInput(props: { label: string; value: LngLat | null; onChange: (p: LngLat) => void; stations: Station[] }) {
  const { label, value, onChange, stations } = props
  const setPick = useUi((s) => s.setPick)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const gps = async () => {
    setBusy(true)
    setError('')
    try {
      onChange(await locate())
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <div className="mb-3">
      <span className="label">{label}</span>
      <div className="mb-1.5 text-sm">{value ? place(value, stations) : <span className="text-muted">Ikke valgt</span>}</div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="btn" onClick={() => setPick({ label, done: onChange })}>
          Velg på kart
        </button>
        <button type="button" className="btn" onClick={gps} disabled={busy}>
          {busy ? 'Henter…' : 'Min posisjon'}
        </button>
        <select
          className="field w-auto! flex-1"
          value=""
          aria-label={`${label}: velg stasjon`}
          onChange={(e) => {
            const s = stations.find((x) => x.id === e.target.value)
            if (s) onChange(stationPos(s))
          }}
        >
          <option value="">Stasjon…</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  )
}

/**
 * Av/på for én innstilling. Samme utseende overalt: tittel, en linje om hva valget betyr nå,
 * og bryteren til høyre.
 */
export function Switch(props: { on: boolean; onChange: (on: boolean) => void; title: string; detail?: ReactNode; disabled?: boolean; guide?: string }) {
  const { on, onChange, title, detail, disabled, guide } = props
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} data-guide={guide} className="card flex w-full cursor-pointer items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60" onClick={() => onChange(!on)}>
      <span className="text-sm">
        <b className="block">{title}</b>
        {detail && <span className="text-xs text-muted">{detail}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-border'}`} aria-hidden>
        <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

/** Velg ett av noen få alternativer, f.eks. rolle, by, spillstørrelse eller tema. */
export function Segmented<T extends string>(props: { value: T; options: { value: T; label: ReactNode; detail?: ReactNode }[]; onChange: (v: T) => void; disabled?: boolean; label: string; guide?: string }) {
  const { value, options, onChange, disabled, label, guide } = props
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label} data-guide={guide}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`btn h-auto! flex-1 flex-col! gap-0! py-1.5! ${value === o.value ? 'btn-on' : ''}`}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.detail && <span className="text-xs font-normal text-muted">{o.detail}</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * Et steg i lobbyen: nummer, tittel og en kort oppsummering når steget er lukket.
 * `done` viser en hake i stedet for nummeret.
 */
export function Step(props: { n: number; title: string; summary?: ReactNode; done?: boolean; open: boolean; onToggle: () => void; children: ReactNode; guide?: string }) {
  const { n, title, summary, done, open, onToggle, children, guide } = props
  return (
    <section className="card mb-3 p-0!" data-guide={guide}>
      <button type="button" className="flex w-full cursor-pointer items-center gap-3 p-3 text-left" aria-expanded={open} onClick={onToggle}>
        <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-ok text-white' : 'bg-accent text-accent-text'}`} aria-hidden>
          {done ? '✓' : n}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block">{title}</b>
          {!open && summary && <span className="block truncate text-xs text-muted">{summary}</span>}
        </span>
        <span className="text-muted" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </section>
  )
}

/** Snurrende ring som viser at noe lastes. */
export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px] ${className}`} aria-hidden />
}

/** Lastemelding: ring og tekst, f.eks. mens kartet for en by lastes. */
export function Loading({ text, full = false }: { text: string; full?: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-muted ${full ? 'h-dvh justify-center p-6' : ''}`} role="status">
      <Spinner />
      {text}
    </div>
  )
}

const DRAG_PX = 5

/**
 * Streken over panelet på mobil. Dra opp og ned for å velge hvor mye av skjermen som er
 * kart og hvor mye som er panel (0–90 %). Et kort trykk skjuler eller viser panelet.
 */
export function PanelHandle({ hidden }: { hidden: boolean }) {
  const collapsed = useUi((s) => s.collapsed)
  const pct = usePanel((s) => s.pct)
  const [dragging, setDragging] = useState(false)
  const pctAt = (clientY: number) => Math.max(0, Math.min(PANEL_MAX, ((window.innerHeight - clientY) / window.innerHeight) * 100))
  const set = (p: number) => {
    if (p < PANEL_HIDE) useUi.setState({ collapsed: true })
    else {
      usePanel.setState({ pct: Math.round(p) })
      useUi.setState({ collapsed: false })
    }
  }
  /**
   * Følger fingeren over hele vinduet til den slippes, ikke bare over streken. Noen nettlesere
   * slipper taket i streken når fingeren beveger seg fort, og da ville panelet stoppet halvveis.
   */
  const start = (e: React.PointerEvent) => {
    const y0 = e.clientY
    // Høyden da dragingen startet. Dras panelet helt ned, åpner det seg igjen i den høyden.
    const from = usePanel.getState().pct
    const wasCollapsed = useUi.getState().collapsed
    let moved = false
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientY - y0) < DRAG_PX) return
      if (!moved) setDragging((moved = true))
      ev.preventDefault()
      set(pctAt(ev.clientY))
    }
    const end = (ev: PointerEvent) => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', end)
      removeEventListener('pointercancel', end)
      setDragging(false)
      if (ev.type === 'pointercancel') return
      // Et kort trykk uten å dra skjuler eller viser panelet.
      if (!moved) useUi.setState({ collapsed: !wasCollapsed })
      else if (useUi.getState().collapsed) usePanel.setState({ pct: from })
    }
    addEventListener('pointermove', move, { passive: false })
    addEventListener('pointerup', end)
    addEventListener('pointercancel', end)
  }
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Dra for å endre hvor stor del av skjermen som er kart"
      aria-valuemin={0}
      aria-valuemax={PANEL_MAX}
      aria-valuenow={collapsed ? 0 : pct}
      tabIndex={0}
      data-guide="panel-handle"
      className={`grid h-7 w-full shrink-0 cursor-row-resize touch-none place-items-center select-none md:hidden ${hidden ? 'hidden' : ''}`}
      onPointerDown={start}
      onKeyDown={(e) => {
        const step = e.key === 'ArrowUp' ? 5 : e.key === 'ArrowDown' ? -5 : 0
        if (!step) return
        e.preventDefault()
        set((collapsed ? 0 : pct) + step)
      }}
    >
      <span className={`h-1.5 w-12 rounded-full ${dragging ? 'bg-accent' : 'bg-border'}`} />
    </div>
  )
}

/** Høyden panelet skal ha på mobil. Skjult panel er bare streken (og fanene på spillskjermen). */
export function usePanelHeight() {
  const collapsed = useUi((s) => s.collapsed)
  const pct = usePanel((s) => s.pct) || PANEL_DEFAULT
  return collapsed ? 'auto' : `${pct}dvh`
}
