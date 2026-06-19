// src/ui/screens/themeSelectScreen.js

import { listThemes } from '../../data/characters.js';
import { getPieceSet } from '../pieces/pieceSets.js';

export function renderThemeSelect(root, { onSelect, onBack }) {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'cq-screen';
  screen.innerHTML = `
    ${onBack ? '<button class="cq-btn" id="cq-back-btn" style="margin-bottom:18px;">&larr; Main menu</button>' : ''}
    <h1 class="cq-screen-title">Choose your world <span style="font-family:var(--font-mono);font-size:0.9rem;color:var(--brass);vertical-align:middle;">v15 · Elo + leaderboard</span></h1>
    <p class="cq-screen-subtitle">Each theme reshapes the board, the pieces, the music, and your opponents.</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'cq-theme-grid';

  for (const theme of listThemes()) {
    const set = getPieceSet(theme.id);
    const card = document.createElement('button');
    card.className = 'cq-theme-card';
    card.innerHTML = `
      <div class="cq-theme-swatch">
        <div style="background:${theme.boardColors.light}"></div>
        <div style="background:${theme.boardColors.dark}"></div>
      </div>
      <div class="cq-theme-preview" style="--piece-stroke:#1a1a1a;">
        <span class="cq-prev-piece" style="color:#f7f1e3">${set.k}</span>
        <span class="cq-prev-piece" style="color:#f7f1e3">${set.q}</span>
        <span class="cq-prev-piece" style="color:#f7f1e3">${set.n}</span>
        <span class="cq-prev-piece" style="color:#f7f1e3">${set.p}</span>
      </div>
      <h3 class="cq-theme-name">${theme.label}</h3>
      <span class="cq-character-elo">7 opponents \u00b7 300-3000 Elo</span>
    `;
    card.addEventListener('click', () => onSelect(theme));
    grid.appendChild(card);
  }

  screen.appendChild(grid);
  root.appendChild(screen);
  if (onBack) {
    const backBtn = screen.querySelector('#cq-back-btn');
    if (backBtn) backBtn.addEventListener('click', onBack);
  }
}
