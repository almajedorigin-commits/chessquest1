// src/ui/screens/leaderboardScreen.js
//
// Shows the top players by rating. Reads from whichever transport is active
// (Supabase when configured, else the local-mode profiles store). Your own row
// is highlighted if present.

import { getIdentity, getTransport } from '../../online/index.js';

export function renderLeaderboard(root, { onBack }) {
  const identity = getIdentity();
  root.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'cq-screen';
  screen.innerHTML = `
    <button class="cq-btn" id="cq-back-btn" style="margin-bottom:18px;">&larr; Back</button>
    <h1 class="cq-screen-title">Leaderboard</h1>
    <p class="cq-screen-subtitle">Top players by rating. Win online games to climb.</p>
    <div class="cq-leaderboard" id="cq-lb"><p class="cq-lb-loading">Loading...</p></div>
  `;
  root.appendChild(screen);
  screen.querySelector('#cq-back-btn').addEventListener('click', onBack);

  (async () => {
    const host = screen.querySelector('#cq-lb');
    try {
      const transport = await getTransport();
      const rows = transport.getLeaderboard ? await transport.getLeaderboard(20) : [];
      if (!rows.length) {
        host.innerHTML = `<p class="cq-lb-empty">No rated games yet. Play someone online to get on the board!</p>`;
        return;
      }
      host.innerHTML = `
        <div class="cq-lb-table">
          <div class="cq-lb-head"><span>#</span><span>Player</span><span>Rating</span></div>
          ${rows.map((r, i) => `
            <div class="cq-lb-row ${r.id === identity.id ? 'cq-lb-me' : ''}">
              <span class="cq-lb-rank">${i + 1}</span>
              <span class="cq-lb-name">${escapeHtml(r.name || 'Player')}${r.id === identity.id ? ' (you)' : ''}</span>
              <span class="cq-lb-rating">${r.rating}</span>
            </div>`).join('')}
        </div>`;
    } catch {
      host.innerHTML = `<p class="cq-lb-empty">Couldn't load the leaderboard right now.</p>`;
    }
  })();
}

function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
