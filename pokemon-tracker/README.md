# Kortbok

En statisk nettside som sporer en Pokémon-kortsamling og hvor mye du har tjent
på salg. Kun HTML, CSS og vanilla JS — ingen rammeverk, ingen server.

Ligger på: `https://kristiangoystdal.github.io/pokemon-tracker/`

## Bruk

1. Åpne siden.
2. Gå til fanen **Import og data** og importer en CSV-eksport fra Collectr
   (dra-og-slipp eller klikk for å velge fil).
3. Se oversikt, bla gjennom samlingen, og registrer salg under **Samling**
   (velg kort → "Selg valgte" eller "Selg" på en enkelt rad).
4. Under **Salg** kan du angre eller slette salg, og legge til gamle salg uten
   kort.
5. Under **Import og data** kan du laste ned en JSON-sikkerhetskopi,
   gjenopprette fra en slik fil, eksportere samlingen som CSV, eller slette
   alt.

### Data og lagring

Alle data lagres i nettleserens `localStorage` under nøkkelen `kortbok.v1`,
som ett JSON-dokument. Siden leveres uten data — importer din egen CSV for å
komme i gang. Dette er lokalt per nettleser.

For å ha samme samling i flere nettlesere kan du bruke
**Sky-synkronisering (GitHub Gist)** i Import og data-fanen: lim inn en
personlig GitHub-token med `gist`-rettighet, og last opp/hent dataene dine fra
en privat Gist knyttet til din egen GitHub-konto. Tokenet lagres kun i
nettleseren din og sendes direkte til `api.github.com`.

Ekte kortdata, CSV-eksporter og sikkerhetskopier skal **aldri** commit'es til
repoet — se `.gitignore`.

## Utlegging (GitHub Pages)

Repoet er `kristiangoystdal.github.io`, som allerede er satt opp for GitHub
Pages fra `main`-grenen. Denne mappen (`pokemon-tracker/`) ligger i roten av
repoet, så den blir automatisk tilgjengelig på
`https://kristiangoystdal.github.io/pokemon-tracker/` etter en vanlig
`git push`.

```bash
git add pokemon-tracker
git commit -m "Add Kortbok Pokémon card tracker"
git push
```

Ingen bygg-steg er nødvendig.

## Filer

- `index.html` — struktur, inline CSS, dialoger
- `js/csv.js` — RFC 4180 CSV-parser + mapping av Collectr-eksport (`KB.csv`)
- `js/app.js` — state, rendering, faner, dialoger, Gist-sync (`KB.app`)
- `tests/sample.csv` — syntetiske testdata (ikke ekte kortdata)
