# Prosjektplan: «Choose Your Own Hogwarts Adventure»

Tekstbasert «choose your own adventure»-spill i Harry Potter-universet. Kjører i nettleseren, uten backend, og kan hostes statisk (GitHub Pages / github.io).

Skriv all spilltekst og UI på **norsk (bokmål)**, men bruk **engelske egennavn** for steder, hus og gjenstander (Hogwarts, Gryffindor, Slytherin, Ravenclaw, Hufflepuff osv.).

## 1. Mål og avgrensning

- Spilleren velger en av flere **historier** (kampanjer), og tar deretter valg som forgrener fortellingen mot ulike slutter.
- Spilleren er en **egen original karakter** (navn og hus velges i starten). Kjente figurer kan opptre som bifigurer.
- Enkelt å legge til nye historier uten å røre motorkoden: **innhold er data, motor er kode.**
- Lagring av fremgang, mobilvennlig, tilgjengelig (tastatur, skjermleser).

### Ute av scope (v1)
Backend, brukerkontoer, flerspiller, lyd med lisensiert musikk, og film-/bokmateriale av enhver art.

### Opphavsrett
- All tekst skrives **originalt**. Ingen avsnitt, replikker eller kapitler kopieres fra bøkene eller filmene.
- Ingen offisielle logoer, filmbilder eller lisensiert musikk. Bruk egen CSS/SVG-grafikk og typografi.
- Legg inn en liten «Fanprosjekt, ikke tilknyttet J.K. Rowling, Warner Bros. eller Wizarding World» i bunnteksten.
- «Hogwarts» og andre HP-navn er varemerker. Det er greit i et privat/lokalt fanprosjekt, men et offentlig repo og en offentlig side er mer utsatt for fjerningskrav. Hold derfor figurer, design og tekst originale, og velg gjerne et eget spilltittel-navn (f.eks. «Wizard Academy Adventures») hvis du publiserer offentlig.

## 2. Teknologivalg

| Valg | Begrunnelse |
|---|---|
| Vite + TypeScript, vanilla (ingen UI-rammeverk) | Lite, raskt, enkelt å deploye statisk. Spillet er i hovedsak tekst og knapper. |
| Historier som JSON/TS-filer i `src/stories/` | Enkelt å skrive og validere. |
| `localStorage` for lagring | Ingen backend nødvendig. |
| Vitest | Test av motor og validator. |
| GSAP (eller Motion One) | Tidslinjer for scene-animasjoner og overganger. |
| PixiJS eller ren Canvas 2D | Partikler (stearinlys, glitter, tåke, regn) og parallakslag. |
| Remotion (valgfritt, kun i byggesteg) | Lager korte videoklipp med kode, fra de samme SVG-/animasjonsassetene. |
| `<video>` med MP4 (H.264) + WebM (VP9) | Avspilling av ferdige klipp. |
| GitHub Actions → GitHub Pages | Samme oppsett som resten av github.io. |

Alternativ hvis du vil ha enklest mulig: én `index.html` + `engine.js` + `stories/*.json` uten byggesteg. Planen under fungerer for begge.

## 2.1 Kjøring lokalt på PC (hovedmål)

Spillet skal spilles lokalt i nettleseren på PC, uten hosting. GitHub Pages er nå valgfritt.

- **Ikke åpne `index.html` direkte med `file://`.** Nettlesere blokkerer ES-moduler, `fetch` av JSON og lasting av GLB-modeller fra `file://`. Bruk i stedet en av disse:
  1. **`npm run play`**: bygger og starter `vite preview` på `http://localhost:4173`, og åpner nettleseren automatisk. Anbefalt.
  2. **`start-game.bat`** (Windows) / `start-game.sh`: dobbeltklikk-fil som kjører samme kommando, så du slipper terminalen.
  3. **Frittstående utgave** for å åpne `index.html` ved dobbeltklikk: bygg med `vite-plugin-singlefile` (JS, CSS og historiene inlines), og la video/3D laste via `<video src>` og `GLTFLoader` med relative stier. Merk at 3D-modeller (`fetch`) fortsatt krever lokal server, så dette fungerer best for 2D + video.
- Sett `base: './'` i `vite.config.ts` slik at bygget fungerer fra en hvilken som helst mappe.
- `localStorage` fungerer på `localhost`, men er knyttet til porten. Bruk **fast port** (`--port 4173 --strictPort`) så lagrede spill ikke forsvinner. Eksporter/importer-funksjonen i seksjon 7 er sikkerhetsnett.
- Skjermen er PC: prioriter 16:9, mus og tastatur, fullskjerm-knapp (F-tasten), og la lagring og innstillinger huskes mellom økter.
- Uten mobilbegrensning kan mediabudsjettet økes: video opptil 1080p / 30 fps og 3D-modeller opptil ca. 20 MB er greit. Repo-størrelse spiller mindre rolle, men legg `public/media` i `.gitignore` eller Git LFS hvis klippene blir store.
- Mobil og GitHub Pages er ikke et krav i v1. Behold responsiv layout som en enkel bonus, men ikke bruk tid på ytelsestesting for mobil.

## 2.2 Publisering som underside på github.io (valgt)

Spillet publiseres som eget repo og havner på `https://kristiangitar.github.io/<repo-navn>/`. Foreslått repo-navn: `hogwarts-adventure` (kan endres, men bruk små bokstaver og bindestrek).

