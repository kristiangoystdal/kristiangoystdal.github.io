# Hide and Seek Oslo: funksjonsoversikt for AI-assistent

Dette dokumentet beskriver nøyaktig hva en eksisterende nettside kan og ikke kan.
Det er skrevet for at en AI-assistent skal kunne sammenligne nettsiden med
reglene for Jetlag Hide and Seek og foreslå hva som mangler eller bør endres.

Alt under «Implementert» finnes og virker i dag. Alt under «Ikke implementert»
finnes ikke. Ikke anta funksjoner som ikke er nevnt.

## 1. Hva nettsiden er

- Et hjelpeverktøy for Jetlag Hide and Seek spilt på Oslo T-bane.
- Seekerne stiller spørsmål, hider svarer, og seekernes kart viser hvor hider
  fortsatt kan være.
- Spillerne har en fysisk kortstokk. Nettsiden har verken trekk, kostnad eller
  hånd, men har knapper for de fem kortene som endrer spillet (se 4.13).
- Adresse: https://kristiangoystdal.github.io/hide-and-seek/
- Språk i grensesnittet: norsk. Laget mobil først.

## 2. Tekniske rammer (begrenser hva som kan legges til)

- Statisk nettside på GitHub Pages. Ingen egen server og ingen serverkode.
- Vite, React, TypeScript, Tailwind, Zustand, Leaflet, Turf.js.
- Tilstand lagres i nettleserens localStorage på hver telefon.
- Sanntidssynk via Firebase Realtime Database, uten innlogging og uten API-nøkkel.
  Gratisplan, så Cloud Functions og annen serverlogikk er ikke tilgjengelig.
- PWA med service worker: appen og kartdata caches for offline bruk.
- All geodata er forhåndsbygget og ligger i nettsiden. Under spill kalles bare
  kartfliser, Firebase og to åpne API-er hos Kartverket (høyde og adresser, se 4.4).
- Konsekvens: ekte push-varsler til lukket app, serverstyrt klokke, innlogging og
  fusksikring er ikke mulig uten å legge til en server eller betalt plan.

## 3. Spillområde og grunndata

- 101 T-banestasjoner på linje 1–5, fra Ruters GTFS. Kun T-bane, ingen buss,
  trikk eller tog som gjemmesteder.
- Hver stasjon har en sirkelformet sone. Radius settes av spillstørrelsen
  (400 m i Small og Medium, 800 m i Large) og kan justeres 250–1000 m. Hider
  skal være innenfor sonen til én stasjon.
- Hiders stasjon er den nærmeste, men står hider i sonen til flere stasjoner,
  velger hider selv hvilken som er «sin». Valget står så lenge hider er i sonen.
- Avganger per time per stasjon (hverdag, lørdag, søndag) vises, men brukes
  ikke i noen regel.

## 4. Implementert

### 4.1 Roller

- To roller per telefon: seeker eller hider. Ingen lag, ingen navn på seekere.
- Rollen velges fritt før runden og er låst mens runden pågår.
- Seeker kan ikke svare på spørsmål og ser ingenting om hider.
- Hider ser ikke seekernes kart, antall gjenstående stasjoner eller loggens
  «før → etter»-tall. Hider ser bare sin egen sone og sin egen posisjon. Sonen vises alltid og kan ikke slås av.

### 4.2 Spilloppsett (felles for rommet, låst mens runden pågår)

- By: velges under Oppsett → By, og deles i rommet. I dag finnes bare Oslo, men
  appen er bygget for flere byer. Hver by har egne kartdata, stasjoner, linjer,
  områdenivåer og navn på kollektivnettet. Bytte av by nullstiller
  spillområde, linjevalg og spørsmålsutvalg. Høyde- og adresseoppslag hos
  Kartverket, og Kartverkets bakgrunnskart, gjelder bare norske byer.

- Spillstørrelse: Small, Medium, Large. Standard Medium. Styrer hvilke spørsmål
  som er tilgjengelige (se 4.3), og setter gjemmetid (30 / 60 / 180 min) og
  soneradius (400 / 400 / 800 m). Begge kan overstyres etterpå.
- Spillområde: hele nettet, automatisk ramme 2 km utenfor de ytterste
  stasjonene, eller et polygon tegnet for hånd på kartet. Stasjoner der hele
  sonen ligger utenfor spillområdet er utelukket fra start.
