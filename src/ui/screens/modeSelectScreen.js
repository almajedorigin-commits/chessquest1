// src/ui/screens/modeSelectScreen.js

export function renderModeSelect(root, { character, onSelect, onBack }) {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'cq-screen';
  screen.innerHTML = `
    <button class="cq-btn" id="cq-back-btn" style="margin-bottom:18px;">&larr; Change opponent</button>
    <h1 class="cq-screen-title">How should the notebook work?</h1>
    <p class="cq-screen-subtitle">Playing against ${character.name} (${character.elo} Elo).</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'cq-mode-grid';
  grid.innerHTML = `
    <button class="cq-mode-card" data-mode="live">
      <h3>Live Coach</h3>
      <p>After every move, see immediately why it was good or bad, in plain language with the engine's math translated into pawns and lines-ahead. Builds a running weakness profile as you play.</p>
    </button>
    <button class="cq-mode-card" data-mode="silent">
      <h3>Silent Mode</h3>
      <p>No interruptions during the game. Every move's reasoning -- yours and the opponent's -- is recorded quietly. Reveal the notebook any time you want to see the thinking behind it.</p>
    </button>
  `;

  grid.querySelectorAll('.cq-mode-card').forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.mode));
  });

  screen.appendChild(grid);
  root.appendChild(screen);
  root.querySelector('#cq-back-btn').addEventListener('click', onBack);
}