- **Base-sti:** `vite.config.ts` leser `process.env.BASE_PATH ?? './'`. Lokalt (`npm run play`) brukes `./`. I GitHub Actions settes `BASE_PATH=/hogwarts-adventure/`.
- **Deploy:** `.github/workflows/deploy.yml` som på push til `main` kjører `npm ci`, `npm run validate`, `npm test`, `npm run build`, og deployer `dist/` med `actions/upload-pages-artifact` og `actions/deploy-pages`. Aktiver i repoet: Settings → Pages → Source: **GitHub Actions**.
- **Delt origin:** alle undersider på `kristiangitar.github.io` deler `localStorage`. Bruk derfor alltid prefikset `hp-cyoa:` på nøkler (se seksjon 7), og aldri generiske nøkler som `save` eller `settings`, slik at spillet ikke kolliderer med kortbok-prosjektet eller andre sider.
- **Relative stier overalt:** last video, GLB og JSON via `import.meta.env.BASE_URL` (aldri hardkodet `/media/...`), ellers feiler de på underside.
- **Størrelse:** hold det publiserte `dist/` under ca. 500 MB (Pages-grense 1 GB, anbefalt maks 1 GB per side). Store klipp: komprimer med `optimize-media.ts`, eller hold dem utenfor repoet og hent fra annen hosting.
- **Ikke kopier opphavsrettsbeskyttet materiale** inn i et offentlig repo (modeller, lyd, bilder). Et offentlig repo og en offentlig side gjør brudd langt mer synlige enn lokal bruk.
- **Lenke fra kortbok-siden** (valgfritt): legg en vanlig `<a href="/hogwarts-adventure/">` i hovedsiden.
- Test før publisering med `BASE_PATH=/hogwarts-adventure/ npm run build && npm run preview`, og åpne `http://localhost:4173/hogwarts-adventure/`.

## 3. Mappestruktur

```
/
├─ index.html
├─ src/
│  ├─ main.ts              # oppstart, ruter mellom skjermer
│  ├─ engine/
│  │  ├─ types.ts          # Story, Scene, Choice, Effect, Condition
│  │  ├─ state.ts          # GameState + reducer
│  │  ├─ conditions.ts     # evaluerer requires-uttrykk
│  │  ├─ effects.ts        # anvender effects
│  │  ├─ save.ts           # localStorage, flere lagringsplasser
│  │  └─ rng.ts            # seedet tilfeldighet (terningkast)
│  ├─ ui/
│  │  ├─ titleScreen.ts
│  │  ├─ storySelect.ts
│  │  ├─ characterCreate.ts
│  │  ├─ sceneView.ts      # tekst, valg, statuslinje
│  │  ├─ inventory.ts
│  │  ├─ endScreen.ts
│  │  └─ settings.ts
│  ├─ visuals/
│  │  ├─ stage.ts          # SceneStage: monterer bakgrunn, lag, partikler, video
│  │  ├─ layers.ts         # parallakslag (SVG) med dybde
│  │  ├─ particles.ts      # partikkeleffekter (candles, fog, sparks, snow, rain)
│  │  ├─ presets.ts        # navngitte animasjonspresets (se seksjon 6.1)
│  │  ├─ video.ts          # lazy-loading, preload av neste scene, fallback
│  │  └─ transitions.ts    # overganger mellom scener
│  ├─ assets/
│  │  └─ art/              # egne SVG-er: siluetter, slott, rom, symboler
│  ├─ stories/
│  │  ├─ index.ts          # registrerer alle historier
│  │  ├─ first-year.ts
│  │  ├─ forbidden-corridor.ts
│  │  └─ tournament-night.ts
│  └─ styles/
│     ├─ tokens.css
│     └─ main.css
├─ public/
│  └─ media/               # video/<story>/<scene>.mp4 + .webm + poster .jpg
├─ video/                  # Remotion-prosjekt (valgfritt), rendrer til public/media
├─ tools/
│  ├─ validate-stories.ts  # sjekker historiegrafen og at media-filer finnes
│  └─ optimize-media.ts    # ffmpeg: komprimer, lag WebM og poster
├─ tests/
└─ CLAUDE.md               # kort prosjektguide for Claude Code
```

## 4. Datamodell

```ts
type Story = {
  id: string;
  title: string;
  tagline: string;
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
  startScene: string;
  initialState?: Partial<GameState>;   // startverdier for denne historien
  scenes: Record<string, Scene>;
};

type Scene = {
  id: string;
  title?: string;
  mood?: 'cozy' | 'tense' | 'dark' | 'magic' | 'funny';  // styrer palett/ambient effekt
  visual?: SceneVisual;                 // animasjon og/eller video, se seksjon 6.1
  text: string[];                       // avsnitt; støtter {name} og {house}
  onEnter?: Effect[];                   // kjøres når scenen vises
  choices?: Choice[];                   // mangler = slutt hvis ending er satt
  ending?: { id: string; title: string; kind: 'good' | 'neutral' | 'bad' | 'secret' };
};

type Choice = {
  label: string;
  to: string;                           // id til neste scene
  requires?: Condition;                 // vises ellers skjult eller grået ut
  lockedHint?: string;                  // vises når requires ikke er oppfylt
  effects?: Effect[];
  check?: {                             // valgfritt terningkast / ferdighetssjekk
    stat: 'courage' | 'wit' | 'kindness' | 'cunning';
    difficulty: number;                 // 1–10
    successTo: string;
    failTo: string;
  };
};

type Effect =
  | { stat: StatName; add: number }
  | { flag: string; set: boolean }
  | { item: string; give: boolean }
  | { relation: string; add: number };  // forhold til en bifigur

type Condition =
  | { flag: string; is?: boolean }
  | { item: string }
  | { stat: StatName; gte?: number; lte?: number }
  | { relation: string; gte?: number }
  | { all: Condition[] } | { any: Condition[] } | { not: Condition };

type GameState = {
  storyId: string;
  sceneId: string;
  player: { name: string; house: 'Gryffindor' | 'Slytherin' | 'Ravenclaw' | 'Hufflepuff' };
  stats: { courage: number; wit: number; kindness: number; cunning: number };
  flags: Record<string, boolean>;
  items: string[];
  relations: Record<string, number>;
  history: string[];                    // besøkte scener, for «Gå tilbake» og slutt-oppsummering
  seed: number;
};
```

