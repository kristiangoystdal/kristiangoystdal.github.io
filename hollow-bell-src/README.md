# The Hollow Bell

A choose-your-own-adventure in the browser, painted in watercolour. Fan project, not affiliated with
J.K. Rowling, Warner Bros. or Wizarding World. All text, art and sound were made for this project.

Play: https://kristiangoystdal.github.io/hollow-bell/

## Play locally
`./start-game.sh` (or `npm install && npm run play`) builds the game and opens http://localhost:4173.
Don't open `index.html` straight from disk; the browser then blocks modules and sound.

Keys: 1–9 choose · Space next · H hide text · L log · I status · F fullscreen · Esc menu.

## Phone as remote
Menu → "Phone remote" shows a QR code and a room code. The phone shows the choices; the story stays on the PC.
Needs the Firebase keys (`.env.local`, see `.env.example`; GitHub Actions uses the Hide and Seek secrets)
and the `hollowbell/` rules in `../hide-and-seek-src/database.rules.json` published in the Firebase console.

## Voices
Narrator and characters are voiced with Piper (offline TTS). Credits and licences: `public/voices/CREDITS.md`.
Settings let you switch the narrator and character voices separately, and turn the page when a voice ends.

## Development
See `CLAUDE.md` for commands and layout, `PROGRESS.md` for status and `PLAN.md` for the plan.
