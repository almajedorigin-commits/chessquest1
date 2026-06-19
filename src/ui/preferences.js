// src/ui/preferences.js
//
// Persistent game settings (localStorage), edited from the Settings page and
// read across the app. All have sensible defaults so a fresh player gets a
// good experience without opening Settings.

const KEY = 'chessquest_prefs_v2';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

const DEFAULTS = {
  classicPieces: false,
  pieceStyle: 'themed',       // 'themed' | 'classic' | 'retro'
  boardView: 'flat',          // 'flat' | 'scene'
  moveStyle: 'instant',       // 'instant' | 'confirm'
  cornerPosition: 'top-right',// 'top-right' | 'top-center' | 'custom'
  cornerX: null,              // custom px (left), used when cornerPosition === 'custom'
  cornerY: null,              // custom px (top)
  musicEnabled: true,         // master music on/off (persists)
  sfxEnabled: true,
};

function get(key) {
  const v = load()[key];
  return v === undefined ? DEFAULTS[key] : v;
}
function set(key, value) {
  const p = load();
  p[key] = value;
  save(p);
}

export const Prefs = {
  get classicPieces() { return Boolean(get('classicPieces')); },
  set classicPieces(v) { set('classicPieces', Boolean(v)); },

  get pieceStyle() { return get('pieceStyle'); },
  set pieceStyle(v) { set('pieceStyle', v); },

  get boardView() { return get('boardView'); },
  set boardView(v) { set('boardView', v); },

  get moveStyle() { return get('moveStyle'); },
  set moveStyle(v) { set('moveStyle', v); },

  get cornerPosition() { return get('cornerPosition'); },
  set cornerPosition(v) { set('cornerPosition', v); },

  get cornerX() { return get('cornerX'); },
  set cornerX(v) { set('cornerX', v); },
  get cornerY() { return get('cornerY'); },
  set cornerY(v) { set('cornerY', v); },

  get musicEnabled() { return Boolean(get('musicEnabled')); },
  set musicEnabled(v) { set('musicEnabled', Boolean(v)); },

  get sfxEnabled() { return Boolean(get('sfxEnabled')); },
  set sfxEnabled(v) { set('sfxEnabled', Boolean(v)); },

  all() { return { ...DEFAULTS, ...load() }; },
};