Tips: bruk engelske hus- og stedsnavn konsekvent gjennom hele spillet, og samle dem i én `glossary.ts`. Egne figurer får egne navn (se «Karakterer»).

## 5. Spillmekanikk

1. **Karakteropprettelse**: navn, hus (valgt eller via en kort spørsmålsquiz), og fordeling av 6 poeng over fire egenskaper (mot, vett, godhet, list).
2. **Valg** kan være låst bak egenskap, gjenstand, flagg eller relasjon.
3. **Sjekker**: `d10 + egenskap >= vanskelighetsgrad`. Seedet RNG gjør at reload ikke gir nytt kast. Vis kastet tydelig i UI.
4. **Relasjoner** til 2–4 bifigurer per historie som påvirker hva som er tilgjengelig i siste akt.
5. **Slutter**: minst 5 per historie, minst 1 hemmelig slutt. Sluttskjermen viser valgene som ledet dit, og hvilke slutter som er funnet (x av N).
6. **Flere gjennomspillinger**: lås opp et hemmelig valg i en historie ved å ha funnet en slutt i en annen (meta-fremgang lagres separat).

## 6. UI og design

- Én kolonne, lesebredde ca. 65 tegn, stor og rolig typografi. Fokus på lesing.
- Skjermer: tittel → velg historie → opprett karakter → spill → sluttskjerm. Meny med lagre/last, innstillinger og logg.
- Statuslinje (egenskaper, gjenstander, relasjoner) som kan skjules på mobil.
- Tekst vises som avsnitt som fader inn ett og ett, med «hopp over»-knapp. Respekter `prefers-reduced-motion`.
- Valg som store knapper, tastatursnarveier 1–9, synlig fokusmarkering.
- `mood` per scene endrer bakgrunn og aksent subtilt (f.eks. varmt lys for `cozy`, kaldt og mørkt for `dark`). Bruk CSS-variabler.
- Lys og mørk modus. Tilgjengelige kontraster (WCAG AA).
- Velg en egen visuell retning (f.eks. gammelt pergament og blekk, eller stearinlys i mørke), og unngå å kopiere filmenes visuelle identitet. Velg to skrifttyper: en display-font til titler og en lesevennlig serif til brødtekst.
- Valgfri lyd: enkle egenlagde lydeffekter (page-turn, knitring). Av som standard, bryter i innstillinger.

## 6.1 Visuelt: animasjoner og video

Mål: hver scene har et levende bilde over teksten, og nøkkelscener har et kort videoklipp. Bygges i to nivåer slik at spillet alltid fungerer selv om en video mangler.

### Nivå A: animerte scener i kode (alle scener)
- `SceneStage` er en fast bildeflate (16:9 på desktop, 4:5 på mobil) over eller bak teksten.
- Hver scene setter sammen **lag**: bakgrunn (SVG), 2–4 parallakslag, figurer som siluetter, og partikler.
- Bevegelse: sakte kamerabevegelse (Ken Burns), parallakse ved musebevegelse eller enhetens gyroskop, flimrende lys, drivende tåke, fallende snø, svevende stearinlys, magiske gnister.
- Figurer tegnes som **egne stiliserte siluetter** (SVG), ikke gjenkjennelige film- eller bokkarakterer. Unngå briller-og-arr-ikonografi, offisielle logoer og kopierte kostymer.
- Overganger mellom scener: krysstoning, «blekkflekk», støvvirvel, dørsvingning. Velg overgang etter `mood`.
- Rask å lage mange scener på, fordi presets gjenbrukes.

### Nivå B: videoklipp (nøkkelscener)
- Korte klipp (3–8 sek, loop eller én gang) for åpning av hver historie, store vendepunkter og alle slutter.
- Kilder, i prioritert rekkefølge:
  1. **Remotion:** animer de egne SVG-assetene, rendres til MP4/WebM. Full kontroll, ingen lisensproblemer.
  2. **Egne AI-generte klipp** (valgfritt, eksternt verktøy). Brukeren genererer selv og legger filene i `public/media`. Prompter skal beskrive generiske motiver (en gotisk sal, flytende lys, en tåkelagt innsjø), aldri navngitte figurer eller scener fra filmene.
  3. Ingen klipp fra filmene eller treff fra stockbibliotek med uklar lisens.
- Format: H.264 MP4 (+ VP9 WebM), maks 1280×720, 24 fps, 1–3 Mbit/s, uten lyd som standard. Hvert klipp får en `poster`-JPG.
- Total mediastørrelse i repoet: hold under ca. 300 MB (GitHub Pages-grense er 1 GB). Store filer hostes ellers eksternt (egen bucket) og refereres via URL.
- Bruk `preload="none"` og last neste scenes klipp i bakgrunnen mens spilleren leser. Vis `poster` til videoen er klar.
- Fallback: mangler video eller er forbindelsen treg, vises nivå A-animasjonen. Respekter `prefers-reduced-motion` (stillbilde) og «Spar data» (hopp over video).
- `autoplay` krever `muted` og `playsinline` for å fungere på mobil.

### Datamodell for visuelt

