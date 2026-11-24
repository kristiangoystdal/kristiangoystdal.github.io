# Fremdrift: The Hollow Bell

Les denne i starten av hver økt, og oppdater den ved slutten. Kun milepæler, tall og tekniske detaljer.
Ingen gjengivelse av historien (scener, slutter, figurer, replikker): brukeren skal oppleve den som en overraskelse.

Sist oppdatert: 2026-11-24. Gren: `hollow-bell` (committet, ikke pushet).

## Status nå

Verktøy er satt opp (se «Verktøy»), og byggingen er gjenopptatt. Første spillbare versjon er committet på grenen.

## Milepæler fra PLAN.md

| # | Milepæl | Status |
|---|---|---|
| 1 | Oppsett: Vite + TS, Vitest, `npm run play`, deploy som underside, CLAUDE.md | Ferdig: `pages.yml` bygger til `hollow-bell/`, `start-game.sh`, CLAUDE.md, README, kort på forsiden |
| 2 | Motor: types, state, conditions, effects, tester | Ferdig (inkl. counters, bonds, direktør/hendelser, løkke, betinget tekst) |
| 3 | Minimal UI: tekst og valg | Ferdig |
| 4 | Karakter, lagring, meny | Ferdig (3 plasser + autolagring, eksport/import, innstillinger) |
| 5 | Sjekker og relasjoner i UI | Ferdig (terningkort, låste valg med hint, statuspanel) |
| 6 | Design-pass | Første versjon (akvarell/papir, to skrifter, papir/blekk-tema, redusert bevegelse) |
| 7 | SceneStage nivå A | Første versjon: 13 malte steder i kode, parallakse, kamera, lys, partikler, figurer, snakkebobler, klipp/gå-overganger, `?gallery` |
| 8 | Videospiller | Ikke startet (valgfritt i planen) |
| 9 | Validator + bot i CI | Ferdig: validate, enhetstester, nettlesertester og fjernkontroll-test kjøres i CI når `hollow-bell-src` endres |
| 10 | Historie 1 ferdig | Historiedata er på plass (fra zip). Polering gjenstår |
| 10b | 3D-prototype | Droppet (PLAN 6.3) |
| 11 | Videopipeline | Ikke startet |
| 6.4 | Lyd og stemmer | Lyd ferdig (46 lyder). Stemmer: Web Speech som reserve; Piper-verktøy med, ikke kjørt |
| 6.6 | Mobil som fjernkontroll | Ferdig mot emulator. Bruker Jetlag Hide and Seek-prosjektet, mappe `hollowbell/`. Reglene må publiseres i Firebase-konsollen |
| 12 | Historie 2 og 3 | Ikke startet |
| 13 | Sluttskjerm, funne slutter | Ferdig (rutenett, sti med «?», rulletekst) |
| 14 | Lansering | Ikke startet |

## Tall (fra `npm run validate`, spoilerfritt)

- Engelsk: 98 scener, 8 slutter, 0 feil, 0 advarsler, 0 blindveier i 3000 bot-spill.
- Norsk (eldre): 79 scener, 8 slutter, 0 feil, 0 advarsler, 0 blindveier.
- Én slutt er sjelden ved tilfeldig spill (ca. 0,1 %), men nåbar.
- Enhetstester: 19/19. Databaseregler: 23/23 (emulator).
- Nettlesertester (`npm run e2e`): 3 tilfeldige gjennomspillinger til slutt, lagre/laste, autolagring: alle består.
- Fjernkontroll mot emulator (`npm run e2e:remote`): 4/4.

## Gjenstår (når bygging gjenopptas)

1. Publiser databasereglene for `hollowbell/` (brukeren, i Firebase-konsollen, eller med Firebase MCP etter godkjenning).
2. Push grenen og lag PR når brukeren ber om det. CI kjører da alle testene.
3. Brukeren spiller gjennom og gir tilbakemelding på utseende og flyt.
4. Polering: figurposer (redd, trylle, sove), flere animasjoner, «walk» bare mellom naboområder (områdekart).
5. Valgfritt senere: stemmer med Piper, videoklipp (milepæl 8/11), historie 2 og 3.

## Verktøy

| Verktøy | Status |
|---|---|
| `gh` | Innlogget, har `repo` og `workflow` |
| frontend-design | Var allerede installert (`~/.claude/skills/frontend-design`) |
| Playwright MCP | Installert (local scope, `@playwright/mcp@0.0.86 --headless --isolated`). Testet: åpner side, tar skjermbilde. Filer havner i `.playwright-mcp/` (git-ignorert) |
| Firebase MCP | Installert (local scope, `firebase-tools@15.34.2 mcp --only core,database`, `--dir hide-and-seek-src`). Testet: innlogget, ser `jetlag-hide-and-seek-norway`. Ingen aktiv prosjekt-alias satt. Spør før `firebase_deploy` eller skriving til databasen |
| game-design / game-art | Droppet (brukerens valg) |
| team-narrative | Droppet (brukerens valg) |
| sprite-forge | Droppet (brukerens valg) |
| svg-illustration | Ikke installert (ingen offisiell kilde funnet) |

## Filplassering (avvik fra brukerens beskrivelse)

Brukeren nevner `story/hollow-bell.json`, `story/hollow-bell.no.json`, `story/SPOILERS/` og `story/check.mjs`.
I dag ligger de i `hollow-bell-src/src/stories/`, `hollow-bell-src/story-src/SPOILERS/` og `hollow-bell-src/tools/check.mjs`
(spoilerfri sjekk: `npm run check` i `hollow-bell-src`). Flyttes hvis brukeren vil.
