# Hide and Seek Oslo

Spørsmålstracker for Jetlag Hide and Seek. Spilles i Oslo (T-bane og trikk),
Bergen (Bybanen og bybuss), Stavanger (bybuss på Nord-Jæren) og Trondheim
(Gråkallbanen og bybuss). Under Oppsett velges hvilke transportmidler og linjer
som er med. Kilden ligger her. GitHub Actions bygger appen til `../hide-and-seek/`
og publiserer hele nettsiden (se under).

```
npm install
npm run dev      # utvikling
npm test         # raske tester (geometri, video, byer), et par sekunder
npm run test:sim # simulerte runder i hver by, ca. 1,5 min (8 blokker i parallell)
npm run test:all # alt
npm run sim:games # lager de simulerte spillene i public/data/<by>/game.json på nytt
npm run e2e      # klikk-tester som iPhone (WebKit) og Android, mot den bygde appen (bygg først)
npm run build    # bygger til ../hide-and-seek (ikke i git), for npm run e2e og vite preview
```

Publisering: hver push til `main` kjører `.github/workflows/pages.yml`. Den kjører alle testene
(også klikk-testene som iPhone og Android), bygger appen og publiserer hele nettsiden til GitHub Pages.
Feiler en test, publiseres ingenting. Bygget committes ikke.

## Data

Hver by har sine data ferdig bygget i `public/data/<by>/` (`oslo/`, `bergen/`, `stavanger/`, `trondheim/`).
Alle transportmidlene i en by ligger i de samme filene. Hver linje i `lines.geojson`
har `mode` (`metro`, `tram`, `lightrail` eller `bus`).
Det eneste appen henter under spill er høyde og nærmeste adresse fra Kartverkets
åpne API-er (`src/online.ts`), for spørsmålene om havnivå og gate. De finnes bare
i norske byer. Uten nett svarer hider selv.

| Fil | Kilde (Oslo) | Script |
|---|---|---|
| `stations.json`, `lines.geojson` | Entur GTFS: Ruter (`rb_rut`), Skyss (`rb_sky`), Kolumbus (`rb_kol`), AtB (`rb_atb`). Rutetypene står under `networks` i `scripts/cities.json` | `scripts/gtfs_to_json.py <by> gtfs.zip` |
| `admin.geojson` | Kartverket (fylke, kommune, postnummer), OSM (bydel) | `scripts/fetch_geodata.py <by> cache admin` |
| `poi/*.geojson` | OpenStreetMap via Overpass | `scripts/fetch_geodata.py <by> cache poi` |
| `coast.geojson`, `water.geojson`, `riks.geojson` | OpenStreetMap via Overpass (kystlinje og øyer, navngitte vann og elver, riksgrensen) | `scripts/fetch_geodata.py <by> cache shapes` |

Er Overpass opptatt (502/504), kan et speil brukes: `OVERPASS_URL=https://lz4.overpass-api.de/api/interpreter`.
Svarer det ikke i det hele tatt, bygges grensene fra Kartverket likevel, bare uten bydeler.

`admin.geojson`, `poi/` og linjefilene er valgfrie: mangler de, vises spørsmålstypene som
trenger dem som «data mangler», og resten virker som før.

### Legge til en by

1. Legg byen til i `scripts/cities.json`: GTFS-feeden (`url`) med ett nett per
   transportmiddel under `networks`: `mode`, `routeTypes` (f.eks. `"401"` for T-bane,
   `"900"`/`"902"` for trikk, `"901"` for bybane, `"704"` for lokalbuss), eventuelt
   `linePattern` for å velge linjenumre og `lineColors` (linjer uten farge får en
   automatisk). Så områdene `bbox` (alle stasjonene med margin),
   `wide`, `coastBbox` og `borderBbox` som «sør,vest,nord,øst». Uten `borderBbox`
   slås spørsmålet om riksgrensen av. I Norge holder det å sette `admin` til fylkene
   og kommunene (`{"fylker": {...}, "kommuner": {...}}`).
2. Bygg stasjoner og linjer: `python3 scripts/gtfs_to_json.py <by> gtfs.zip`.
3. Bygg steder og linjer det måles til: `python3 scripts/fetch_geodata.py <by> cache poi`
   og `... shapes`. Grenser (`admin`) må bygges med en egen funksjon per by i
   `ADMIN_BUILDERS` utenfor Norge, siden kildene er ulike fra land til land. Uten den er
   Matching og Measuring på grenser slått av for byen.
4. Legg byen til i `CITIES` i `src/cities.ts`: navn, transportmidlene (`modes`) og
   de som er med fra start (`defaultModes`). Ordene i tekstene står i `MODES`, og bare
   T-banestasjoner teller som jernbanestasjoner. Så ramme (`bounds`, [vest, sør, øst, nord]), områdenivåene som
   finnes i `admin.geojson`, om den er i Norge, og om den har høyhastighetsbane.
5. `npm run test:all` (de simulerte rundene tar med den nye byen av seg selv når den har en fil i `src/sim/`) og `npm run build`. Byen dukker opp under Oppsett → By.

Service workeren laster ned Oslos data på forhånd (`globPatterns` i `vite.config.ts`).
De andre byene lagres første gang de åpnes (`runtimeCaching`, «city-data»), og virker
deretter uten nett.

## Kode

