import { Layers, LocateFixed, Navigation } from 'lucide-react'
import L from 'leaflet'
import 'leaflet-rotate'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formToQuestion } from './form'
import { POI_TYPES, excluded, levelAreas, regionOf, type Result } from './geo'
import { ArchiveBanner } from './Archive'
import { city, modeOf, networkSuffix, type Mode } from './cities'
import { useGame, useHiderPos, useUi, type ArchivedRound } from './store'
import { useSync } from './sync'
import { useTestMode } from './testmode'
import { useDemo } from './demo'
import type { GeoData, LngLat, Settings, Station } from './types'
import { GameStatus, Spinner, locate } from './ui'

/**
 * Luft rundt det kartet zoomer til. Ligger guiden eller et simulert spill over bunnen av kartet,
 * holdes stasjonene over arket, så det ikke skjuler dem.
 */
const insetPadding = () => ({ paddingTopLeft: L.point(20, 70), paddingBottomRight: L.point(64, 20 + useUi.getState().mapInset) })

/** Over så mange mulige stasjoner vises navnene bare når man holder over eller trykker. */
const MAX_LABELS = 150
const GROUPS = ['mask', 'admin', 'lines', 'zones', 'poi', 'stations', 'draft', 'tools', 'seekers', 'me'] as const
/** Måleverktøyet tegnes i en egen farge, så det ikke forveksles med spørsmål. */
const TOOL_COLOR = '#8e44ad'
type Group = (typeof GROUPS)[number]
const LABEL_ZOOM = 13
/** T-bane tegnes tykkest, buss tynnest, så nettene er lette å skille. */
const LINE_WEIGHT: Record<Mode, number> = { metro: 3.5, lightrail: 3.5, tram: 3, bus: 2.5 }
/** Eldre posisjoner enn dette tegnes svakere. */
const STALE_MS = 120000

