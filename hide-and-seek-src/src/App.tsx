import { useEffect, useMemo, useState } from 'react'
import { useArchivedView } from './Archive'
import MapView from './MapView'
import { BonusPrompt, PossibleStations, RoundBar } from './Panels'
import { AppSheet, GameScreen, GameTabs, LearnSheet } from './Screens'
import { Lobby, StartBar } from './Lobby'
import { useDemo, useDemoHider } from './demo'
import { useGuide } from './guide'
import { GuideOverlay, HelpButtons, ShowcaseCard } from './GuideCard'
import { useShowcaseRunner } from './showcase'
import { city, cityOf, linesOf, modesOf, setActiveModes } from './cities'
import { loadCore, loadData } from './data'
import { movedAt } from './clock'
import { adminLevels, autoPlayArea, clipData, dist, hasData, hiderStation, levelAreas, onlyLines, solve } from './geo'
import { useHiderPath } from './hiderPath'
import { Rules } from './Rules'
import { useThermoGps } from './Tools'
import { gameFromHash, useGame, useHiderPos, useUi } from './store'
import { Toast } from './notify'
import { Loading, PanelHandle, rememberFix, usePanelHeight } from './ui'
import { joinRoom, resumeRoom, roomFromHash, shareSeekerPos, useSync, type SeekerPos } from './sync'
import type { GeoData, LngLat } from './types'


