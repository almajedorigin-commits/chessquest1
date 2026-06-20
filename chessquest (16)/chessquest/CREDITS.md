# Credits & licenses

## Code & engine
- Chess rules: **chess.js** (BSD-2-Clause)
- Engine: **Stockfish.js** / Stockfish 18 (**GPLv3**) — see
  `public/engine/STOCKFISH_LICENSE.txt`. Bundling this engine means the
  distributed project must comply with GPLv3.
- Audio playback: **Howler.js** (MIT)
- Build tooling: **Vite** (MIT)

## Art & audio created for this project (original work)
- All chess piece designs (`src/ui/pieces/pieceSets.js`) — original SVG.
- All animated backgrounds (`src/themes/backgroundManager.js`) — original code.
- All sound effects (`public/sounds/`) — original synthesized tones.
- All ambient music loops (`public/music/`) — original algorithmic compositions
  generated for this project.

## If you swap in third-party music
The included music is original. If you replace it with downloaded tracks, list
them here with their license and required attribution. For example:

```
- nature/ambient: "<track name>" by <artist>, CC-BY 4.0, from <url>
```

Important: the **Undertale** soundtrack (Toby Fox) is copyrighted and is NOT
included and should not be added to a distributed build. The bundled loops aim
for a similar calm mood using only original material.

## User-supplied music (this build)
These tracks were provided by the project owner (extracted from uploaded
videos) and placed by the owner. The owner is responsible for confirming they
hold the rights to distribute them:
- menu / selection screens: "Waltz of the Ancient Pine" (public/music/menu/)
- nature level: "Where the Path Begins" (public/music/nature/)
- archery level: "Through the Ancient Arch" (public/music/archery/)

## User-supplied art (this build)
Provided by the project owner (AI-generated via Gemini); owner is responsible
for confirming distribution rights:
- Retro pixel piece set (public/pieces/retro/) — sliced from the owner's
  "Spirit Sheet: Chess Pieces" asset pack image.
- Character scene art (public/scenes/character-default.png) — used as the
  Scene-view backdrop, color-graded per theme via CSS.