```ts
type SceneVisual = {
  preset?: PresetId;                    // f.eks. 'great-hall-night', 'forest-fog', 'dungeon-torch'
  layers?: LayerSpec[];                 // overstyr/legg til lag
  particles?: ('candles' | 'fog' | 'sparks' | 'snow' | 'rain' | 'dust' | 'fireflies')[];
  camera?: { move: 'push-in' | 'pan-left' | 'pan-right' | 'drift' | 'shake'; durationSec: number };
  lighting?: { tint: string; flicker?: number };   // 0–1
  video?: {
    src: string;                        // uten filendelse, f.eks. 'first-year/opening'
    poster: string;
    loop?: boolean;
    playOnce?: boolean;                 // sett «sett»-flagg og hopp over neste gang
    skippable?: boolean;                // default true
    captions?: string;                  // undertekst/beskrivelse for tilgjengelighet
  };
  transitionIn?: 'fade' | 'ink' | 'dust' | 'door' | 'flash';
};
```

### Tilgjengelighet og kontroll
- Innstillinger: «Animasjoner: full / redusert / av», «Video: på / av», «Spar data».
- Alle videoer har alternativtekst (`captions`) og en «Hopp over»-knapp.
- Ingen blinkende effekter over 3 Hz (lysfølsomhet). `flash`-overgangen er mykt og kort.
- Stillbilde-modus gir full tekstopplevelse uten bevegelse.

### Arbeidsflyt for å lage mange scener raskt
1. Definer 10–15 **presets** i `presets.ts` (sal, korridor, kjeller, skog, innsjø, klasserom, bibliotek, tårn, stadion, natt/dag-varianter).
2. Skriv scener med bare `preset` + `mood` + `particles`. Overstyr bare der det trengs.
3. Lag en **galleri-side** (`/#gallery`, kun i dev) som viser alle presets og overganger, så de kan vurderes uten å spille.
4. Lag video for nøkkelscener til slutt, når historien er låst.

## 6.2 (UTGÅR, se 6.3) Valgfritt nivå C: 3D-scener med nedlastede modeller

Kan erstatte eller supplere nivå A for utvalgte scener (f.eks. en 3D-flyover av et slott, flytende lys i en sal).

### Teknikk
- **Three.js** (eller react-three-fiber hvis du bytter til React) med **glTF/GLB**-modeller. Last med `GLTFLoader`, bruk `DRACOLoader`/`meshopt` for komprimering.
- Animasjon: innebygde skjelett-/klippanimasjoner via `AnimationMixer`, pluss kode for kamera (kurver, `lookAt`), lys (flimring), partikler og tåke.
- Last 3D bare i scener som trenger det (dynamisk `import()`), og vis nivå A som fallback hvis WebGL mangler eller enheten er svak.
- Budsjett: maks ca. 5 MB per modell, mål 60 fps på mellomklasse mobil. Bruk teksturer på maks 1024 px, instanset geometri for gjentatte objekter (stearinlys).
- Alternativ for video: render 3D-scenen offline til MP4 og bruk den som nivå B-klipp (billigere å spille av på svake enheter).

### Hvor modellene kommer fra
Bruk bare modeller med lisens som tillater gjenbruk, og **før en `CREDITS.md`** med kilde, forfatter og lisens for hver fil.

| Kilde | Lisens | Egnet til |
|---|---|---|
| Kenney.nl | CC0 | Lavpoly-sett: bygninger, møbler, natur |
| Quaternius | CC0 | Fantasy, karakterer, dyr, natur |
| Poly Pizza | CC0 / CC-BY | Enkeltmodeller |
| Sketchfab (filtrer på nedlastbare, CC0 / CC-BY) | Varierer per modell | Detaljerte modeller. Sjekk lisens og krediter. |
| Mixamo | Gratis med Adobe-konto, vilkår må leses | Menneskeanimasjoner til humanoide modeller |

### Viktige begrensninger
- **Ikke bruk fan-modeller av Harry Potter** (figurer, slott, gjenstander som ligner offisielle design; generiske trollmenn er tillatt, se «Karakterer» under), selv om de ligger gratis på Sketchfab eller andre sider. De er ofte lastet opp uten rettigheter, og kan ikke brukes lovlig i et publisert spill.
- Bruk **generiske** motiver: gotisk slott, sal med lange bord, trapper, stearinlys, ugle, skog, innsjø, bøker, staver som generiske staver. Gjenkjennelige elementer lages i stilen din, ikke som kopi.
- Hold én felles stil: samme palett, belysning og lavpoly-nivå, ellers ser scenene sammensatt ut. Bruk en felles materialoppsett og fargegrading.
- Verifiser filformat og lisens før hver modell legges inn. Last aldri ned og kjør kjørbare filer eller arkiver fra ukjente kilder. Åpne bare `.glb`/`.gltf`.

### Datamodell-tillegg

```ts
type SceneVisual = {
  // ...feltene fra seksjon 6.1
  scene3d?: {
    model: string;                      // sti til .glb under public/models
    animation?: string;                 // navn på klipp i filen
    camera: { path: [number, number, number][]; lookAt: [number, number, number]; durationSec: number };
    lights?: { type: 'point' | 'spot' | 'ambient'; color: string; intensity: number; flicker?: number }[];
    fog?: { color: string; density: number };
    fallbackPreset: PresetId;           // brukes uten WebGL / ved redusert bevegelse
  };
};
```

### Karakterer: inspirerte, ikke kopier
Bruk generiske trollmann-modeller (GLB) fra CC0/CC-BY-kilder, f.eks. Quaternius' fantasy-pakker, Kenney, Poly Pizza og lisensierte Sketchfab-modeller søkt på «wizard», «mage», «witch», «apprentice», «owl», «robe», «staff».

