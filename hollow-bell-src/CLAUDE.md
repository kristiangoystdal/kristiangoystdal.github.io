# The Hollow Bell (hollow-bell-src)

Choose-your-own-adventure in the browser. Vite + vanilla TypeScript, no UI framework. Built by GitHub Actions
into `../hollow-bell/` (not in git) and served at `/hollow-bell/` on github.io. Full plan: `PLAN.md`.

## Session routine and rules
- Read `PROGRESS.md` at the start of every session and update it at the end.
- **No spoilers.** Never retell, summarise or comment on story content (`src/stories/*.json`, `story-src/SPOILERS/`).
  Report only numbers and technical details. Use `npm run check` (masks scene and ending names) for QA output.
- Story changes only when the user asks; never change existing scenes without approval; run `npm run check` after each change.
- Ask before installing any skill, plugin or MCP server, and before `firebase deploy` or writing to the live database.
- English only: story, UI (`src/ui/i18n.ts`), phone page and docs. The Norwegian version was dropped on purpose.
  Code, comments and commit messages in English. Write everything original; nothing from the books or films.

## Two-player story (The Other Side of the Glass)
- Source: `story-src/SPOILERS/mirror/story.mjs` -> `node story-src/SPOILERS/mirror/build.mjs` -> `src/stories/mirror.json` (spoilers: same rules).
- Engine: `src/engine/duo.ts`. Players take turns: each scene has choices for at most one player (tests enforce it);
  `next` rules pick the way on from the combined state (flags, relations such as `bond` between the players and how each
  side character feels). Big screen: `src/ui/duo.ts`. Phones: `src/remote/phone.ts` (seat, look, house, qualities, own choices)
  via `src/remote/duoHost.ts`; database paths `hollowbell/<CODE>/players|setup|inputs` (rules in hide-and-seek-src).
- Default looks (players can change them in setup): Ingerid long blonde hair, Kristian short auburn hair, same height (`src/visuals/appearance.ts`).
- Balance targets: each player about 12 choices per game; best ending about 5-6 % of random games.

## Commands
- `npm run dev`: dev server. `?debug` shows a spoiler-free state panel and a bot quick test; `?gallery` shows every location and character.
- `npm run play` (or `./start-game.sh`): build and open http://localhost:4173 (fixed port keeps saves).
- `npm test`: unit tests + 1000 bot games through the real engine.
- `npm run validate`: graph check, bot and sound check for the story (prints only summary lines).
- `npm run check`: spoiler-free validator report (10000 runs).
- `npm run e2e`: the important browser checks only: one playthrough, save/load, voices, a whole two-player game on one screen
  (Playwright, `PW_CHROMIUM` can point at a local Chromium). Kept short on purpose so CI stays quick.
- `npm run e2e:remote`: phone remote against the Firebase emulator (needs Java).
- `npm run story:build`: rebuild `src/stories/hollow-bell.json` from `story-src/SPOILERS/en/*.mjs` (two-player story: see above).
- `npm run sfx`: re-render the procedural sounds into `public/audio/`.
- Voices (offline, Piper in `tools/voices/.venv`): `node tools/voices/extract-lines.mjs && tools/voices/.venv/bin/python tools/voices/gen-voices.py`.
  Every paragraph is split into narrator and character segments (`src/engine/segments.ts`, shared with the game); who speaks each
  quote is the scene's `speaker` unless `src/stories/hollow-bell.voices.json` says otherwise. Tones (whisper, shout, ...) come from
  cues in the narration. Output: `public/voices/out/*.m4a` + `manifest.json`; `npm run validate` fails if a segment has no recording.
  Voice models and licences: `tools/voices/voices.json`, `public/voices/CREDITS.md`. Default player name: Kringer (lines with the name are recorded with it).

## Layout
- `src/engine/`: pure game logic (types, conditions, effects, seeded rng, state machine with director/storylets and the loop, saves, meta, bot). No DOM.
- `src/ui/`: screens and overlays (`app.ts`), strings (`i18n.ts`), settings, dev gallery.
- `src/visuals/`: watercolour painting in Canvas 2D (`paint.ts`), locations (`presets.ts`), characters (`actors.ts`), particles, `stage.ts` (parallax, camera, lights, transitions).
- `src/audio/audio.ts`: Web Audio ambience/SFX, voice lines (recorded file, else Web Speech).
- `src/remote/`: phone remote. Uses the Jetlag Hide and Seek Firebase project, only `hollowbell/<CODE>` in the Realtime Database.
  Rules live in `../hide-and-seek-src/database.rules.json` (tests: `npm run test:rules` there) and are published by hand in the Firebase console.
- localStorage keys all start with `hp-cyoa:v1:` (the github.io origin is shared with other pages).