- Sonestørrelse (se 3).
- Egendefinert spørsmålsutvalg: en liste med alle 80 spørsmål der hvert kan
  slås av og på, med «alle» og «ingen» per kategori. Uten endringer gjelder
  utvalget for spillstørrelsen. Bytte av størrelse nullstiller utvalget.
- I Small finnes en egen bryter for å ta med Tentacles (2 km).
- Lagrede oppsett: hele spilloppsettet (størrelse, spørsmålsutvalg, sone,
  linjer, spillområde) og gjemmetiden kan lagres under et navn og brukes igjen.
  Oppsettene lagres på telefonen og deles med alle som bruker appen. Uten nett
  blir de bare på telefonen. Hvem som helst kan endre eller slette et delt
  oppsett.
- Hvilke av linje 1–5 som er med.

### 4.3 Spørsmålskatalog

Hvert spørsmål har en kategori og en svartid: 5 min, men 10 min (Small og
Medium) eller 20 min (Large) for Photos. Hva spørsmålet koster i kort, vises
ikke.

**Matching** («Er nærmeste X den samme som min?»), alle spillstørrelser:

- Transport: flyplass, kollektivlinje, lengde på stasjonsnavn, gate eller sti.
  Kollektivlinje: seeker velger linje, retning og neste stopp for T-banen de
  sitter på. Svaret er ja hvis hiders stasjon er blant stoppene som gjenstår.
- Administrativt: 1. nivå fylke, 2. nivå kommune, 3. nivå bydel, 4. nivå postsone
  (de tre første sifrene i postnummeret)
- Natur: fjell, landmasse, park
- Severdigheter: fornøyelsespark, dyrepark, akvarium, golfbane, museum, kino
- Offentlige tjenester: sykehus, bibliotek, utenlandsk konsulat (inkl. ambassader)

**Measuring** («Er du nærmere X enn meg?»), alle spillstørrelser:

- Transport: flyplass, høyhastighetsbane, jernbanestasjon (T-banestasjoner
  teller med)
- Grenser: riksgrensen, fylkesgrense, kommunegrense
- Natur: havnivå, vann eller innsjø, kystlinjen, fjell, park
- Severdigheter og offentlige tjenester: samme liste som Matching

**Thermometer** («Jeg har reist minst X. Varmere eller kaldere?»):

- Alle: 1 km, 5 km. Medium og Large: 15 km. Large: 75 km.
- Seeker oppgir start- og sluttpunkt. Appen advarer hvis avstanden mellom dem er
  kortere enn kravet, men hindrer ikke spørsmålet.

**Radar** («Er du innenfor X fra meg?»), alle spillstørrelser:

- 500 m, 1, 2, 5, 10, 15, 40, 80, 160 km, og fritt valgt avstand.

**Tentacles** («Hvilken X innen avstand fra meg er du nærmest?»):

- Small: ingen, om ikke det slås på under Oppsett (da gjelder 2 km-spørsmålene).
- Medium og Large, 2 km: museer, biblioteker, kinoer, sykehus.
- Kun Large, 25 km: T-banelinjer, dyreparker, akvarier, fornøyelsesparker.
- Svaralternativene er stedene innenfor avstanden fra seeker, pluss «utenfor radius».

**Photos** («Send et bilde av X»), med kravet til bildet vist som tekst:

- Alle (6): et tre, himmelen, deg selv, bredeste gate, høyeste konstruksjon i
  sikte, en bygning synlig fra stasjonen.
- Medium og Large (+8): høyeste bygning synlig fra stasjonen, tegn opp nærmeste
  gate eller sti, to bygninger, restaurant innvendig, togperrong, park, hylle i
  dagligvarebutikk, gudshus.
- Kun Large (+4): 1 km gater tegnet opp, høyeste fjell synlig fra stasjonen,
  største vann i sonen din, fem bygninger.

**Steder utenfor kartgrensen.** Er det satt et spillområde, regnes steder,
kystlinje, vann og riksgrense utenfor som om de ikke finnes. Finnes det da
ingenting av det spørsmålet handler om, foreslår appen nullsvar. Det gjelder
for eksempel flyplass og riksgrensen når området bare dekker T-banenettet.
Tentacles gir nullsvar når ingen steder ligger innen rekkevidde fra seeker.

### 4.4 Hva appen regner ut, og hva som er manuelt

**Regnes ut automatisk** (appen foreslår hiders svar fra GPS, og svaret krymper
seekernes kart):