**Tillatt (generisk fantasy):** spiss hatt, kappe eller kåpe, stav eller tryllestav, skjegg, bøker, ugle, kjele, gløding, skjoldløse skolefigurer i uniform med skjerf.

**Unngå (gjenkjennelig for Harry Potter):**
- lyn-arr, runde briller kombinert med arr og stripete skjerf, og andre kjennetegn ved enkeltfigurer,
- eksakte huskostymer og slips med offisielle farger og mønstre sammen med våpenskjold,
- offisielle våpenskjold, logoer, gjenstander med distinkt design (f.eks. et bestemt navnet sverd, gullkule med vinger, bestemte stavdesign),
- modeller som er navngitt eller markedsført som en bestemt HP-figur, selv om de er «inspirerte».

**Fremgangsmåte:**
1. Lag **egne figurer** med egne navn og egen design: velg en generisk modell og endre farger, tilbehør og proporsjoner til de har en egen silhuett.
2. Gi hver figur en kort **karakterbeskrivelse** (`docs/characters.md`): navn, rolle, utseende, stemme, relasjon til spilleren.
3. Kjente HP-navn kan nevnes i teksten som verdensreferanser, men figurene på skjermen skal være dine egne.
4. Test: hvis en uvitende person ville sagt «det er [HP-figur]» ved første øyekast, endre designet.
5. For hver modell: legg kilde, forfatter og lisens i `CREDITS.md`. Sjekk at lisensen tillater endring og publisering (CC-BY krever kreditering, CC-BY-NC tillater ikke offentlig deling med mindre siden er helt ikke-kommersiell, og sjekk også vilkårene for Mixamo-animasjoner).

### Arbeidsflyt
1. Velg **ett stilsett** (f.eks. Kenney eller Quaternius) og hold deg til det.
2. Lag en `ModelViewer`-side i dev for å forhåndsvise modeller, animasjonsklipp og lys.
3. Bygg 2–3 3D-scener som prototype, mål ytelse på en reell mobil, og bestem deretter om resten av spillet skal bruke 3D eller bare nivå A/B.

## 6.3 OPPDATERING: 2D side-scroller med høy detaljgrad (erstatter nivå C som hovedspor)

Beslutning: spillet er **2D side-scroller (profil-/sidevisning, IKKE topdown)** med mye detaljer. 3D (6.2) droppes som hovedspor.

### Visuell oppskrift (lagdelt parallakse, alt i Canvas/WebGL via PixiJS eller ren Canvas 2D)
- Hver scene = 4-6 lag: bakgrunn (himmel/steinvegger), fjern-silhuetter, midtplan (søyler, rustninger, bokhyller), spillplan (karakterer + gulv), forgrunn (tåke, støv, rekkverk, sløret).
- Karakterer: **sprite-ark eller Spine/DragonBones-skjelett** (side-profil, 4-6 poser: idle, gå, snakke, redd, kaste trylleformel, sovende). Én rigg per karakter, gjenbrukt i alle scener. Original design, «inspirert», aldri kopi av filmkarakterer.
- Kamera: sakte pan/zoom mellom to posisjoner per scene, parallakse ved musebevegelse (0-10 px), «walk-cycle» når spilleren går til neste scene (kort sidescrollende overgang i stedet for hard cut).
- Lys og effekter: dynamisk lys (fakkel flimrer, måneskinn gjennom vindu), partikler (støv, ildfluer, tåke, gnister), skyggelag, fargegradering per `mood`.
- Detaljnivå: 1920x1080 kildegrafikk, pixel-art ELLER håndtegnet vektor (velg ÉN stil og hold den). Anbefalt: håndtegnet vektor/SVG-lag, fordi det skalerer og kan genereres/justeres i kode.
- Scenebygging: hver scene har `visual.layers[]` (bilde, parallakse-faktor, animasjon) i stedet for kun `preset`. `preset` beholdes som fallback/plassholder så spillet er spillbart før all grafikk er ferdig.
- Asset-kilder: egentegnet, AI-generert egen kunst, eller CC0-pakker (OpenGameArt, itch.io CC0). Ingen kunst fra filmene/bøkene.
- Milepæler: (1) plassholdere + parallakse-motor, (2) 3 komplette scener + 1 karakter-rigg, (3) alle scenelokasjoner (ca. 13 bakgrunner, se listen i story-filen), (4) resterende karakterer.

## 6.6 Mobil som fjernkontroll (Firebase Realtime Database)

Mål: PC viser spillet. Mobilen er en fjernkontroll for valgene (og evt. neste/skip), uten å installere noe.

### Flyt
1. PC-spillet har knappen «Koble til mobil». Det genererer en **romkode** (4-6 tegn, f.eks. `K7QM`) og viser den sammen med en **QR-kode** til `https://kristiangitar.github.io/hogwarts-adventure/remote/?room=K7QM`.
2. Mobilen åpner siden (egen enkel side, ikke hele spillet), logger inn anonymt og kobler seg til rommet.
3. PC skriver gjeldende valg til databasen hver gang en ny scene vises. Mobilen viser knappene, spilleren trykker, og valget skrives til databasen. PC leser valget og kjører det som om det var klikket.
4. Mobilen viser også sceneoverskrift, om valg er låst, og sluttskjerm. Fortellerteksten vises KUN på PC (mobilen er kun kontroll), med et valg for å vise teksten på mobil også.

