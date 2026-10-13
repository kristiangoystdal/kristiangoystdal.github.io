import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formToQuestion } from './form'
import { POI_TYPES, excluded, levelAreas, regionOf, type Result } from './geo'
import { useGame, useUi } from './store'
import { useSync } from './sync'
import type { GeoData, LngLat, Settings, Station } from './types'
import { GameStatus, locate } from './ui'

const GROUPS = ['mask', 'admin', 'lines', 'zones', 'poi', 'stations', 'draft', 'seekers', 'me'] as const
type Group = (typeof GROUPS)[number]
const LABEL_ZOOM = 13
const METRO_SUFFIX = ' (T-bane)'
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

export default function MapView({ data, result }: { data: GeoData; result: Result }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const groups = useRef({} as Record<Group, L.LayerGroup>)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<LngLat | null>(null)
  const [locError, setLocError] = useState('')

  const settings = useGame((s) => s.settings)
  const layers = useGame((s) => s.layers)
  const mode = useGame((s) => s.mode)
  const hider = useGame((s) => s.hider)
  const endgame = useGame((s) => !!s.round.endgame)
  const draft = useUi((s) => s.draft)
  const pick = useUi((s) => s.pick)
  const setPick = useUi((s) => s.setPick)
  const draw = useUi((s) => s.draw)
  const setDraw = useUi((s) => s.setDraw)
  const setSettings = useGame((s) => s.setSettings)
  const seekers = useSync((s) => s.seekers)

  // Hider ser bare sin egen sone, aldri hvilke stasjoner seekerne har igjen.
  const hiderView = mode === 'hider'
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
    const m = L.map(el.current!, { zoomControl: false, preferCanvas: true })
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
    const showLabels = () => el.current?.classList.toggle('hide-labels', m.getZoom() < LABEL_ZOOM)
    m.on('zoomend', showLabels)
    showLabels()

    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current!)
    map.current = m
    setReady(true)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
    }
    // Stasjonene er de samme selv om spillområdet endrer hvilke steder som er med.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.stations])

  useEffect(() => {
    if (!ready || !map.current) return
    const { url, maxZoom, attribution } = BASEMAPS[settings.basemap] ?? BASEMAPS.clean
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
      if (result.area) L.geoJSON(result.area, { interactive: false, style: { color: css('--accent'), weight: 2, fill: false } }).addTo(g)
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
      L.polyline(f.geometry.coordinates.map((c) => ll(c as LngLat)), { color: f.properties.color, weight: 3.5, opacity: 0.85, interactive: false }).addTo(g)
    }
  }, [ready, data, layers.lines, settings.lines])

  useEffect(() => {
    if (!ready) return
    const zones = groups.current.zones.clearLayers()
    const st = groups.current.stations.clearLayers()
    const accent = css('--accent')
    const muted = css('--muted')
    for (const s of data.stations) {
      if (!s.lines.some((l) => settings.lines.includes(l))) continue
      const on = possible.has(s.id)
      // Hider ser alltid sin egen sone. Seeker ser sonen først i endgame, og kan slå den av.
      if (on && (hiderView || (endgame && layers.zones))) {
        L.circle([s.lat, s.lon], {
          radius: settings.zoneRadius,
          interactive: false,
          color: on ? accent : muted,
          weight: on ? 1.5 : 0.5,
          opacity: on ? 0.9 : 0.4,
          fillOpacity: on ? 0.16 : 0.03,
        }).addTo(zones)
      }
      const rate = depRate(s, settings.day, settings.hourFrom, settings.hourTo)
      const dots = s.lines.map((l) => `<span style="color:${lineColor[l]}">●</span> ${l}`).join(' &nbsp;')
      L.circleMarker([s.lat, s.lon], {
        radius: on ? 5.5 : 3.5,
        color: on ? css('--text') : muted,
        weight: 1.5,
        fillColor: on ? accent : css('--panel'),
        fillOpacity: 1,
      })
        .bindTooltip(s.name, { permanent: on, direction: 'right', offset: [6, 0], className: 'station-label' })
        .bindPopup(`<b>${s.name}</b><br>Linje ${dots}<br>${hiderView ? '' : `${on ? 'Mulig' : 'Utelukket'} · `}${rate.toFixed(1)} avganger/t`)
        .addTo(st)
    }
  }, [ready, data, possible, hiderView, endgame, layers.zones, settings, lineColor])

  // Når et svar krymper området, zoomes kartet inn på stasjonene som står igjen.
  useEffect(() => {
    const left = data.stations.filter((s) => possible.has(s.id))
    if (!ready || draw || left.length === 0 || left.length === data.stations.length) return
    const pad = settings.zoneRadius / 111000
    const bounds = L.latLngBounds(left.map((s) => [s.lat, s.lon])).pad(0.15)
    // Panelet kan nettopp ha endret høyde. Uten dette regner Leaflet utsnittet for gammel kartstørrelse.
    map.current?.invalidateSize()
    map.current?.fitBounds([[bounds.getSouth() - pad, bounds.getWest() - 2 * pad], [bounds.getNorth() + pad, bounds.getEast() + 2 * pad]], { maxZoom: 15 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, possible])

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
        // T-banestasjonene tegnes alt som stasjoner.
        if (p.name.endsWith(METRO_SUFFIX)) continue
        L.marker(ll(p.pos), { icon, keyboard: false }).bindTooltip(`${p.name} · ${type?.label ?? key}`).addTo(poi)
      }
    }
    if (mode === 'hider' && hider.pos) {
      L.circleMarker(ll(hider.pos), { radius: 8, color: '#fff', weight: 2, fillColor: css('--ok'), fillOpacity: 1 }).bindTooltip('Hider (deg)').addTo(g)
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
  }, [ready, data, draft, draw, layers.poi, mode, hider.pos, settings.theme])

  useEffect(() => {
    if (!ready) return
    const g = groups.current.me.clearLayers()
    if (me) L.circleMarker(ll(me), { radius: 7, color: '#fff', weight: 2.5, fillColor: '#1a73e8', fillOpacity: 1, interactive: false }).addTo(g)
  }, [ready, me])

  // Seekerne som deler posisjon. Det er disse hider følger med på.
  useEffect(() => {
    if (!ready) return
    const g = groups.current.seekers.clearLayers()
    for (const s of Object.values(seekers)) {
      const fresh = Date.now() - s.t < STALE_MS
      const at = new Date(s.t).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const speed = s.v === null ? '' : ` · ${Math.round(s.v * 3.6)} km/t`
      L.circleMarker(ll(s.pos), { radius: 8, color: '#fff', weight: 2, fillColor: '#e8590c', fillOpacity: fresh ? 1 : 0.4 })
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

  return (
    <div className={`relative h-full w-full ${pick || draw ? 'picking' : ''}`}>
      <div ref={el} data-basemap={settings.basemap} className="h-full w-full [&.hide-labels_.station-label]:hidden" />
      <div className="pointer-events-none absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-3 z-[1000] flex max-w-[85%] flex-col items-start gap-2 md:max-w-[70%]">
        <div className="card pointer-events-auto px-3! py-1.5! text-sm shadow-lg">
          {hiderView ? (
            hider.stationId ? (
              <>
                Sonen din: <b className="text-accent">{data.stations.find((s) => s.id === hider.stationId)?.name}</b>
              </>
            ) : (
              'Sett posisjonen din under Kart'
            )
          ) : (
            <>
              {endgame && <span className="block text-xs font-semibold text-accent uppercase">Endgame</span>}
              <b className="text-accent tabular-nums">{result.stations.length}</b> {result.stations.length === 1 ? `stasjon igjen: ${result.stations[0].name}` : 'stasjoner igjen'}
              {!result.area && <span className="block text-xs text-bad">Svarene motsier hverandre</span>}
            </>
          )}
        </div>
        <GameStatus />
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
                  setSettings({ playArea: draw })
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
      <div className="absolute right-3 bottom-7 z-[1000] flex flex-col items-end gap-2">
        <button
          className="btn shadow-lg"
          aria-label={`Bakgrunnskart: ${BASEMAPS[settings.basemap].label}. Trykk for å bytte.`}
          onClick={() => setSettings({ basemap: BASEMAP_ORDER[(BASEMAP_ORDER.indexOf(settings.basemap) + 1) % BASEMAP_ORDER.length] })}
        >
          ◫ {BASEMAPS[settings.basemap].label}
        </button>
        <button className="btn shadow-lg" onClick={findMe} aria-label="Vis min posisjon">
          ◎ Meg
        </button>
      </div>
    </div>
  )
}
