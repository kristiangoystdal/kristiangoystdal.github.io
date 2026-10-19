import { useEffect, useRef } from 'react'
import { city } from './cities'
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
const from = (size: GameSize) => (size === 'S' ? 'Alle spill' : size === 'M' ? 'Medium og Large' : 'Bare Large')

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

const SECTIONS: { id: string; title: string; body: () => React.ReactNode }[] = [
  {
    id: 'spillet',
    title: 'Spillet i korte trekk',
    body: () => (
      <List>
        <li>Én spiller (hider) reiser kollektivt til et gjemmested ved en {city().network}stasjon.</li>
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
        <li>Seekerne deler posisjonen sin så hider kan følge med. Hiders posisjon deles ikke.</li>
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
          <b>Kollektivlinje:</b> seekerne må være om bord og i bevegelse. Svaret er ja hvis {city().network === 'T-bane' ? 'T-banen' : 'det'} de sitter på stopper ved hiders stasjon. Passerer den uten å stoppe, er svaret nei.
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
          <b>Jernbanestasjon:</b> {city().network}stasjoner teller med.
        </li>
        <li>
          <b>Vann:</b> navngitt i kartappen, ikke basseng. <b>Kystlinje:</b> der land møter sjøen.
        </li>
        <li>
          <b>Havnivå:</b> spillerens høyde over havet. Appen har ikke høydedata, så hider svarer selv.
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
        <Table head={['Steder', 'Avstand', 'Med i']} rows={bySize('Tentacles').flatMap((g) => g.items.map((i) => [i.label, i.group.replace('Innen ', ''), from(g.size)]))} />
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
          Endgame starter når seekerne er <b>inne i hiders sone og ikke lenger på et transportmiddel</b>. I appen starter seekerne det under Kart.
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
            📖 Regler
          </h2>
          <button className="btn min-h-9!" onClick={() => setRules(null)}>
            Lukk
          </button>
        </div>
        <div ref={box} className="overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm">
          <p className="mb-2 text-xs text-muted">
            Jetlag Hide and Seek, tilpasset {city().name} {city().network}. Spillet er satt til {SIZE_NAMES[size]}. Avstandene er appens avrundede verdier.
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