function useTheme() {
  const theme = useGame((s) => s.settings.theme)
  const role = useGame((s) => s.mode)
  // Hele appen får fargen til rollen: oransje for seeker, fiolett for hider.
  useEffect(() => void (document.documentElement.dataset.role = role), [role])
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
        rememberFix(pos, p.coords.accuracy)
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
  const seekFrom = useGame((s) => s.round.seekFrom)
  // Reprise av et simulert spill: ingen faner, så man ikke havner i et ekte spill.
  const replay = useDemo((s) => s.kind === 'showcase')
  const pick = useUi((s) => s.pick)
  const draw = useUi((s) => s.draw)
  const collapsed = useUi((s) => s.collapsed)
  const panelHeight = usePanelHeight()
  const questions = useGame((s) => s.questions)
  const settings = useGame((s) => s.settings)
  const mode = useGame((s) => s.mode)
  const endgame = useGame((s) => s.round.endgame ?? null)
  const since = useGame((s) => movedAt(s.round))

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
    // Først stasjonene og linjene, så appen vises med en gang. Grenser, kyst, vann og steder kommer like etter.
    loadCore(cityId)
      .then((core) => {
        if (!live) return
        // Ny by: linjene til byens vanlige transportmidler er med til noen velger annet.
        const all = core.lines.features.map((f) => f.properties.line)
        const { settings } = useGame.getState()
        if (!settings.lines.some((l) => all.includes(l))) useGame.setState({ settings: { ...settings, lines: linesOf(core, city().defaultModes) } })
        setData(core)
        return loadData(cityId).then(
          (full) => live && setData(full),
          // Uten resten virker appen som før med manglende data: de spørsmålstypene slås av.
          () => live && setData({ ...core, loading: false }),
        )
      })
      .catch(() => live && setError(true))
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
  useDemoHider(data)
  useShowcaseRunner(loaded, data || null)
  const past = useArchivedView(loaded)
  const result = useMemo(
    // Hider får aldri se hvordan seekernes kart krymper: for hider regnes det som om ingen spørsmål er besvart.
    // Mens resten av kartdataene lastes, regnes kartet bare med svarene som ikke trenger dem. Ellers ville de gitt feil.
    () => data && (mode === 'hider' ? solve([], data, settings) : solve(data.loading ? questions.filter((q) => hasData(q, data)) : questions, data, settings, endgame, since)),
    // Bare sonestørrelse, linjevalg og spillområde påvirker geometrien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, questions, mode, endgame, since, settings.zoneRadius, settings.lines, settings.playArea],
  )

  // Spillområdet legges automatisk rundt stasjonene på linjene som er med, til noen tegner sitt eget eller velger hele nettet.
  // Ikke under runden: da er oppsettet låst.
  useEffect(() => {
    if (!loaded || seekFrom !== null || settings.areaAuto === false || !settings.lines.length) return
    const area = autoPlayArea(loaded.stations, settings)
    if (JSON.stringify(area) !== JSON.stringify(settings.playArea)) useGame.getState().setSettings({ playArea: area })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, seekFrom, settings.areaAuto, settings.lines, settings.zoneRadius])

  // Postsonene lages ved å slå sammen postnumrene. Det er tungt, så det gjøres når telefonen er ledig etter oppstart,
  // ikke første gang noen stiller et spørsmål om postsone.
  useEffect(() => {
    if (!data || data.loading || !adminLevels().some((l) => l.key === 'postsone')) return
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const id = idle(() => void levelAreas(data, 'postsone'))
    return () => cancel(id)
  }, [data])

  // Demoen trenger å vite hvor mange stasjoner seekeren har igjen.
  useEffect(() => void (result && useGuide.setState({ left: result.stations.length })), [result])

  if (error) return <p className="p-6 text-bad">Kunne ikke laste stasjonsdata. Last siden på nytt.</p>
  // Appen vises med en gang. Det som trenger kartdataene, viser at det laster til de er der.
  const ready = data && result && loaded ? { data, result, loaded } : null
  const loadingText = `Laster kartet for ${cityOf(cityId).name}…`

  // Før og mellom rundene vises lobbyen. Mens runden pågår, spillskjermen med klokke og faner.
  const playing = seekFrom !== null
  return (
    <div className="flex h-dvh flex-col md:flex-row-reverse">
      <main className="relative min-h-0 flex-1" data-guide="map">
        {ready ? (
          <MapView data={past?.data ?? ready.data} result={past?.result ?? ready.result} past={past?.round} />
        ) : (
          <div className="grid h-full place-items-center bg-panel-2">
            <Loading text={loadingText} />
          </div>
        )}
        <Toast />
        <BonusPrompt />
        <Rules />
        <AppSheet data={loaded || null} help={<HelpButtons />} />
        <LearnSheet />
        <GuideOverlay stations={ready?.data.stations ?? []} />
        {ready && <ShowcaseCard data={ready.data} />}
      </main>
      <aside style={{ '--panel-h': panelHeight } as React.CSSProperties} className={`flex h-(--panel-h) shrink-0 flex-col border-t border-border bg-bg md:h-full md:w-96 md:border-t-0 md:border-r ${replay ? 'hidden!' : ''}`}>
        <PanelHandle hidden={!!(pick || draw)} />
        {/* Mens man velger punkt eller tegner på kartet, skjules panelet på mobil så kartet får plassen. */}
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 md:pt-4 ${pick || draw || collapsed ? 'hidden md:block' : ''}`}>
          <header className={`mb-3 items-center justify-between gap-2 ${playing && !past ? 'hidden md:flex' : 'hidden'}`}>
            <h1 className="text-lg font-bold">
              Hide and Seek <span className="text-accent">{cityOf(cityId).name}</span>
            </h1>
            <span className="flex gap-1.5">
              <button className="btn min-h-9! px-2.5!" data-guide="app" onClick={() => useUi.getState().setSheet('app')}>
                ⚙ Hjelp
              </button>
            </span>
          </header>
          {past ? (
            <>
              <p className="mb-4 rounded-lg border border-accent p-3 text-sm">Kartet viser en tidligere runde. Trykk «Tilbake til spillet» på kartet for å gå tilbake.</p>
              <PossibleStations data={past.data} result={past.result} />
            </>
          ) : playing ? (
            ready ? (
              <GameScreen data={ready.data} result={ready.result} />
            ) : (
              <>
                <RoundBar />
                <Loading text={loadingText} />
              </>
            )
          ) : (
            <Lobby data={ready?.data ?? null} all={ready?.loaded ?? null} result={ready?.result ?? null} />
          )}
        </div>
        {playing && !past && !replay && <GameTabs />}
        {!playing && !past && !collapsed && <StartBar ready={!!ready} />}
      </aside>
    </div>
  )
}