- `src/sim/`: simulerte runder. For hver by stiller seekerne alle spørsmålene byen har
  data til, hider svarer ut fra der hen står, og testen sjekker at hiders stasjon aldri
  utelukkes og at endgame ender riktig. Kjør dem etter endringer i spillogikk eller data.
  Én by alene: `npx vitest run src/sim/bergen`.
- `src/geo.ts`: all geometri. `regionOf` gir området et spørsmål peker ut,
  `solve` krymper det mulige området spørsmål for spørsmål, `autoAnswer` regner
  ut hiders svar direkte fra avstander.
- `src/form.ts`: regelbokens spørsmål (`ITEMS`), svartid og tekstene i loggen. Kortstokken er fysisk. Appen har bare
  kortene som endrer spillet: Veto, Randomize, Move, Drained Brain og Spotty Memory (`lockedBy`, `randomSwap`).
- `src/Tools.tsx`: måleverktøyet (egen radar og eget termometer) under Kart. Lokalt per telefon, i `tools` i `useGame`.
- `src/Rules.tsx`: regelvisningen. Avstander og bildekrav hentes fra `ITEMS`, så de alltid stemmer med appen.
- `src/clock.ts`: rundens klokke. Pause og svartid som går ut stopper hiders tid.
- `src/sync.ts`: sanntidsrom i Firebase Realtime Database. Reglene ligger i `database.rules.json`
  og må publiseres i Firebase-konsollen når de endres. Seekernes posisjon ligger under `seekers/`.
  Rommet merkes med `active` når noen kobler til og jevnlig mens det spilles.

## Firebase: innlogging, regler og opprydding

Appen kan bruke anonym innlogging (en usynlig konto per telefon), så databasen vet hvem som eier hva.
Uten nettnøkkel (`VITE_FIREBASE_API_KEY`) er den av, og appen virker som før.

1. Firebase-konsollen → Authentication → Sign-in method: slå på **Anonymous**.
2. Kopier `.env.example` til `.env.local` (ignoreres av git) og fyll inn Web API Key (Prosjektinnstillinger →
   General) og eventuelt App ID. Legg de samme verdiene inn som hemmeligheter i GitHub, så byggingen får dem:
   `gh secret set -f hide-and-seek-src/.env.local` (fra rotmappen). Verdiene havner i den publiserte appen,
   slik det er ment for Firebase. Det er reglene som beskytter dataene.
3. Publiser `database.rules.json` (fase 1: godtar telefoner med og uten innlogging).
4. Etter to uker, når telefonene har den nye versjonen: legg `auth != null &&` foran alle `.write`-reglene
   og publiser på nytt (fase 2).

Oppryddingen (`scripts/cleanup-rooms.mjs`, `.github/workflows/cleanup.yml`) sletter rom og arkiv som ikke
er brukt på 90 dager, første dag i hver måned. Den trenger en tjenestekontonøkkel: Prosjektinnstillinger →
Service accounts → Generate new private key, og lim hele JSON-filen inn som hemmeligheten
`FIREBASE_SERVICE_ACCOUNT` i GitHub (Settings → Secrets and variables → Actions). Kjør den gjerne for hånd
med «Bare vis» først (Actions → Rydd gamle rom → Run workflow).
- `src/cities.ts`: byene appen kan spilles i, og alt som er ulikt fra by til by. `city()` er byen som er lastet inn.
- `src/Archive.tsx`: tidligere runder. Lagres i `archive` i `useGame` og under `archive/<rom>/` i databasen, utenfor rommet.
- `src/presets.ts`: lagrede spilloppsett. De ligger på telefonen og deles under `presets/` i databasen.
- `src/notify.tsx`: varsler om nye spørsmål og svar.
- `src/store.ts`: Zustand. `useGame` lagres i localStorage, `useUi` gjør ikke det.
- `src/Screens.tsx`: skjermene. Før og mellom rundene `Lobby` (fire steg: rom, spillere og rolle, by og regler, start).
  Mens runden pågår `GameScreen` med klokken øverst (`RoundBar`) og fanene Spørsmål, Endgame og Verktøy.
  Delene ligger i `Panels.tsx`. Knappene følger ett system: én `btn-primary` per skjerm, `btn-danger` for det som
  sletter eller avbryter (spør alltid først), `Switch` for av/på og `Segmented` for å velge ett av flere (`ui.tsx`).
- `src/guide.ts` og `src/GuideCard.tsx`: «Lær appen»: omvisningen og demorunden steg for steg. Hvert steg peker på
  et element med `data-guide` og går videre når brukeren har gjort det.
- `src/demo.ts`: sandkassen. Det ekte spillet legges til side (også i lagringen, så det overlever en omlasting) og
  telefonen kobles fra rommet mens demoen eller et simulert spill går. Demoen har en datastyrt hider.
- `src/showcase.ts`: simulerte spill, ett per by, som brukeren blar gjennom. De regnes ut på forhånd
  (`npm run sim:games`), og `src/sim/showcase.test.ts` feiler hvis de ikke stemmer med kartdataene lenger.
- `src/testmode.ts`: falsk GPS for demoen. Uten demo går alt til telefonens GPS.
- `src/MapView.tsx`: Leaflet-kartet og bakgrunnskartene (`BASEMAPS`, ingen krever nøkkel). `QuestionsView.tsx` og `Panels.tsx` er skjermene.
