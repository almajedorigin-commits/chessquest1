// src/ui/screens/startMenuScreen.js
//
// The landing screen shown before everything else. Routes to single-player,
// online, or the account panel, and shows the player's current identity.

import { getIdentity, isOnlineNetworked } from '../../online/index.js';

export function renderStartMenu(root, { onPlayComputer, onPlayOnline, onAccount, onSettings, onLeaderboard, audio }) {
  const identity = getIdentity();
  root.innerHTML = '';

  const screen = document.createElement('div');
  screen.className = 'cq-screen cq-start-menu';
  screen.innerHTML = `
    <div class="cq-start-hero">
      <div class="cq-start-logo"><span class="cq-crown">\u265A</span></div>
      <h1 class="cq-start-title">ChessQuest</h1>
      <p class="cq-start-tagline">Seven worlds. Forty-nine opponents. One coach in your corner.</p>
    </div>

    <div class="cq-start-buttons">
      <button class="cq-menu-btn cq-menu-primary" id="cq-play-computer">
        <span class="cq-menu-icon">\u265F</span>
        <span class="cq-menu-label">Play vs Computer</span>
        <span class="cq-menu-sub">300\u20133000 Elo \u00b7 themed opponents \u00b7 coaching</span>
      </button>

      <button class="cq-menu-btn" id="cq-play-online">
        <span class="cq-menu-icon">\u2694</span>
        <span class="cq-menu-label">Play Online</span>
        <span class="cq-menu-sub">${isOnlineNetworked() ? 'Random match or private room code' : 'Play a friend on this device \u00b7 internet play once the server is connected'}</span>
      </button>

      <button class="cq-menu-btn" id="cq-account">
        <span class="cq-menu-icon">\u2605</span>
        <span class="cq-menu-label">Account</span>
        <span class="cq-menu-sub" id="cq-account-sub"></span>
      </button>

      <button class="cq-menu-btn" id="cq-settings">
        <span class="cq-menu-icon">\u2699</span>
        <span class="cq-menu-label">Settings</span>
        <span class="cq-menu-sub">Piece style, music, sound</span>
      </button>

      <button class="cq-menu-btn" id="cq-leaderboard">
        <span class="cq-menu-icon">\uD83C\uDFC6</span>
        <span class="cq-menu-label">Leaderboard</span>
        <span class="cq-menu-sub">Top players by rating</span>
      </button>
    </div>

    <div class="cq-start-footer">
      <span id="cq-identity-line"></span>
      <button class="cq-btn cq-track-btn" id="cq-track-btn" title="Switch music track">\u266A <span id="cq-track-name">Music</span></button>
    </div>
  `;

  root.appendChild(screen);

  // Music track switcher: cycles through the named tracks and plays the choice.
  const trackBtn = screen.querySelector('#cq-track-btn');
  if (trackBtn && audio) {
    const nameEl = screen.querySelector('#cq-track-name');
    const showName = () => { nameEl.textContent = audio.currentTrackTitle || 'Music'; };
    showName();
    trackBtn.addEventListener('click', () => {
      audio.cycleMusic();
      showName();
    });
  }

  const updateIdentityUi = () => {
    const id = getIdentity();
    screen.querySelector('#cq-account-sub').textContent = id.isGuest
      ? 'Playing as a guest \u2014 claim a name'
      : `Signed in as ${id.name}`;
    screen.querySelector('#cq-identity-line').innerHTML =
      `You are <strong>${id.name}</strong>${id.isGuest ? ' (guest)' : ''} \u00b7 Rating ${id.rating}`;
  };
  updateIdentityUi();

  screen.querySelector('#cq-play-computer').addEventListener('click', onPlayComputer);
  screen.querySelector('#cq-play-online').addEventListener('click', onPlayOnline);
  screen.querySelector('#cq-account').addEventListener('click', () => onAccount(updateIdentityUi));
  screen.querySelector('#cq-settings').addEventListener('click', () => onSettings?.());
  screen.querySelector('#cq-leaderboard').addEventListener('click', () => onLeaderboard?.());
}
