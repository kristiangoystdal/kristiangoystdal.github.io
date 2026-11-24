# Progress: The Hollow Bell

Read this at the start of every session and update it at the end. Milestones, numbers and technical details only.
Never retell the story (scenes, endings, characters, lines): the user wants to experience it as a surprise.

Last updated: 2026-11-24. Branch: `hollow-bell`, pushed, pull request open (merge to main publishes).

## Now

First playable version is committed on the branch. English only: the Norwegian story and UI were dropped.
Default player name: Kringer. Every line is voiced (narrator and characters); see CLAUDE.md for the voice pipeline.

## Milestones from PLAN.md

| # | Milestone | Status |
|---|---|---|
| 1 | Setup: Vite + TS, Vitest, `npm run play`, deploy as sub-page, CLAUDE.md | Done: `pages.yml` builds into `hollow-bell/`, `start-game.sh`, CLAUDE.md, README, card on the front page |
| 2 | Engine: types, state, conditions, effects, tests | Done (counters, bonds, director/storylets, loop, conditional text) |
| 3 | Minimal UI: text and choices | Done |
| 4 | Character, saving, menu | Done (3 slots + autosave, export/import, settings) |
| 5 | Checks and relations in the UI | Done (dice card, locked choices with hints, status panel) |
| 6 | Design pass | First version (watercolour/paper, two typefaces, paper/ink theme, reduced motion) |
| 7 | SceneStage level A | 13 locations painted in code, parallax, camera, lights, particles, speech bubbles, `?gallery`. Characters are rigs (body, head, upper arm, forearm) with tweened joints: poses (idle, scared, cast, surprised) chosen from text cues, arm swing when walking, gestures when talking, robe sway. Walk only between neighbouring areas (`src/visuals/areas.ts`), otherwise cut |
| 8 | Video player | Not started (optional in the plan) |
| 9 | Validator + bot in CI | Done: validate, unit tests, browser tests and remote test run in CI when `hollow-bell-src` changes |
| 10 | Story 1 finished | Story data in place (from the zip). Polish remains |
| 10b | 3D prototype | Dropped (PLAN 6.3) |
| 11 | Video pipeline | Not started |
| 6.4 | Sound and voices | Sound done (46 sounds, from the zip). Voices: narrator + 9 character voices made with Piper (AAC .m4a), 407 segments, about 35 min. Tones from narration cues; loudness per tone (whisper -27, quiet -23, normal -18, shout -13 LUFS, peaks under -1.5 dB). Settings: narrator / characters / turn page when voice ends |
| 6.6 | Phone as remote | Done against the emulator. Uses the Jetlag Hide and Seek project, folder `hollowbell/`. Rules must be published in the Firebase console |
| 12 | Stories 2 and 3 | Not started |
| 13 | End screen, endings found | Done (grid, path with "?", credits) |
| 14 | Launch | Not started |

## Numbers (spoiler-free, from `npm run validate`)

- 98 scenes, 8 endings, 0 errors, 0 warnings, 0 dead ends in 3000 bot games.
- One ending is rare in random play (about 0.1 %) but reachable.
- Difficulty (user's choice, 2026-11-24): the best ending is reached in about 5.8 % of random games (was 14.9 %),
  and is still reachable without any dice roll. Tuned by raising one relation requirement in the final scene.
- Decision points: 54, choices: 168, with a consequence hint: 26, dice checks: 36.
- No new villain (user's choice). Light Harry Potter references are allowed if the user asks; none added.
- Unit tests: 19/19. Database rules: 23/23 (emulator).
- Browser tests (`npm run e2e`): 3 random playthroughs to an ending, save/load, autosave continue: all pass.
- Remote against the emulator (`npm run e2e:remote`): 4/4.

## Next

1. Publish the `hollowbell/` database rules (the user, in the Firebase console, or with Firebase MCP after approval).
2. Push the branch and open a PR when the user asks. CI then runs all tests.
3. The user plays through and gives feedback on look and flow.
4. Listen through the voices; tune tones/voices in `tools/voices/voices.json` if needed.
5. Polish: character poses (scared, casting, asleep), more animation, walk only between neighbouring areas (area map).
6. Optional later: emotional voices with a paid service (needs approval), video clips (milestones 8/11), stories 2 and 3.

## Tools

| Tool | Status |
|---|---|
| `gh` | Logged in, has `repo` and `workflow` |
| frontend-design | Already installed (`~/.claude/skills/frontend-design`) |
| Playwright MCP | Installed (local scope, `@playwright/mcp@0.0.86 --headless --isolated`). Tested: opens a page, takes a screenshot. Files go to `.playwright-mcp/` (git-ignored) |
| Firebase MCP | Installed (local scope, `firebase-tools@15.34.2 mcp --only core,database`, `--dir hide-and-seek-src`). Tested: logged in, sees `jetlag-hide-and-seek-norway`. No active project alias. Ask before `firebase_deploy` or writing to the database |
| team-narrative, game-design/game-art, sprite-forge | Dropped (user's choice) |
| svg-illustration | Not installed (no official source found) |

## File locations

The story is in `src/stories/hollow-bell.json`, its source in `story-src/SPOILERS/`, and the spoiler-free check is
`tools/check.mjs` (`npm run check`).

## Site homepage (outside the game)

`../homepage/pages.json` decides which pages the github.io homepage lists (`show`), with tile colour and icon.
`node homepage/build.mjs` writes the tiles into `../index.html`; CI checks they match. Hidden pages still work by link
but are not named anywhere on the published site. Shown now: Kortbok, Hide and Seek Oslo, The Hollow Bell,
Rangeringshatten. Hidden: Pokédex Tracker, Countdown, Pokémon Bulk-pakker. `jeopardy/` is untracked and left alone.