- Radar, Thermometer, Tentacles.
- Matching: flyplass, kollektivlinje, lengde på stasjonsnavn, fylke, kommune,
  bydel, postsone, fjell, landmasse, park og alle severdigheter og offentlige
  tjenester.
- Measuring: flyplass, jernbanestasjon, riksgrensen, fylkesgrense,
  kommunegrense, vann eller innsjø, kystlinjen, fjell, park og alle
  severdigheter og offentlige tjenester.
- Measuring, høyhastighetsbane: appen foreslår nullsvar, siden det ikke finnes
  noen i kartet.

**Slås opp hos Kartverket** (hiders app foreslår svaret, hider bekrefter, kartet krymper ikke):

- Matching, gate eller sti: gaten til nærmeste adresse for hider og seeker
  (Kartverkets adresse-API, innen 300 m). Stier uten navn er ikke med.
- Measuring, havnivå: høyde over havet for hider og seeker (Kartverkets
  høyde-API, terrengmodell med 1 m oppløsning). Lavere er nærmere.
- Uten nett eller svar fra Kartverket svarer hider selv.

**Manuelt:** alle Photos. Bildet sendes utenfor appen. Hider trykker «Bilde sendt».

Landmasse skiller bare mellom fastlandet og øyene i fjorden.
Vann måles til nærmeste navngitte vann eller elv, eller til sjøen.

### 4.5 Stille og besvare spørsmål

- Seeker velger kategori og spørsmål, ser en forhåndsvisning av området på
  kartet, og sender. Posisjonen hentes fra GPS når skjemaet åpnes, og kan
  endres (trykk på kart, GPS eller velg stasjon).
- Ett spørsmål om gangen: et nytt kan ikke sendes mens et annet er ubesvart,
  heller ikke av en annen seeker i rommet.
- Spørsmålene velges med knapper. De som er stilt før står i rød tekst med ✓.
  «Samme spørsmål» betyr samme oppføring i katalogen, uavhengig av hvor seeker
  står. For kollektivlinje teller linjenummeret med, og for fritt valgt radar
  teller avstanden med.
- Prøver seeker å stille et spørsmål som er stilt før i runden, får seeker en
  advarsel i skjemaet og må bekrefte. Advarselen sier hvor mange ganger det er
  stilt, og at kostnaden ganges med antall ganger (hider trekker så mange ganger).
- Hvert ubesvarte spørsmål har nedtelling for svartiden. Når tiden er ute, står
  hiders klokke stille til svaret kommer, og alle får beskjed.
- Hider kan også svare «Nullsvar» (det spørsmålet handler om finnes ikke i
  kartet), og i endgame «Kan ikke svare» på bilder. Begge teller som besvart
  uten at kartet krymper.
- Hiders posisjon følger alltid GPS mens appen er åpen. Den kan ikke settes for
  hånd, og den lagres ikke, verken på telefonen eller i rommet. Bare stasjonen
  hider har valgt huskes. Hider ser spørsmålene i sin
  Spørsmål-fane med svaret ferdig utregnet, og sender det med ett trykk. Svaret
  sendes aldri automatisk, så hider kan spille Veto eller Randomize i stedet.
  Svarknappen henter alltid GPS på nytt og regner ut svaret fra der hider står
  akkurat da. Ble svaret et annet enn forslaget, får hider beskjed. Får telefonen
  ikke posisjon, svarer hider selv med knappene som da vises.
- Hider svarer ut fra der hider står. Unntakene er kollektivlinje og lengde på
  stasjonsnavn, som svares ut fra hiders stasjon.
- Appen varsler hider hvis posisjonen er under 30 m fra å gi motsatt svar.
- Hider kan svare på nytt, eller trykke «angre svaret» etter et feiltrykk. Da
  tas det gamle svaret vare på, og både hider og seekere ser i loggen at svaret
  er endret, hva det var, og når.
- Seeker kan redigere og slette et spørsmål helt til hider har svart. Etter
  det er spørsmålet låst. Seeker kan skrive et notat per spørsmål og angre sin
  siste endring i loggen.
- Alle spørsmål unntatt bilder stilles med seekers posisjon, også
  kollektivlinje og de hider svarer på for hånd. For kollektivlinje foreslås
  neste stopp fra posisjonen.
- Loggen viser tid, kategori, spørsmålstekst, svar og antall stasjoner før og
  etter hvert svar.

