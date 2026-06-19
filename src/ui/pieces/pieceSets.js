// src/ui/pieces/pieceSets.js
//
// Original, parametric SVG chess piece families -- one distinct silhouette set
// per theme (42 designs total, plus the default). All drawn in code so there
// are zero licensing concerns, and all use `currentColor` for the body fill so
// the board can recolor white/black per side. viewBox is the standard 45x45.
//
// Each set is an object: { p, n, b, r, q, k } of SVG strings.
// boardView.js looks up the active theme's set and renders accordingly.

const S = 'var(--piece-stroke, #1a1a1a)';

function wrap(inner) {
  return `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg" class="piece-svg">${inner}</svg>`;
}
const base = (d, extra = '') =>
  `<path d="${d}" fill="currentColor" stroke="${S}" stroke-width="1.5" stroke-linejoin="round"/>${extra}`;
const foot = (x = 13, w = 19) =>
  `<rect x="${x}" y="37" width="${w}" height="4" rx="1" fill="currentColor" stroke="${S}" stroke-width="1.5"/>`;

// ---------------------------------------------------------------------------
// DEFAULT (classic geometric) -- used as a fallback for any theme without a set
// ---------------------------------------------------------------------------
const DEFAULT = {
  p: wrap(`<circle cx="22.5" cy="13" r="6" fill="currentColor" stroke="${S}" stroke-width="1.5"/>${base('M16 23 Q22.5 19 29 23 L31 37 Q22.5 40 14 37 Z')}`),
  n: wrap(base('M14 38 Q12 30 16 25 Q12 22 13 16 Q15 9 23 8 Q33 8 35 19 Q36 25 30 27 L31 30 Q33 32 31 35 L31 38 Z', `<circle cx="26" cy="16" r="1.4" fill="${S}"/>${foot()}`)),
  b: wrap(`<circle cx="22.5" cy="9" r="3" fill="currentColor" stroke="${S}" stroke-width="1.5"/>${base('M22.5 13 Q31 18 28 28 Q26 33 22.5 33 Q19 33 17 28 Q14 18 22.5 13 Z')}${foot(14, 17)}`),
  r: wrap(base('M11 11 V17 H16 V11 H21 V17 H24 V11 H29 V17 H34 V11 H37 V21 L33 25 V36 H12 V25 L8 21 V11 Z') + foot(11, 23)),
  q: wrap(`<circle cx="12" cy="10" r="2.4" fill="currentColor" stroke="${S}" stroke-width="1.3"/><circle cx="22.5" cy="7" r="2.6" fill="currentColor" stroke="${S}" stroke-width="1.3"/><circle cx="33" cy="10" r="2.4" fill="currentColor" stroke="${S}" stroke-width="1.3"/>${base('M12 12 L17 26 L22.5 11 L28 26 L33 12 L30 31 Q22.5 34 15 31 Z')}${foot()}`),
  k: wrap(`<line x1="22.5" y1="3" x2="22.5" y2="11" stroke="${S}" stroke-width="2"/><line x1="18.5" y1="7" x2="26.5" y2="7" stroke="${S}" stroke-width="2"/>${base('M22.5 11 Q31 16 29 28 Q27 34 22.5 34 Q18 34 16 28 Q14 16 22.5 11 Z')}${foot()}`),
};

