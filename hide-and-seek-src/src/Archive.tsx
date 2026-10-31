import { useEffect, useMemo, useState } from 'react'
import { LOCALE, tr } from './lang'
import { DEFAULT_CITY, city, cityOf } from './cities'
import { movedAt } from './clock'
import { CATEGORIES, answerLabel, categoryOf, describe, itemOf } from './form'
import { clipData, onlyLines, shrinks, solve } from './geo'
import { useGame, useUi, type ArchivedRound } from './store'
import { loadArchive, useSync } from './sync'
import type { GeoData, RoundStats } from './types'
import { Section, left, Spinner } from './ui'
import type { Progress } from './replay'

const clock = (sec: number) => left(sec * 1000)
const when = (t: number) => new Date(t).toLocaleString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
// Én formaterer for alle klokkeslett. Å lage en ny for hvert er tregt på telefonen.
const CLOCK = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const time = (t: number) => CLOCK.format(t)

/** Tallene for én runde: spørsmål per kategori, kort, svartid og endgame. */
export function StatsList({ stats }: { stats: RoundStats }) {
  const rows: [string, string][] = [
    [tr('Spørsmål', 'Questions'), `${stats.asked}${stats.asked ? ` (${CATEGORIES.filter((c) => stats.byCategory[c]).map((c) => `${c} ${stats.byCategory[c]}`).join(', ')})` : ''}`],
    [tr('Snittlig svartid', 'Average answer time'), stats.answerSec === null ? '–' : clock(stats.answerSec)],
    [tr('Svar etter svartiden', 'Late answers'), String(stats.late)],
    ['Veto / Randomize', `${stats.vetoes} / ${stats.randomized}`],
    ['Move', String(stats.moves)],
    [tr('Gjemmetid', 'Hiding time'), `${stats.hidingMinutes} min`],
    [tr('Pause under letingen', 'Paused while seeking'), clock(stats.pausedSec)],
    ['Endgame', stats.endgameSec === null ? tr('Ikke startet', 'Not started') : clock(stats.endgameSec)],
  ]
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

const title = (a: ArchivedRound) => `${a.hider} · ${tr('runde', 'round')} ${a.nth}`

/** Kartet og stasjonene slik de så ut i en tidligere runde, med det oppsettet den ble spilt med. */
export function useArchivedView(raw: GeoData | null) {
  const viewing = useUi((s) => s.viewing)
  const round = useGame((s) => s.archive.find((a) => a.id === viewing) ?? null)
  const settings = useGame((s) => s.settings)
  return useMemo(() => {
    // Kartet kan bare vises for byen som er lastet inn.
    if (!raw || !round || (round.setup.city ?? DEFAULT_CITY) !== city().id) return null
    const rules = { ...settings, ...round.setup }
    const data = onlyLines(clipData(raw, rules.playArea), rules.lines)
    return { round, data, result: solve(round.questions, data, rules, round.round.endgame ?? null, movedAt(round.round)) }
    // Bare runden og kartdataene avgjør hva som vises.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, round])
}

/** Vises på kartet mens en tidligere runde er åpen. */
export function ArchiveBanner({ round }: { round: ArchivedRound }) {
  const setViewing = useUi((s) => s.setViewing)
  return (
    <div className="card pointer-events-auto border-accent! px-3! py-2! text-sm shadow-lg">
      <span className="block text-xs font-semibold text-accent uppercase">{tr('Tidligere runde', 'Earlier round')}</span>
      {title(round)}, {when(round.endedAt)}
      <button className="btn mt-1.5 min-h-9! w-full" onClick={() => setViewing(null)}>
        {tr('Tilbake til spillet', 'Back to the game')}
      </button>
    </div>
  )
}

const STAGES: Record<Progress['stage'], string> = tr(
  { map: 'Regner ut kartet', tiles: 'Henter bakgrunnskart', video: 'Lager video' },
  { map: 'Working out the map', tiles: 'Loading the background map', video: 'Making the video' },
)

/** Lager en video av runden: kartet som krymper, hvor spillerne var og spørsmålene som ble stilt. */
function ReplayVideo({ a, raw }: { a: ArchivedRound; raw: GeoData }) {
  const settings = useGame((s) => s.settings)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [video, setVideo] = useState<{ url: string; file: File } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => () => void (video && URL.revokeObjectURL(video.url)), [video])

  const make = async () => {
    setError('')
    setVideo(null)
    try {
      const { renderReplay } = await import('./replay')
      const rules = { ...settings, ...a.setup }
      const data = onlyLines(clipData(raw, rules.playArea), rules.lines)
      const blob = await renderReplay(a, data, settings, setProgress)
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const name = `hide-and-seek-${a.hider}-${tr('runde', 'round')}-${a.nth}.${ext}`.toLowerCase().replace(/[^a-z0-9æøå.-]+/g, '-')
      setVideo({ url: URL.createObjectURL(blob), file: new File([blob], name, { type: blob.type }) })
    } catch (e) {
      setError((e as Error).message || tr('Kunne ikke lage videoen.', 'Could not make the video.'))
    }
    setProgress(null)
  }
  const share = async () => {
    if (!video) return
    try {
      await navigator.share({ files: [video.file], title: title(a) })
    } catch {
      // Avbrutt deling er ikke en feil.
    }
  }
  const canShare = !!video && !!navigator.canShare?.({ files: [video.file] })

  return (
    <div className="mb-3">
      {!video && (
        <button className="btn w-full" disabled={!!progress} onClick={make}>
          {progress ? `${STAGES[progress.stage]} … ${Math.round(progress.done * 100)} %` : tr('🎬 Lag video av runden', '🎬 Make a video of the round')}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
      {video && (
        <div className="flex flex-col gap-1.5">
          <video className="w-full rounded-lg bg-black" src={video.url} controls playsInline />
          <div className="flex gap-1.5">
            {canShare && (
              <button className="btn btn-primary flex-1" onClick={share}>
                {tr('Del', 'Share')}
              </button>
            )}
            <a className="btn flex-1 text-center" href={video.url} download={video.file.name}>
              {tr('Last ned', 'Download')}
            </a>
            <button className="btn" onClick={() => setVideo(null)}>
              {tr('Lukk', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Én tidligere runde: statistikk, kort, endgame og hele loggen. */
function RoundDetail({ a, raw, close }: { a: ArchivedRound; raw: GeoData; close: () => void }) {
  const settings = useGame((s) => s.settings)
  const removeArchived = useGame((s) => s.removeArchived)
  const { setViewing, setCollapsed } = useUi()
  const { data, result } = useMemo(() => {
    const rules = { ...settings, ...a.setup }
    const data = onlyLines(clipData(raw, rules.playArea), rules.lines)
    return { data, result: solve(a.questions, data, rules, a.round.endgame ?? null, movedAt(a.round)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, raw])
  const station = (id?: string | null) => data.stations.find((s) => s.id === id)?.name
  const r = a.round
  const other = (a.setup.city ?? DEFAULT_CITY) !== city().id
  if (other) {
    return (
      <div className="card">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <b>{title(a)}</b>
          <button className="link" onClick={close}>
            {tr('Lukk', 'Close')}
          </button>
        </div>
        <p className="mb-2 text-sm">
          {tr(
            `Runden ble spilt i ${cityOf(a.setup.city).name}. Bytt by under Oppsett for å se loggen og kartet.`,
            `The round was played in ${cityOf(a.setup.city).name}. Switch city under Setup to see the log and the map.`,
          )}
        </p>
        <div className="rounded-lg bg-panel-2 p-2">
          <StatsList stats={a.stats} />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <b>{title(a)}</b>
        <button className="link" onClick={close}>
          Lukk
        </button>
      </div>
      <p className="mb-2 text-sm">
        {a.outcome === 'found' ? (
          <>
            {tr('Funnet etter', 'Found after')} <b>{clock(a.seconds ?? 0)}</b>
          </>
        ) : (
          <span className="text-bad">{tr('Avbrutt', 'Stopped')}</span>
        )}{' '}
        · {when(a.endedAt)}
        {a.room && (
          <span className="block text-xs text-muted">
            {tr('Rom', 'Room')} {a.room}
          </span>
        )}
      </p>
      <div className="mb-3 rounded-lg bg-panel-2 p-2">
        <StatsList stats={a.stats} />
      </div>
      <ul className="mb-3 list-disc space-y-0.5 pl-5 text-xs text-muted">
        <li>
          {tr(
            `Spill ${a.setup.size}, soner på ${a.setup.zoneRadius} m, linje ${a.setup.lines.join(', ')}${a.setup.playArea ? ', eget spillområde' : ''}.`,
            `Game ${a.setup.size}, ${a.setup.zoneRadius} m zones, line ${a.setup.lines.join(', ')}${a.setup.playArea ? ', custom play area' : ''}.`,
          )}
        </li>
        {r.endgame && (
          <li>
            {tr(
              `Endgame ved ${station(r.endgame.stationId) ?? 'ukjent stasjon'}, startet kl. ${time(r.endgame.time)}.`,
              `Endgame at ${station(r.endgame.stationId) ?? 'unknown station'}, started at ${time(r.endgame.time)}.`,
            )}
          </li>
        )}
        {r.moves?.map((m, i) => (
          <li key={i}>
            {tr(`Move kl. ${time(m.at)}${m.from ? ` fra ${station(m.from)}` : ''}.`, `Move at ${time(m.at)}${m.from ? ` from ${station(m.from)}` : ''}.`)}
          </li>
        ))}
        {!!r.drained?.length && <li>Drained Brain: {r.drained.map((id) => itemOf(id)?.label).join(', ')}.</li>}
        {r.spotty && <li>Spotty Memory: {r.spotty}.</li>}
        <li>
          {tr('Seekerne endte med', 'The seekers ended with')}{' '}
          {result.stations.length === 1 ? result.stations[0].name : tr(`${result.stations.length} mulige stasjoner`, `${result.stations.length} possible stations`)}.
        </li>
      </ul>
      <div className="mb-3 flex gap-1.5">
        <button
          className="btn btn-primary flex-1"
          onClick={() => {
            setViewing(a.id)
            // På mobil skjules panelet, så kartet med runden får plassen.
            setCollapsed(true)
          }}
        >
          {tr('Vis på kartet', 'Show on the map')}
        </button>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (!confirm(tr('Slette runden fra denne telefonen? Den ligger fortsatt i rommet.', 'Delete the round from this phone? It stays in the room.'))) return
            removeArchived(a.id)
            close()
          }}
        >
          {tr('Slett', 'Delete')}
        </button>
      </div>
      <ReplayVideo a={a} raw={raw} />
      <h3 className="label">
        {tr('Logg', 'Log')} ({a.questions.length})
      </h3>
      <ol className="flex flex-col gap-1.5">
        {a.questions.map((q, i) => {
          const before = i === 0 ? data.stations.length : result.steps[i - 1].count
          const after = result.steps[i]?.count ?? before
          return (
            <li key={q.id} className="rounded-lg bg-panel-2 p-2 text-sm">
              <span className="flex justify-between gap-2 text-xs text-muted">
                <span>
                  {i + 1}. {categoryOf(q)} · {time(q.time)}
                </span>
                {shrinks(q) && q.kind !== 'photo' && <span className="tabular-nums">{`${before} → ${after}`}</span>}
              </span>
              <span className="block">{describe(q, data)}</span>
              <b className="text-accent">{q.answer === null ? tr('Ikke besvart', 'Not answered') : answerLabel(q, q.answer)}</b>
              {q.note && (
                <span className="block text-xs text-muted">
                  {tr('Notat', 'Note')}: {q.note}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Alle rundene som er spilt, med logg, kart og statistikk. */
export function ArchivePanel({ raw }: { raw: GeoData }) {
  const archive = useGame((s) => s.archive)
  const room = useSync((s) => s.room)
  const [open, setOpen] = useState<string | null>(null)
  const [onlyRoom, setOnlyRoom] = useState(true)
  const [busy, setBusy] = useState(false)
  // Rundene fra rommet hentes i bakgrunnen. Det som alt ligger på telefonen, vises med en gang.
  useEffect(() => {
    if (!room) return
    setBusy(true)
    void loadArchive().finally(() => setBusy(false))
  }, [room])

  const shown = archive.filter((a) => !room || !onlyRoom || a.room === room).toReversed()
  const current = archive.find((a) => a.id === open)
  if (current) return <Section title={tr('Tidligere runder', 'Earlier rounds')}><RoundDetail a={current} raw={raw} close={() => setOpen(null)} /></Section>

  return (
    <Section title={`${tr('Tidligere runder', 'Earlier rounds')} (${shown.length})`}>
      {room && (
        <div className="mb-2 flex gap-1.5">
          <button className={`btn min-h-9! flex-1 ${onlyRoom ? 'btn-on' : ''}`} onClick={() => setOnlyRoom(true)}>
            {tr('Rom', 'Room')} {room}
          </button>
          <button className={`btn min-h-9! flex-1 ${onlyRoom ? '' : 'btn-on'}`} onClick={() => setOnlyRoom(false)}>
            {tr('Alle', 'All')}
          </button>
          <button
            className="btn min-h-9!"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await loadArchive()
              setBusy(false)
            }}
          >
            {busy ? tr('Henter…', 'Loading…') : tr('Oppdater', 'Refresh')}
          </button>
        </div>
      )}
      {busy && (
        <p className="mb-2 flex items-center gap-2 text-sm text-muted" role="status">
          <Spinner className="size-3.5!" /> {tr('Henter runder fra rommet…', 'Loading rounds from the room…')}
        </p>
      )}
      {shown.length === 0 && !busy && <p className="text-sm text-muted">{tr('Ingen runder ennå. Når hider er funnet eller runden avbrytes, lagres hele runden her.', 'No rounds yet. When the hider is found or the round is stopped, the whole round is saved here.')}</p>}
      <ul className="flex flex-col gap-1.5">
        {shown.map((a) => (
          <li key={a.id}>
            <button className="card flex w-full cursor-pointer items-center justify-between gap-2 py-2! text-left" onClick={() => setOpen(a.id)}>
              <span className="min-w-0 text-sm">
                <b className="block truncate">{title(a)}</b>
                <span className="text-xs text-muted">
                  {when(a.endedAt)} · {a.stats.asked} {tr('spørsmål', 'questions')}
                  {a.room && !onlyRoom ? ` · ${tr('rom', 'room')} ${a.room}` : ''}
                </span>
              </span>
              <span className={`shrink-0 text-sm tabular-nums ${a.outcome === 'found' ? '' : 'text-bad'}`}>{a.outcome === 'found' ? clock(a.seconds ?? 0) : tr('Avbrutt', 'Stopped')}</span>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  )
}
