import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEMO_START, endDemo, startDemo, useDemo } from './demo'
import { answerLabel } from './form'
import { useGame, useUi } from './store'
import { useTestMode } from './testmode'

/**
 * Guiden: en omvisning i lobbyen, og en demorunde steg for steg. Hvert steg peker på
 * en knapp (`data-guide`) og går videre av seg selv når brukeren har gjort det.
 */
export interface GuideStep {
  title: string
  body: () => string
  /** `data-guide` på knappen eller området steget handler om. */
  target?: string
  /** Steget er gjort. Da går guiden videre av seg selv. */
  done?: () => boolean
  /** Kjøres når steget vises, f.eks. for å åpne riktig fane. */
  enter?: () => void
  /** Demoen viser hvor seeker står, med «Flytt meg». Bare på stegene som handler om det. */
  position?: boolean
}

export type Script = 'tour' | 'demo'

interface GuideState {
  script: Script | null
  step: number
  /** Velkomstkortet er vist og lukket. */
  seen: boolean
  /** Stasjonene som er igjen på seekers kart. Settes av appen, så demoen vet når det er få igjen. */
  left: number
}
export const useGuide = create<GuideState>()(persist((): GuideState => ({ script: null, step: 0, seen: false, left: 0 }), { name: 'hideandseek.guide', partialize: (s) => ({ seen: s.seen }) }))

const game = () => useGame.getState()
const ui = () => useUi.getState()
export const TOUR: GuideStep[] = [
  {
    title: 'Velkommen',
    body: () => 'Appen holder styr på spørsmål, svar og kart i Jet Lag Hide and Seek. Her er hva knappene i lobbyen gjør. Du kan avslutte når som helst.',
  },
  {
    title: 'Kartet',
    target: 'map',
    body: () => 'Prikkene er stasjonene hider kan gjemme seg ved, i linjenes farger. Hvert svar fra hider skraverer bort det som ikke passer, til én stasjon er igjen.',
  },
  {
    title: 'By og oppsett',
    target: 'lobby-rules',
    body: () => 'Velg byen dere spiller i. Spillstørrelse, linjer, sone og spørsmål ligger bak linjen under. Standarden følger regelboken, så de fleste kan la det være.',
  },
  {
    title: 'Spillere',
    target: 'lobby-players',
    body: () => 'Legg inn alle som er med, og trykk på den som skal gjemme seg. Øyet viser hvem det er.',
  },
  {
    title: 'Denne telefonen',
    target: 'lobby-role',
    body: () => 'Velg om denne telefonen leter eller gjemmer seg. Fargen følger rollen: oransje for seekere, fiolett for hider.',
  },
  {
    title: 'Gjemmetid',
    target: 'lobby-hiding',
    body: () => 'Hvor lenge hider får på seg til å gjemme seg. Regelboken foreslår en tid ut fra spillstørrelsen.',
  },
  {
    title: 'Flere telefoner',
    target: 'lobby-room',
    body: () => 'Spiller dere på flere telefoner, oppretter én et rom og de andre blir med med koden eller QR-koden. Da ser alle samme logg og klokke. På én telefon hopper dere over dette.',
  },
  {
    title: 'Start',
    target: 'start-round',
    body: () => 'Velg gjemmetid og start runden. Da bytter appen til spillskjermen med klokken øverst og fanene Spørsmål, Endgame og Verktøy.',
  },
  {
    title: 'Lær mer',
    target: 'learn',
    body: () => 'Her finner du omvisningen igjen, demorunden og ferdige spill for hver by.',
  },
  {
    title: 'Klar?',
    body: () => 'Vil du prøve en demorunde? Du leter etter en datastyrt hider, og spillet ditt blir liggende urørt.',
  },
]

/** Hvor seeker står i demoen har flyttet seg fra start. */
const moved = () => {
  const p = useTestMode.getState().pos
  return !!p && (p[0] !== DEMO_START[0] || p[1] !== DEMO_START[1])
}
const answered = () => game().questions.filter((q) => q.answer !== null)
const hiderName = () => useDemo.getState().hider?.name ?? ''