// ---------------------------------------------------------------------------
// NATURE -- sprouts, stags, vined towers, mushrooms, blossoms, ancient trees
// ---------------------------------------------------------------------------
const NATURE = {
  p: wrap(base('M22.5 8 Q18 12 22.5 16 Q27 12 22.5 8 Z') + base('M19 17 Q22.5 14 26 17 L28 37 Q22.5 40 17 37 Z') + `<path d="M22.5 16 V30" stroke="${S}" stroke-width="1.2"/>` ),
  n: wrap(base('M14 38 Q13 28 18 24 Q14 20 16 14 L20 17 Q22 9 26 11 Q25 15 29 17 Q34 22 31 30 L32 38 Z', `<path d="M19 13 L17 8 M23 12 L24 7" stroke="${S}" stroke-width="1.4" fill="none"/><circle cx="26" cy="20" r="1.2" fill="${S}"/>${foot(14, 19)}`)),
  b: wrap(base('M22.5 8 Q15 14 18 24 Q20 30 22.5 30 Q25 30 27 24 Q30 14 22.5 8 Z', `<path d="M22.5 12 Q19 18 22.5 24 Q26 18 22.5 12" fill="none" stroke="${S}" stroke-width="1.2"/>${foot(15, 15)}`)),
  r: wrap(base('M12 13 V20 L15 22 V36 H30 V22 L33 20 V13 H28 L26 16 H19 L17 13 Z', `<path d="M15 26 Q22 23 30 26 M15 30 Q22 28 30 30" fill="none" stroke="${S}" stroke-width="1.1"/>${foot(11, 23)}`)),
  q: wrap(base('M22.5 6 Q16 12 18 22 L15 34 Q22.5 37 30 34 L27 22 Q29 12 22.5 6 Z', `<circle cx="22.5" cy="6" r="2.4" fill="currentColor" stroke="${S}" stroke-width="1.2"/><path d="M18 16 Q14 14 12 17 M27 16 Q31 14 33 17" fill="none" stroke="${S}" stroke-width="1.3"/>${foot()}`)),
  k: wrap(base('M22.5 4 Q15 10 17 22 L15 34 Q22.5 37 30 34 L28 22 Q31 10 22.5 4 Z', `<path d="M22.5 4 V12 M18 8 H27" stroke="${S}" stroke-width="1.6" fill="none"/><path d="M16 24 Q22.5 27 29 24" fill="none" stroke="${S}" stroke-width="1.2"/>${foot()}`)),
};

// ---------------------------------------------------------------------------
// ARCHERY -- arrowheads, bows, quivers, fletching
// ---------------------------------------------------------------------------
const ARCHERY = {
  p: wrap(base('M22.5 8 L27 16 H18 Z') + base('M19 17 H26 L28 37 Q22.5 40 17 37 Z')),
  n: wrap(base('M13 38 Q14 27 20 23 L15 14 L22 18 Q24 10 28 13 L25 19 L31 22 Q33 30 31 38 Z', `<path d="M15 14 L11 10 M22 18 L24 11" stroke="${S}" stroke-width="1.4" fill="none"/>${foot(14, 19)}`)),
  b: wrap(`<path d="M16 9 Q30 15 28 36" fill="none" stroke="${S}" stroke-width="2"/><line x1="16" y1="9" x2="28" y2="36" stroke="${S}" stroke-width="1.2"/>${base('M20 22 L25 24 L20 26 Z')}${foot(14, 17)}`),
  r: wrap(base('M12 13 H17 L19 16 H26 L28 13 H33 V20 L29 23 V36 H16 V23 L12 20 Z', `<path d="M22.5 16 V32 M19 20 L22.5 16 L26 20" fill="none" stroke="${S}" stroke-width="1.2"/>${foot(11, 23)}`)),
  q: wrap(base('M22.5 6 L26 13 H19 Z') + base('M16 14 H29 L31 30 Q22.5 34 14 30 Z', `<path d="M22.5 14 V28 M18 30 L22.5 6 L27 30" fill="none" stroke="${S}" stroke-width="1"/>${foot()}`)),
  k: wrap(`<path d="M14 12 Q22.5 6 31 12" fill="none" stroke="${S}" stroke-width="2"/>${base('M17 14 H28 L30 32 Q22.5 35 15 32 Z')}<path d="M22.5 8 V32 M19 12 L22.5 8 L26 12" fill="none" stroke="${S}" stroke-width="1.3"/>${foot()}`),
};

