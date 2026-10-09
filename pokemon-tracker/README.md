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
6. Under **Samling** kan du trykke **Rediger** på en rad for å endre
   kost/verdi/antall manuelt, eller **Legg til kort** for å søke opp et
   engelsk Pokémon-kort og legge det inn med pris hentet fra TCGdex.

### Nytt salg

Knappen **Nytt salg** i Salg-fanen er den fulle salgsflyten: ett salg kan
inneholde kort fra samlingen din OG kort du aldri har registrert (f.eks. en
Finn-pakke med en blanding). Søkeboksen i dialogen søker samtidig i
samlingen din og i TCGdex, og viser to separate lister — **I samlingen min**
og **Nytt kort fra søk** — slik at du selv velger kilde hvis et kort finnes i
begge. Et kort fra søk legges aldri inn i samlingen; markedsprisen hentes kun
én gang når du trykker «Legg til».

For hvert kort i salget kan du redigere antall, kostpris per stk,
markedspris per stk og salgspris per stk fritt. **Fordel total** fyller
salgsprisfeltene proporsjonalt etter markedspris fra én oppgitt totalsum —
juster deretter enkeltfelter fritt, og differansen mot den oppgitte totalen
vises løpende til den stemmer. For kort som kom fra samlingen kan du krysse
av **Fjern fra samling** (av som standard) hvis salget faktisk skal redusere
antallet du har igjen. Frakt er valgfritt og trekkes fra fortjenesten.

Alle salg (uansett hvordan de ble registrert) kan redigeres eller slettes
senere fra Salg-fanen — **Rediger** åpner samme dialog forhåndsutfylt (eller
det enkle skjemaet for salg uten kort), og lagring oppdaterer samlingens
antall riktig selv om du endrer hva som skal fjernes.

### Søk og legg til kort (TCGdex)

"Legg til kort" på Samling-fanen søker i [TCGdex](https://tcgdex.dev) (gratis,
ingen nøkkel) etter navn, med valgfritt kortnummer (f.eks. «064/128» eller
«064») for å smalne inn treffene. Når du velger et treff vises bildet, pris
per variant i USD/EUR (fra TCGplayer, med Cardmarket i EUR som reserve når
TCGplayer ikke har data) omregnet til NOK via en gratis valutakurs-API — du
kan alltid overstyre prisen selv. **Prisen hentes kun i det øyeblikket du
legger kortet til** og endres ikke automatisk etterpå; det er ingen
bakgrunnsoppdatering eller live-pris. Kort importert fra Collectr-CSV er
aldri påvirket av dette og endres aldri av TCGdex.

Hvis kortet allerede finnes i samlingen (samme navn, nummer og variant, uansett
hvordan settet er skrevet), spør siden om du vil øke antallet eller legge det
til som en egen rad. Hvis søket ikke gir treff, eller TCGdex ikke svarer, kan
du legge inn kortet helt manuelt i stedet.

Søkene sender kun søketekst og TCGdex-kort-id til `api.tcgdex.net` og
`api.frankfurter.dev` — aldri kostpriser, salg eller annen privat
samlingsdata. Søkeresultater og kortdetaljer caches bare i minnet mens siden
er åpen (ikke i `localStorage`), så ingenting av dette havner i
sikkerhetskopier.

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
- `js/tcgdex.js` — tynn klient mot TCGdex og valutakurs-APIet, med
  minnecache (`KB.tcgdex`)
- `js/app.js` — state, rendering, faner, dialoger, Gist-sync (`KB.app`)
- `tests/sample.csv` — syntetiske testdata (ikke ekte kortdata)
