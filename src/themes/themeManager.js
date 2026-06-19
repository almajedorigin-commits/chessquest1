// src/themes/themeManager.js
//
// Applies a theme's board colors + accent as CSS variables on :root.
// The rest of the design system (walnut chrome, parchment notebook, type)
// stays constant across themes by design -- only the board and accent
// color shift, which is what keeps the product feeling cohesive while
// still giving each theme a distinct board identity.

export function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--board-light', theme.boardColors.light);
  root.style.setProperty('--board-dark', theme.boardColors.dark);
  root.style.setProperty('--accent', theme.accent);
}
