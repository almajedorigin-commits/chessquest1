# ChessQuest

Play chess against opponents from **300 to 3000 Elo** across **7 themed worlds**,
with a built-in coach that explains every move — why the engine played what it
played, where you went wrong, and what your recurring weaknesses are. Runs
entirely in the browser. No backend, no accounts, no per-move cost.

## What's inside

- **Start menu** with three paths: Play vs Computer, Play Online, and Account.
- **Online play** — random matchmaking and private room codes. Works locally
  with zero setup (two browser windows on one machine), and connects to a free
  Supabase project for real cross-internet play (see `supabase/SUPABASE_SETUP.md`).
- **Guest + named accounts** — play instantly as an auto-named guest, or claim a
  display name that keeps your rating.
- **One engine, full Elo range.** A single Stockfish 18 (lite, single-threaded)
  WebAssembly build runs client-side and is dialed from 300 to 3000 Elo via
  `UCI_LimitStrength` + `UCI_Elo` — so there's no training pipeline or GPU
  needed, and it deploys as static files.
- **49 characters.** 7 themes × 7 Elo-tier opponents. Beat one to unlock the
  next, tougher one. Each character flavors its move choice (aggressive vs
  patient) among near-equal engine candidates, so they feel distinct without
  separate models.
- **Two coaching modes.**
  - *Live Coach* — after each move, a plain-language explanation appears in the
    notebook, with the engine's math translated to human terms ("this gave back
    about 1.5 pawns"; "the engine looked 11 moves ahead"). A running weakness
    profile builds as you play.
  - *Silent* — nothing interrupts the game; every move's reasoning (yours and
    the opponent's) is recorded quietly and revealed whenever you want it.
- **Persistent notes.** Match notes are saved in the browser (IndexedDB) and
  survive between sessions.
- **7 themes** with their own board colors, accent, and sound pack, plus a
  shared "game-table" visual identity (walnut, brass, parchment).

## Run it locally (one click)

You need [Node.js](https://nodejs.org) (LTS) installed.

- **Windows:** double-click `start.bat`
- **macOS / Linux:** double-click `start.command` (or run `./start.command`)

The first launch installs dependencies, then the game opens at
`http://localhost:5173`.

Prefer the terminal? `npm install` then `npm run dev`.

## Deploy to Netlify

This is a static site and fits Netlify's free tier comfortably (the engine is
~7 MB). The included `netlify.toml` sets the build command (`npm run build`),
publish directory (`dist`), and the right headers for the WASM file.

1. Push this folder to a Git repo.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Netlify reads `netlify.toml` automatically. Deploy.

The lite single-threaded engine was chosen specifically because it does **not**
require cross-origin isolation (COOP/COEP) headers, so it works on Netlify with
no special configuration.

## Architecture

```
src/
  data/characters.js        7 themes x 7 characters (Elo + personality)
  engine/
    stockfishEngine.js      UCI wrapper around the WASM engine + MultiPV picker
    aiOpponent.js           character (Elo + personality) -> playable opponent
    coachEngine.js          separate FULL-STRENGTH engine for objective analysis
    gameController.js        orchestrates a match (rules, AI, coach, audio, notes)
  coach/
    CoachProvider.js        the interface (explainMove / explainOpponentMove)
    RuleBasedCoach.js       default: free, offline, templated explanations
    LLMCoach.js             optional swap-in for richer LLM prose (see below)
  storage/notesStore.js     IndexedDB-backed match notes
  audio/audioManager.js     Howler-based per-theme sound packs
  themes/themeManager.js    applies a theme's CSS variables
  ui/                        board, notebook, screens, piece SVGs
netlify/functions/coach.js  optional serverless endpoint for LLMCoach
```

## Upgrading the coach to an LLM (optional)

The coach is hidden behind a `CoachProvider` interface. The default
`RuleBasedCoach` is free and instant. To get richer, more conversational
commentary later:

1. Implement the LLM call in `netlify/functions/coach.js` (the API key stays
   server-side via Netlify env vars).
2. Construct the game with the LLM coach: in `gameScreen.js`, pass
   `coach: new LLMCoach()` to `GameController`.

Nothing else changes — the UI, storage, and engine layers are untouched. The
local Stockfish engine still supplies the eval numbers; the LLM only turns them
into nicer prose, which is why this is opt-in (it adds per-move API cost).

## Assets

The game runs with working placeholder sounds and glyph fallbacks for
portraits. See [ASSETS.md](./ASSETS.md) to add real character art and themed
audio.

## Credits & licenses

- Chess rules: [chess.js](https://github.com/jhlywa/chess.js)
- Engine: [Stockfish.js](https://github.com/nmrugg/stockfish.js) (Stockfish 18),
  **GPLv3** — see `public/engine/STOCKFISH_LICENSE.txt`. Because this project
  bundles a GPLv3 engine, distributing the project means complying with GPLv3.
- Audio: [Howler.js](https://howlerjs.com)
- Piece glyphs and all UI: original to this project.
