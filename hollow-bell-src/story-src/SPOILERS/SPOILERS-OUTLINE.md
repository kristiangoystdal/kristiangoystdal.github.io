# The Hollow Bell: oversikt (til Claude Code)

Filer: `hollow-bell.json` (historien, ferdig spilldata), `validate.mjs` (graf-sjekk + bot, `node validate.mjs hollow-bell.json 5000`).
Kopier JSON til `src/stories/` og registrer i `stories/index.ts`. Spilltekst er norsk, egennavn engelske.

## Struktur
1. **Prolog (natt 1):** Pip sover, bjellen klinger. Velg: gå alene til tårnet / vekk prefekt Mirela / vent til morgenen.
2. **Dag 2:** frokost (fortell professor Ashgrove? lov å tie?), valgfri samtale med Mirela, deretter **to av tre spor**:
   - Arkivet (Quill): finn notesiden (`score_page`)
   - Musikkrommet (Vale, spøkelse): få stemmegaffelen (`tuning_fork`), valgfri spillbar flashback som Vale
   - Ashgroves kontor: finn regnskapet (`ledger`) eller bli tatt
3. **Natt 2:** solnedgang (Pip), valgfri Mirela-sekvens (spillbar som Mirela), trapp i stillhet, klokkestuen, finale.

## Hva som betyr noe
| Tidlig valg | Konsekvens senere |
|---|---|
| Gå alene vs. vekke Mirela | Mirela kan hjelpe, redde deg i trappen og knuse bjellen |
| Love Ashgrove å tie | Han stoler på deg i finalen, men bare hvis du kommer alene |
| Hvilke to spor du velger | Hvilke deler av sangen du har (`score_page`, `tuning_fork`) |
| Ærlig mot Quill / Vale | Relasjoner som låser opp hjelp og lettere sjekker |
| Mirela-sekvensen | Hun kan sovne for godt, og da forsvinner flere valg |
| Stemmegaffelen brukt i trappen | Den sprekker og er borte i finalen |
| Å sitte hos Pip / ta med frosken hans | Små linjer i sluttene, og frosken kan redde deg i trappen |
| Harrow: ærlighet, unnskyldning, hans historie | Nøkkel som åpner rom uten sjekk, og han kan lyse deg gjennom trappen. Unnskyldning sletter advarselen |
| Quill: tilgi eller skyld på ham | Tilgir du ham, kommer han i finalen og overbeviser Ashgrove |
| Ashgroves søster Lenora | Kjenner du sorgen hans, får du en lett vei til å overtale ham |
| Be Vale love å støtte deg | Han bryter lenkene i finalen og stopper Ashgrove |
| Mirela: stavene klare vs. senk staven | Hun slår først (rask vei, men Ashgrove blir fiende), eller legger ned staven som fredstegn |
| Å dø én gang (Stillheten) | Du våkner på nytt med nullstilt verden, men husker pakten |

## 8 endinger
| Id | Type | Krever |
|---|---|---|
| `waking_together` | god (best) | Begge deler av sangen + overtal Ashgrove |
| `waking` | god | Sangen, men Ashgrove er slått eller du leser uten gaffel |
| `cantors_rest` | god (bittersøt) | Gaffelen uten noter, eller improvisert |
| `broken_bell` | nøytral | Mirela våken og med deg: knus bjellen |
| `last_toll` | dårlig | Hjelp Ashgrove å ringe |
| `silence` | dårlig | Feil i sjekker i trappen/slaget. Gir én ny sjanse (løkke) |
| `expelled` | dårlig | To advarsler (fanget natt 1 og i Ashgroves kontor) |
| `quiet_bargain` | hemmelig | Kjenn pakten og list >= 4: ta Vales plass |

## Nye felt i datamodellen (legg til i `types.ts`)
- `text` kan inneholde `{ "if": Condition, "text": "..." }` (betinget avsnitt, brukes i epiloger)
- `choice.ripple`: tekst som vises som «X vil huske dette»-varsel etter valget
- `scene.pov`: `{ name }` når spilleren styrer en annen karakter (Mirela, Vale)
- `choice.resetState`: `{ keep: ['stats'] }` nullstiller flagg, gjenstander og relasjoner (brukes av løkken)
- `effects`/`requires` støtter nå også `bond`
- `scene.director` og `scene.storylet` (se over), mål `$return` gyldig bare i hendelser
- `choice.lockedHint`: vises når `requires` ikke er oppfylt (valget vises grået ut)
- `choice.check.successTo/failTo` er målene. `choice.to` er alltid lik `successTo`.
- Ingen tidsbegrensning på valg (bevisst valgt bort).

Relasjoner: `mirela`, `quill`, `cantor`, `ashgrove`, `harrow`. Gjenstander: `score_page`, `tuning_fork`, `ledger`, `harrow_key`, `pip_frog`.
Alle nye grener leder til de samme 8 endingene (validert med bot: 0 blindveier, alle scener nåbare).

## Navn, bånd og dynamiske scener (nytt)
- **Eget navn:** `characterCreation` i JSON (navnefelt, hus, 6 poeng). `{name}` og `{house}` brukes i all tekst.
- **Bånd mellom andre karakterer:** `initialState.bonds` (f.eks. `mirela|quill`). Effekt `{ "bond": "mirela|quill", "add": -2 }`, betingelse `{ "bond": "mirela|quill", "gte": 1 }`. Dine valg kan skape og ødelegge bånd, og det styrer hvilke scener og veier som åpner seg.
- **Direktør og hendelser:** en scene med `director: { pool, pick, then }` velger de `pick` mest relevante hendelsene (`storylet: { pool, when, priority, once }`) ut fra tilstanden. Hendelsen ender med `to: "$return"`. Spilleren ser derfor bare en del av historien (ca. 38 % av scenene per gjennomspilling).
- **Hendelser nå:** Mirela mot Ashgrove, Quill mot Mirela, Harrow mot Quill, Vale mot Ashgrove, Quills brev, Mirela og nøkkelen, Harrows melding.

## Funksjoner motoren trenger
Flytskjema på sluttskjermen (Detroit-stil: tidligere valgte grener, ikke-valgte grener skjult som «?»), «hvem overlevde»-linjer via betingede avsnitt (Until Dawn), og løkke etter første død (Bandersnatch-aktig).


---
# OPPDATERING (engelsk versjon)
- Historien er skrevet om på **engelsk**: `hollow-bell.json` (96 scener, ~6100 ord, 8 slutter). Norsk original: `hollow-bell.no.json`.
- Ny mekanikk: `counter` (tellere, f.eks. `song` 0-3) i effects/conditions/initialState. Sangbitene kan skaffes på flere måter.
- Nytt per scene: `audio:{ambience,sfx[]}` og `speaker` (stemme for sitert tale).
- Bygges fra `en/part1-3.mjs` med `node en/build.mjs`. Valider: `node validate.mjs hollow-bell.json 20000`.
- Lyd: `node audio/render-sfx.mjs`. Stemmer: se `voices/gen-voices.py`.
- Visuelt: 2D side-scroller, se PLAN.md 6.3.
