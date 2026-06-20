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
  pieceStyle: 'classic',      // 'themed' | 'classic'
  boardView: 'flat',          // 'flat' | 'scene'
  moveStyle: 'instant',       // 'instant' | 'confirm'
  cornerPosition: 'top-right',// 'top-right' | 'top-center' | 'custom'
  cornerX: null,              // custom px (left), used when cornerPosition === 'custom'
  cornerY: null,              // custom px (top)
  musicEnabled: true,         // master music on/off (persists)
  sfxEnabled: true,
  checkFlash: true,           // flash the king's square red when in check
  flashKingDanger: true,      // flash red when the king is in danger
  timerMinutes: 0,            // 0 = no clock; 2 | 5 | 10 minute options
  onlineTheme: 'medieval',    // board theme used for online matches
  flashKingDanger: true,      // flash red when your king is in check
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

  get pieceStyle() { const v = get('pieceStyle'); return v === 'retro' ? 'classic' : v; },
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

  get checkFlash() { return Boolean(get('checkFlash')); },
  set checkFlash(v) { set('checkFlash', Boolean(v)); },

  get flashKingDanger() { return get('flashKingDanger') !== false; },
  set flashKingDanger(v) { set('flashKingDanger', Boolean(v)); },

  get timerMinutes() { return Number(get('timerMinutes')) || 0; },
  set timerMinutes(v) { set('timerMinutes', Number(v) || 0); },

  get onlineTheme() { return get('onlineTheme') || 'medieval'; },
  set onlineTheme(v) { set('onlineTheme', v); },

  get flashKingDanger() { return Boolean(get('flashKingDanger')); },
  set flashKingDanger(v) { set('flashKingDanger', Boolean(v)); },

  all() { return { ...DEFAULTS, ...load() }; },
};
