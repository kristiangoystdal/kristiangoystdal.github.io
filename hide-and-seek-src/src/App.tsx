import { useEffect, useMemo, useState } from 'react'
import { useArchivedView } from './Archive'
import MapView from './MapView'
import { BonusPrompt, GamePanel, MapPanel, SettingsPanel } from './Panels'
import QuestionsView from './QuestionsView'
import { city, cityOf, linesOf, modesOf, setActiveModes } from './cities'
import { loadData } from './data'
import { movedAt } from './clock'
import { clipData, dist, hiderStation, onlyLines, solve } from './geo'
import { useHiderPath } from './hiderPath'
import { Rules } from './Rules'
import { useThermoGps } from './Tools'
import { gameFromHash, useGame, useHiderPos, useUi, type Tab } from './store'
import { Toast } from './notify'
import { rememberFix } from './ui'
import { joinRoom, resumeRoom, roomFromHash, shareSeekerPos, useSync, type SeekerPos } from './sync'
import type { GeoData, LngLat } from './types'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'map', label: 'Kart', icon: '🗺️' },
  { key: 'questions', label: 'Spørsmål', icon: '❓' },
  { key: 'game', label: 'Spill', icon: '⏱️' },
  { key: 'settings', label: 'Oppsett', icon: '⚙️' },
]

