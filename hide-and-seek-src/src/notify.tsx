import { useEffect, useState } from 'react'
import { tr } from './lang'
import { create } from 'zustand'
import { answerLabel, categoryOf, itemOf } from './form'
import type { Round } from './clock'
import { useUi, type Tab } from './store'
import type { Question } from './types'

const TOAST_MS = 7000

interface Note {
  title: string
  body: string
  tab: Tab
}
const useToast = create<{ note: Note | null }>(() => ({ note: null }))

const supported = () => typeof Notification !== 'undefined'

/** Viser beskjeden i appen, og som systemvarsel når appen ligger i bakgrunnen. */
export function notify(note: Note) {
  useToast.setState({ note })
  navigator.vibrate?.(200)
  if (!supported() || Notification.permission !== 'granted' || !document.hidden) return
  const options = { body: note.body, tag: 'hideandseek', icon: `${import.meta.env.BASE_URL}icon.svg` }
  // Mobilnettlesere krever at varselet går via service workeren.
  navigator.serviceWorker?.ready.then((reg) => reg.showNotification(note.title, options)).catch(() => new Notification(note.title, options))
}

/**
 * Sammenligner loggen før og etter en endring fra rommet og varsler om det som
 * angår rollen: hider får beskjed om nye spørsmål, seeker om nye svar.
 */
export function announce(before: Question[], after: Question[], mode: 'seeker' | 'hider') {
  const old = new Map(before.map((q) => [q.id, q]))
  const category = (q: Question) => `${categoryOf(q)}${itemOf(q.item) ? `: ${itemOf(q.item)!.label}` : ''}`
  for (const q of after) {
    const prev = old.get(q.id)
    if (!prev && q.answer === null) {
      notify({
        title: mode === 'hider' ? tr('Nytt spørsmål til deg', 'New question for you') : tr('Nytt spørsmål stilt', 'New question asked'),
        body: `${category(q)}${mode === 'hider' ? tr('. Åpne Spørsmål for å svare.', '. Open Questions to answer.') : ''}`,
        tab: 'questions',
      })
    } else if (q.answer !== null && prev?.answer !== q.answer && mode === 'seeker') {
      const swap = q.swap && itemOf(q.swap)
      notify({ title: tr('Hider har svart', 'The hider answered'), body: `${category(q)} → ${answerLabel(q, q.answer)}${swap ? tr(`. Still «${swap.label}» i stedet.`, `. Ask "${swap.label}" instead.`) : ''}`, tab: 'questions' })
    }
  }
}

/** Seekerne får beskjed når hider spiller et kort som endrer spillet for dem. */
export function announceRound(before: Round, after: Round, mode: 'seeker' | 'hider') {
  // Endgame startes av en seeker. Hider må vite det med en gang for å stå stille. Hider får ikke vite stasjonen.
  if (after.endgame && !before.endgame) {
    notify(
      mode === 'hider'
        ? { title: tr('Endgame er startet', 'The endgame has started'), body: tr('Seekerne er i en sone. Er det din, står du stille der du er nå.', 'The seekers are in a zone. If it is yours, stay put where you are now.'), tab: 'questions' }
        : { title: tr('Endgame er startet', 'The endgame has started'), body: tr('En annen seeker startet endgame. Bare den ene sonen er gyldig nå.', 'Another seeker started the endgame. Only that one zone counts now.'), tab: 'endgame' },
    )
  } else if (!after.endgame && before.endgame && after.seekFrom !== null) {
    notify({ title: tr('Endgame er avsluttet', 'The endgame has ended'), body: mode === 'hider' ? tr('Seekerne har avsluttet endgame.', 'The seekers have ended the endgame.') : tr('Kartet viser igjen alle stasjonene svarene peker ut.', 'The map shows all the stations the answers point to again.'), tab: mode === 'hider' ? 'questions' : 'endgame' })
  }
  if (mode !== 'seeker') return
  if ((after.moves?.length ?? 0) > (before.moves?.length ?? 0)) {
    notify({ title: tr('Hider har spilt Move', 'The hider played Move'), body: tr('Bli stående. Ingen spørsmål før hider er i ny sone.', 'Stay where you are. No questions until the hider is in a new zone.'), tab: 'questions' })
  } else if (before.pause?.kind === 'move' && !after.pause) {
    notify({ title: tr('Hider er i ny sone', 'The hider is in a new zone'), body: tr('Spillet fortsetter. Kartet starter på nytt.', 'The game resumes. The map starts over.'), tab: 'questions' })
  }
  if ((after.drained?.length ?? 0) > (before.drained?.length ?? 0)) {
    notify({ title: tr('Hider har spilt Drained Brain', 'The hider played Drained Brain'), body: `${after.drained!.map((id) => itemOf(id)?.label).join(', ')} ${tr('kan ikke stilles.', 'cannot be asked.')}`, tab: 'questions' })
  }
  if (after.spotty && after.spotty !== before.spotty) {
    notify({ title: 'Spotty Memory', body: `${after.spotty} ${tr('er slått ut.', 'is knocked out.')}`, tab: 'questions' })
  }
}

/** Beskjeden øverst på kartet. Trykk for å gå til riktig fane. */
export function Toast() {
  const note = useToast((s) => s.note)
  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => useToast.setState({ note: null }), TOAST_MS)
    return () => clearTimeout(t)
  }, [note])
  if (!note) return null
  return (
    <button
      className="card absolute top-[calc(3.75rem+env(safe-area-inset-top))] left-1/2 z-[1100] w-[min(22rem,calc(100%-1.5rem))] -translate-x-1/2 cursor-pointer border-accent! text-left shadow-xl"
      role="status"
      onClick={() => {
        useUi.setState({ tab: note.tab, collapsed: false })
        useToast.setState({ note: null })
      }}
    >
      <b className="block text-sm">{note.title}</b>
      <span className="text-sm text-muted">{note.body}</span>
    </button>
  )
}

/** Slår på systemvarsler, som trengs når appen ligger i bakgrunnen. */
export function NotifyToggle() {
  const [permission, setPermission] = useState(supported() ? Notification.permission : 'unsupported')
  if (permission === 'granted') return <p className="mb-2 text-xs text-ok">{tr('Varsler er på.', 'Notifications are on.')}</p>
  if (permission === 'unsupported') {
    return (
      <p className="mb-2 text-xs text-muted">
        {tr(
          'Varsler støttes ikke her. På iPhone må siden først legges til på Hjem-skjermen (Del → Legg til på Hjem-skjerm).',
          'Notifications are not supported here. On iPhone the page must first be added to the Home Screen (Share → Add to Home Screen).',
        )}
      </p>
    )
  }
  if (permission === 'denied') return <p className="mb-2 text-xs text-bad">{tr('Varsler er blokkert for denne siden. Slå dem på i nettleserens innstillinger.', 'Notifications are blocked for this page. Turn them on in the browser settings.')}</p>
  return (
    <button className="btn mb-2 w-full" onClick={async () => setPermission(await Notification.requestPermission())}>
      {tr('🔔 Slå på varsler', '🔔 Turn on notifications')}
    </button>
  )
}
