// src/ui/screens/onlineGameScreen.js
//
// Renders a networked two-player match. Reuses BoardView (same as single
// player) but drives it with OnlineGameController instead of an AI opponent.
// The local player is locked to their assigned color.

import { BoardView } from '../boardView.js';
import { OnlineGameController } from '../../online/onlineGameController.js';
import { applyTheme, } from '../../themes/themeManager.js';
import { getTheme } from '../../data/characters.js';

export function renderOnlineGame(root, { transport, identity, game, audio, background, onExit }) {
  // Online games use a neutral default theme/board (no AI character).
  const theme = getTheme('medieval');
  applyTheme(theme);
  audio.loadTheme(theme.id);
  audio.loadMusic('menu'); // online matches use the menu waltz if the player opts in
  audio.stopMusic(); // opt-in only: start silent, player enables via Music button
  if (background) background.applyTheme(theme.id);

  const controller = new OnlineGameController({ transport, identity, game, audio });

  root.innerHTML = '';

  const topbar = document.createElement('div');
  topbar.className = 'cq-topbar';
  topbar.innerHTML = `
    <div class="cq-brand"><span class="cq-crown">\u265A</span> ChessQuest \u00b7 Online</div>
    <div class="cq-topbar-actions">
      <button class="cq-btn" id="cq-music-btn" title="Play background music">\uD83C\uDFB5 Music: off</button>
      <button class="cq-btn" id="cq-audio-btn" title="Toggle sound effects">\uD83D\uDD0A Sound</button>
      <button class="cq-btn" id="cq-exit-btn">Resign &amp; Exit</button>
    </div>
  `;
  root.appendChild(topbar);

  const arena = document.createElement('div');
  arena.className = 'cq-arena';
  root.appendChild(arena);

  // Left: opponent / status plaque.
  const plaque = document.createElement('div');
  plaque.className = 'cq-plaque';
  plaque.innerHTML = `
    <h2 class="cq-plaque-name" id="cq-opp-name">${controller.opponentName || 'Waiting...'}</h2>
    <div class="cq-plaque-elo">You are ${controller.myColor === 'w' ? 'White' : 'Black'}</div>
    <p class="cq-plaque-blurb" id="cq-online-status">Connecting...</p>
    <div class="cq-room-share" id="cq-room-share"></div>
  `;
  arena.appendChild(plaque);

  // Center: board.
  const boardFrame = document.createElement('div');
  boardFrame.className = 'cq-board-frame';
  const boardEl = document.createElement('div');
  boardFrame.appendChild(boardEl);
  arena.appendChild(boardFrame);

  // Right: move list.
  const moveListEl = document.createElement('div');
  moveListEl.className = 'cq-notebook';
  moveListEl.innerHTML = `<div class="cq-notebook-header"><span>Moves</span></div><div class="cq-notebook-entries" id="cq-move-list"></div>`;
  arena.appendChild(moveListEl);

  const board = new BoardView(boardEl, {
    orientation: controller.myColor,
    themeId: theme.id,
    onUserMove: async (from, to) => {
      const promotion = maybePromotion(controller, from, to);
      await controller.playMove(promotion ? { from, to, promotion } : { from, to });
    },
  });

  board.setOnRequestSelect((square) => {
    if (!controller.isMyTurn) return;
    const piece = controller.chess.get(square);
    if (!piece || piece.color !== controller.myColor) {
      board.setSelected(null); board.setLegalTargets([]); return;
    }
    board.setSelected(square);
    board.setLegalTargets(controller.chess.moves({ square, verbose: true }).map((m) => m.to));
  });

  const statusEl = plaque.querySelector('#cq-online-status');
  const moveList = moveListEl.querySelector('#cq-move-list');

  controller.onStatus = (txt) => { statusEl.textContent = txt; };
  controller.onOpponentJoined = (name) => {
    plaque.querySelector('#cq-opp-name').textContent = name || 'Opponent';
    plaque.querySelector('#cq-room-share').textContent = '';
  };
  controller.onMoveMade = ({ move }) => {
    board.setPosition(controller.chess.board());
    board.highlightLastMove(move.from, move.to);
    appendMove(moveList, controller.chess.history().length, move.san);
  };
  controller.onGameOver = ({ result }) => {
    statusEl.textContent = result;
    showResult(root, result, onExit);
  };

  // If we created a room and are waiting, show the code to share.
  if (game.status === 'waiting') {
    plaque.querySelector('#cq-room-share').innerHTML =
      `Share this code:<br><strong class="cq-room-code">${game.id}</strong>`;
  }

  board.setPosition(controller.chess.board());
  controller.start();

  // Audio toggle + music-on-gesture.
  const audioBtn = topbar.querySelector('#cq-audio-btn');
  audioBtn.addEventListener('click', () => {
    const muted = audio.toggleMuted();
    audioBtn.innerHTML = muted ? '\uD83D\uDD07 Muted' : '\uD83D\uDD0A Sound';
  });
  // Music is OPT-IN for online/private matches: off until the player turns it on.
  let musicOn = false;
  const musicBtn = topbar.querySelector('#cq-music-btn');
  musicBtn.addEventListener('click', () => {
    musicOn = !musicOn;
    if (musicOn) { audio.startMusic(); musicBtn.innerHTML = '\uD83C\uDFB5 Music: on'; }
    else { audio.stopMusic(); musicBtn.innerHTML = '\uD83C\uDFB5 Music: off'; }
  });

  topbar.querySelector('#cq-exit-btn').addEventListener('click', () => {
    controller.resign();
    controller.destroy();
    onExit();
  });

  return controller;
}

function appendMove(listEl, num, san) {
  const row = document.createElement('div');
  row.className = 'cq-entry';
  row.innerHTML = `<div class="cq-entry-move">${num}. ${san}</div>`;
  listEl.appendChild(row);
  listEl.scrollTop = listEl.scrollHeight;
}

function maybePromotion(controller, from, to) {
  const piece = controller.chess.get(from);
  if (!piece || piece.type !== 'p') return null;
  const rank = to[1];
  if ((piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1')) {
    const c = window.prompt('Promote to (q, r, b, n)?', 'q');
    return ['q', 'r', 'b', 'n'].includes(c) ? c : 'q';
  }
  return null;
}

function showResult(root, result, onExit) {
  const backdrop = document.createElement('div');
  backdrop.className = 'cq-modal-backdrop';
  backdrop.innerHTML = `
    <div class="cq-modal">
      <h2>Game Over</h2>
      <p>${result}</p>
      <div class="cq-modal-actions">
        <button class="cq-btn cq-btn-primary" id="cq-modal-exit">Back to Menu</button>
      </div>
    </div>
  `;
  root.appendChild(backdrop);
  backdrop.querySelector('#cq-modal-exit').addEventListener('click', () => { backdrop.remove(); onExit(); });
}