function useTheme() {
  const theme = useGame((s) => s.settings.theme)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme = theme === 'auto' ? (mq.matches ? 'dark' : 'light') : theme
      // Statuslinjen på telefonen følger temaet.
      const panel = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim()
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', panel)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/** Åpnes siden med en romkode eller et delt spill i lenken, tilbys det én gang. Ellers gjenopptas forrige rom. */
function useSharedLink() {
  useEffect(() => {
    const room = roomFromHash(location.hash)
    if (room) {
      history.replaceState(null, '', location.pathname)
      const mine = useGame.getState().questions.length
      if (!mine || confirm(`Bli med i rom ${room}? Dine ${mine} spørsmål erstattes av rommets.`)) void joinRoom(room)
      return
    }
    resumeRoom()
    const game = gameFromHash(location.hash)
    if (!game) return
    history.replaceState(null, '', location.pathname)
    const mine = useGame.getState().questions.length
    const ask = `Importere delt spill med ${game.questions.length} spørsmål?${mine ? ` Dine ${mine} spørsmål erstattes (kan angres).` : ''}`
    if (confirm(ask)) useGame.getState().importGame(game)
  }, [])
}

const SHARE_EVERY_MS = 10000

const HIDER_MOVE_M = 10

/**
 * Hiders posisjon følger GPS hele tiden mens appen er åpen, så svarforslagene alltid
 * gjelder der hider står nå. Den lagres ikke, og deles aldri. Stasjonen hider har
 * valgt beholdes så lenge hider er i sonen dens.
 */
function useHiderLocation(data: GeoData | null) {
  const on = useGame((s) => s.mode === 'hider')
  useEffect(() => {
    if (!on || !data) return
    if (!navigator.geolocation) return void useHiderPos.setState({ error: 'Nettleseren støtter ikke posisjon.' })
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const pos: LngLat = [p.coords.longitude, p.coords.latitude]
        rememberFix(pos)
        const last = useHiderPos.getState().pos
        // Små GPS-hopp gir ikke nye svarforslag, men tidspunktet viser at posisjonen er fersk.
        const here = last && dist(last, pos) < HIDER_MOVE_M ? last : pos
        useHiderPos.setState({ pos: here, t: Date.now(), accuracy: p.coords.accuracy, error: '' })
        const { hider, settings, setHider } = useGame.getState()
        const id = hiderStation(data.stations, here, settings.zoneRadius, hider.stationId).id
        if (id !== hider.stationId) setHider({ stationId: id })
      },
      (e) => useHiderPos.setState({ error: e.code === e.PERMISSION_DENIED ? 'Nettsiden har ikke lov til å bruke posisjonen. Slå det på i innstillingene.' : 'Finner ikke posisjonen din akkurat nå.' }),
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [on, data])
}

/** En pause med sluttid (Move) slutter av seg selv. Den som ser det først, starter klokkene igjen. */
function useAutoResume() {
  const until = useGame((s) => s.round.pause?.until ?? null)
  useEffect(() => {
    if (until === null) return
    const t = setTimeout(() => useGame.getState().resumeGame(), Math.max(0, until - Date.now()))
    return () => clearTimeout(t)
  }, [until])
}

/**
 * Deler seekers posisjon i rommet så hider kan følge med. Nettleseren gir bare
 * posisjon mens appen er åpen. Hiders posisjon deles aldri.
 */
function useShareLocation() {
  const on = useGame((s) => s.sharePos && s.mode === 'seeker')
  const room = useSync((s) => s.room)
  useEffect(() => {
    if (!on || !room || !navigator.geolocation) return
    let here: LngLat | null = null
    let speed: number | null = null
    let sent: SeekerPos | null = null
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        here = [p.coords.longitude, p.coords.latitude]
        rememberFix(here)
        speed = p.coords.speed
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
    const send = () => {
      if (!here) return
      const t = Date.now()
      // Ikke alle telefoner oppgir fart. Da regnes den fra forrige punkt.
      const v = speed ?? (sent ? dist(sent.pos, here) / ((t - sent.t) / 1000) : null)
      shareSeekerPos((sent = { pos: here, t, v: v === null ? null : Math.round(v * 10) / 10 }))
    }
    const timer = setInterval(send, SHARE_EVERY_MS)
    return () => {
      navigator.geolocation.clearWatch(watch)
      clearInterval(timer)
      shareSeekerPos(null)
    }
  }, [on, room])
}

export default function App() {
  const [loaded, setData] = useState<GeoData | null>(null)
  const [error, setError] = useState(false)
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  const pick = useUi((s) => s.pick)
  const draw = useUi((s) => s.draw)
  const collapsed = useUi((s) => s.collapsed)
  const setCollapsed = useUi((s) => s.setCollapsed)
  const questions = useGame((s) => s.questions)
  const settings = useGame((s) => s.settings)
  const mode = useGame((s) => s.mode)
  const endgame = useGame((s) => s.round.endgame ?? null)
  const since = useGame((s) => movedAt(s.round))
  const pending = questions.filter((q) => q.answer === null).length
  const room = useSync((s) => s.room)
  const online = useSync((s) => s.status === 'online')

  useTheme()
  useSharedLink()
  useShareLocation()
  useAutoResume()
  useThermoGps()
  useHiderPath()
  // Kartdataene hører til byen. Bytter noen by (her eller i rommet), lastes den nye byen inn.
  const cityId = useGame((s) => s.settings.city)
  useEffect(() => {
    let live = true
    setData(null)
    setError(false)
    loadData(cityId).then(
      (d) => {
        if (!live) return
        // Ny by: linjene til byens vanlige transportmidler er med til noen velger annet.
        const all = d.lines.features.map((f) => f.properties.line)
        const { settings } = useGame.getState()
        if (!settings.lines.some((l) => all.includes(l))) useGame.setState({ settings: { ...settings, lines: linesOf(d, city().defaultModes) } })
        setData(d)
      },
      () => live && setError(true),
    )
    return () => {
      live = false
    }
  }, [cityId])
  useEffect(() => void (document.title = `Hide and Seek ${cityOf(cityId).name}`), [cityId])

  // Tekstene følger transportmidlene som er med: «T-banestasjon», «bussholdeplass» eller «holdeplass».
  useMemo(() => loaded && setActiveModes(modesOf(loaded, settings.lines)), [loaded, settings.lines])
  // Steder utenfor spillområdet regnes som om de ikke finnes.
  // Linjer som ikke er med, finnes heller ikke.
  const data = useMemo(() => loaded && onlyLines(clipData(loaded, settings.playArea), settings.lines), [loaded, settings.playArea, settings.lines])
  // Hiders stasjon velges bare blant stasjonene som er med.
  useHiderLocation(data)
  const past = useArchivedView(loaded)
  const result = useMemo(
    // Hider får aldri se hvordan seekernes kart krymper: for hider regnes det som om ingen spørsmål er besvart.
    () => data && (mode === 'hider' ? solve([], data, settings) : solve(questions, data, settings, endgame, since)),
    // Bare sonestørrelse, linjevalg og spillområde påvirker geometrien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, questions, mode, endgame, since, settings.zoneRadius, settings.lines, settings.playArea],
  )

  if (error) return <p className="p-6 text-bad">Kunne ikke laste stasjonsdata. Last siden på nytt.</p>
  if (!data || !result) return <p className="p-6 text-muted">Laster kartet for {cityOf(cityId).name}…</p>

  return (
    <div className="flex h-dvh flex-col md:flex-row-reverse">
      <main className="relative min-h-0 flex-1">
        <MapView data={past?.data ?? data} result={past?.result ?? result} past={past?.round} />
        <Toast />
        <BonusPrompt />
        <Rules />
      </main>
      <aside className={`flex ${tab === 'map' ? 'max-h-[38dvh]' : 'max-h-[62dvh]'} flex-col border-t border-border bg-bg md:h-full md:max-h-none md:w-96 md:border-t-0 md:border-r`}>
        <button
          className={`grid h-6 w-full shrink-0 cursor-pointer place-items-center md:hidden ${pick || draw ? 'hidden' : ''}`}
          aria-label={collapsed ? 'Vis panelet' : 'Skjul panelet og vis hele kartet'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="h-1 w-10 rounded-full bg-border" />
        </button>
        {/* Mens man velger punkt eller tegner på kartet, skjules panelet på mobil så kartet får plassen. */}
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 md:pt-4 ${pick || draw || collapsed ? 'hidden md:block' : ''}`}>
          <div className="mb-3 hidden items-baseline justify-between md:flex">
            <h1 className="text-lg font-bold">
              Hide and Seek <span className="text-accent">{cityOf(cityId).name}</span>
            </h1>
            <span className="flex gap-3">
              <button className="cursor-pointer text-xs text-muted underline" onClick={() => useUi.getState().setRules('')}>
                Regler
              </button>
              <a className="text-xs text-muted underline" href="../">
                Til forsiden
              </a>
            </span>
          </div>
          {tab === 'map' && <MapPanel data={past?.data ?? data} result={past?.result ?? result} past={!!past} />}
          {tab === 'questions' && <QuestionsView data={data} result={result} />}
          {tab === 'game' && <GamePanel raw={loaded!} />}
          {tab === 'settings' && <SettingsPanel data={data} all={loaded!} result={result} />}
        </div>
        <nav className="flex shrink-0 border-t border-border bg-panel pb-[env(safe-area-inset-bottom)]" aria-label="Skjermer">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`relative flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${tab === t.key ? 'text-accent' : 'text-muted'}`}
              aria-current={tab === t.key ? 'page' : undefined}
              onClick={() => setTab(t.key)}
            >
              <span className="text-lg leading-none" aria-hidden>
                {t.icon}
              </span>
              {t.label}
              {t.key === 'game' && room && (
                <span className={`absolute top-2 right-[26%] size-2.5 rounded-full ${online ? 'bg-ok' : 'bg-muted'}`} title={online ? 'Tilkoblet rom' : 'Frakoblet'} />
              )}
              {t.key === 'questions' && pending > 0 && (
                <span className="absolute top-1.5 right-[22%] grid size-4 place-items-center rounded-full bg-accent text-[10px] text-accent-text">{pending}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>
    </div>
  )
}
