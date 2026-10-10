import { useEffect, useMemo, useState } from 'react'
import MapView from './MapView'
import { HiderPanel, MapPanel, RoundPanel, SettingsPanel } from './Panels'
import QuestionsView from './QuestionsView'
import { loadData } from './data'
import { solve } from './geo'
import { gameFromHash, useGame, useUi, type Tab } from './store'
import type { GeoData } from './types'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'map', label: 'Kart', icon: '🗺️' },
  { key: 'questions', label: 'Spørsmål', icon: '❓' },
  { key: 'hider', label: 'Hider', icon: '🙈' },
  { key: 'round', label: 'Runde', icon: '⏱️' },
  { key: 'settings', label: 'Oppsett', icon: '⚙️' },
]

function useTheme() {
  const theme = useGame((s) => s.settings.theme)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme = theme === 'auto' ? (mq.matches ? 'dark' : 'light') : theme
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/** Åpnes siden med et delt spill i lenken, tilbys det importert én gang. */
function useSharedLink() {
  useEffect(() => {
    const game = gameFromHash(location.hash)
    if (!game) return
    history.replaceState(null, '', location.pathname)
    const mine = useGame.getState().questions.length
    const ask = `Importere delt spill med ${game.questions.length} spørsmål?${mine ? ` Dine ${mine} spørsmål erstattes (kan angres).` : ''}`
    if (confirm(ask)) useGame.getState().importGame(game)
  }, [])
}

export default function App() {
  const [data, setData] = useState<GeoData | null>(null)
  const [error, setError] = useState(false)
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  const pick = useUi((s) => s.pick)
  const questions = useGame((s) => s.questions)
  const settings = useGame((s) => s.settings)
  const pending = questions.filter((q) => q.answer === null).length

  useTheme()
  useSharedLink()
  useEffect(() => {
    loadData().then(setData, () => setError(true))
  }, [])

  const result = useMemo(
    () => data && solve(questions, data, settings),
    // Bare sonestørrelse og linjevalg påvirker geometrien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, questions, settings.zoneRadius, settings.lines],
  )

  if (error) return <p className="p-6 text-bad">Kunne ikke laste stasjonsdata. Last siden på nytt.</p>
  if (!data || !result) return <p className="p-6 text-muted">Laster T-banekartet…</p>

  return (
    <div className="flex h-dvh flex-col md:flex-row-reverse">
      <main className="relative min-h-0 flex-1">
        <MapView data={data} result={result} />
      </main>
      <aside className={`flex ${tab === 'map' ? 'max-h-[38dvh]' : 'max-h-[62dvh]'} flex-col border-t border-border bg-bg md:h-full md:max-h-none md:w-96 md:border-t-0 md:border-r`}>
        {/* Mens man velger punkt på kartet, skjules panelet på mobil så kartet får plassen. */}
        <div className={`min-h-0 flex-1 overflow-y-auto p-4 ${pick ? 'hidden md:block' : ''}`}>
          <div className="mb-3 hidden items-baseline justify-between md:flex">
            <h1 className="text-lg font-bold">
              Hide and Seek <span className="text-accent">Oslo</span>
            </h1>
            <a className="text-xs text-muted underline" href="../">
              Til forsiden
            </a>
          </div>
          {tab === 'map' && <MapPanel data={data} result={result} />}
          {tab === 'questions' && <QuestionsView data={data} result={result} />}
          {tab === 'hider' && <HiderPanel data={data} />}
          {tab === 'round' && <RoundPanel />}
          {tab === 'settings' && <SettingsPanel data={data} />}
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