// ---------------------------------------------------------------------------
// SOLDIERS -- helmets, tank treads, bunkers, chevrons, medals
// ---------------------------------------------------------------------------
const SOLDIERS = {
  p: wrap(base('M16 18 Q22.5 10 29 18 L29 22 H16 Z') + base('M17 23 H28 L29 37 H16 Z')),
  n: wrap(base('M12 38 V30 Q12 22 20 22 L20 16 Q26 14 28 20 L33 22 Q35 26 33 30 L33 38 Z', `<rect x="14" y="32" width="18" height="3" rx="1" fill="none" stroke="${S}" stroke-width="1"/><circle cx="26" cy="19" r="1.2" fill="${S}"/>${foot(13, 20)}`)),
  b: wrap(base('M22.5 9 Q16 14 17 24 H28 Q29 14 22.5 9 Z') + base('M16 25 H29 L30 37 H15 Z', `<path d="M19 14 L26 14 M18 19 H27" stroke="${S}" stroke-width="1.1" fill="none"/>`)),
  r: wrap(base('M11 12 H15 V15 H19 V12 H26 V15 H30 V12 H34 V22 H11 Z') + base('M12 23 H33 V36 H12 Z', `<circle cx="16" cy="29" r="2" fill="none" stroke="${S}" stroke-width="1.1"/><circle cx="29" cy="29" r="2" fill="none" stroke="${S}" stroke-width="1.1"/>${foot(10, 25)}`)),
  q: wrap(base('M14 16 Q22.5 8 31 16 L31 20 H14 Z') + base('M15 21 H30 L31 34 Q22.5 37 14 34 Z', `<path d="M19 25 L22.5 28 L26 25 M19 30 L22.5 33 L26 30" fill="none" stroke="${S}" stroke-width="1.2"/>${foot()}`)),
  k: wrap(base('M13 17 Q22.5 7 32 17 L32 21 H13 Z') + base('M14 22 H31 L32 35 Q22.5 38 13 35 Z', `<line x1="22.5" y1="3" x2="22.5" y2="10" stroke="${S}" stroke-width="2"/><line x1="19" y1="6.5" x2="26" y2="6.5" stroke="${S}" stroke-width="2"/><path d="M18 28 H27 M22.5 24 V32" stroke="${S}" stroke-width="1.3"/>${foot()}`)),
};

// ---------------------------------------------------------------------------
// MEDIEVAL -- ornate heraldic, shields, crenellations, fleur cues
// ---------------------------------------------------------------------------
const MEDIEVAL = {
  p: wrap(`<circle cx="22.5" cy="13" r="5.5" fill="currentColor" stroke="${S}" stroke-width="1.5"/>${base('M16 22 H29 L31 37 Q22.5 40 14 37 Z')}<path d="M18 27 H27" stroke="${S}" stroke-width="1"/>`),
  n: wrap(base('M13 38 Q11 29 16 24 Q11 21 13 15 Q16 8 24 9 Q34 11 34 21 Q34 27 29 28 L30 32 Q31 35 29 38 Z', `<circle cx="25" cy="16" r="1.4" fill="${S}"/><path d="M16 12 L13 7" stroke="${S}" stroke-width="1.4"/>${foot(13, 20)}`)),
  b: wrap(`<path d="M22.5 6 L24 9 L22.5 11 L21 9 Z" fill="currentColor" stroke="${S}" stroke-width="1"/>${base('M22.5 11 Q31 17 28 28 Q26 33 22.5 33 Q19 33 17 28 Q14 17 22.5 11 Z')}<line x1="18" y1="22" x2="27" y2="22" stroke="${S}" stroke-width="1.3"/>${foot(14, 17)}`),
  r: wrap(base('M11 11 V17 H16 V11 H21 V17 H24 V11 H29 V17 H34 V11 H37 V21 L33 25 V36 H12 V25 L8 21 V11 Z', `<path d="M18 28 H27" stroke="${S}" stroke-width="1.1"/>${foot(11, 23)}`)),
  q: wrap(`<circle cx="11" cy="9" r="2.2" fill="currentColor" stroke="${S}" stroke-width="1.2"/><circle cx="22.5" cy="6" r="2.6" fill="currentColor" stroke="${S}" stroke-width="1.2"/><circle cx="34" cy="9" r="2.2" fill="currentColor" stroke="${S}" stroke-width="1.2"/>${base('M11 11 L16 27 L22.5 10 L29 27 L34 11 L31 32 Q22.5 35 14 32 Z')}<path d="M17 30 H28" stroke="${S}" stroke-width="1"/>${foot()}`),
  k: wrap(`<path d="M22.5 2 V11 M18 6 H27" stroke="${S}" stroke-width="2.2" fill="none"/>${base('M22.5 11 Q32 17 30 29 Q28 35 22.5 35 Q17 35 15 29 Q13 17 22.5 11 Z')}<path d="M15 23 Q22.5 27 30 23 M17 30 H28" fill="none" stroke="${S}" stroke-width="1.2"/>${foot()}`),
};

