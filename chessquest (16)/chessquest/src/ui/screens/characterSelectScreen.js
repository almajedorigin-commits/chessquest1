// src/ui/screens/characterSelectScreen.js

export function renderCharacterSelect(root, { theme, unlockedTier, onSelect, onBack }) {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'cq-screen';
  screen.innerHTML = `
    <button class="cq-btn" id="cq-back-btn" style="margin-bottom:18px;">&larr; Change world</button>
    <h1 class="cq-screen-title">${theme.label}: pick your opponent</h1>
    <p class="cq-screen-subtitle">Defeat a character to unlock the next, tougher one.</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'cq-character-grid';

  theme.characters.forEach((char, index) => {
    const locked = index > unlockedTier;
    const card = document.createElement('button');
    card.className = 'cq-character-card';
    card.disabled = locked;
    if (locked) card.style.opacity = '0.45';
    card.innerHTML = `
      <div class="cq-character-portrait-sm">${portraitOrEmoji(theme.id, char.id)}</div>
      <h3 class="cq-character-name">${char.name}</h3>
      <span class="cq-character-elo">${char.elo} Elo</span>
      <p class="cq-character-blurb">${locked ? 'Defeat the previous opponent to unlock.' : char.blurb}</p>
    `;
    if (!locked) card.addEventListener('click', () => onSelect(char));
    grid.appendChild(card);
  });

  screen.appendChild(grid);
  root.appendChild(screen);

  root.querySelector('#cq-back-btn').addEventListener('click', onBack);
}

function portraitOrEmoji(themeId, characterId) {
  // Looks for /portraits/{themeId}/{characterId}.png; falls back to a
  // generic glyph if the asset isn't present yet (keeps the app usable
  // before all art is produced).
  return `<img src="/portraits/${themeId}/${characterId}.png" onerror="this.replaceWith(document.createTextNode('\u265E'))" alt="" />`;
}