### 4.6 Hvordan kartet og stasjonslisten krymper

- En stasjon er fortsatt mulig så lenge minst én del av sonen dens er forenlig
  med hvert enkelt svar. Hvert spørsmål vurderes for seg, fordi hider kan flytte
  seg i sonen mellom spørsmålene.
- Seekers kart viser før endgame området svarene peker ut til sammen (snitt og
  differanser av sirkler, halvplan, Voronoi-celler og administrative flater).
  Stasjonssonene tegnes ikke.
- Spørsmål om T-banelinje og navnelengde avgjøres per stasjon og fjerner
  stasjoner uten å tegne et område.
- Avstand til kyst, vann, riksgrensen, fylkes- og kommunegrense avgjøres per
  stasjon med nøyaktig avstand, og tegnes i tillegg som området innenfor
  seekers avstand fra linjen. Området regnes i et rutenett på 120 × 120 over det
  som er igjen av kartet: rundt 500 m ruter før endgame (bare til skravering),
  og rundt 10 m i en endgame-sone, der svaret skjærer sonen.
- Geometri: Radar er en sirkel. Thermometer er halvplanet på riktig side av
  midtnormalen. «Samme nærmeste X» er Voronoi-cellen rundt seekers nærmeste X.
  Measuring mot en stedstype er unionen av sirkler rundt alle steder av typen,
  med radius lik seekers avstand til sitt nærmeste.

### 4.7 Endgame

- Seeker velger en stasjon og trykker «Start endgame». De gjenstående står
  først, men også utelukkede stasjoner kan velges i tilfelle et svar var feil.
  Endgame kan bare startes når letingen pågår og spillet ikke står.
- Hider får en påminnelse om kravene til gjemmestedet (ca. 3 m fra vei eller
  sti, offentlig tilgjengelig).
- Da er bare den stasjonens sone gyldig, og sonen vises på kartet.
- Alle spørsmål stilt etter endgame-start skjærer sonen nøyaktig og gjør kartet
  mindre. Spørsmål fra før gjør det bare når seekerne velger det, per spørsmål,
  i endgame-panelet under Kart eller i loggen. Valget deles i rommet. Spørsmål
  som avgjøres per stasjon (linje, navnelengde) og bilder kan ikke velges.
- Hider og de andre seekerne varsles når endgame startes eller avsluttes. Hider
  får beskjed om å stå stille hvis det er riktig sone, men ser ikke hvilken
  stasjon seekerne valgte. Endgame vises også øverst på kartet.
- Kartet zoomer inn på sonen når endgame starter. Seeker ser stasjonen, når
  endgame startet og hvor lenge det har vart.
- Seeker kan avslutte endgame igjen. Endgame nullstilles når runden er ferdig.

### 4.8 Runde, klokke og poeng

- Gjemmetid med nedtelling, satt av spillstørrelsen, justerbar.
- Letetid som teller opp fra gjemmetiden er over til noen trykker «Funnet!».
  Klokken står mens spillet er på pause, og mens et spørsmål er ubesvart etter
  svartiden.
- Pause og hvileperiode: én knapp stopper alle klokker for alle i rommet, og en
  annen starter dem igjen. Svartider forlenges tilsvarende.
- Poengtavle: bare den beste runden til hver spiller teller. Alle rundene
  vises, og den beste er merket. Spillernavn er fritekst.
- Tidsbonus: når «Funnet!» er trykket, får hiders telefon opp et vindu der
  hider skriver inn tidsbonusen i minutter. Den legges til rundens tid, og kan
  rettes etterpå i feltet ved runden på poengtavlen.
- Etter en runde vises 10 minutters planleggingstid for neste hider, og neste
  spiller i rekkefølgen foreslås som hider. Rekkefølgen kan trekkes tilfeldig.
- Ny runde tømmer spørsmålsloggen.
- Rundestatistikk: spørsmål per kategori, snittlig svartid, svar etter
  svartiden, Veto og Randomize, Move, gjemmetid, pause og tid i endgame. Vises
  mens letingen pågår, og lagres med runden på poengtavlen.
- Hver spiller kan gjemme seg flere runder i samme rom. Rundene nummereres per
  spiller («Ada · runde 2»).