// ---------------------------------------------------------------------------
// SPACE -- drones, fighters, satellites, capsules, orbital rings
// ---------------------------------------------------------------------------
const SPACE = {
  p: wrap(`<circle cx="22.5" cy="13" r="6" fill="currentColor" stroke="${S}" stroke-width="1.5"/><circle cx="22.5" cy="13" r="2.4" fill="none" stroke="${S}" stroke-width="1"/>${base('M17 22 H28 L30 37 H15 Z')}`),
  n: wrap(base('M13 38 L18 20 Q20 14 26 16 L31 20 Q33 26 30 30 L31 38 Z', `<path d="M18 20 L11 18 M26 16 L28 9" stroke="${S}" stroke-width="1.4" fill="none"/><circle cx="25" cy="22" r="1.6" fill="none" stroke="${S}" stroke-width="1"/>${foot(13, 19)}`)),
  b: wrap(base('M22.5 7 L28 20 Q28 30 22.5 33 Q17 30 17 20 Z', `<ellipse cx="22.5" cy="20" rx="9" ry="3" fill="none" stroke="${S}" stroke-width="1.1"/>${foot(14, 17)}`)),
  r: wrap(base('M14 13 H31 L29 18 H16 Z') + base('M16 19 H29 V34 L22.5 37 L16 34 Z', `<line x1="22.5" y1="9" x2="22.5" y2="13" stroke="${S}" stroke-width="1.6"/><circle cx="22.5" cy="26" r="3" fill="none" stroke="${S}" stroke-width="1.1"/>${foot(13, 19)}`)),
  q: wrap(base('M22.5 6 L29 18 Q31 30 22.5 34 Q14 30 16 18 Z', `<ellipse cx="22.5" cy="20" rx="11" ry="3.5" fill="none" stroke="${S}" stroke-width="1.2" transform="rotate(-15 22.5 20)"/><circle cx="22.5" cy="6" r="2" fill="currentColor" stroke="${S}" stroke-width="1"/>${foot()}`)),
  k: wrap(base('M22.5 5 L30 18 Q32 31 22.5 35 Q13 31 15 18 Z', `<line x1="22.5" y1="2" x2="22.5" y2="9" stroke="${S}" stroke-width="2"/><circle cx="22.5" cy="2" r="1.6" fill="currentColor" stroke="${S}" stroke-width="1"/><circle cx="22.5" cy="21" r="4" fill="none" stroke="${S}" stroke-width="1.2"/>${foot()}`)),
};

// ---------------------------------------------------------------------------
// MYTHICAL -- horns, wings, claws, crystals, dragon cues
// ---------------------------------------------------------------------------
const MYTHICAL = {
  p: wrap(base('M22.5 8 L25 13 L22.5 12 L20 13 Z') + base('M18 16 Q22.5 13 27 16 L29 37 Q22.5 40 16 37 Z')),
  n: wrap(base('M13 38 Q11 28 17 24 Q12 20 14 13 L19 17 Q20 9 25 11 Q24 16 29 17 Q35 21 31 30 L32 38 Z', `<path d="M14 13 L10 8 M19 17 L20 9" stroke="${S}" stroke-width="1.4" fill="none"/><circle cx="26" cy="19" r="1.3" fill="${S}"/>${foot(13, 20)}`)),
  b: wrap(base('M22.5 7 L26 14 Q30 22 22.5 33 Q15 22 19 14 Z', `<path d="M19 16 Q12 18 14 26 M26 16 Q33 18 31 26" fill="none" stroke="${S}" stroke-width="1.3"/>${foot(14, 17)}`)),
  r: wrap(base('M12 12 L15 18 L12 18 V22 H33 V18 L30 18 L33 12 L27 16 L24 11 L22.5 15 L21 11 L18 16 Z') + base('M14 23 H31 V36 H14 Z', foot(13, 19))),
  q: wrap(base('M22.5 5 L26 14 L29 8 L30 16 L34 13 L31 31 Q22.5 35 14 31 L11 13 L15 16 L16 8 L19 14 Z', `<circle cx="22.5" cy="22" r="3" fill="none" stroke="${S}" stroke-width="1.1"/>${foot()}`)),
  k: wrap(base('M22.5 4 L25 11 L29 6 L30 14 Q33 24 22.5 34 Q12 24 15 14 L16 6 L20 11 Z', `<path d="M22.5 4 V13" stroke="${S}" stroke-width="1.6"/><path d="M16 22 Q22.5 26 29 22" fill="none" stroke="${S}" stroke-width="1.2"/>${foot()}`)),
};

