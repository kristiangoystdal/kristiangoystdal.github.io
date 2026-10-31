import { Check, ChevronRight, Copy, Dices, Eye, GraduationCap, Plus, QrCode, Settings, Share2, X } from 'lucide-react'
import { LOCALE, tr } from './lang'
import qrcode from 'qrcode-generator'
import { useEffect, useState } from 'react'
import { ArchivePanel } from './Archive'
import { CITIES, MODES, city as loadedCity, cityOf } from './cities'
import { SIZE_RULES } from './form'

const SIZE_NAMES = { S: 'Small', M: 'Medium', L: 'Large' } as const
import type { Result } from './geo'
import { useGuide } from './guide'
import { LastResult, RulesPanel, Scoreboard } from './Panels'
import { ShareGame } from './QuestionsView'
import { countUse } from './presets'
import { useGame, useUi } from './store'
import { CODE_LENGTH, cleanCode, createRoom, joinRoom, leaveRoomClean, recentRooms, roomLink, useSync } from './sync'
import type { GeoData } from './types'
import { Loading, Spinner } from './ui'

/**
 * Lobbyen før og mellom rundene: én skjerm. Rom øverst, så spillerne og hvem som gjemmer
 * seg, rollen til denne telefonen, oppsettet og gjemmetiden. «Start runden» står fast nederst
 * (`StartBar`), så den alltid kan nås med tommelen.
 */
export function Lobby({ data, all, result }: { data: GeoData | null; all: GeoData | null; result: Result | null }) {
  return (
    <div>
      <LobbyHeader />
      <FirstVisit />
      <LastResult />
      <CityAndRules />
      <PlayerChips />
      <RoleToggle />
      <HidingChips />
      <RoomBlock />
      <div className="mt-8 border-t border-border pt-4">
        <Scoreboard />
        {all ? <ArchivePanel raw={all} /> : <Loading text={tr('Henter tidligere runder…', 'Loading earlier rounds…')} />}
        <ShareGame />
      </div>
      <RulesSheet data={data} all={all} result={result} />
    </div>
  )
}

/** Navneskiltet øverst, som skiltet på en stasjon: appens navn og byen. */
function LobbyHeader() {
  const cityId = useGame((s) => s.settings.city)
  return (
    <header className="sign mb-3 flex h-12 items-center gap-1 pr-1 pl-3.5">
      <h1 className="min-w-0 flex-1 truncate text-lg leading-none">
        Hide and Seek <span className="font-semibold opacity-75">{cityOf(cityId).name}</span>
      </h1>
      <button className="flex h-10 cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 font-sign text-[15px] font-semibold hover:bg-white/10" data-guide="learn" onClick={() => useUi.getState().setSheet('learn')}>
        <GraduationCap size={18} aria-hidden /> {tr('Lær appen', 'Learn the app')}
      </button>
      <button className="grid size-10 cursor-pointer place-items-center rounded-[6px] hover:bg-white/10" aria-label={tr('Innstillinger', 'Settings')} data-guide="app" onClick={() => useUi.getState().setSheet('app')}>
        <Settings size={19} aria-hidden />
      </button>
    </header>
  )
}

/** Første gang: en kort linje om at appen kan prøves uten oppsett. Forsvinner når den er brukt eller lukket. */
function FirstVisit() {
  const seen = useGuide((s) => s.seen)
  const script = useGuide((s) => s.script)
  if (seen || script) return null
  return (
    <p className="-mt-1 mb-4 flex items-center gap-2 text-sm text-muted">
      <span className="flex-1">
        <b className="font-sign text-text">{tr('Ny her?', 'New here?')}</b> {tr('Prøv en demorunde før dere setter opp noe.', 'Try a demo round before you set anything up.')}{' '}
        <button className="link text-sm! text-accent!" onClick={() => useUi.getState().setSheet('learn')}>
          {tr('Vis meg', 'Show me')}
        </button>
      </span>
      <button className="grid size-10 shrink-0 cursor-pointer place-items-center" aria-label={tr('Skjul', 'Hide')} onClick={() => useGuide.setState({ seen: true })}>
        <X size={18} aria-hidden />
      </button>
    </p>
  )
}

