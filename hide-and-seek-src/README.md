# Hide and Seek Oslo

Spørsmålstracker for Jetlag Hide and Seek, laget for Oslo T-bane og bygget for å
kunne ta inn flere byer. Kilden ligger her,
bygget ligger i `../hide-and-seek/` og er det GitHub Pages serverer.

```
npm install
npm run dev      # utvikling
npm test         # geometritester
npm run build    # skriver til ../hide-and-seek (må committes)
```

Pages bygger ikke noe selv (repoet serveres rett fra `main`), så husk
`npm run build` før commit når noe i `src/` eller `public/` er endret.

## Data

Hver by har sine data ferdig bygget i `public/data/<by>/` (i dag bare `oslo/`).
Det eneste appen henter under spill er høyde og nærmeste adresse fra Kartverkets
åpne API-er (`src/online.ts`), for spørsmålene om havnivå og gate. De finnes bare
i norske byer. Uten nett svarer hider selv.

| Fil | Kilde (Oslo) | Script |
|---|---|---|
| `stations.json`, `lines.geojson` | Ruter GTFS (`rb_rut-aggregated-gtfs.zip`, route_type 401) | `scripts/gtfs_to_json.py <by> gtfs.zip` |
| `admin.geojson` | Kartverket (fylke, kommune, postnummer), OSM (bydel) | `scripts/fetch_geodata.py <by> cache admin` |
| `poi/*.geojson` | OpenStreetMap via Overpass | `scripts/fetch_geodata.py <by> cache poi` |
| `coast.geojson`, `water.geojson`, `riks.geojson` | OpenStreetMap via Overpass (kystlinje og øyer, navngitte vann og elver, riksgrensen) | `scripts/fetch_geodata.py <by> cache shapes` |

`admin.geojson`, `poi/` og linjefilene er valgfrie: mangler de, vises spørsmålstypene som
trenger dem som «data mangler», og resten virker som før.

### Legge til en by

1. Legg byen til i `scripts/cities.json`: GTFS-feeden (`url`, `routeTypes` for
   nettet som skal spilles på, f.eks. `"1"` for metro eller `"0"` for trikk, og
   eventuelt `lineColors`), og områdene `bbox` (alle stasjonene med margin),
   `wide`, `coastBbox` og `borderBbox` som «sør,vest,nord,øst».
2. Bygg stasjoner og linjer: `python3 scripts/gtfs_to_json.py <by> gtfs.zip`.
3. Bygg steder og linjer det måles til: `python3 scripts/fetch_geodata.py <by> cache poi`
   og `... shapes`. Grenser (`admin`) må bygges med en egen funksjon per by i
   `ADMIN_BUILDERS`, siden kildene er ulike fra land til land. Uten den er
   Matching og Measuring på grenser slått av for byen.
4. Legg byen til i `CITIES` i `src/cities.ts`: navn, hva nettet heter
   (`network`), ramme (`bounds`, [vest, sør, øst, nord]), områdenivåene som
   finnes i `admin.geojson`, om den er i Norge, og om den har høyhastighetsbane.
5. `npm test` og `npm run build`. Byen dukker opp under Oppsett → By.

Alle byenes data forhåndslastes av service workeren (`globPatterns` i
`vite.config.ts`). Med mange byer bør det begrenses til byen som er valgt.

## Kode

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
- `src/cities.ts`: byene appen kan spilles i, og alt som er ulikt fra by til by. `city()` er byen som er lastet inn.
- `src/Archive.tsx`: tidligere runder. Lagres i `archive` i `useGame` og under `archive/<rom>/` i databasen, utenfor rommet.
- `src/presets.ts`: lagrede spilloppsett. De ligger på telefonen og deles under `presets/` i databasen.
- `src/notify.tsx`: varsler om nye spørsmål og svar.
- `src/store.ts`: Zustand. `useGame` lagres i localStorage, `useUi` gjør ikke det.
- `src/MapView.tsx`: Leaflet-kartet og bakgrunnskartene (`BASEMAPS`, ingen krever nøkkel). `QuestionsView.tsx` og `Panels.tsx` er skjermene.
