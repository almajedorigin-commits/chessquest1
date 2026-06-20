# Assets guide

The game ships with **working placeholder assets** so it runs immediately:

- **Sounds**: clean, original synthesized tones live in `public/sounds/<theme>/`
  (`move.wav`, `capture.wav`, `check.wav`, `castle.wav`, `promote.wav`,
  `game-start.wav`, `game-end.wav`, `illegal.wav`). The same set is used for
  every theme right now.
- **Portraits**: there are none yet. The UI falls back to a chess-knight glyph
  (♞) wherever a portrait is missing, so nothing breaks.

## Adding real character portraits

Drop a square image (PNG, ~400×400 recommended) at:

```
public/portraits/<themeId>/<characterId>.png
```

Theme and character IDs come from `src/data/characters.js`. For example, the
Nature theme's first opponent is `sapling`, so its portrait goes at:

```
public/portraits/nature/sapling.png
```

The full list of expected files (7 themes × 7 characters = 49 portraits):

- `nature/`: sapling, sprout-warden, bramble-knight, elder-oak, ancient-treant, forest-titan, world-tree-avatar
- `archery/`: apprentice-archer, forest-scout, longbowman, marksman-captain, royal-huntsman, master-of-the-hunt, legendary-sharpshooter
- `soldiers/`: recruit, footsoldier, sergeant, captain, commander, general, field-marshal
- `medieval/`: squire, knight-in-training, knight, baron, duke, kings-champion, the-sovereign
- `space/`: cadet-drone, scout-bot, pilot-ai, strike-commander, fleet-admiral, star-marshal, the-singularity
- `mythical/`: imp, goblin-tactician, orc-warlord, sorcerer, dragon-knight, lich-king, ancient-dragon
- `pirates/`: cabin-boy, deckhand, first-mate, privateer, pirate-captain, ghost-captain, the-kraken

Any missing file simply falls back to the glyph — you can add them incrementally.

## Adding themed sound packs

Replace the files in `public/sounds/<themeId>/` with your own (keep the same
filenames). Use royalty-free / CC0 audio or originals to avoid licensing
issues. If you prefer `.mp3`, update the filename map in
`src/audio/audioManager.js` accordingly.

## Background music (per theme)

Each theme has a looping ambient track at `public/music/<themeId>/ambient.wav`.
The game ships with **original algorithmic ambient loops** (generated for this
project — calm pads + gentle arpeggios, a different musical key per theme).

To swap in curated music instead, replace `ambient.wav` in each theme folder
(or change `MUSIC_FILENAME` in `src/audio/audioManager.js` to use `.mp3`).
Recommended CC0 / CC-BY sources:

- OpenGameArt.org (filter by CC0): forest ambience, space loops, fantasy/medieval
- Incompetech (Kevin MacLeod, CC-BY — attribution required)
- Pixabay Music (royalty-free)

Note: the Undertale soundtrack is copyrighted by Toby Fox and cannot be bundled.
The included loops aim for a similarly calm, cozy feeling without using it.

## Piece designs and backgrounds

These are **already done** and original to the project — no action needed:

- **Piece sets**: 7 distinct hand-coded SVG families (one per theme) in
  `src/ui/pieces/pieceSets.js`. Each recolors per side automatically.
- **Animated backgrounds**: per-theme Canvas particle effects (starfield,
  drifting leaves, rising embers, sea bubbles, etc.) in
  `src/themes/backgroundManager.js`.
