#!/bin/sh
# Double-click (or run) to play The Hollow Bell locally: builds the game and opens http://localhost:4173.
# The fixed port keeps saved games (localStorage is tied to the port).
cd "$(dirname "$0")" || exit 1
[ -d node_modules ] || npm install
npm run play
