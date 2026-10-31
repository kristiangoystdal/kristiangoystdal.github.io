import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEMO_START, endDemo, startDemo, useDemo } from './demo'
import { answerLabel } from './form'
import { tr } from './lang'
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
    title: tr('Velkommen', 'Welcome'),
    body: () =>
      tr(
        'Appen holder styr på spørsmål, svar og kart i Jet Lag Hide and Seek. Her er hva knappene i lobbyen gjør. Du kan avslutte når som helst.',
        'The app keeps track of questions, answers and the map in Jet Lag Hide and Seek. Here is what the buttons in the lobby do. You can stop at any time.',
      ),
  },
  {
    title: tr('Kartet', 'The map'),
    target: 'map',
    body: () =>
      tr(
        'Prikkene er stasjonene hider kan gjemme seg ved, i linjenes farger. Hvert svar fra hider skraverer bort det som ikke passer, til én stasjon er igjen.',
        "The dots are the stations the hider can hide at, in the lines' colors. Each answer from the hider shades out what does not fit, until one station is left.",
      ),
  },
  {
    title: tr('By og oppsett', 'City and setup'),
    target: 'lobby-rules',
    body: () =>
      tr(
        'Velg byen dere spiller i. Spillstørrelse, linjer, sone og spørsmål ligger bak linjen under. Standarden følger regelboken, så de fleste kan la det være.',
        'Choose the city you play in. Game size, lines, zone and questions are behind the line below. The standard follows the rulebook, so most can leave it as is.',
      ),
  },
  {
    title: tr('Spillere', 'Players'),
    target: 'lobby-players',
    body: () => tr('Legg inn alle som er med, og trykk på den som skal gjemme seg. Øyet viser hvem det er.', 'Add everyone who is playing, and tap the one who will hide. The eye shows who it is.'),
  },
  {
    title: tr('Denne telefonen', 'This phone'),
    target: 'lobby-role',
    body: () => tr('Velg om denne telefonen leter eller gjemmer seg. Fargen følger rollen: oransje for seekere, fiolett for hider.', 'Choose whether this phone seeks or hides. The color follows the role: orange for seekers, violet for the hider.'),
  },
  {
    title: tr('Gjemmetid', 'Hiding time'),
    target: 'lobby-hiding',
    body: () => tr('Hvor lenge hider får på seg til å gjemme seg. Regelboken foreslår en tid ut fra spillstørrelsen.', 'How long the hider gets to hide. The rulebook suggests a time based on the game size.'),
  },
  {
    title: tr('Flere telefoner', 'More phones'),
    target: 'lobby-room',
    body: () =>
      tr(
        'Spiller dere på flere telefoner, oppretter én et rom og de andre blir med med koden eller QR-koden. Da ser alle samme logg og klokke. På én telefon hopper dere over dette.',
        'Playing on more than one phone, one creates a room and the others join with the code or the QR code. Then everyone sees the same log and clock. With one phone you skip this.',
      ),
  },
  {
    title: 'Start',
    target: 'start-round',
    body: () =>
      tr(
        'Velg gjemmetid og start runden. Da bytter appen til spillskjermen med klokken øverst og fanene Spørsmål, Endgame og Verktøy.',
        'Choose the hiding time and start the round. The app then switches to the game screen with the clock at the top and the tabs Questions, Endgame and Tools.',
      ),
  },
  {
    title: tr('Lær mer', 'Learn more'),
    target: 'learn',
    body: () => tr('Her finner du omvisningen igjen, demorunden og ferdige spill for hver by.', 'Here you find the tour again, the demo round and finished games for each city.'),
  },
  {
    title: tr('Klar?', 'Ready?'),
    body: () => tr('Vil du prøve en demorunde? Du leter etter en datastyrt hider, og spillet ditt blir liggende urørt.', 'Want to try a demo round? You look for a computer hider, and your game is left untouched.'),
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
    title: tr('Demorunde', 'Demo round'),
    body: () =>
      tr(
        'Du er seeker. En datastyrt hider har gjemt seg ved en T-banestasjon i Oslo. Finn hen med så få spørsmål som mulig. Spillet ditt er lagt til side og kommer tilbake etterpå.',
        'You are the seeker. A computer hider is hiding at a metro station in Oslo. Find them with as few questions as possible. Your game is set aside and comes back afterwards.',
      ),
  },
  {
    title: tr('Start runden', 'Start the round'),
    target: 'start-round',
    done: () => game().round.seekFrom !== null,
    body: () => tr('Spillerne er lagt inn, og reglene er standard for Medium. Trykk «Start runden».', 'The players are added, and the rules are the standard for Medium. Tap "Start the round".'),
  },
  {
    title: tr('Gjemmetiden', 'The hiding time'),
    target: 'round-bar',
    done: () => (game().round.seekFrom ?? Infinity) <= Date.now(),
    body: () => tr('Nå gjemmer hider seg. I et ekte spill venter dere til klokken er ute. Trykk «Start letingen» for å hoppe over ventetiden.', 'Now the hider is hiding. In a real game you wait until the clock runs out. Tap "Start seeking" to skip the wait.'),
  },
  {
    title: tr('Ditt første spørsmål', 'Your first question'),
    target: 'new-question',
    enter: () => useUi.setState({ tab: 'questions', collapsed: false }),
    done: () => !!ui().draft || game().questions.length > 0,
    body: () => tr('Trykk «+ Nytt spørsmål».', 'Tap "+ New question".'),
  },
  {
    title: tr('Still det', 'Ask it'),
    target: 'question-form',
    position: true,
    done: () => game().questions.length > 0,
    body: () =>
      tr(
        'Radar er valgt, og posisjonen din er hentet. Du står ved Jernbanetorget. Velg en avstand, for eksempel 5 km, og trykk «Still spørsmål».',
        'Radar is chosen, and your position is set. You are at Jernbanetorget. Choose a distance, for example 5 km, and tap "Ask question".',
      ),
  },
  {
    title: tr('Hider svarer', 'The hider answers'),
    done: () => answered().length > 0,
    body: () => tr('Hider har fått spørsmålet og svarer om et øyeblikk. I et ekte spill har hider 5 minutter på seg.', 'The hider has the question and answers in a moment. In a real game the hider has 5 minutes.'),
  },
  {
    title: tr('Kartet krymper', 'The map shrinks'),
    target: 'map',
    body: () => {
      const q = answered()[0]
      const a = q ? answerLabel(q, q.answer!) : ''
      return tr(
        `Hider svarte «${a}». Alt som ikke passer med svaret er skravert bort, og tallet øverst på kartet viser hvor mange stasjoner som er igjen.`,
        `The hider answered "${a}". Everything that does not fit the answer is shaded out, and the number at the top of the map shows how many stations are left.`,
      )
    },
  },
  {
    title: tr('Flytt deg', 'Move'),
    target: 'move-me',
    position: true,
    done: moved,
    body: () =>
      tr(
        'I et ekte spill reiser dere med T-banen mellom spørsmålene. Her flytter du deg ved å trykke «Flytt meg» og så et sted på kartet.',
        'In a real game you travel by metro between questions. Here you move by tapping "Move me" and then a place on the map.',
      ),
  },
  {
    title: tr('Snevre inn', 'Narrow it down'),
    target: 'new-question',
    position: true,
    enter: () => useUi.setState({ tab: 'questions', collapsed: false }),
    done: () => useGuide.getState().left > 0 && useGuide.getState().left <= 3,
    body: () => {
      const left = useGuide.getState().left
      return tr(
        `Still flere spørsmål til det er tre stasjoner eller færre igjen (nå: ${left}). Prøv Termometer, eller Matching og Measuring under kategoriene. Du kan også flytte deg igjen.`,
        `Ask more questions until there are three stations or fewer left (now: ${left}). Try Thermometer, or Matching and Measuring under the categories. You can also move again.`,
      )
    },
  },
  {
    title: 'Endgame',
    target: 'tab-endgame',
    done: () => ui().tab === 'endgame',
    body: () => tr('Når dere tror dere vet stasjonen, reiser dere dit. Åpne fanen Endgame.', 'When you think you know the station, you travel there. Open the Endgame tab.'),
  },
  {
    title: tr('Start endgame', 'Start the endgame'),
    target: 'endgame-start',
    done: () => !!game().round.endgame,
    body: () => tr('Velg stasjonen du tror hider er ved, og trykk «Start endgame». Da må hider stå stille.', 'Choose the station you think the hider is at, and tap "Start endgame". The hider must then stay put.'),
  },
  {
    title: tr('Fasit', 'The answer'),
    target: 'found',
    body: () => {
      const right = game().round.endgame?.stationId === useDemo.getState().hider?.stationId
      const name = hiderName()
      return right
        ? tr(
            `Riktig! Hider er ved ${name || 'denne stasjonen'}. I et ekte spill leter dere nå i sonen til dere ser hen, og trykker «Hider er funnet».`,
            `Correct! The hider is at ${name || 'this station'}. In a real game you now search the zone until you see them, and tap "Hider found".`,
          )
        : tr(
            `Ikke helt. Hider er ved ${name || 'en annen stasjon'}. I et ekte spill ville dere avsluttet endgame og prøvd en annen. Trykk «Hider er funnet» for å avslutte runden.`,
            `Not quite. The hider is at ${name || 'another station'}. In a real game you would end the endgame and try another. Tap "Hider found" to end the round.`,
          )
    },
    done: () => game().results.length > 0,
  },
  {
    title: tr('Det var demoen', 'That was the demo'),
    body: () =>
      tr(
        'Runden er lagret, og hider får tidsbonus etterpå. For å spille på ekte: opprett et rom og del koden med de andre. Når du avslutter, kommer spillet ditt tilbake.',
        'The round is saved, and the hider gets a time bonus afterwards. To play for real: create a room and share the code with the others. When you finish, your game comes back.',
      ),
  },
]

export const SCRIPTS: Record<Script, GuideStep[]> = { tour: TOUR, demo: DEMO }

/** Starter omvisningen eller demoen fra første steg. */
export function startGuide(script: Script) {
  if (script === 'demo') {
    if (game().round.seekFrom !== null && !useDemo.getState().active && !confirm(tr('En runde pågår. Demoen legger den til side og kobler fra rommet til demoen er ferdig. Fortsette?', 'A round is running. The demo sets it aside and disconnects from the room until the demo is over. Continue?'))) return
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