### Teknikk
- **Firebase Realtime Database + Anonymous Auth** på gratisplanen (Spark). Firebase-klienten (modular SDK via npm) fungerer fint fra github.io. Ingen egen server.
- Firebase web-konfig (apiKey osv.) er ikke hemmelig, men **sikkerheten ligger i Security Rules**, ikke i å skjule nøkkelen. Legg konfig i `.env`/`firebase-config.ts` og sjekk den inn; begrens API-nøkkelen til domenet `kristiangitar.github.io` og `localhost` i Google Cloud Console.
- Datamodell:
```
rooms/{code}/
  hostUid: "<uid til PC>"
  createdAt: <timestamp>
  state: { sceneId, title, choices: [{id, label, locked, lockedHint}], ending: null|{id,title,kind}, rev: 17 }
  input: { choiceId, rev: 17, from: "<uid>", at: <timestamp> }
```
- `rev` øker for hver ny scene. Mobilens valg gjelder bare hvis `input.rev === state.rev`, slik at gamle/dobbelte trykk ignoreres. PC sletter/overskriver `input` etter at det er brukt.
- **Security Rules (skisse):** kun innlogget bruker kan lese `rooms/{code}`; bare `hostUid` kan skrive `state`; hvem som helst innlogget kan skrive `input` men bare i et rom som finnes og kun feltene choiceId/rev/from/at; rommet kan bare opprettes når `hostUid == auth.uid`. Rom eldre enn 12 timer ignoreres (og ryddes bort av PC ved start). Romkoder er tilfeldige og ikke gjettbare nok til å brukes uten QR (6 tegn, ikke sekvensielle).
- Ingen personopplysninger lagres. Kun scene-id, valg-id og tidsstempel. Rommet slettes når PC-en lukker spillet (`onDisconnect().remove()`).
- **Frakobling/gjenoppkobling:** mobilen viser «Kobler til på nytt…» og bruker Firebase sin innebygde gjenoppkobling. PC fortsetter å fungere med mus/tastatur hele tiden (mobil er et tillegg, ikke et krav).
- **Mobilsiden:** store knapper, mørk stil som matcher spillet, vibrasjon ved trykk (`navigator.vibrate`), holder skjermen våken (`Wake Lock API`). Bør fungere uten scrolling.
- Lagring av spillet skjer fortsatt på PC (localStorage), ikke i Firebase.

### Milepæl
Legg dette etter at selve spillet fungerer fra tastatur/mus (tidlig versjon klar). Start med en lokal test mot Firebase Emulator Suite (`firebase emulators:start`) før ekte prosjekt.

### Det du må gjøre selv
Opprette et Firebase-prosjekt (console.firebase.google.com), slå på Realtime Database og Anonymous sign-in, legge til web-app og kopiere konfigen inn i prosjektet. Claude Code kan lage alt annet.

## 6.5 VALGT STIL OG SCENE-UI (gjelder foran alt annet i 6.1-6.3)

**Stil C: akvarell/bildebok, 2D side-scroller (profilvisning).** Myke akvarellflater med synlig papirtekstur, varme jordfarger, mørkere blåfiolette toner for nattscener. Svake konturer (ikke tykke svarte streker). Én konsekvent stil for alle bakgrunner og karakterer. Mørke scener (enkelte sluttscener og nattscener) må fortsatt fungere: bruk dype blå/lilla toner og varme lyskilder (fakkel, lykt) i stedet for svart.

### Skjermoppsett (PC, 16:9)
- **Scenen** fyller hele skjermen: lagdelt bakgrunn, karakterer og effekter.
- **Snakkebobler over hodet** til den som snakker. Boblen følger karakteren (ankret til hodet), har hale mot munnen, og bytter plass automatisk så den ikke går utenfor skjermen eller dekker en annen boble. Flere replikker i samme scene vises etter hverandre, ikke samtidig. Taleren er `scene.speaker`/per-avsnitt `speaker` i JSON; spilleren får egen boble over sin figur. Tankeboble (skyform) for indre tanker.
- **Fortellertekst nederst** i en egen boks (halvgjennomsiktig papirfarge, serif-skrift). Her vises narrasjon og beskrivelser, aldri replikker. Teksten vises avsnitt for avsnitt (klikk/space for neste, eller auto-fremdrift som innstilling). Boksen kan skjules med en tast (H) for å se hele bildet.
- **Valgknapper** kommer i en rad/liste over eller inni fortellerboksen når teksten er ferdig. Låste valg vises gråtonet med hint. `ripple`-merknader («Something shifts.») vises som et lite flyktig merke øverst i hjørnet.
- Alt kan spilles med mus og tastatur (1-9 for valg, space for neste).

### Bevegelse (ikke statiske bilder)
- **Idle-animasjon** på alle karakterer (pust, blunk, kappe/hår beveger seg lett) og i miljøet (flimrende fakler, svaiende tåke, støvpartikler, lys som flyter, vind i gardiner).
- **Poser per karakter:** idle, gå, snakke (munn/kropp), redd, kaste trylleformel, sove, skrekk/overrasket. Skifter etter `mood` og replikk.
- **Karakterene flytter seg i scenen:** de kan gå inn/ut fra sidene, gå mot spilleren, stoppe ved en dør, snu seg. Hver scene kan ha `stage: { actors: [{id, enter, pos, pose, facing}], moves: [...] }` med enkle sekvenser (inn fra høyre, gå til x, stopp, snakk).
- **Kamera:** panorerer sakte på tvers av det brede bakgrunnsbildet (scenen er bredere enn skjermen), følger spillerfiguren, og zoomer inn på dramatiske øyeblikk.
- **Parallakse** (fjern-/midt-/forgrunn beveger seg i ulik hastighet) både når kameraet panorerer og når musen flyttes.