type Basemap = Settings['basemap']
/** Bakgrunnskartene. Ingen av dem krever nøkkel. */
export const BASEMAPS: Record<Basemap, { label: string; url: string; maxZoom: number; attribution: string }> = {
  clean: {
    label: 'Enkelt',
    url: 'https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png',
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.kartverket.no/">Kartverket</a>',
  },
  standard: {
    label: 'Vanlig',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    label: 'Satellitt',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
}
const BASEMAP_ORDER: Basemap[] = ['clean', 'standard', 'satellite']
const ll = (p: LngLat): L.LatLngTuple => [p[1], p[0]]
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Snitt avganger per time i valgt tidsrom. */
export function depRate(s: Station, day: keyof Station['dep'], from: number, to: number) {
  const hours = s.dep[day].slice(from, Math.max(to, from + 1))
  return hours.reduce((a, b) => a + b, 0) / hours.length
}

/** `past`: en tidligere runde som vises i stedet for den som pågår. */
export default function MapView({ data, result, past = null }: { data: GeoData; result: Result; past?: ArchivedRound | null }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const groups = useRef({} as Record<Group, L.LayerGroup>)
  // Øker hver gang kartet lages på nytt (ny by), så alle lagene tegnes inn i det nye kartet.
  const [ready, setReady] = useState(0)
  const [me, setMe] = useState<LngLat | null>(null)
  // I demoen står seeker der den falske GPS-en sier, og det vises på kartet med en gang.
  const testOn = useTestMode((s) => s.on)
  const testPos = useTestMode((s) => s.pos)
  // Slås den falske GPS-en av (demoen eller reprisen er ferdig), forsvinner prikken, så ingen gammel posisjon blir stående.
  useEffect(() => setMe(testOn ? testPos : null), [testOn, testPos])
  const replay = useDemo((s) => s.kind === 'showcase')
  const [locError, setLocError] = useState('')
  const [bearing, setBearing] = useState(0)
  const [follow, setFollow] = useState(false)

  const settings = useGame((s) => s.settings)
  const layers = useGame((s) => s.layers)
  const mode = useGame((s) => s.mode)
  const hider = useGame((s) => s.hider)
  const hiderPos = useHiderPos((s) => s.pos)
  const liveEndgame = useGame((s) => s.round.endgame?.stationId ?? null)
  const endgameAt = past ? (past.round.endgame?.stationId ?? null) : liveEndgame
  const endgame = endgameAt !== null
  const draft = useUi((s) => s.draft)
  const pick = useUi((s) => s.pick)
  const setPick = useUi((s) => s.setPick)
  const draw = useUi((s) => s.draw)
  const setDraw = useUi((s) => s.setDraw)
  const setSettings = useGame((s) => s.setSettings)
  const seekers = useSync((s) => s.seekers)
  const tools = useGame((s) => s.tools)

  // Hider ser bare sin egen sone, aldri hvilke stasjoner seekerne har igjen.
  // En tidligere runde vises likt for alle, også hider.
  const hiderView = mode === 'hider' && !past
  const possible = useMemo(
    () => new Set(hiderView ? (hider.stationId ? [hider.stationId] : []) : result.stations.map((s) => s.id)),
    [result, hiderView, hider.stationId],
  )
  const mask = useMemo(() => excluded(result.area), [result])
  const lineColor = useMemo(
    () => Object.fromEntries(data.lines.features.map((f) => [f.properties.line, f.properties.color])),
    [data],
  )

  useEffect(() => {
    // Kartet kan roteres med to fingre. Kompassknappen setter nord opp igjen, eller lar kartet følge telefonen.
    const m = L.map(el.current!, { zoomControl: false, preferCanvas: true, rotate: true, touchRotate: true, rotateControl: false, bearing: 0 })
    m.fitBounds(L.latLngBounds(data.stations.map((s) => [s.lat, s.lon])), { padding: [20, 20] })
    L.control.zoom({ position: 'topright' }).addTo(m)
    for (const g of GROUPS) groups.current[g] = L.layerGroup().addTo(m)

    m.on('click', (e) => {
      const { pick, setPick, draw, setDraw } = useUi.getState()
      const p: LngLat = [e.latlng.lng, e.latlng.lat]
      if (draw) return setDraw([...draw, p])
      if (!pick) return
      pick.done(p)
      setPick(null)
    })
    // Mens man kniper for å zoome, tegnes linjer, stasjoner og områder på nytt for hvert bilde. Ellers skalerer
    // nettleseren det tegnede som et bilde (eller lar det stå stille på iPhone) til man slipper.
    // Animerte overganger (zoom til stasjonene som er igjen) lar Leaflet skalere som før, de er korte.
    let frame = 0
    m.on('zoom', () => {
      const leaflet = m as unknown as { _animatingZoom?: boolean; _renderer?: { _reset?: () => void } }
      if (leaflet._animatingZoom || frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        leaflet._renderer?._reset?.()
      })
    })
    const showLabels = () => el.current?.classList.toggle('hide-labels', m.getZoom() < LABEL_ZOOM)
    m.on('zoomend', showLabels)
    showLabels()
    m.on('rotate', () => setBearing(m.getBearing()))

    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current!)
    map.current = m
    setReady((n) => n + 1)
    return () => {
      ro.disconnect()
      // Fjernes kartet midt i en zoom (f.eks. når byen byttes), avslutter Leaflet zoomen etterpå på et kart
      // som ikke finnes. Merket som ferdig hopper Leaflet over det.
      ;(m as unknown as { _animatingZoom: boolean })._animatingZoom = false
      m.remove()
      map.current = null
    }
    // Stasjonene er de samme selv om spillområdet endrer hvilke steder som er med.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.stations])

  useEffect(() => {
    if (!ready || !map.current) return
    // Kartverkets kart dekker bare Norge. Utenfor Norge brukes OpenStreetMap i stedet.
    const { url, maxZoom, attribution } = settings.basemap === 'clean' && !city().norway ? BASEMAPS.standard : (BASEMAPS[settings.basemap] ?? BASEMAPS.clean)
    const tiles = L.tileLayer(url, { maxZoom, attribution }).addTo(map.current)
    map.current.setMaxZoom(maxZoom)
    return () => void tiles.remove()
  }, [ready, settings.basemap])

  useEffect(() => {
    if (!ready) return
    const g = groups.current.mask.clearLayers()
    if (mask && layers.area) {
      // Skyggen har ingen kant (den ville også tegnet ytterrammen). Kanten tegnes rundt selve området.
      L.geoJSON(mask, { interactive: false, style: { stroke: false, fillColor: css('--bg'), fillOpacity: 0.6 } }).addTo(g)
      // Rollefargene hører til panelet. På kartet brukes bare linjefargene og en nøytral kant, så lilla og oransje linjer ikke forveksles med roller.
      if (result.area) L.geoJSON(result.area, { interactive: false, style: { color: css('--text'), weight: 2, opacity: 0.75, fill: false } }).addTo(g)
    }
  }, [ready, mask, result.area, layers.area, settings.theme])

  useEffect(() => {
    if (!ready) return
    const g = groups.current.admin.clearLayers()
    if (!layers.admin) return
    const feats = levelAreas(data, settings.adminLevel)
    L.geoJSON(feats as never, { style: { color: css('--muted'), weight: 1.5, fill: false, dashArray: '4 4' } })
      .bindTooltip((l) => (l as L.GeoJSON & { feature: (typeof feats)[number] }).feature.properties.name, { sticky: true })
      .addTo(g)
  }, [ready, data, layers.admin, settings.adminLevel, settings.theme])

  useEffect(() => {
    if (!ready) return
    const g = groups.current.lines.clearLayers()
    if (!layers.lines) return
    for (const f of data.lines.features) {
      if (!settings.lines.includes(f.properties.line)) continue
      L.polyline(f.geometry.coordinates.map((c) => ll(c as LngLat)), { color: f.properties.color, weight: LINE_WEIGHT[modeOf(f)], opacity: 0.85, interactive: false }).addTo(g)
    }
  }, [ready, data, layers.lines, settings.lines])

  // Stasjonene tegnes én gang per kartdata og oppsett. Når svarene endrer hvilke som er mulige,
  // endres bare de som skifter. Å tegne alle på nytt for hvert svar er tregt på telefonen.
  const markers = useRef(new Map<string, { m: L.CircleMarker; on: boolean; s: Station }>())
  const possibleNow = useRef(possible)
  possibleNow.current = possible
  const dense = data.stations.length > 200
  // Mulige stasjoner fylles med fargen til linjen sin, som på et linjekart. Utelukkede blir små hule ringer.
  const style = (s: Station, on: boolean) => {
    const line = s.lines.find((l) => settings.lines.includes(l)) ?? s.lines[0]
    return {
      radius: dense ? (on ? 4.5 : 2.5) : on ? 6 : 3.5,
      color: on ? '#ffffff' : css('--muted'),
      weight: on ? 2 : 1,
      fillColor: on ? (lineColor[line] ?? css('--accent')) : css('--panel'),
      fillOpacity: on ? 1 : 0.6,
    }
  }
  // Faste navnelapper bare når det er få nok mulige stasjoner til at de kan leses.
  const labelsOn = possible.size <= MAX_LABELS
  const label = (m: L.CircleMarker, s: Station, permanent: boolean) => {
    m.unbindTooltip()
    m.bindTooltip(s.name, { permanent, direction: 'right', offset: [6, 0], className: 'station-label' })
  }

  useEffect(() => {
    if (!ready) return
    const st = groups.current.stations.clearLayers()
    markers.current.clear()
    const showLabels = possibleNow.current.size <= MAX_LABELS
    for (const s of data.stations) {
      if (!s.lines.some((l) => settings.lines.includes(l))) continue
      const on = possibleNow.current.has(s.id)
      const m = L.circleMarker([s.lat, s.lon], style(s, on))
      label(m, s, on && showLabels)
      // Innholdet lages når boblen åpnes, så det alltid sier om stasjonen er mulig nå.
      m.bindPopup(() => {
        const rate = depRate(s, settings.day, settings.hourFrom, settings.hourTo)
        const dots = s.lines.map((l) => `<span style="color:${lineColor[l]}">●</span> ${l}`).join(' &nbsp;')
        return `<b>${s.name}</b><br>Linje ${dots}<br>${hiderView ? '' : `${possibleNow.current.has(s.id) ? 'Mulig' : 'Utelukket'} · `}${rate.toFixed(1)} avganger/t`
      })
      m.addTo(st)
      markers.current.set(s.id, { m, on, s })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data, hiderView, settings.lines, settings.day, settings.hourFrom, settings.hourTo, settings.theme, lineColor])

  useEffect(() => {
    if (!ready) return
    for (const x of markers.current.values()) {
      const on = possible.has(x.s.id)
      const labelChange = on && (labelsOn !== x.m.getTooltip()?.options.permanent)
      if (on === x.on && !labelChange) continue
      const st = style(x.s, on)
      x.m.setStyle(st).setRadius(st.radius)
      // Mulige stasjoner over utelukkede, så de ikke skjules der linjene ligger tett.
      if (on) x.m.bringToFront()
      label(x.m, x.s, on && labelsOn)
      x.on = on
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, possible, labelsOn])

  // Sonene: hider ser alltid sin egen, seeker ser dem først i endgame og kan slå dem av. De er få.
  useEffect(() => {
    if (!ready) return
    const zones = groups.current.zones.clearLayers()
    if (!hiderView && !(endgame && layers.zones)) return
    const edge = css('--text')
    for (const s of data.stations) {
      if (!possible.has(s.id) || !s.lines.some((l) => settings.lines.includes(l))) continue
      L.circle([s.lat, s.lon], { radius: settings.zoneRadius, interactive: false, color: edge, weight: 2, opacity: 0.8, dashArray: '6 5', fillColor: edge, fillOpacity: 0.08 }).addTo(zones)
    }
  }, [ready, data, possible, hiderView, endgame, layers.zones, settings.lines, settings.zoneRadius, settings.theme])

  // Kartet kan ikke zoomes lenger ut enn at hele spillområdet så vidt får plass. Uten
  // spillområde gjelder sonene rundt stasjonene som er med. Mens spillområdet tegnes, er det fritt.
  const drawing = draw !== null
  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    if (drawing) return void m.setMinZoom(0)
    const pad = settings.zoneRadius / 111000
    // Rett etter bytte av by er ingen linjer valgt ennå. Da gjelder alle stasjonene.
    const onLines = data.stations.filter((s) => s.lines.some((l) => settings.lines.includes(l)))
    const bounds = settings.playArea?.length
      ? L.latLngBounds(settings.playArea.map(ll))
      : L.latLngBounds((onLines.length ? onLines : data.stations).map((s) => [s.lat, s.lon]))
    const area = settings.playArea?.length ? bounds : L.latLngBounds([bounds.getSouth() - pad, bounds.getWest() - 2 * pad], [bounds.getNorth() + pad, bounds.getEast() + 2 * pad])
    const fit = () => m.setMinZoom(m.getBoundsZoom(area, false))
    fit()
    // Panelet endrer høyden på kartet, og da endres hvor langt ut som trengs.
    m.on('resize', fit)
    return () => void m.off('resize', fit)
  }, [ready, drawing, data.stations, settings.playArea, settings.lines, settings.zoneRadius])

  // Når et svar krymper området, zoomes kartet inn på stasjonene som står igjen.
  useEffect(() => {
    const left = data.stations.filter((s) => possible.has(s.id))
    if (!ready || draw || left.length === 0 || left.length === data.stations.length) return
    const pad = settings.zoneRadius / 111000
    const bounds = L.latLngBounds(left.map((s) => [s.lat, s.lon])).pad(0.15)
    // Panelet kan nettopp ha endret høyde. Uten dette regner Leaflet utsnittet for gammel kartstørrelse.
    map.current?.invalidateSize()
    map.current?.fitBounds([[bounds.getSouth() - pad, bounds.getWest() - 2 * pad], [bounds.getNorth() + pad, bounds.getEast() + 2 * pad]], { maxZoom: 15, ...insetPadding() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, possible])

  // Endgame: kartet zoomer inn på sonen, også når svarene alt hadde snevret det inn til én stasjon.
  useEffect(() => {
    const s = data.stations.find((x) => x.id === endgameAt)
    if (!ready || !s || hiderView) return
    map.current?.invalidateSize()
    map.current?.fitBounds(L.latLng(s.lat, s.lon).toBounds(settings.zoneRadius * 2.4), insetPadding())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, endgameAt])

  // Punktet/området for spørsmålet som redigeres, pluss stedene det handler om.
  useEffect(() => {
    if (!ready) return
    const g = groups.current.draft.clearLayers()
    const poi = groups.current.poi.clearLayers()
    const draftPoi = draft && ['nearest', 'tentacles'].includes(draft.kind) ? draft.poiType : draft?.kind === 'measure' ? draft.ref : null
    const shown = layers.poi ? Object.keys(data.poi) : draftPoi ? [draftPoi] : []
    for (const key of shown) {
      const type = POI_TYPES.find((t) => t.key === key)
      const icon = L.divIcon({ className: 'poi-icon', html: type?.icon ?? '•', iconSize: [22, 22] })
      for (const p of data.poi[key] ?? []) {
        // Stasjonene i nettet tegnes alt som stasjoner.
        if (p.name.endsWith(networkSuffix())) continue
        L.marker(ll(p.pos), { icon, keyboard: false }).bindTooltip(`${p.name} · ${type?.label ?? key}`).addTo(poi)
      }
    }
    if (mode === 'hider' && hiderPos) {
      L.circleMarker(ll(hiderPos), { radius: 8, color: '#fff', weight: 2, fillColor: css('--ok'), fillOpacity: 1 }).bindTooltip('Hider (deg)').addTo(g)
    }
    if (draw) {
      const style = { color: '#3b6ceb', weight: 2.5, dashArray: '6 5', fillOpacity: 0.1, interactive: false }
      if (draw.length >= 2) (draw.length >= 3 ? L.polygon(draw.map(ll), style) : L.polyline(draw.map(ll), style)).addTo(g)
      for (const p of draw) L.circleMarker(ll(p), { radius: 5, color: '#fff', weight: 2, fillColor: '#3b6ceb', fillOpacity: 1, interactive: false }).addTo(g)
    }
    if (!draft) return
    const q = formToQuestion(draft)
    const region = q && regionOf(q, data)
    if (region) {
      L.geoJSON(region, { interactive: false, style: { color: '#3b6ceb', weight: 2.5, dashArray: '6 5', fillColor: '#3b6ceb', fillOpacity: 0.12 } }).addTo(g)
    }
    const pin = (p: LngLat | null, text: string) =>
      p && L.circleMarker(ll(p), { radius: 7, color: '#fff', weight: 2, fillColor: '#3b6ceb', fillOpacity: 1 }).bindTooltip(text, { permanent: true, direction: 'top' }).addTo(g)
    pin(draft.pos, draft.kind === 'thermometer' ? 'Start' : 'Seeker')
    if (draft.kind === 'thermometer') pin(draft.pos2, 'Slutt')
  }, [ready, data, draft, draw, layers.poi, mode, hiderPos, settings.theme])

  useEffect(() => {
    if (!ready) return
    const g = groups.current.me.clearLayers()
    if (!me) return
    const dot = L.circleMarker(ll(me), { radius: 8, color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1, interactive: false })
    // I reprisen er prikken seekerne, ikke telefonen.
    if (replay) dot.bindTooltip('Seekerne', { permanent: true, direction: 'top', offset: [0, -8], className: 'station-label' })
    dot.addTo(g)
  }, [ready, me, replay])

  useEffect(() => {
    if (!ready) return
    const g = groups.current.tools.clearLayers()
    const style = { color: TOOL_COLOR, weight: 2.5, dashArray: '4 6', fillColor: TOOL_COLOR, fillOpacity: 0.08, interactive: false }
    const pin = (p: LngLat, text: string) =>
      L.circleMarker(ll(p), { radius: 6, color: '#fff', weight: 2, fillColor: TOOL_COLOR, fillOpacity: 1 }).bindTooltip(text, { direction: 'top' }).addTo(g)
    const { radar, thermo } = tools
    if (radar?.center) {
      L.circle(ll(radar.center), { ...style, radius: radar.radiusM }).addTo(g)
      pin(radar.center, `Egen radar · ${(radar.radiusM / 1000).toLocaleString('nb-NO')} km`)
    }
    if (thermo?.start) {
      // Sirkelen viser hvor langt man må komme. Streken er reist så langt.
      L.circle(ll(thermo.start), { ...style, fillOpacity: 0, radius: thermo.minM }).addTo(g)
      pin(thermo.start, 'Termometer: start')
      if (thermo.at) L.polyline([ll(thermo.start), ll(thermo.at)], { color: TOOL_COLOR, weight: 3, interactive: false }).addTo(g)
    }
  }, [ready, tools])

  // Seekerne som deler posisjon. Det er disse hider følger med på.
  useEffect(() => {
    if (!ready) return
    const g = groups.current.seekers.clearLayers()
    for (const s of Object.values(seekers)) {
      const fresh = Date.now() - s.t < STALE_MS
      const at = new Date(s.t).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const speed = s.v === null ? '' : ` · ${Math.round(s.v * 3.6)} km/t`
      L.circleMarker(ll(s.pos), { radius: 8, color: '#fff', weight: 2.5, fillColor: css('--text'), fillOpacity: fresh ? 1 : 0.4 })
        .bindTooltip(`Seeker · kl. ${at}${speed}`)
        .addTo(g)
    }
  }, [ready, seekers])

  const findMe = async () => {
    setLocError('')
    try {
      const p = await locate()
      setMe(p)
      map.current?.setView(ll(p), Math.max(map.current.getZoom(), 15))
    } catch (e) {
      setLocError((e as Error).message)
    }
  }

  const north = () => {
    map.current?.compassBearing.disable()
    map.current?.touchRotate.enable()
    map.current?.setBearing(0)
    setFollow(false)
  }
  const followCompass = async () => {
    // iPhone krever at brukeren gir lov til kompasset, og det må skje fra et trykk.
    const ask = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    if (ask && (await ask().catch(() => 'denied')) !== 'granted') return setLocError('Fikk ikke bruke kompasset. Gi nettsiden lov under innstillingene.')
    map.current?.compassBearing.enable()
    setFollow(!!map.current?.compassBearing.enabled())
    if (!map.current?.compassBearing.enabled()) setLocError('Telefonen har ikke kompass, eller nettleseren gir ikke tilgang til det.')
  }

  return (
    <div className={`relative h-full w-full ${pick || draw ? 'picking' : ''}`}>
      <div ref={el} data-basemap={settings.basemap} className="h-full w-full [&.hide-labels_.station-label]:hidden" />
      <div className="pointer-events-none absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-3 z-[1000] flex max-w-[85%] flex-col items-start gap-2 md:max-w-[70%]">
        {past && <ArchiveBanner round={past} />}
        <div className="card pointer-events-auto px-3! py-1.5! text-sm shadow-lg">
          {hiderView ? (
            <>
              {endgame && <span className="block text-xs font-semibold text-accent">Endgame: står seekerne i din sone, står du stille</span>}
              {hider.stationId ? (
                <>
                  Sonen din: <b className="text-accent">{data.stations.find((s) => s.id === hider.stationId)?.name}</b>
                </>
              ) : (
                'Venter på GPS…'
              )}
            </>
          ) : (
            <>
              {endgame ? (
                <>
                  <span className="block text-xs font-semibold text-accent">Endgame</span>
                  Sonen ved <b className="text-accent">{data.stations.find((s) => s.id === endgameAt)?.name}</b>
                  {!result.area && <span className="block text-xs text-bad">Svarene utelukker hele sonen</span>}
                </>
              ) : (
                <>
                  <b className="text-accent tabular-nums">{result.stations.length}</b> {result.stations.length === 1 ? `stasjon igjen: ${result.stations[0].name}` : 'stasjoner igjen'}
                  {!result.area && <span className="block text-xs text-bad">Svarene motsier hverandre</span>}
                </>
              )}
            </>
          )}
        </div>
        {data.loading && (
          <div className="card pointer-events-auto flex items-center gap-2 px-3! py-1.5! text-sm text-muted shadow-lg" role="status">
            <Spinner className="size-3.5!" /> Laster kartdata…
          </div>
        )}
        {!past && <GameStatus stations={data.stations} />}
        {pick && (
          <div className="card pointer-events-auto flex items-center gap-2 px-3! py-2! text-sm shadow-lg">
            <span>Trykk på kartet: {pick.label.toLowerCase()}</span>
            <button className="btn min-h-9!" onClick={() => setPick(null)}>
              Avbryt
            </button>
          </div>
        )}
        {draw && (
          <div className="card pointer-events-auto px-3! py-2! text-sm shadow-lg">
            <p className="mb-2">Trykk rundt spillområdet, hjørne for hjørne. {draw.length} satt.</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                className="btn btn-primary min-h-9!"
                disabled={draw.length < 3}
                onClick={() => {
                  setSettings({ playArea: draw, areaAuto: false })
                  setDraw(null)
                }}
              >
                Ferdig
              </button>
              <button className="btn min-h-9!" disabled={draw.length === 0} onClick={() => setDraw(draw.slice(0, -1))}>
                Angre punkt
              </button>
              <button className="btn min-h-9!" onClick={() => setDraw(null)}>
                Avbryt
              </button>
            </div>
          </div>
        )}
        {locError && <div className="card pointer-events-auto px-3! py-1.5! text-xs text-bad shadow-lg">{locError}</div>}
      </div>
      {/* Kartknappene som en smal kolonne med ikoner, så de dekker minst mulig av stasjonene. */}
      <div className="absolute right-2.5 bottom-7 z-[1000] flex flex-col gap-1.5">
        <button
          className="btn size-11 px-0! shadow-lg"
          aria-label={`Bakgrunnskart: ${BASEMAPS[settings.basemap].label}. Trykk for å bytte.`}
          title={`Bakgrunnskart: ${BASEMAPS[settings.basemap].label}`}
          onClick={() => setSettings({ basemap: BASEMAP_ORDER[(BASEMAP_ORDER.indexOf(settings.basemap) + 1) % BASEMAP_ORDER.length] })}
        >
          <Layers size={20} aria-hidden />
        </button>
        <button
          className={`btn size-11 px-0! shadow-lg ${follow ? 'btn-on' : ''}`}
          onClick={() => (follow || Math.round(bearing) % 360 !== 0 ? north() : followCompass())}
          aria-label={follow ? 'Kartet følger kompasset. Trykk for nord opp.' : bearing ? 'Sett nord opp' : 'La kartet følge kompasset'}
          title={follow ? 'Følger kompasset' : bearing ? 'Nord opp' : 'Følg kompasset. Roter med to fingre.'}
        >
          <Navigation size={20} style={{ transform: `rotate(${bearing}deg)` }} aria-hidden />
        </button>
        <button className="btn size-11 px-0! shadow-lg" onClick={findMe} aria-label="Vis min posisjon" title="Vis min posisjon">
          <LocateFixed size={20} aria-hidden />
        </button>
      </div>
    </div>
  )
}
