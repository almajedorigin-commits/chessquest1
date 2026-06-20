// src/ui/screens/onlineLobbyScreen.js
//
// Lobby for online play: random matchmaking, create a private room (shows a
// shareable code), or join a room by code. Shows whether real networked play
// is active or the local fallback is in use.

import { getIdentity, getTransport, isOnlineNetworked } from '../../online/index.js';
import { Prefs } from '../preferences.js';

export function renderOnlineLobby(root, { onStartGame, onBack }) {
  const identity = getIdentity();
  root.innerHTML = '';

  const screen = document.createElement('div');
  screen.className = 'cq-screen';

  const banner = isOnlineNetworked()
    ? `<div class="cq-net-banner cq-net-on">\u25CF Online: connected. Play anyone, anywhere.</div>`
    : `<div class="cq-net-banner cq-net-local">\u25CB Local play: open a second browser window or tab on this device to play against yourself or a friend nearby. Internet play turns on automatically once the online server is connected.</div>`;

  screen.innerHTML = `
    <button class="cq-btn" id="cq-back-btn" style="margin-bottom:18px;">&larr; Main menu</button>
    <h1 class="cq-screen-title">Play Online</h1>
    <p class="cq-screen-subtitle">Playing as <strong>${escapeHtml(identity.name)}</strong>${identity.isGuest ? ' (guest)' : ''} \u00b7 Rating ${identity.rating}</p>
    ${banner}

    <div class="cq-online-theme">
      <label for="cq-online-theme-sel">Board theme:</label>
      <select id="cq-online-theme-sel" class="cq-text-input">
        ${['nature','archery','soldiers','medieval','space','mythical','pirates']
          .map((t) => `<option value="${t}"${Prefs.onlineTheme === t ? ' selected' : ''}>${t[0].toUpperCase()}${t.slice(1)}</option>`).join('')}
      </select>
    </div>

    <div class="cq-lobby-grid">
      <div class="cq-lobby-card">
        <h3>Quick match</h3>
        <p>Get paired with another waiting player automatically.</p>
        <button class="cq-btn cq-btn-primary" id="cq-quick">Find a match</button>
        <p class="cq-lobby-status" id="cq-quick-status"></p>
      </div>

      <div class="cq-lobby-card">
        <h3>Private room</h3>
        <p>Create a room and share the code with a friend.</p>
        <button class="cq-btn cq-btn-primary" id="cq-create">Create room</button>
        <p class="cq-lobby-status" id="cq-create-status"></p>
      </div>

      <div class="cq-lobby-card">
        <h3>Join with code</h3>
        <p>Enter a room code a friend gave you.</p>
        <div class="cq-join-row">
          <input id="cq-code-input" class="cq-text-input" maxlength="4" placeholder="ABCD" style="text-transform:uppercase;" />
          <button class="cq-btn cq-btn-primary" id="cq-join">Join</button>
        </div>
        <p class="cq-lobby-status" id="cq-join-status"></p>
      </div>
    </div>
  `;

  root.appendChild(screen);
  const themeSel = screen.querySelector('#cq-online-theme-sel');
  if (themeSel) themeSel.addEventListener('change', () => { Prefs.onlineTheme = themeSel.value; });
  screen.querySelector('#cq-back-btn').addEventListener('click', onBack);

  let transport = null;
  let searching = false;
  const ensureTransport = async () => {
    if (!transport) transport = await getTransport();
    return transport;
  };

  // Quick match
  screen.querySelector('#cq-quick').addEventListener('click', async () => {
    const statusEl = screen.querySelector('#cq-quick-status');
    if (searching) return;
    searching = true;
    statusEl.textContent = 'Searching for an opponent...';
    try {
      const t = await ensureTransport();
      const { game } = await t.findMatch({
        identity,
        onWaiting: () => { statusEl.textContent = 'Waiting for an opponent to join...'; },
      });
      onStartGame(game);
    } catch (err) {
      statusEl.textContent = 'Could not find a match: ' + err.message;
    } finally {
      searching = false;
    }
  });

  // Create room
  screen.querySelector('#cq-create').addEventListener('click', async () => {
    const statusEl = screen.querySelector('#cq-create-status');
    statusEl.textContent = 'Creating room...';
    try {
      const t = await ensureTransport();
      const { game, code } = await t.createRoom({ identity });
      statusEl.innerHTML = `Room code: <strong class="cq-room-code">${code}</strong> \u2014 share it, then the game starts when they join. Entering room...`;
      onStartGame(game);
    } catch (err) {
      statusEl.textContent = 'Could not create room: ' + err.message;
    }
  });

  // Join room
  screen.querySelector('#cq-join').addEventListener('click', async () => {
    const statusEl = screen.querySelector('#cq-join-status');
    const code = screen.querySelector('#cq-code-input').value.trim().toUpperCase();
    if (!code) { statusEl.textContent = 'Enter a room code first.'; return; }
    statusEl.textContent = 'Joining...';
    try {
      const t = await ensureTransport();
      const { game } = await t.joinRoom({ code, identity });
      onStartGame(game);
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
