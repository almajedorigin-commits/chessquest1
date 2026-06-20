// src/ui/screens/settingsScreen.js
//
// Central settings page. Everything persists via Prefs and is read across the
// app. Reachable from the start menu and (optionally) mid-game.

import { Prefs } from '../preferences.js';

export function renderSettings(root, { onBack, audio }) {
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'cq-screen';

  screen.innerHTML = `
    <button class="cq-btn" id="cq-back-btn" style="margin-bottom:18px;">&larr; Back</button>
    <h1 class="cq-screen-title">Settings</h1>
    <p class="cq-screen-subtitle">These apply to every game and are saved automatically.</p>

    <div class="cq-settings">
      ${segment('Piece style', 'pieceStyle', [
        ['classic', 'Classic', 'Clean, standard pieces \u2014 clear horse, easy to read.'],
        ['themed', 'Themed', 'Unique pieces matching each world.'],
      ])}

      ${segment('Timer', 'timerMinutes', [
        ['0', 'No clock', 'Play untimed.'],
        ['2', '2 min', 'Bullet \u2014 fast.'],
        ['5', '5 min', 'Blitz.'],
        ['10', '10 min', 'Rapid.'],
      ])}

      ${toggleRow('Music', 'musicEnabled', 'Background music for menus and matches.')}
      ${toggleRow('Sound effects', 'sfxEnabled', 'Move, capture, and check sounds.')}
      ${toggleRow('Flash red in check', 'flashKingDanger', 'Flash the king red when it is in danger.')}
      ${toggleRow('Flash red on check', 'flashKingDanger', 'Flash your king red when it is in danger.')}
    </div>
  `;

  root.appendChild(screen);
  screen.querySelector('#cq-back-btn').addEventListener('click', onBack);

  // Wire segmented choices.
  screen.querySelectorAll('[data-seg]').forEach((group) => {
    const key = group.dataset.seg;
    group.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        Prefs[key] = btn.dataset.val;
        group.querySelectorAll('button').forEach((b) => b.classList.toggle('cq-seg-active', b === btn));
      });
    });
  });

  // Wire toggles.
  screen.querySelectorAll('[data-toggle]').forEach((el) => {
    const key = el.dataset.toggle;
    el.addEventListener('click', () => {
      const next = !Prefs[key];
      Prefs[key] = next;
      el.classList.toggle('cq-switch-on', next);
      if (key === 'musicEnabled' && audio) audio.setMusicEnabled(next);
      if (key === 'sfxEnabled' && audio) audio.setMuted(!next);
    });
  });
}

function segment(label, key, options, hint) {
  const current = Prefs[key];
  const buttons = options.map(([val, title, desc]) => `
    <button data-val="${val}" class="cq-seg ${val === current ? 'cq-seg-active' : ''}">
      <span class="cq-seg-title">${title}</span>
      <span class="cq-seg-desc">${desc}</span>
    </button>`).join('');
  return `
    <div class="cq-setting-block">
      <div class="cq-setting-label">${label}</div>
      <div class="cq-segmented" data-seg="${key}">${buttons}</div>
      ${hint ? `<div class="cq-setting-hint">${hint}</div>` : ''}
    </div>`;
}

function toggleRow(label, key, desc) {
  const on = Prefs[key];
  return `
    <div class="cq-setting-block cq-toggle-row">
      <div>
        <div class="cq-setting-label">${label}</div>
        <div class="cq-setting-hint">${desc}</div>
      </div>
      <div class="cq-switch ${on ? 'cq-switch-on' : ''}" data-toggle="${key}" role="switch" aria-checked="${on}">
        <span class="cq-switch-knob"></span>
      </div>
    </div>`;
}