### Gå mellom områder
- Spillet har **områder** (ca. 10 steder, se story-filen) som hver er et bredt side-scrollende bilde med flere «punkter» (dør, trapp, bord).
- Når et valg tar spilleren til en scene i et annet område, gå spillerfiguren ut av bildet til siden, kamera/bakgrunn glir (eller en kort tåke-/akvarell-overgang), og figuren kommer inn i det nye området. Samme område = figuren går til et nytt punkt i bildet i stedet for en hard overgang.
- Scenens `location: { area, point }` i JSON styrer dette. Tilleggsfelt til `visual`: `layers[]` (bilde, parallakse-faktor, evt. animasjon), `width` (hvor bredt området er), `points{}`.
- Overganger kan hoppes over/skrus ned i innstillinger (tilgjengelighet, `prefers-reduced-motion`).

### Overgangsregler: gå ELLER klipp (velges per overgang)
Hver overgang mellom scener har en `transition`-type, satt i JSON (`scene.transition` = hvordan man kommer INN i scenen) med en automatisk standard:
- **`walk`** (figuren går ut av bildet og kommer inn i neste område, kamera følger): standard når områdene ligger inntil hverandre på kartet (korridor ↔ trapp ↔ bibliotek-kjeller) og tiden ikke hopper.
- **`cut`** (klipp, kort akvarell-/tåkeovergang, ca. 0,6-1 s): standard ved tidshopp (natt → morgen, kveld → natt), POV-bytte, fjerne steder, drømmer/flashbacks, alle slutter, loop-tilbakestilling og dramatiske brå øyeblikk (f.eks. når noen blir tatt).
- **`slide`** (valgfri): kamera glir sidelengs uten at figuren går, for korte flytt innenfor samme område.
- Overstyring: forfatteren kan skrive `transition: 'cut'` eller `'walk'` på en scene eller på et enkelt valg (`choice.transition`) og det vinner over standarden.
- Gå-overgang har maks ca. 2,5 s og kan hoppes over med klikk/space. Innstilling «Alltid klipp» for de som foretrekker rask flyt, og `prefers-reduced-motion` tvinger klipp.
- Validatoren sjekker at `walk` bare brukes mellom områder som er koblet i områdekartet (`areas.json`: hvilke områder grenser til hverandre og hvilken kant man går ut av).

### Teknikk
- PixiJS (WebGL/Canvas) for scene, parallakse og kamera. Karakterer som skjelettanimasjon (Spine/DragonBones-format eller egen enkel riggleser) eller sprite-ark. Snakkebobler og fortellerboks som HTML/CSS lagt over canvas (enklere tekst, tilgjengelighet, skalering).
- Boblene plasseres ved å projisere karakterens hode-posisjon fra scene-koordinater til skjerm-koordinater hver frame, og klampe/justere mot kantene.
- Plassholdere først: fargede rektangler som «karakterer» og enkle bakgrunnslag, så spill-/dialogflyten kan testes før akvarellgrafikken er klar.

## 6.4 Lyd og stemmer (nivå 1-2)

Alt ligger i `audio/` og `voices/` i leveransen.
- **Lydeffekter + ambient:** prosedyrisk syntetisert (`audio/sfx-synth.mjs`), 46 lyder, ingen nedlastede filer. `node audio/render-sfx.mjs` renderer WAV+OGG, verifiserer topp/RMS og at alle lyd-id-er i historien finnes. Hver scene har `audio:{ambience,sfx[]}`.
- **Motor:** `audio/audio-engine.js` (Web Audio): krysstoning av ambient mellom scener, sfx med forsinkelse, stemmer med fallback-kjede (ferdig fil, så Web Speech API).
- **Stemmer nivå 2:** Piper TTS (gratis, offline). `node voices/extract-lines.mjs` lager `voices/lines.json` (replikker i anførselstegn, stemme = `scene.speaker`). `python voices/gen-voices.py` laster modeller, genererer én OGG per replikk og skriver `voices/manifest.json`. Én stemme per karakter i `voices/voices.json` (egne effekter per karakter). Replikker med {name} leses ikke opp (kun tekst) – evt. lag varianter for 5-6 vanlige navn.
- Bruker kan slå av/justere master, ambient, sfx, stemme i innstillinger.
- Fortelleren (narrasjon) er ustemt som standard; kan legges til som egen stemme senere.

## 7. Lagring

- 3 manuelle lagringsplasser + 1 autolagring (etter hver scene).
- Nøkkelformat: `hp-cyoa:v1:slot:<n>`. Inkluder `version`-felt og migreringsfunksjon.
- Egen nøkkel for meta-fremgang (funne slutter, opplåste valg).
- Håndter manglende/avslått `localStorage` uten feil (try/catch, vis tydelig melding).
- «Eksporter/importer lagring» som tekst (kopier/lim inn JSON).

## 8. Innhold: tre startistorier

Hver historie: 40–60 scener, 5–7 slutter, ca. 25–40 min første gjennomspilling.

1. **Første natt på slottet** (vanskelighet 1, kosete/spennende)
   Første kveld, nytt hus, en gåte om en forsvunnet gjenstand. Introduserer mekanikkene. Bifigurer: en eldre elev, en spøkelsesfigur, en vaktmester.
2. **Den forbudte korridoren** (vanskelighet 2, mørkere)
   Du hører noe i veggene. Utforskning, valg mellom nysgjerrighet og regler, relasjoner med lærere påvirker slutten.
3. **Turneringsnatten** (vanskelighet 3, intens)
   Konkurranse mellom skoler, sabotasje, du må velge hvem du stoler på. Mest bruk av sjekker og relasjoner.

