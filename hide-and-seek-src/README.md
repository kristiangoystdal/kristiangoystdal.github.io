# Hide and Seek Oslo

Spørsmålstracker for Jetlag Hide and Seek på Oslo T-bane. Kilden ligger her,
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

Alt ligger ferdig bygget i `public/data/`. Appen kaller ingen API-er ved kjøring.

| Fil | Kilde | Script |
|---|---|---|
| `stations.json`, `lines.geojson` | Ruter GTFS (`rb_rut-aggregated-gtfs.zip`, route_type 401) | `scripts/gtfs_to_json.py` |
| `admin.geojson` | Kartverket (fylke, kommune, postnummer), OSM (bydel) | `scripts/fetch_geodata.py` |
| `poi/*.geojson` | OpenStreetMap via Overpass | `scripts/fetch_geodata.py` |
| `coast.geojson`, `water.geojson`, `riks.geojson` | OpenStreetMap via Overpass (kystlinje og øyer, navngitte vann og elver, riksgrensen) | `scripts/fetch_geodata.py public/data cache shapes` |

`admin.geojson`, `poi/` og linjefilene er valgfrie: mangler de, vises spørsmålstypene som
trenger dem som «data mangler», og resten virker som før.

## Kode

- `src/geo.ts`: all geometri. `regionOf` gir området et spørsmål peker ut,
  `solve` krymper det mulige området spørsmål for spørsmål, `autoAnswer` regner
  ut hiders svar direkte fra avstander.
- `src/form.ts`: regelbokens spørsmål (`ITEMS`), svartid og tekstene i loggen. Kort finnes ikke i appen.
- `src/clock.ts`: rundens klokke. Pause og svartid som går ut stopper hiders tid.
- `src/sync.ts`: sanntidsrom i Firebase Realtime Database. Reglene ligger i `database.rules.json`
  og må publiseres i Firebase-konsollen når de endres. Seekernes posisjon ligger under `seekers/`.
- `src/notify.tsx`: varsler om nye spørsmål og svar.
- `src/store.ts`: Zustand. `useGame` lagres i localStorage, `useUi` gjør ikke det.
- `src/MapView.tsx`: Leaflet-kartet og bakgrunnskartene (`BASEMAPS`, ingen krever nøkkel). `QuestionsView.tsx` og `Panels.tsx` er skjermene.