- Tidligere runder (under Spill): når hider er funnet eller runden avbrytes,
  lagres hele runden: loggen med svar og notater, klokken, kortene, Move,
  endgame, oppsettet og statistikken. En runde kan åpnes med full logg og vises
  på kartet slik seekerne så det til slutt. Arkivet ligger på telefonen (de
  siste 100 rundene) og i rommet, så alle i rommet ser alle rundene.

### 4.9 Rom og sanntid

- Én spiller lager et rom og får en kode på seks tegn. Andre blir med via kode
  eller lenke.
- Synkes i rommet: spørsmål, svar, notater, spilloppsett, klokke, pause,
  endgame, spillerliste, poengtavle, og posisjonen til seekere som har slått på
  posisjonsdeling.
- Seekernes posisjon sendes hvert tiende sekund mens appen er åpen, og vises
  som punkter på kartet. Hider ser dem hele runden.
- Synkes aldri: hiders posisjon, rolle, tema, kartvalg.
- Rundearkivet ligger utenfor selve rommet i databasen (`archive/<kode>`), og
  hentes når man kobler til eller åpner Tidligere runder.
- Rommene telefonen har vært i, vises under Spill, så man kan gå tilbake til et
  senere.
- Uten rom kan spørsmålsloggen deles som lenke eller JSON. Det er et
  øyeblikksbilde som ikke oppdateres.

### 4.10 Varsler

- Hider varsles om nye spørsmål. Seeker varsles om nye svar og om spørsmål
  andre seekere stiller.
- Vises som melding i appen med vibrasjon, og som systemvarsel hvis brukeren har
  slått det på og siden ligger i bakgrunnen.

### 4.11 Kart og visning

Appen har fire faner. **Kart**: endgame og mulige stasjoner for seeker, hiders
posisjon og stasjonsvalg for hider, kartlag, bakgrunnskart, avganger og
områdegrenser. **Spørsmål**: stille, svare og logg. **Spill**: rom, rolle,
runde og klokke, posisjonsdeling og poengtavle. **Oppsett**: lagrede oppsett,
spillområde, størrelse, spørsmålsutvalg, sone, linjer, utseende og data.

- Tre bakgrunnskart: gråtone (Kartverket), vanlig (OpenStreetMap), satellitt (Esri).
- Kartlag som kan slås av og på: mulig område, linjer, områdegrenser, steder.
- Lyst og mørkt tema. Knapp for å vise egen posisjon.
- Kartet kan ikke zoomes lenger ut enn at hele spillområdet får plass (uten
  spillområde: sonene rundt stasjonene som er med). Mens spillområdet tegnes,
  er det ingen grense.
- Kartet kan roteres med to fingre (shift + scrollehjul på PC). Kompassknappen
  setter nord opp, eller lar kartet følge telefonens kompass.
- Knappen «Regler» på kartet (og «Regler» øverst på PC) åpner reglene. Fra et
  spørsmål åpnes avsnittet for kategorien. Avstander og bildekrav hentes fra
  spørsmålskatalogen og viser appens verdier.

### 4.12 Måleverktøy

Under Kart, for alle roller. Til kostnaden for forbannelser og lignende. Teller
ikke som spørsmål, krymper ikke kartet, lagres bare på telefonen og deles ikke.

- **Egen radar:** sirkel med valgfri avstand (valg eller fritt i km) rundt et
  punkt. Hider ser avstanden til hver seeker som deler posisjon, og om de er
  innenfor. Alle ser om de selv er innenfor.
- **Eget termometer:** startpunkt og avstand. GPS følger hvor langt telefonen
  har reist i luftlinje, og viser når avstanden er nådd.

### 4.13 Kort

Hider spiller kortene i appen. Kortet må fortsatt spilles fra den fysiske hånden.

- **Veto:** knapp på et ubesvart spørsmål. Svaret blir «Veto», spørsmålet regnes
  som stilt, og kartet krymper ikke.
- **Randomize:** knapp på et ubesvart spørsmål. Appen trekker et tilfeldig
  spørsmål i samme kategori som ikke er stilt og ikke er stengt. Det opprinnelige
  regnes ikke som stilt. Seekerne får en knapp for å stille det nye spørsmålet.
- **Move:** under Kort i Spørsmål-fanen, bare mens letingen pågår og ikke i
  endgame. Klokkene står i opptil gjemmetiden (en egen pausetype som slutter av
  seg selv), og ingen spørsmål kan stilles. Seekerne ser stasjonen hider forlot.
  Hider trykker «Jeg er i ny sone» ved ankomst. Spørsmål stilt før siste
  Move krymper ikke kartet.