Skriv først en **skisse (graf) per historie** i `docs/story-outlines/`: akter, nøkkelvalg, slutter. Skriv deretter scenene. Hold avsnitt korte (2–4 setninger), og gi hvert valg en tydelig konsekvens.

## 9. Validering og testing

`tools/validate-stories.ts` kjøres i CI og feiler bygget hvis:
- en `to`/`successTo`/`failTo` peker på en scene som ikke finnes,
- en scene er utilgjengelig fra `startScene`,
- en scene uten valg ikke har `ending`,
- alle veier i en historie kan dø i blindvei (ingen vei til en slutt),
- et flagg/gjenstand brukes i `requires` men settes aldri noe sted,
- en slutt-id er duplisert.

Skriv ut en rapport: antall scener, slutter, lengste og korteste vei, og hvilke slutter som er vanskeligst å nå.

Enhetstester (Vitest):
- `conditions` (all/any/not, grenser for stats),
- `effects` (clamping av egenskaper 0–10),
- `save` (versjonsmigrering, korrupt data),
- RNG (samme seed → samme kast),
- en **bot** som spiller tilfeldige veier 1000 ganger per historie og sjekker at alle ender i en slutt uten feil.

## 10. Milepæler

1. **Oppsett**: Vite + TS, lint, Vitest, `npm run play` + `start-game`-fil (seksjon 2.1), GitHub Pages-deploy som underside (seksjon 2.2), `CLAUDE.md`.
2. **Motor**: types, state, conditions, effects, tester. Ingen UI ennå.
3. **Minimal UI**: sceneView med tekst og valg, én liten testhistorie på 8 scener.
4. **Karakter, lagring, meny**: opprettelse, 3 plasser + autolagring, innstillinger.
5. **Sjekker og relasjoner**: terningkast i UI, låste valg med hint, statuslinje.
6. **Design-pass**: typografi, moods, mobil, tilgjengelighet.
7. **SceneStage (nivå A)**: lag, parallakse, partikler, kamerabevegelse, overganger, 10–15 presets, dev-galleri.
8. **Videospiller**: `video.ts` med preload, poster, fallback, innstillinger og redusert bevegelse.
9. **Validator + bot** i CI, inkludert sjekk av at alle `visual.video.src` finnes på disk.
10. **Historie 1** ferdig (innhold, presets og polering).
10b. **3D-prototype (valgfritt)**: Three.js, `ModelViewer`, 2–3 scener, `CREDITS.md`, ytelsestest på mobil. Beslutningspunkt: fortsett med 3D eller hold deg til nivå A/B.
11. **Videopipeline**: Remotion-oppsett, `optimize-media.ts`, første klipp (åpning + slutter for historie 1).
12. **Historie 2 og 3** (innhold, presets, nøkkelklipp).
13. **Sluttskjerm, funne slutter, meta-opplåsninger**.
14. **Lansering**: README, skjermbilder, Lighthouse (a11y ≥ 95, ytelse ≥ 85 på mobil), deploy.

Hver milepæl skal ende i en fungerende, deploybar versjon og en commit.

## 11. Arbeidsmåte for Claude Code

- Start med å lese denne filen, og opprett `CLAUDE.md` med kommandoer (`npm run dev`, `test`, `validate`, `build`) og kodekonvensjoner.
- Jobb en milepæl om gangen. Kjør tester og validator før hver commit.
- Spør meg om designretning og tone før milepæl 6, og om historieskissene før milepæl 8.
- All spilltekst og UI på norsk, men med engelske egennavn (Hogwarts, Gryffindor osv.). Kode, kommentarer og commit-meldinger på engelsk.
- Ikke legg inn tekst fra bøkene eller filmene. Skriv originalt.

## 12. Åpne spørsmål (avklar før start)

- Vanilla TypeScript med Vite, eller helt uten byggesteg?
- Skal spilleren lage egen karakter, eller spille en fast figur?
- Hvilken visuell retning: pergament og blekk, stearinlys i mørke, eller noe annet?
- Skal det være lyd fra start, eller legges til senere?
- Windows eller Mac? (bestemmer om vi lager `start-game.bat` eller `.sh`)
- Repo-navn for undersiden (forslag: `hogwarts-adventure`)? Skal repoet være offentlig? (Kreves for gratis Pages på de fleste kontoer.)
- Videoklipp: lages de med Remotion i kode, eller vil du generere dem selv med et eksternt AI-videoverktøy og legge filene inn?
- Hvor mye video totalt (antall klipp og lengde)? Det styrer repo-størrelse og om filer må hostes eksternt.
- Stilretning på grafikken: flat siluett, malt/akvarell, eller mørk og filmatisk?
- 3D: bare noen få prototypescener, eller hele spillet? Hvilket stilsett (Kenney, Quaternius, annet)?

## 6.7 Intro, avslutning og spoilerfri testing
- Spillet starter på `ui.titleScene` (tittelkort), så navn/hus-valg, så en kort prolog. Loop-tilbakestilling hopper over intro (`skipIntroOnLoop`).
- Etter hver slutt vises sluttkort med sluttens tittel, deretter et rulletekst-/takkeskjermbilde fra `credits` i JSON, med «Endings found: X of 8» (lagres lokalt) og knappene Play again / Back to title.
- Spoilerfri QA: bruk `node check.mjs 10000` (skjuler scene-/sluttnavn). Bygg en `?debug`-modus i spillet som viser kun scene-nummer, teller og tilstand (ikke tekst), og en «hurtigtest»-knapp som kjører boten uten å vise tekst.