export const DEMO: GuideStep[] = [
  {
    title: 'Demorunde',
    body: () => 'Du er seeker. En datastyrt hider har gjemt seg ved en T-banestasjon i Oslo. Finn hen med så få spørsmål som mulig. Spillet ditt er lagt til side og kommer tilbake etterpå.',
  },
  {
    title: 'Start runden',
    target: 'start-round',
    done: () => game().round.seekFrom !== null,
    body: () => 'Spillerne er lagt inn, og reglene er standard for Medium. Trykk «Start runden».',
  },
  {
    title: 'Gjemmetiden',
    target: 'round-bar',
    done: () => (game().round.seekFrom ?? Infinity) <= Date.now(),
    body: () => 'Nå gjemmer hider seg. I et ekte spill venter dere til klokken er ute. Trykk «Start letingen» for å hoppe over ventetiden.',
  },
  {
    title: 'Ditt første spørsmål',
    target: 'new-question',
    enter: () => useUi.setState({ tab: 'questions', collapsed: false }),
    done: () => !!ui().draft || game().questions.length > 0,
    body: () => 'Trykk «+ Nytt spørsmål».',
  },
  {
    title: 'Still det',
    target: 'question-form',
    position: true,
    done: () => game().questions.length > 0,
    body: () => 'Radar er valgt, og posisjonen din er hentet. Du står ved Jernbanetorget. Velg en avstand, for eksempel 5 km, og trykk «Still spørsmål».',
  },
  {
    title: 'Hider svarer',
    done: () => answered().length > 0,
    body: () => 'Hider har fått spørsmålet og svarer om et øyeblikk. I et ekte spill har hider 5 minutter på seg.',
  },
  {
    title: 'Kartet krymper',
    target: 'map',
    body: () => {
      const q = answered()[0]
      return `Hider svarte «${q ? answerLabel(q, q.answer!) : ''}». Alt som ikke passer med svaret er skravert bort, og tallet øverst på kartet viser hvor mange stasjoner som er igjen.`
    },
  },
  {
    title: 'Flytt deg',
    target: 'move-me',
    position: true,
    done: moved,
    body: () => 'I et ekte spill reiser dere med T-banen mellom spørsmålene. Her flytter du deg ved å trykke «Flytt meg» og så et sted på kartet.',
  },
  {
    title: 'Snevre inn',
    target: 'new-question',
    position: true,
    enter: () => useUi.setState({ tab: 'questions', collapsed: false }),
    done: () => useGuide.getState().left > 0 && useGuide.getState().left <= 3,
    body: () => {
      const left = useGuide.getState().left
      return `Still flere spørsmål til det er tre stasjoner eller færre igjen (nå: ${left}). Prøv Termometer, eller Matching og Measuring under kategoriene. Du kan også flytte deg igjen.`
    },
  },
  {
    title: 'Endgame',
    target: 'tab-endgame',
    done: () => ui().tab === 'endgame',
    body: () => 'Når dere tror dere vet stasjonen, reiser dere dit. Åpne fanen Endgame.',
  },
  {
    title: 'Start endgame',
    target: 'endgame-start',
    done: () => !!game().round.endgame,
    body: () => 'Velg stasjonen du tror hider er ved, og trykk «Start endgame». Da må hider stå stille.',
  },
  {
    title: 'Fasit',
    target: 'found',
    body: () => {
      const right = game().round.endgame?.stationId === useDemo.getState().hider?.stationId
      const name = hiderName()
      return right
        ? `Riktig! Hider er ved ${name || 'denne stasjonen'}. I et ekte spill leter dere nå i sonen til dere ser hen, og trykker «Hider er funnet».`
        : `Ikke helt. Hider er ved ${name || 'en annen stasjon'}. I et ekte spill ville dere avsluttet endgame og prøvd en annen. Trykk «Hider er funnet» for å avslutte runden.`
    },
    done: () => game().results.length > 0,
  },
  {
    title: 'Det var demoen',
    body: () => 'Runden er lagret, og hider får tidsbonus etterpå. For å spille på ekte: opprett et rom i steg 1 og del koden med de andre. Når du avslutter, kommer spillet ditt tilbake.',
  },
]

export const SCRIPTS: Record<Script, GuideStep[]> = { tour: TOUR, demo: DEMO }

/** Starter omvisningen eller demoen fra første steg. */
export function startGuide(script: Script) {
  if (script === 'demo') {
    if (game().round.seekFrom !== null && !useDemo.getState().active && !confirm('En runde pågår. Demoen legger den til side og kobler fra rommet til demoen er ferdig. Fortsette?')) return
    startDemo()
  }
  ui().setSheet(null)
  useGuide.setState({ script, step: 0, seen: true })
}

/** Avslutter guiden. Var det demoen, kommer spillet tilbake. */
export function stopGuide() {
  const { script } = useGuide.getState()
  useGuide.setState({ script: null, step: 0, seen: true })
  if (script === 'demo') endDemo()
}

export function nextStep() {
  const { script, step } = useGuide.getState()
  if (!script) return
  if (step + 1 >= SCRIPTS[script].length) return stopGuide()
  useGuide.setState({ step: step + 1 })
}
export function prevStep() {
  const { step } = useGuide.getState()
  useGuide.setState({ step: Math.max(0, step - 1) })
}