- **Drained Brain:** hider velger opptil tre spørsmål i ulike kategorier. De kan
  ikke stilles resten av runden, heller ikke mot økt kostnad.
- **Spotty Memory:** appen kaster en terning (1–6 = de seks kategoriene) eller
  hider velger selv. Kategorien er slått ut til den kastes på nytt eller fjernes.
- Seekerne varsles når Move, Drained Brain eller Spotty Memory spilles.

## 5. Ikke implementert

### 5.1 Kort

- Ingen kortstokk, ingen hånd, ingen trekking eller kasting i appen.
- Ingen andre forbannelser, tidsbonuskort eller powerups enn de fem i 4.13.
- Ingen visning av hvor mange kort hider trekker, heller ikke ved gjentakelser
  eller når svartiden går ut.
- Appen sjekker ikke at hider faktisk har kortet på hånden, eller at kostnaden
  til en forbannelse er betalt.

### 5.2 Regler som ikke håndheves

- Kollektivlinje: ingen sjekk av at seekerne faktisk er om bord.
- Ingen sjekk av at hider faktisk er innenfor en sone, verken ved slutten av
  gjemmetiden eller senere. Appen viser bare en advarsel til hider.
- Ingen sjekk av at hider står stille i endgame.
- Ingen sjekk av at seeker faktisk har reist avstanden et termometer krever.
- Hider bekrefter ikke at endgame er startet i riktig sone.
- Svar kan endres etter at de er gitt, men hver endring vises i loggen.
- Ingen regler for hvilke transportmidler som er lov, eller spilletid.
- «Funnet!» bekreftes for hånd. Appen måler ikke avstanden til hider.

### 5.3 Spillere og lag

- Ingen lag, ingen spillerkontoer, ingen innlogging.
- Posisjonsdeling virker bare mens appen er åpen på skjermen, og seekerne har
  ingen navn på kartet.
- Ingen chat og ingen bildeopplasting. Bilder sendes utenfor appen.
- Ingen vert: alle i rommet kan endre oppsettet før start, starte runden og
  starte endgame.

### 5.4 Data som mangler

- Gatenett og høydemodell finnes ikke i appen. Gate og havnivå slås opp hos
  Kartverket, og virker derfor bare med nett.
- OpenStreetMap har ingen honorære konsulater merket i Oslo, så filteret for
  dem fjerner ingenting i dag.
- Uten spillområde er alle steder med, også Gardermoen. Da gir Matching på
  flyplass alltid «ja».
- Postsone- og bydelsgrenser har noen meters unøyaktighet.

### 5.5 Teknisk

- Ingen push-varsler når siden er lukket eller telefonen har vært låst lenge.
- På iPhone virker systemvarsler bare når siden er lagt til på Hjem-skjermen.
- Klokken bruker hver telefons egen tid og kan avvike noen sekunder.
- Rommet er bare beskyttet av koden. Alle som har den kan lese og endre spillet.
- Rom slettes aldri automatisk.
- Lastes siden på nytt uten nett, og det gjøres endringer før nettet er tilbake,
  vinner rommets versjon.

## 6. Datakilder

| Data | Kilde | Omfang |
|---|---|---|
| Stasjoner, linjer, avganger | Ruter GTFS | 101 stasjoner, 5 linjer |
| Fylke, kommune | Kartverket | Oslo og Akershus, Oslo og Bærum |
| Postnummer | Kartverket og Posten | 537 områder, slått sammen til 67 postsoner |
| Bydeler | OpenStreetMap | 15 bydeler, Sentrum, Marka, og Bærum som én |
| Stedstyper | OpenStreetMap | Se under |
| Kystlinje, vann, riksgrense | OpenStreetMap | 165 øyer, 807 vann og elver, grensen mot Sverige |

Antall steder per type: flyplass 2, jernbanestasjon 20 (pluss 101 T-banestasjoner), fjell 361, park 216,
fornøyelsespark 6, dyrepark 5, akvarium 1, golfbane 59, museum 81, kino 16,
sykehus 21, bibliotek 42, konsulat/ambassade 76.

Sjeldne typer (flyplass, fornøyelsespark, dyrepark, akvarium, golfbane) er
hentet fra et større område rundt Oslo, siden nærmeste kan ligge langt unna.
