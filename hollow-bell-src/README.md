# The Hollow Bell

Et choose-your-own-adventure i nettleseren, malt i akvarell. Fanprosjekt, ikke tilknyttet J.K. Rowling,
Warner Bros. eller Wizarding World. All tekst, grafikk og lyd er laget for prosjektet.

Spill: https://kristiangoystdal.github.io/hollow-bell/

## Spille lokalt
`./start-game.sh` (eller `npm install && npm run play`) bygger spillet og åpner http://localhost:4173.
Ikke åpne `index.html` direkte fra disk; nettleseren blokkerer da lyd og moduler.

Taster: 1–9 velg · mellomrom neste · H skjul tekst · L logg · I status · F fullskjerm · Esc meny.

## Mobil som fjernkontroll
Meny → «Phone remote» viser en QR-kode og en romkode. Mobilen viser valgene, historien vises på PC-en.
Krever Firebase-nøklene (`.env.local`, se `.env.example`; i GitHub Actions brukes hemmelighetene til Hide and Seek)
og at reglene for `hollowbell/` i `../hide-and-seek-src/database.rules.json` er publisert i Firebase-konsollen.

## Utvikling
Se `CLAUDE.md` for kommandoer og mappestruktur, `PROGRESS.md` for status og `PLAN.md` for planen.