/** En gruppe i lobbyen: tittel, eventuelt en handling til høyre, og innholdet. */
function Group({ title, action, children, guide }: { title: string; action?: React.ReactNode; children: React.ReactNode; guide?: string }) {
  return (
    <section className="mb-5" data-guide={guide}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Romkoden som avgangstavle: én flis per tegn. */
function CodeTiles({ code }: { code: string }) {
  return (
    <span className="flex gap-1" aria-label={`${tr('Romkode', 'Room code')} ${code.split('').join(' ')}`}>
      {code.split('').map((c, i) => (
        <span key={i} className="board-tile h-11 w-8 text-2xl" aria-hidden>
          {c}
        </span>
      ))}
    </span>
  )
}

/** Rommet: koden stor, med kopier, del og QR. Uten rom en kort linje om å spille på flere telefoner. */
function RoomBlock() {
  const { room, status, error } = useSync()
  const hasGame = useGame((s) => s.questions.length > 0)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState(false)
  const recent = room ? [] : recentRooms().slice(0, 3)
  const join = (c: string) => {
    if (hasGame && !confirm(tr('Spørsmålene på denne telefonen erstattes av rommets. Fortsette?', "The questions on this phone will be replaced by the room's. Continue?"))) return
    void joinRoom(c)
  }

  if (room) {
    const link = roomLink(room)
    return (
      <Group
        title={tr('Rom', 'Room')}
        guide="lobby-room"
        action={
          <span className={`text-sm ${status === 'online' ? 'text-ok' : 'text-muted'}`}>
            {status === 'online' ? tr('● Tilkoblet', '● Connected') : status === 'connecting' ? tr('Kobler til…', 'Connecting…') : tr('Frakoblet', 'Offline')}
          </span>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CodeTiles code={room} />
          <span className="flex gap-1.5">
            <button
              className="btn px-2.5!"
              aria-label={tr('Kopier lenke til rommet', 'Copy link to the room')}
              onClick={async () => {
                await navigator.clipboard?.writeText(link).catch(() => {})
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
            </button>
            {typeof navigator.share === 'function' && (
              <button
                className="btn px-2.5!"
                aria-label={tr('Del lenke til rommet', 'Share link to the room')}
                onClick={() => void navigator.share({ title: 'Hide and Seek', text: tr(`Bli med i rom ${room}`, `Join room ${room}`), url: link }).catch(() => {})}
              >
                <Share2 size={18} aria-hidden />
              </button>
            )}
            <button className={`btn px-2.5! ${qr ? 'btn-on' : ''}`} aria-label={tr('Vis QR-kode', 'Show QR code')} aria-pressed={qr} onClick={() => setQr(!qr)}>
              <QrCode size={18} aria-hidden />
            </button>
          </span>
        </div>
        {qr && <QrImage text={link} />}
        <p className="mt-2 text-sm text-muted">
          {tr(
            'De andre skanner koden eller åpner lenken. Logg, klokke og poengtavle er felles. Hiders gjemmested deles aldri.',
            "The others scan the code or open the link. The log, clock and scoreboard are shared. The hider's hiding spot is never shared.",
          )}
        </p>
        <button
          className="link mt-1"
          onClick={() => {
            if (
              confirm(
                tr(
                  `Forlate rom ${room}? Rundene, poengtavlen og spillerne fra rommet fjernes fra denne telefonen. Byen og reglene beholdes. Alt ligger fortsatt i rommet, så du kan bli med igjen senere.`,
                  `Leave room ${room}? The rounds, scoreboard and players from the room are removed from this phone. The city and rules are kept. Everything stays in the room, so you can join again later.`,
                ),
              )
            )
              leaveRoomClean()
          }}
        >
          {tr('Forlat rommet', 'Leave the room')}
        </button>
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      </Group>
    )
  }

  return (
    <Group title={tr('Flere telefoner?', 'More than one phone?')} guide="lobby-room">
      <p className="mb-2 text-sm text-muted">
        {tr('Lag et rom, så ser alle samme logg og klokke. På én telefon trenger dere ikke rom.', 'Create a room so everyone sees the same log and clock. With one phone you do not need a room.')}
      </p>
      <div className="flex gap-1.5">
        <button className="btn shrink-0" data-guide="create-room" onClick={() => void createRoom()}>
          <Plus size={18} aria-hidden /> {tr('Opprett rom', 'Create room')}
        </button>
        <form
          className="flex min-w-0 flex-1 gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            join(code)
          }}
        >
          <input className="field board min-w-0 tracking-[0.2em] uppercase" value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="ABC123" aria-label={tr('Romkode', 'Room code')} autoCapitalize="characters" autoComplete="off" />
          <button className="btn shrink-0" disabled={code.length !== CODE_LENGTH}>
            {tr('Bli med', 'Join')}
          </button>
        </form>
      </div>
      {recent.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted">{tr('Tidligere:', 'Recent:')}</span>
          {recent.map((r) => (
            <button key={r.code} className="chip board min-h-8! px-2.5! text-sm" title={`${tr('Sist brukt', 'Last used')} ${new Date(r.at).toLocaleString(LOCALE)}`} onClick={() => join(r.code)}>
              {r.code}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </Group>
  )
}

/** QR-kode for lenken til rommet, så de andre kan skanne den fra skjermen. */
function QrImage({ text }: { text: string }) {
  const q = qrcode(0, 'M')
  q.addData(text)
  q.make()
  return <div className="mt-3 grid place-items-center rounded-[14px] bg-white p-3 [&_svg]:h-auto [&_svg]:w-48" role="img" aria-label={tr('QR-kode med lenke til rommet', 'QR code with a link to the room')} dangerouslySetInnerHTML={{ __html: q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) }} />
}

/**
 * Spillerne som brikker. Trykk på en for å gjøre hen til hider (øyet viser hvem).
 * «Rediger» viser kryss for å fjerne. Den første som legges til, gjemmer seg til noen velger annet.
 */
function PlayerChips() {
  const players = useGame((s) => s.players)
  const hider = useGame((s) => s.round.hider)
  const g = useGame.getState
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const add = () => {
    const n = name.trim()
    if (!n) return
    g().addPlayer(n)
    if (!g().round.hider) g().setRound({ hider: n })
    setName('')
  }
  return (
    <Group
      title={tr('Spillere', 'Players')}
      guide="lobby-players"
      action={
        players.length > 0 && (
          <span className="flex gap-1.5">
            {players.length > 1 && !editing && (
              <button className="btn min-h-10! px-2.5! text-sm!" onClick={() => g().shufflePlayers()}>
                <Dices size={16} aria-hidden /> {tr('Trekk', 'Shuffle')}
              </button>
            )}
            <button className={`btn min-h-10! px-2.5! text-sm! ${editing ? 'btn-on' : ''}`} aria-pressed={editing} onClick={() => setEditing(!editing)}>
              {editing ? tr('Ferdig', 'Done') : tr('Rediger', 'Edit')}
            </button>
          </span>
        )
      }
    >
      {players.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr('Hvem gjemmer seg', 'Who is hiding')}>
          {players.map((p) => {
            const hides = p === hider
            return editing ? (
              <button key={p} className="chip" aria-label={tr(`Fjern ${p}`, `Remove ${p}`)} onClick={() => g().removePlayer(p)}>
                {p} <X size={15} aria-hidden />
              </button>
            ) : (
              <button key={p} role="radio" aria-checked={hides} className={`chip ${hides ? 'border-hide! bg-hide! text-white!' : ''}`} onClick={() => g().setRound({ hider: p })}>
                {hides && <Eye size={16} aria-hidden />}
                {p}
              </button>
            )
          })}
        </div>
      )}
      {!editing && (
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={players.length ? tr('Legg til en til', 'Add another') : tr('Navn på en spiller', 'Name of a player')} aria-label={tr('Ny spiller', 'New player')} data-guide="add-player" enterKeyHint="done" />
          <button className="btn px-3!" aria-label={tr('Legg til', 'Add')} disabled={!name.trim()}>
            <Plus size={20} aria-hidden />
          </button>
        </form>
      )}
      <p className="mt-2 text-sm text-muted">
        {players.length > 1 ? tr('Trykk på den som skal gjemme seg.', 'Tap the one who will hide.') : tr('Legg inn alle som er med. Uten navn kan dere likevel spille.', 'Add everyone who is playing. You can still play without names.')}
      </p>
    </Group>
  )
}

/** Rollen til denne telefonen, i rollens farge. Låst under runden. */
function RoleToggle() {
  const mode = useGame((s) => s.mode)
  const setMode = useGame((s) => s.setMode)
  const options = [
    { value: 'seeker' as const, label: tr('Leter', 'Seeking'), detail: tr('stiller spørsmål', 'asks questions'), on: 'border-seek! bg-seek! text-white!' },
    { value: 'hider' as const, label: tr('Gjemmer seg', 'Hiding'), detail: tr('svarer', 'answers'), on: 'border-hide! bg-hide! text-white!' },
  ]
  return (
    <Group title={tr('Denne telefonen', 'This phone')} guide="lobby-role">
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={tr('Denne telefonen', 'This phone')}>
        {options.map((o) => (
          <button key={o.value} role="radio" aria-checked={mode === o.value} className={`btn h-auto! flex-col! gap-0! py-2! ${mode === o.value ? o.on : ''}`} onClick={() => setMode(o.value)}>
            <span className="text-base">{o.label}</span>
            <span className="text-xs font-normal opacity-80">{o.detail}</span>
          </button>
        ))}
      </div>
    </Group>
  )
}

/**
 * Byen og oppsettet, øverst i lobbyen: byene som valg, og resten av oppsettet som én linje
 * som åpner arket med alle valgene.
 */
function CityAndRules() {
  const current = useGame((s) => s.settings.city)
  const setCity = useGame((s) => s.setCity)
  const s = useGame((x) => x.settings)
  const lines = s.lines.length
  const area = !s.playArea ? tr('hele nettet', 'whole network') : s.areaAuto === false ? tr('eget område', 'custom area') : tr('automatisk område', 'automatic area')
  return (
    <Group title={tr('By og oppsett', 'City and setup')} guide="lobby-rules">
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={tr('By', 'City')}>
        {CITIES.map((c) => {
          const on = c.id === current
          return (
            <button
              key={c.id}
              role="radio"
              aria-checked={on}
              className={`flex h-auto min-h-12 cursor-pointer flex-col items-start justify-center rounded-[6px] border px-3 py-1.5 text-left font-sign ${on ? 'border-sign bg-sign text-sign-text' : 'border-border bg-panel text-text'}`}
              onClick={() => {
                if (
                  !on &&
                  confirm(
                    tr(
                      `Bytte til ${c.name}? Spillområde, linjevalg og spørsmålsutvalg nullstilles, og alle i rommet får samme by.`,
                      `Switch to ${c.name}? The play area, lines and question selection are reset, and everyone in the room gets the same city.`,
                    ),
                  )
                )
                  setCity(c.id)
              }}
            >
              <span className="text-[17px] leading-tight font-bold">{c.name}</span>
              <span className={`text-xs font-normal ${on ? 'opacity-80' : 'text-muted'}`}>{c.modes.map((m, i) => (i ? MODES[m].name.toLowerCase() : MODES[m].name)).join(', ')}</span>
            </button>
          )
        })}
      </div>
      <button className="card mt-2 flex w-full cursor-pointer items-center gap-3 text-left" onClick={() => useUi.getState().setSheet('rules')}>
        <span className="min-w-0 flex-1">
          <span className={`block font-sign font-semibold ${lines ? '' : 'text-bad'}`}>{lines
              ? tr(`${SIZE_NAMES[s.size]}, sone ${s.zoneRadius} m, ${lines} ${lines === 1 ? 'linje' : 'linjer'}, ${area}`, `${SIZE_NAMES[s.size]}, ${s.zoneRadius} m zone, ${lines} ${lines === 1 ? 'line' : 'lines'}, ${area}`)
              : tr('Ingen linjer er valgt', 'No lines selected')}
          </span>
          <span className="block text-sm text-muted">{tr('Spillstørrelse, linjer, sone, område og spørsmål', 'Game size, lines, zone, area and questions')}</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden />
      </button>
    </Group>
  )
}

const HIDING_CHOICES = [30, 45, 60, 90]

/** Gjemmetiden som brikker. Spillstørrelsen foreslår en, og «Annen» gir fritt valg. */
function HidingChips() {
  const minutes = useGame((s) => s.round.hidingMinutes)
  const size = useGame((s) => s.settings.size)
  const setRound = useGame((s) => s.setRound)
  const [custom, setCustom] = useState(!HIDING_CHOICES.includes(minutes))
  const suggested = SIZE_RULES[size].hidingMinutes
  return (
    <Group title={tr('Gjemmetid', 'Hiding time')} guide="lobby-hiding">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr('Gjemmetid', 'Hiding time')}>
        {HIDING_CHOICES.map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={!custom && minutes === m}
            className={`chip ${!custom && minutes === m ? 'chip-on' : ''}`}
            onClick={() => {
              setCustom(false)
              setRound({ hidingMinutes: m })
            }}
          >
            {m} min
          </button>
        ))}
        <button role="radio" aria-checked={custom} className={`chip ${custom ? 'chip-on' : ''}`} onClick={() => setCustom(true)}>
          {tr('Annen', 'Other')}
        </button>
      </div>
      {custom && (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input className="field w-24!" type="number" min={1} inputMode="numeric" value={minutes} aria-label={tr('Gjemmetid i minutter', 'Hiding time in minutes')} onChange={(e) => setRound({ hidingMinutes: Math.max(1, +e.target.value || 1) })} />
          {tr('minutter', 'minutes')}
        </label>
      )}
      <p className="mt-2 text-sm text-muted">
        {minutes === suggested
          ? tr(`Det regelboken sier for ${SIZE_NAMES[size]}.`, `What the rulebook says for ${SIZE_NAMES[size]}.`)
          : tr(`Regelboken sier ${suggested} min for ${SIZE_NAMES[size]}. Spillstørrelsen velges under Oppsett.`, `The rulebook says ${suggested} min for ${SIZE_NAMES[size]}. The game size is chosen under Setup.`)}
      </p>
    </Group>
  )
}

/** Fast nederst i lobbyen: knappen som starter runden, med det viktigste oppsummert. */
export function StartBar({ ready }: { ready: boolean }) {
  const g = useGame()
  // Mens byen lastes, er linjene ikke valgt ennå. Da venter knappen i stedet for å si at noe er galt.
  const problem = !ready ? tr('Laster kartet…', 'Loading the map…') : !g.settings.lines.length ? tr('Velg minst én linje under Oppsett.', 'Choose at least one line under Setup.') : null
  return (
    <div className="shrink-0 border-t border-border bg-panel px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
      <p className={`mb-1.5 flex items-center gap-2 text-sm ${problem && ready ? 'text-bad' : 'text-muted'}`}>
        {!ready && <Spinner className="size-3.5!" />}
        {problem ?? (
          <>
            {g.round.hider ? (
              <>
                <b className="text-hide">{g.round.hider}</b> {tr('gjemmer seg, ', 'is hiding, ')}
              </>
            ) : null}
            {g.mode === 'hider'
              ? g.round.hider
                ? tr('med denne telefonen.', 'with this phone.')
                : tr('Denne telefonen gjemmer seg.', 'This phone is hiding.')
              : g.round.hider
                ? tr('og denne telefonen leter.', 'and this phone is seeking.')
                : tr('Denne telefonen leter.', 'This phone is seeking.')}
          </>
        )}
      </p>
      <button
        className="btn btn-primary min-h-13! w-full text-lg!"
        data-guide="start-round"
        disabled={!!problem}
        onClick={() => {
          g.startRound()
          // Startes runden med et delt oppsett som ikke er endret, telles det som brukt.
          void countUse()
        }}
      >
        {tr('Start runden', 'Start the round')} <span className="font-normal opacity-85">({g.round.hidingMinutes} min)</span>
      </button>
    </div>
  )
}

/** Arket med alle valgene for oppsettet. Glir opp nedenfra og dekker ikke hele kartet. */
function RulesSheet({ data, all, result }: { data: GeoData | null; all: GeoData | null; result: Result | null }) {
  const open = useUi((s) => s.sheet === 'rules')
  const draw = useUi((s) => s.draw)
  // Tegnes spillområdet, lukkes arket så kartet blir fritt.
  useEffect(() => {
    if (open && draw) useUi.getState().setSheet(null)
  }, [open, draw])
  return (
    <Sheet open={open} title={tr(`Oppsett for ${loadedCity().name}`, `Setup for ${loadedCity().name}`)} onClose={() => useUi.getState().setSheet(null)}>
      {data && all && result ? <RulesPanel data={data} all={all} result={result} /> : <Loading text={tr('Laster kartet for byen…', 'Loading the map for the city…')} />}
    </Sheet>
  )
}

/** Et ark som glir opp nedenfra, med tittel og en synlig lukkeknapp. Trykk utenfor lukker også. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/45" role="dialog" aria-modal aria-label={title} onClick={onClose}>
      <div className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-[20px] bg-bg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn px-2.5!" aria-label={tr('Lukk', 'Close')} onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}
