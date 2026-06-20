// src/audio/musicRegistry.js
//
// Maps a music "context" to its track file under /public/music/<context>/.
// 'menu' is used for the start menu and all level-selection screens.
// Each theme id maps to its in-game track. Where a custom track isn't
// supplied, we fall back to the generated ambient loop for that theme.
//
// User-supplied tracks (extracted from uploaded videos) are credited in
// CREDITS.md as user-provided assets.

export const MUSIC_TRACKS = {
  // Entry menu + every selection screen.
  menu: { dir: 'menu', file: 'waltz-of-the-ancient-pine.mp3', title: 'Waltz of the Ancient Pine' },

  // In-game, per theme.
  nature: { dir: 'nature', file: 'where-the-path-begins.mp3', title: 'Where the Path Begins' },
  archery: { dir: 'archery', file: 'through-the-ancient-arch.mp3', title: 'Through the Ancient Arch' },
  medieval: { dir: 'medieval', file: 'sunlight-over-the-ancient-path.mp3', title: 'Sunlight Over the Ancient Path' },

  // Themes without a custom track use their generated ambient loop.
  soldiers: { dir: 'soldiers', file: 'ambient.wav', title: 'Ambient' },
  space: { dir: 'space', file: 'the-violet-meridian.mp3', title: 'The Violet Meridian' },
  mythical: { dir: 'mythical', file: 'ambient.wav', title: 'Ambient' },
  pirates: { dir: 'pirates', file: 'stars-behind-the-hull.mp3', title: 'Stars Behind the Hull' },
};

export function trackFor(context) {
  return MUSIC_TRACKS[context] || MUSIC_TRACKS.menu;
}

// All custom (non-ambient) tracks, for the in-game music switcher.
export function namedTracks() {
  return Object.entries(MUSIC_TRACKS)
    .filter(([, t]) => t.file.endsWith('.mp3'))
    .map(([context, t]) => ({ context, dir: t.dir, file: t.file, title: t.title }));
}