// ---------------------------------------------------------------------------
// PIRATES -- barrels, ship wheels, anchors, hooks, sails, skull cues
// ---------------------------------------------------------------------------
const PIRATES = {
  p: wrap(base('M16 14 H29 L31 37 H14 Z', `<path d="M15 21 H30 M14.5 29 H30.5" stroke="${S}" stroke-width="1.1"/><ellipse cx="22.5" cy="14" rx="6.5" ry="2" fill="currentColor" stroke="${S}" stroke-width="1.2"/>`)),
  n: wrap(base('M13 38 Q12 28 18 24 Q13 20 15 13 L21 17 Q22 10 27 12 Q26 17 31 19 Q35 25 31 31 L32 38 Z', `<circle cx="25" cy="18" r="1.3" fill="${S}"/><path d="M27 12 L29 7" stroke="${S}" stroke-width="1.3"/>${foot(13, 20)}`)),
  b: wrap(`<circle cx="22.5" cy="10" r="3.4" fill="currentColor" stroke="${S}" stroke-width="1.4"/><line x1="22.5" y1="13" x2="22.5" y2="30" stroke="${S}" stroke-width="2"/><path d="M14 26 Q22.5 36 31 26" fill="none" stroke="${S}" stroke-width="2"/><line x1="18" y1="17" x2="27" y2="17" stroke="${S}" stroke-width="1.6"/>${foot(14, 17)}`),
  r: wrap(base('M13 12 H32 L30 17 H15 Z') + base('M15 18 H30 V36 H15 Z', `<path d="M18 23 H27 M18 28 H27 M18 32 H27" stroke="${S}" stroke-width="1.1"/>${foot(13, 19)}`)),
  q: wrap(`<circle cx="22.5" cy="20" r="11" fill="currentColor" stroke="${S}" stroke-width="1.5"/><circle cx="22.5" cy="20" r="3.4" fill="none" stroke="${S}" stroke-width="1.2"/><g stroke="${S}" stroke-width="1.3"><line x1="22.5" y1="6" x2="22.5" y2="34"/><line x1="8.5" y1="20" x2="36.5" y2="20"/><line x1="12.6" y1="10.1" x2="32.4" y2="29.9"/><line x1="12.6" y1="29.9" x2="32.4" y2="10.1"/></g>${foot()}`),
  k: wrap(`<circle cx="22.5" cy="14" r="8" fill="currentColor" stroke="${S}" stroke-width="1.5"/><circle cx="19" cy="13" r="1.6" fill="${S}"/><circle cx="26" cy="13" r="1.6" fill="${S}"/><path d="M19 18 L26 18 M20 20 L20 23 M22.5 20 L22.5 23 M25 20 L25 23" stroke="${S}" stroke-width="1.2"/>${base('M15 25 Q22.5 30 30 25 L31 36 H14 Z')}${foot()}`),
};

export const PIECE_SETS = {
  default: DEFAULT,
  nature: NATURE,
  archery: ARCHERY,
  soldiers: SOLDIERS,
  medieval: MEDIEVAL,
  space: SPACE,
  mythical: MYTHICAL,
  pirates: PIRATES,
};

export function getPieceSet(themeId) {
  return PIECE_SETS[themeId] || PIECE_SETS.default;
}
