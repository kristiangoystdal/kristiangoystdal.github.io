import { AppInfo, EndgameControl, HiderPosition, MapOptions, PossibleStations, RoomInfo, RoundBar } from './Panels'
import { Crosshair, MessageCircleQuestionMark, Ruler } from 'lucide-react'
import QuestionsView from './QuestionsView'
import { ToolsPanel } from './Tools'
import type { Result } from './geo'
import { useGame, useUi, type Tab } from './store'
import { useSync } from './sync'
import type { GeoData } from './types'
import { LearnButtons } from './GuideCard'
import { Sheet } from './Lobby'
import { Section, left, useGameNow } from './ui'
import { useDemo } from './demo'

const TABS: { key: Tab; label: (hider: boolean) => string; icon: typeof Crosshair }[] = [
  { key: 'questions', label: () => 'Spørsmål', icon: MessageCircleQuestionMark },
  { key: 'endgame', label: (hider) => (hider ? 'Din sone' : 'Endgame'), icon: Crosshair },
  { key: 'tools', label: () => 'Verktøy', icon: Ruler },
]

/** Fanene nederst på spillskjermen. */
export function GameTabs() {
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  const hider = useGame((s) => s.mode === 'hider')
  const pending = useGame((s) => s.questions.filter((q) => q.answer === null).length)
  return (
    <nav className="flex shrink-0 border-t border-border bg-panel pb-[env(safe-area-inset-bottom)]" aria-label="Spillskjerm">
      {TABS.map((t) => (
        <button
          key={t.key}
          data-guide={`tab-${t.key}`}
          className={`relative flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${tab === t.key ? 'text-accent' : 'text-muted'}`}
          aria-current={tab === t.key ? 'page' : undefined}
          onClick={() => setTab(t.key)}
        >
          <t.icon size={22} strokeWidth={tab === t.key ? 2.4 : 1.8} aria-hidden />
          <span className="font-sign text-xs font-semibold">{t.label(hider)}</span>
          {t.key === 'questions' && pending > 0 && <span className="absolute top-1.5 right-[22%] grid size-4 place-items-center rounded-full bg-accent text-[10px] text-accent-text">{pending}</span>}
        </button>
      ))}
    </nav>
  )
}

/** Spillskjermen mens runden pågår: klokken øverst, så fanen som er valgt. */
export function GameScreen({ data, result }: { data: GeoData; result: Result }) {
  const tab = useUi((s) => s.tab)
  const hider = useGame((s) => s.mode === 'hider')
  return (
    <div>
      <RoundBar />
      {tab === 'questions' && <HidingStatus />}
      {tab === 'questions' && <QuestionsView data={data} result={result} />}
      {tab === 'endgame' &&
        (hider ? (
          <HiderPosition data={data} />
        ) : (
          <>
            <EndgameControl data={data} result={result} />
            <PossibleStations data={data} result={result} />
          </>
        ))}
      {tab === 'tools' && (
        <>
          <ToolsPanel stations={data.stations} />
          <RoomSection />
          <MapOptions data={data} />
          <AppButtons />
        </>
      )}
    </div>
  )
}

/** I gjemmetiden: hva som skjer nå, og hva hver rolle skal gjøre. */
function HidingStatus() {
  const now = useGameNow()
  const seekFrom = useGame((s) => s.round.seekFrom)
  const hider = useGame((s) => s.round.hider)
  const isHider = useGame((s) => s.mode === 'hider')
  const replay = useDemo((s) => s.kind === 'showcase')
  if (replay || seekFrom === null || now >= seekFrom || Date.now() >= seekFrom) return null
  return (
    <section className="mb-5">
      <h2 className="text-xl leading-tight font-bold">{isHider ? 'Gjem deg' : `${hider || 'Hider'} gjemmer seg`}</h2>
      <p className="mt-1 text-[15px]">
        Letingen starter om <b className="board">{left(seekFrom - now)}</b>.
      </p>
      <ul className="mt-3 space-y-1.5 text-[15px]">
        {isHider ? (
          <>
            <li>Reis til en stasjon og gjem deg innenfor sonen rundt den.</li>
            <li>Appen følger posisjonen din, men den sendes aldri til seekerne.</li>
            <li>Spørsmålene dukker opp her når letingen starter.</li>
          </>
        ) : (
          <>
            <li>Vent på startstedet til klokken er ute.</li>
            <li>Les gjerne spørsmålene og reglene imens.</li>
            <li>Er dere enige om å starte før, trykker dere «Start letingen».</li>
          </>
        )}
      </ul>
    </section>
  )
}

function RoomSection() {
  const room = useSync((s) => s.room)
  if (!room) return null
  return (
    <Section title="Rom">
      <RoomInfo />
    </Section>
  )
}

/** Regler, hjelp og app-innstillinger. I lobbyen står de øverst, på spillskjermen under Verktøy. */
export function AppButtons({ compact = false }: { compact?: boolean }) {
  const setSheet = useUi((s) => s.setSheet)
  const setRules = useUi((s) => s.setRules)
  return (
    <div className={`flex gap-1.5 ${compact ? '' : 'mt-2'}`}>
      <button className="btn flex-1" onClick={() => setRules('')}>
        📖 Regler
      </button>
      <button className="btn flex-1" data-guide="app" onClick={() => setSheet('app')}>
        ⚙ Hjelp og innstillinger
      </button>
    </div>
  )
}

/** Innstillinger og hjelp. Endrer ikke spillet. */
export function AppSheet({ data, help }: { data: GeoData | null; help?: React.ReactNode }) {
  const open = useUi((s) => s.sheet === 'app')
  const close = () => useUi.getState().setSheet(null)
  return (
    <Sheet open={open} title="Innstillinger og hjelp" onClose={close}>
      {help}
      <AppInfo data={data} />
      <a className="link" href="../">
        Til forsiden
      </a>
    </Sheet>
  )
}

/** Lær appen: omvisning, demorunde, simulerte spill og regler. */
export function LearnSheet() {
  const open = useUi((s) => s.sheet === 'learn')
  return (
    <Sheet open={open} title="Lær appen" onClose={() => useUi.getState().setSheet(null)}>
      <p className="mb-4 text-sm text-muted">Spillet ditt blir ikke rørt. Alt her skjer ved siden av, og du kommer tilbake der du var.</p>
      <LearnButtons />
    </Sheet>
  )
}
