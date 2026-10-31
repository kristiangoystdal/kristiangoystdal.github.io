import { useEffect, useRef } from 'react'
import { MODES, city, modeWordsNb, railMode, transit, transitNb } from './cities'
import { tr } from './lang'
import { ITEMS, SIZE_RULES, type Category } from './form'
import { useGame, useUi } from './store'
import type { GameSize } from './types'

const SIZE_NAMES: Record<GameSize, string> = { S: 'Small', M: 'Medium', L: 'Large' }
const SIZES: GameSize[] = ['S', 'M', 'L']

/** Spørsmålene i en kategori, delt etter hvilke spillstørrelser de er med i. */
function bySize(category: Category) {
  const items = ITEMS.filter((i) => i.category === category && i.id !== 'r-choose')
  return SIZES.map((size) => ({ size, items: items.filter((i) => i.sizes[0] === size) })).filter((g) => g.items.length)
}
const from = (size: GameSize) => (size === 'S' ? tr('Alle spill', 'All games') : size === 'M' ? tr('Medium og Large', 'Medium and Large') : tr('Bare Large', 'Large only'))

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border">
            {head.map((h) => (
              <th key={h} className="py-1 pr-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const List = ({ children }: { children: React.ReactNode }) => <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>

type Section = { id: string; title: string; body: () => React.ReactNode }

const SECTIONS_NB: Section[] = [
  {
    id: 'spillet',
    title: 'Spillet i korte trekk',
    body: () => (
      <List>
        <li>Én spiller (hider) reiser kollektivt til et gjemmested ved en {transitNb().stop}.</li>
        <li>De andre (seekerne) samarbeider om å finne hider ved å stille spørsmål fra seks kategorier.</li>
        <li>Hver gang hider svarer, trekker hider kort fra hider-kortstokken.</li>
        <li>Når hider er funnet, er det nestemann sin tur. Den som holdt seg skjult lengst, vinner.</li>
      </List>
    ),
  },
  {
    id: 'oppsett',
    title: 'Oppsett, runder og pauser',
    body: () => (
      <>
        <Table
          head={['', ...SIZES.map((s) => SIZE_NAMES[s])]}
          rows={[
            ['Gjemmetid', ...SIZES.map((s) => `${SIZE_RULES[s].hidingMinutes} min`)],
            ['Soneradius', ...SIZES.map((s) => `${SIZE_RULES[s].zoneRadius} m`)],
            ['Svartid', '5 min', '5 min', '5 min'],
            ['Svartid bilder', '10 min', '10 min', '20 min'],
          ]}
        />
        <List>
          <li>Rekkefølgen for hvem som gjemmer seg trekkes tilfeldig før spillet starter.</li>
          <li>Spiller man flere runder, teller bare spillerens beste runde.</li>
          <li>Anbefalt maks fire spillere. Er dere flere, kan noen gå sammen i lag som gjemmer seg sammen.</li>
          <li>Steder utenfor spillområdet regnes som om de ikke finnes.</li>
          <li>Pause: alle klokker står, og alle blir stående der de er til spillet fortsetter.</li>
          <li>Hvileperiode (spill over flere dager): minst 10 timer anbefales. Alle må tilbake til nøyaktig samme sted før spillet fortsetter.</li>
        </List>
      </>
    ),
  },
  {
    id: 'runde',
    title: 'Gjemmetid og sonen',
    body: () => (
      <List>
        <li>Alle starter på samme sted. Hider får kortstokken, seekerne får spørsmålene. Begge sider har minst to terninger.</li>
        <li>Seekerne deler posisjonen sin så hider kan følge med, for eksempel med posisjonsdeling i Google Maps eller Finn. Hiders posisjon deles ikke.</li>
        <li>Hider reiser til fots og kollektivt. Der hider er når gjemmetiden er over, er hiders stasjon, uansett om det var planen.</li>
        <li>Sonen er en sirkel rundt stasjonen. Ligger hider i sonen til flere stasjoner, velger hider én som sin.</li>
        <li>Hider kan bevege seg fritt i sonen frem til endgame.</li>
      </List>
    ),
  },
  {
    id: 'sporsmal',
    title: 'Spørsmål: fellesregler',
    body: () => (
      <>
        <List>
          <li>
            <b>Ett spørsmål om gangen.</b> Et nytt kan ikke stilles før det forrige er besvart.
          </li>
          <li>
            <b>Hider svarer ut fra der hider står akkurat nå,</b> ikke fra stasjonen. Unntakene er spørsmålene som handler om stasjonen: kollektivlinje, lengde på stasjonsnavn og bilder «synlig fra stasjonen». Seekerne spør ut fra der de selv står.
          </li>
          <li>Hider må svare sant, innen svartiden. Går den ut, står hiders klokke til svaret kommer, og hider trekker ingen kort for spørsmålet.</li>
          <li>
            <b>Gjentakelse:</b> et spørsmål som er stilt, kan stilles igjen mot dobbel kostnad. Hider trekker da to ganger hver for seg. Tredje gang er trippel kostnad, og så videre.
          </li>
          <li>
            <b>Nullsvar:</b> finnes ikke det spørsmålet handler om innenfor spillområdet, er svaret null. Det teller som besvart, og hider trekker kort.
          </li>
          <li>Seekerne kan bruke internett fritt, men ikke Google Street View.</li>
          <li>Avstand til et sted måles til ikonet i kartappen, også for store parker. Er dere uenige om hva som teller, rydder seekerne opp, f.eks. med et skjermbilde.</li>
        </List>
        <Table
          head={['Kategori', 'Hider trekker', 'Svar']}
          rows={[
            ['Matching', 'trekk 3, behold 1', 'ja / nei'],
            ['Measuring', 'trekk 3, behold 1', 'nærmere / lenger unna'],
            ['Thermometer', 'trekk 2, behold 1', 'varmere / kaldere'],
            ['Radar', 'trekk 2, behold 1', 'ja / nei'],
            ['Tentacles', 'trekk 4, behold 2', 'et sted, eller «utenfor rekkevidde»'],
            ['Photos', 'trekk 1, behold 1', 'et bilde, eller «kan ikke svare»'],
          ]}
        />
      </>
    ),
  },
  {
    id: 'matching',
    title: 'Matching: «Er ditt nærmeste X det samme som mitt?»',
    body: () => (
      <List>
        <li>
          <b>Kollektivlinje:</b> seekerne må være om bord og i bevegelse. Svaret er ja hvis {transitNb().vehicle} de sitter på stopper ved hiders stasjon. Passerer den uten å stoppe, er svaret nei.
        </li>
        <li>
          <b>Lengde på stasjonsnavn:</b> antall tegn slik kartappen skriver navnet. Mellomrom og bindestrek teller.
        </li>
        <li>
          <b>Gate eller sti:</b> en gate slutter der den skifter navn. Gater uten navn starter og slutter i kryss.
        </li>
        <li>
          <b>Administrative nivåer:</b> i appen er det fylke, kommune, bydel og postsone.
        </li>
        <li>
          <b>Landmasse:</b> sammenhengende land som ikke er delt av vann. Appen skiller mellom fastlandet og øyene i fjorden.
        </li>
        <li>
          <b>Flyplass:</b> kommersiell, dvs. at flyvninger kan ses i Google Flights. <b>Golfbane:</b> utendørs, ikke minigolf eller driving range. <b>Konsulat:</b> ikke honorære konsulater.
        </li>
        <li>Fjell, park og de andre stedene er det kartappen klassifiserer slik.</li>
      </List>
    ),
  },
  {
    id: 'measuring',
    title: 'Measuring: «Er du nærmere eller lenger unna X enn meg?»',
    body: () => (
      <List>
        <li>
          <b>Jernbanestasjon:</b> {railMode() ? `${modeWordsNb(railMode()!).stops} teller med. Andre holdeplasser gjør det ikke.` : 'Bare jernbanestasjoner teller. Holdeplasser for buss, trikk og bybane gjør det ikke.'}
        </li>
        <li>
          <b>Vann:</b> navngitt i kartappen, ikke basseng. <b>Kystlinje:</b> der land møter sjøen.
        </li>
        <li>
          <b>Havnivå:</b> spillerens høyde over havet. Appen slår opp høyden hos Kartverket, og hider bekrefter svaret.
        </li>
        <li>Grenser: riksgrensen, fylkesgrense og kommunegrense.</li>
        <li>Severdigheter og offentlige tjenester: samme liste som i Matching.</li>
      </List>
    ),
  },
  {
    id: 'thermometer',
    title: 'Thermometer: «Etter å ha reist X, er jeg varmere eller kaldere?»',
    body: () => (
      <>
        <List>
          <li>Seekerne sier fra at de starter, reiser minst avstanden i luftlinje, og sender så ny posisjon.</li>
          <li>Varmere hvis den nye posisjonen er nærmere der hider er nå.</li>
        </List>
        <Table head={['Avstand', 'Med i']} rows={bySize('Thermometer').flatMap((g) => g.items.map((i) => [i.label, from(g.size)]))} />
      </>
    ),
  },
  {
    id: 'radar',
    title: 'Radar: «Er du innenfor X fra meg?»',
    body: () => (
      <List>
        <li>
          Gjelder <b>hiders posisjon, ikke sonen</b>. Dekker radaren en del av sonen, men ikke der hider står, er svaret nei.
        </li>
        <li>
          Avstander:{' '}
          {ITEMS.filter((i) => i.category === 'Radar' && i.id !== 'r-choose')
            .map((i) => i.label)
            .join(', ')}
          , eller fritt valgt.
        </li>
      </List>
    ),
  },
  {
    id: 'tentacles',
    title: 'Tentacles: «Av alle X innen avstand fra meg, hvilken er du nærmest?»',
    body: () => (
      <>
        <List>
          <li>Hider må selv være innenfor avstanden. Ellers svarer hider bare «utenfor rekkevidde».</li>
          <li>Ikke med i Small.</li>
        </List>
        <Table head={['Steder', 'Avstand', 'Med i']} rows={bySize('Tentacles').flatMap((g) => g.items.map((i) => [i.label, i.group.replace(/^(Innen|Within) /, ''), from(g.size)]))} />
      </>
    ),
  },
  {
    id: 'photos',
    title: 'Photos: «Send et bilde av X»',
    body: () => (
      <>
        <List>
          <li>Bildene sendes i telefonens vanlige bildeformat, utenfor appen.</li>
          <li>I endgame er «kan ikke svare» lov når bildet må tas fra et sted hider ikke kan gå til. Hider trekker kort likevel.</li>
        </List>
        {bySize('Photos').map((g) => (
          <div key={g.size}>
            <h4 className="mt-2 text-xs font-semibold">{from(g.size)}</h4>
            <Table head={['Motiv', 'Krav']} rows={g.items.map((i) => [i.label, i.rules])} />
          </div>
        ))}
      </>
    ),
  },
  {
    id: 'kort',
    title: 'Hider-kortstokken',
    body: () => (
      <>
        <List>
          <li>Tre korttyper: tidsbonus (ca. halvparten), powerups og forbannelser.</li>
          <li>Hider kan ha 6 kort på hånden. Har hider flere, må kort spilles eller kastes straks.</li>
          <li>«Trekk 3, behold 1»: se på de tre øverste, ta ett på hånden, kast to.</li>
          <li>
            <b>Tidsbonus</b> kan ikke spilles. Kortet teller bare hvis det er på hånden når runden slutter.
          </li>
        </List>
        <h4 className="mt-2 text-xs font-semibold">Powerups</h4>
        <Table
          head={['Kort', 'Virkning']}
          rows={[
            [<b>Veto</b>, 'Spilles i stedet for å svare. Seekerne får ikke svar, spørsmålet regnes som stilt, og hider trekker ingen kort. Knapp på spørsmålet i appen.'],
            [<b>Randomize</b>, 'Spilles i stedet for å svare. Et tilfeldig ustilt spørsmål i samme kategori stilles i stedet. Det opprinnelige regnes ikke som stilt. Knapp på spørsmålet i appen.'],
            [<b>Move</b>, 'Hider finner en ny sone. Hiders klokke står, og seekerne blir stående og kan ikke stille spørsmål. Hider kaster hele hånden og oppgir den gamle stasjonen. Ikke i endgame. Knapp under Kort.'],
            [<b>Kast 1, trekk 2</b>, 'Bytter ut kort på hånden. Det samme gjelder Kast 2, trekk 3.'],
            [<b>Trekk 1, utvid hånden</b>, 'Hider trekker ett kort, og håndgrensen øker med 1 resten av runden.'],
            [<b>Duplicate</b>, 'Kopi av et annet kort på hånden. Blir det liggende til slutt, dobler det en tidsbonus.'],
          ]}
        />
        <h4 className="mt-2 text-xs font-semibold">Forbannelser</h4>
        <List>
          <li>Spilles mot seekerne for å sinke dem, og brukes én gang. Hver har en kostnad som må være oppfylt, f.eks. å kaste kort eller at seekerne er langt nok unna.</li>
          <li>Flere kan være aktive samtidig, men bare én om gangen kan hindre seekerne i å stille spørsmål eller ta transport. Seekerne sier fra når en slik er løst.</li>
          <li>
            <b>Drained Brain</b> stenger spørsmål resten av runden, også mot økt kostnad. <b>Spotty Memory</b> slår ut en kategori etter terningkast. Begge har knapper under Kort.
          </li>
          <li>
            <b>Overflowing Chalice</b> øker kostnaden: Matching og Measuring trekk 4 behold 1, Thermometer og Radar trekk 3 behold 1, Photos trekk 2 behold 1, Tentacles trekk 5 behold 2.
          </li>
          <li>
            <b>Urban Explorer</b> hindrer seekerne i å stille spørsmål på transport og på stasjoner. <b>U-Turn</b> avhenger av seekernes neste stasjon, som hider ser av sporingen.
          </li>
          <li>Kortteksten på det fysiske kortet gjelder.</li>
        </List>
      </>
    ),
  },
  {
    id: 'endgame',
    title: 'Endgame',
    body: () => (
      <List>
        <li>
          Endgame starter når seekerne er <b>inne i hiders sone og ikke lenger på et transportmiddel</b>. I appen starter seekerne det under fanen Endgame.
        </li>
        <li>Fra da står hider stille. Der hider står i det øyeblikket, er gjemmestedet.</li>
        <li>Gjemmestedet må være offentlig tilgjengelig hele spilletiden, og innen ca. 3 m fra en vei eller sti som kartappen bruker til gangruter. Er det ikke lov, går hider straks til nærmeste lovlige sted.</li>
      </List>
    ),
  },
  {
    id: 'funnet',
    title: 'Funnet og neste runde',
    body: () => (
      <List>
        <li>
          Hider er funnet når seekerne er innen ca. 1,5 m <b>og</b> har sett hider.
        </li>
        <li>Klokken stopper, og tidsbonuskortene hider har på hånden legges til tiden.</li>
        <li>Neste hider får opptil 10 minutter til planlegging. Kortene stokkes inn igjen.</li>
        <li>Neste runde starter fra forrige hiders gjemmested.</li>
      </List>
    ),
  },
]

const SECTIONS_EN: Section[] = [
  {
    id: 'spillet',
    title: 'The game in short',
    body: () => (
      <List>
        <li>One player (the hider) travels by public transit to a hiding spot at a {transit().stop}.</li>
        <li>The others (the seekers) work together to find the hider by asking questions from six categories.</li>
        <li>Each time the hider answers, the hider draws cards from the hider deck.</li>
        <li>When the hider is found, it is the next player's turn. Whoever stayed hidden longest wins.</li>
      </List>
    ),
  },
  {
    id: 'oppsett',
    title: 'Setup, rounds and breaks',
    body: () => (
      <>
        <Table
          head={['', ...SIZES.map((s) => SIZE_NAMES[s])]}
          rows={[
            ['Hiding time', ...SIZES.map((s) => `${SIZE_RULES[s].hidingMinutes} min`)],
            ['Zone radius', ...SIZES.map((s) => `${SIZE_RULES[s].zoneRadius} m`)],
            ['Answer time', '5 min', '5 min', '5 min'],
            ['Answer time, photos', '10 min', '10 min', '20 min'],
          ]}
        />
        <List>
          <li>The order of who hides is drawn at random before the game starts.</li>
          <li>If you play several rounds, only each player's best round counts.</li>
          <li>At most four players is recommended. If there are more of you, some can team up and hide together.</li>
          <li>Places outside the play area count as if they do not exist.</li>
          <li>Pause: all clocks stop, and everyone stays where they are until the game resumes.</li>
          <li>Rest period (games over several days): at least 10 hours is recommended. Everyone must return to exactly the same place before the game resumes.</li>
        </List>
      </>
    ),
  },
  {
    id: 'runde',
    title: 'Hiding time and the zone',
    body: () => (
      <List>
        <li>Everyone starts at the same place. The hider gets the deck, the seekers get the questions. Both sides have at least two dice.</li>
        <li>The seekers share their location so the hider can follow along, for example with location sharing in Google Maps or Find My. The hider's location is not shared.</li>
        <li>The hider travels on foot and by public transit. Wherever the hider is when the hiding time ends is the hider's station, whether that was the plan or not.</li>
        <li>The zone is a circle around the station. If the hider is in the zone of several stations, the hider picks one as theirs.</li>
        <li>The hider can move freely within the zone until the endgame.</li>
      </List>
    ),
  },
  {
    id: 'sporsmal',
    title: 'Questions: common rules',
    body: () => (
      <>
        <List>
          <li>
            <b>One question at a time.</b> A new one cannot be asked until the last one is answered.
          </li>
          <li>
            <b>The hider answers from where they stand right now,</b> not from the station. The exceptions are the questions about the station: transit line, station name length and photos "visible from the station". The seekers ask from where they stand.
          </li>
          <li>The hider must answer truthfully, within the answer time. If it runs out, the hider's clock stops until the answer comes, and the hider draws no cards for the question.</li>
          <li>
            <b>Repeats:</b> a question that has been asked can be asked again at double cost. The hider then draws twice, separately. The third time is triple cost, and so on.
          </li>
          <li>
            <b>Null answer:</b> if what the question asks about does not exist within the play area, the answer is null. It counts as answered, and the hider draws cards.
          </li>
          <li>The seekers can use the internet freely, but not Google Street View.</li>
          <li>Distance to a place is measured to its icon in the map app, also for large parks. If you disagree about what counts, the seekers settle it, e.g. with a screenshot.</li>
        </List>
        <Table
          head={['Category', 'Hider draws', 'Answer']}
          rows={[
            ['Matching', 'draw 3, keep 1', 'yes / no'],
            ['Measuring', 'draw 3, keep 1', 'closer / further'],
            ['Thermometer', 'draw 2, keep 1', 'hotter / colder'],
            ['Radar', 'draw 2, keep 1', 'yes / no'],
            ['Tentacles', 'draw 4, keep 2', 'a place, or "out of range"'],
            ['Photos', 'draw 1, keep 1', 'a photo, or "cannot answer"'],
          ]}
        />
      </>
    ),
  },
  {
    id: 'matching',
    title: 'Matching: "Is your nearest X the same as mine?"',
    body: () => (
      <List>
        <li>
          <b>Transit line:</b> the seekers must be on board and moving. The answer is yes if {transit().vehicle} they are on stops at the hider's station. If it passes without stopping, the answer is no.
        </li>
        <li>
          <b>Station name length:</b> the number of characters as the map app writes the name. Spaces and hyphens count.
        </li>
        <li>
          <b>Street or path:</b> a street ends where it changes name. Streets without a name start and end at intersections.
        </li>
        <li>
          <b>Administrative levels:</b> in the app these are county (fylke), municipality (kommune), borough (bydel) and postal zone.
        </li>
        <li>
          <b>Landmass:</b> continuous land not divided by water. The app tells the mainland apart from the islands in the fjord.
        </li>
        <li>
          <b>Airport:</b> commercial, meaning its flights can be found on Google Flights. <b>Golf course:</b> outdoors, not mini golf or a driving range. <b>Consulate:</b> not honorary consulates.
        </li>
        <li>Mountains, parks and the other places are what the map app classifies as such.</li>
      </List>
    ),
  },
  {
    id: 'measuring',
    title: 'Measuring: "Are you closer to or further from X than me?"',
    body: () => (
      <List>
        <li>
          <b>Train station:</b> {railMode() ? `${MODES[railMode()!].stops[0].toUpperCase()}${MODES[railMode()!].stops.slice(1)} count. Other stops do not.` : 'Only train stations count. Bus, tram and light rail stops do not.'}
        </li>
        <li>
          <b>Body of water:</b> named in the map app, not swimming pools. <b>Coastline:</b> where land meets the sea.
        </li>
        <li>
          <b>Sea level:</b> the player's height above sea level. The app looks up the height from Kartverket, and the hider confirms the answer.
        </li>
        <li>Borders: the international border, county borders and municipal borders.</li>
        <li>Attractions and public services: the same list as in Matching.</li>
      </List>
    ),
  },
  {
    id: 'thermometer',
    title: 'Thermometer: "After traveling X, am I hotter or colder?"',
    body: () => (
      <>
        <List>
          <li>The seekers say they are starting, travel at least the distance as the crow flies, and then send their new position.</li>
          <li>Hotter if the new position is closer to where the hider is now.</li>
        </List>
        <Table head={['Distance', 'In']} rows={bySize('Thermometer').flatMap((g) => g.items.map((i) => [i.label, from(g.size)]))} />
      </>
    ),
  },
  {
    id: 'radar',
    title: 'Radar: "Are you within X of me?"',
    body: () => (
      <List>
        <li>
          It is about <b>the hider's position, not the zone</b>. If the radar covers part of the zone but not where the hider stands, the answer is no.
        </li>
        <li>
          Distances:{' '}
          {ITEMS.filter((i) => i.category === 'Radar' && i.id !== 'r-choose')
            .map((i) => i.label)
            .join(', ')}
          , or your own choice.
        </li>
      </List>
    ),
  },
  {
    id: 'tentacles',
    title: 'Tentacles: "Of all X within a distance of me, which are you closest to?"',
    body: () => (
      <>
        <List>
          <li>The hider must be within the distance too. Otherwise the hider only answers "out of range".</li>
          <li>Not in Small.</li>
        </List>
        <Table head={['Places', 'Distance', 'In']} rows={bySize('Tentacles').flatMap((g) => g.items.map((i) => [i.label, i.group.replace(/^(Innen|Within) /, ''), from(g.size)]))} />
      </>
    ),
  },
  {
    id: 'photos',
    title: 'Photos: "Send a photo of X"',
    body: () => (
      <>
        <List>
          <li>Photos are sent in the phone's normal photo format, outside the app.</li>
          <li>In the endgame, "cannot answer" is allowed when the photo would have to be taken from a place the hider cannot go. The hider still draws cards.</li>
        </List>
        {bySize('Photos').map((g) => (
          <div key={g.size}>
            <h4 className="mt-2 text-xs font-semibold">{from(g.size)}</h4>
            <Table head={['Subject', 'Requirements']} rows={g.items.map((i) => [i.label, i.rules])} />
          </div>
        ))}
      </>
    ),
  },
  {
    id: 'kort',
    title: 'The hider deck',
    body: () => (
      <>
        <List>
          <li>Three kinds of cards: time bonuses (about half), powerups and curses.</li>
          <li>The hider can hold 6 cards. With more, cards must be played or discarded right away.</li>
          <li>"Draw 3, keep 1": look at the top three, take one into your hand, discard two.</li>
          <li>
            <b>Time bonuses</b> cannot be played. The card only counts if it is in your hand when the round ends.
          </li>
        </List>
        <h4 className="mt-2 text-xs font-semibold">Powerups</h4>
        <Table
          head={['Card', 'Effect']}
          rows={[
            [<b>Veto</b>, 'Played instead of answering. The seekers get no answer, the question counts as asked, and the hider draws no cards. Button on the question in the app.'],
            [<b>Randomize</b>, 'Played instead of answering. A random unasked question in the same category is asked instead. The original does not count as asked. Button on the question in the app.'],
            [<b>Move</b>, "The hider finds a new zone. The hider's clock stops, and the seekers stay where they are and cannot ask questions. The hider discards their whole hand and tells the old station. Not in the endgame. Button under Cards."],
            [<b>Discard 1, draw 2</b>, 'Swaps cards in your hand. The same goes for Discard 2, draw 3.'],
            [<b>Draw 1, expand</b>, 'The hider draws one card, and the hand limit goes up by 1 for the rest of the round.'],
            [<b>Duplicate</b>, 'A copy of another card in your hand. If it is left at the end, it doubles a time bonus.'],
          ]}
        />
        <h4 className="mt-2 text-xs font-semibold">Curses</h4>
        <List>
          <li>Played on the seekers to slow them down, and used once. Each has a cost that must be met, e.g. discarding cards or the seekers being far enough away.</li>
          <li>Several can be active at once, but only one at a time can stop the seekers from asking questions or taking transit. The seekers say when such a curse is cleared.</li>
          <li>
            <b>Drained Brain</b> blocks questions for the rest of the round, even at extra cost. <b>Spotty Memory</b> knocks out a category by dice roll. Both have buttons under Cards.
          </li>
          <li>
            <b>Overflowing Chalice</b> raises the cost: Matching and Measuring draw 4 keep 1, Thermometer and Radar draw 3 keep 1, Photos draw 2 keep 1, Tentacles draw 5 keep 2.
          </li>
          <li>
            <b>Urban Explorer</b> stops the seekers from asking questions on transit and at stations. <b>U-Turn</b> depends on the seekers' next station, which the hider sees from the location sharing.
          </li>
          <li>The text on the physical card applies.</li>
        </List>
      </>
    ),
  },
  {
    id: 'endgame',
    title: 'Endgame',
    body: () => (
      <List>
        <li>
          The endgame starts when the seekers are <b>inside the hider's zone and no longer on a vehicle</b>. In the app the seekers start it under the Endgame tab.
        </li>
        <li>From then on the hider stays put. Wherever the hider stands at that moment is the hiding spot.</li>
        <li>The hiding spot must be publicly accessible the whole game, and within about 3 m of a road or path the map app uses for walking directions. If it is not allowed, the hider goes straight to the nearest allowed place.</li>
      </List>
    ),
  },
  {
    id: 'funnet',
    title: 'Found and the next round',
    body: () => (
      <List>
        <li>
          The hider is found when the seekers are within about 1.5 m <b>and</b> have seen the hider.
        </li>
        <li>The clock stops, and the time bonus cards in the hider's hand are added to the time.</li>
        <li>The next hider gets up to 10 minutes to plan. The cards are shuffled back in.</li>
        <li>The next round starts from the last hider's hiding spot.</li>
      </List>
    ),
  },
]
const SECTIONS = tr(SECTIONS_NB, SECTIONS_EN)

/** Reglene i en egen visning. Åpnes på avsnittet som er relevant der man er. */
export function Rules() {
  const section = useUi((s) => s.rules)
  const setRules = useUi((s) => s.setRules)
  const size = useGame((s) => s.settings.size)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!section) return
    box.current?.querySelector(`#regel-${section}`)?.scrollIntoView({ block: 'start' })
  }, [section])
  useEffect(() => {
    if (section === null) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setRules(null)
    addEventListener('keydown', close)
    return () => removeEventListener('keydown', close)
  }, [section, setRules])

  if (section === null) return null
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 md:items-center md:p-4" role="dialog" aria-modal aria-labelledby="rules-title" onClick={() => setRules(null)}>
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-panel shadow-xl md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="rules-title" className="text-lg font-bold">
            {tr('📖 Regler', '📖 Rules')}
          </h2>
          <button className="btn min-h-9!" onClick={() => setRules(null)}>
            {tr('Lukk', 'Close')}
          </button>
        </div>
        <div ref={box} className="overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm">
          <p className="mb-2 text-xs text-muted">
            {tr(
              `Jetlag Hide and Seek, tilpasset ${transitNb().whole} i ${city().name}. Spillet er satt til ${SIZE_NAMES[size]}. Avstandene er appens avrundede verdier.`,
              `Jet Lag Hide and Seek, adapted to ${transit().whole} in ${city().name}. The game is set to ${SIZE_NAMES[size]}. The distances are the app's rounded values.`,
            )}
          </p>
          {SECTIONS.map((s) => (
            <details key={s.id} id={`regel-${s.id}`} className="border-b border-border py-1 last:border-0" open={section === s.id}>
              <summary className="cursor-pointer py-2 font-semibold">{s.title}</summary>
              <div className="pb-3">{s.body()}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
