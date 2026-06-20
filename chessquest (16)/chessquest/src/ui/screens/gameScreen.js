// src/ui/screens/gameScreen.js

import { BoardView } from '../boardView.js';
import { NotebookView } from '../notebookView.js';
import { GameController } from '../../engine/gameController.js';
import { ChessClock, formatClock } from '../../engine/chessClock.js';
import { applyTheme } from '../../themes/themeManager.js';
import { Prefs } from '../preferences.js';

export function renderGameScreen(root, { theme, character, mode, audio, background, humanColor = 'w', onExit, onRematch }) {
  applyTheme(theme);
  audio.loadTheme(theme.id);
  audio.loadMusic(theme.id);
  if (background) background.applyTheme(theme.id);

  root.innerHTML = '';
  const topbar = buildTopbar({ character, audio, onExit });
  root.appendChild(topbar);

  const arena = document.createElement('div');
  arena.className = 'cq-arena';
  root.appendChild(arena);

  const plaque = buildPlaque(theme, character);
  arena.appendChild(plaque);

  const controller = new GameController({ character, themeId: theme.id, mode, audio, humanColor });

  // ----- Chess clock (optional) -----
  const aiColor = humanColor === 'w' ? 'b' : 'w';
  const clock = new ChessClock(Prefs.timerMinutes);
  let clockEl = null;
  if (clock.enabled) {
    clockEl = document.createElement('div');
    clockEl.className = 'cq-clocks';
    clockEl.innerHTML = `
      <div class="cq-clock" id="cq-clock-opp"><span class="cq-clock-label">Opponent</span><span class="cq-clock-time" id="cq-clock-opp-t">--:--</span></div>
      <div class="cq-clock" id="cq-clock-you"><span class="cq-clock-label">You</span><span class="cq-clock-time" id="cq-clock-you-t">--:--</span></div>
    `;
    plaque.appendChild(clockEl);
    const youT = clockEl.querySelector('#cq-clock-you-t');
    const oppT = clockEl.querySelector('#cq-clock-opp-t');
    const renderClock = () => {
      const you = humanColor === 'w' ? clock.white : clock.black;
      const opp = humanColor === 'w' ? clock.black : clock.white;
      youT.textContent = formatClock(you);
      oppT.textContent = formatClock(opp);
      youT.classList.toggle('cq-clock-low', you <= 30);
      oppT.classList.toggle('cq-clock-low', opp <= 30);
    };
    clock.onTick = renderClock;
    clock.onFlag = (color) => {
      const youLost = color === humanColor;
      controller.stop?.();
      controller.onGameOver?.({ result: youLost ? 'You lost on time.' : 'You won \u2014 opponent flagged on time.' });
    };
    renderClock();
  }

  // ----- Board (single, flat, centered) -----
  const boardFrame = document.createElement('div');
  boardFrame.className = 'cq-board-frame';
  const boardEl = document.createElement('div');
  boardFrame.appendChild(boardEl);

  const commitMove = async (from, to, promotion) => {
    const result = await controller.playHumanMove(promotion ? { from, to, promotion } : { from, to });
    if (!result.ok) syncBoardSelection(board, controller, from);
    return result;
  };

  const board = new BoardView(boardEl, {
    orientation: humanColor,
    themeId: theme.id,
    onUserMove: (from, to) => {
      const promotion = maybeAskPromotion(controller, from, to);
      return commitMove(from, to, promotion);
    },
  });
  board.setOnRequestSelect((square) => {
    if (controller.chess.turn() !== controller.humanColor) return;
    const piece = controller.chess.get(square);
    if (!piece || piece.color !== controller.humanColor) {
      board.setSelected(null); board.setLegalTargets([]); return;
    }
    board.setSelected(square);
    board.setLegalTargets(controller.chess.moves({ square, verbose: true }).map((m) => m.to));
  });
  board.setPosition(controller.chess.board());
  arena.appendChild(boardFrame);

  // ----- Notebook -----
  const notebookEl = document.createElement('div');
  arena.appendChild(notebookEl);
  const notebook = new NotebookView(notebookEl, { mode });

  function refreshBoards() {
    board.setPosition(controller.chess.board());
    board.setSelected(null);
    board.setLegalTargets([]);
  }

  // ----- Topbar buttons -----
  const takebackBtn = topbar.querySelector('#cq-takeback-btn');
  if (takebackBtn) {
    takebackBtn.addEventListener('click', () => {
      const did = controller.takeBack();
      if (did) refreshBoards();
    });
  }

  const piecesBtn = topbar.querySelector('#cq-pieces-btn');
  if (piecesBtn) {
    const STYLES = ['themed', 'classic'];
    const LABELS = { themed: '\u265F Themed', classic: '\u265F Classic' };
    const refreshPiecesLabel = () => { piecesBtn.innerHTML = LABELS[Prefs.pieceStyle] || LABELS.themed; };
    refreshPiecesLabel();
    piecesBtn.addEventListener('click', () => {
      const next = STYLES[(STYLES.indexOf(Prefs.pieceStyle) + 1) % STYLES.length];
      Prefs.pieceStyle = next;
      board.setPieceStyle(next);
      refreshPiecesLabel();
    });
  }

  // ----- Controller hooks -----
  const thinkingEl = plaque.querySelector('.cq-thinking');
  controller.onThinking = (isThinking) => {
    thinkingEl.classList.toggle('cq-active', isThinking);
  };

  controller.onMoveMade = ({ move }) => {
    const settle = () => {
      board.setPosition(controller.chess.board());
      if (move.from && move.to) board.highlightLastMove(move.from, move.to);
      if (controller.chess.inCheck() && Prefs.flashKingDanger) {
        const kingSquare = findKingSquare(controller.chess, controller.chess.turn());
        if (kingSquare) board.flashCheck(kingSquare);
      }
    };
    if (move.from && move.to) board.animateMove(move.from, move.to, settle);
    else settle();
    // Switch the clock to whoever is now on move.
    if (clock.enabled && !controller.chess.isGameOver()) {
      clock.switch(controller.chess.turn());
    }
  };

  controller.onEntryRecorded = (entry) => { notebook.addEntry(entry); };

  controller.onGameOver = ({ result, weaknessSummary }) => {
    clock.stop();
    notebook.setFooter(weaknessSummary);
    showGameOverModal(root, { result, weaknessSummary, onRematch, onExit });
  };

  controller.start();
  // Begin the clock for whoever moves first (White).
  if (clock.enabled) clock.start(controller.chess.turn());

  return controller; // exposed for cleanup by caller
}

function buildTopbar({ character, audio, onExit }) {
  const bar = document.createElement('div');
  bar.className = 'cq-topbar';
  bar.innerHTML = `
    <div class="cq-brand"><span class="cq-crown">\u265A</span> ChessQuest</div>
    <div class="cq-topbar-actions">
      <button class="cq-btn" id="cq-pieces-btn" title="Switch between themed and classic pieces">\u265F Pieces</button>
      <button class="cq-btn" id="cq-takeback-btn" title="Undo your last move">\u21A9 Take back</button>
      <button class="cq-btn" id="cq-music-btn" title="Switch music track">\uD83C\uDFB5 Track</button>
      <button class="cq-btn" id="cq-audio-btn" title="Toggle sound &amp; music">\uD83D\uDD0A Sound</button>
      <button class="cq-btn" id="cq-exit-btn">Resign &amp; Exit</button>
    </div>
  `;
  bar.querySelector('#cq-exit-btn').addEventListener('click', onExit);
  const audioBtn = bar.querySelector('#cq-audio-btn');
  audioBtn.addEventListener('click', () => {
    const muted = audio.toggleMuted();
    audioBtn.innerHTML = muted ? '\uD83D\uDD07 Muted' : '\uD83D\uDD0A Sound';
  });
  const musicBtn = bar.querySelector('#cq-music-btn');
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      const title = audio.cycleMusic();
      if (title) {
        musicBtn.innerHTML = '\uD83C\uDFB5 ' + (title.length > 16 ? title.slice(0, 15) + '\u2026' : title);
        setTimeout(() => { musicBtn.innerHTML = '\uD83C\uDFB5 Track'; }, 2500);
      }
    });
  }
  return bar;
}

function buildPlaque(theme, character) {
  const el = document.createElement('div');
  el.className = 'cq-plaque';
  el.innerHTML = `
    <div class="cq-plaque-portrait">
      <img src="/portraits/${theme.id}/${character.id}.png" onerror="this.replaceWith(document.createTextNode('\u265E'))" alt="${character.name}" />
    </div>
    <h2 class="cq-plaque-name">${character.name}</h2>
    <div class="cq-plaque-elo">${character.elo} ELO</div>
    <p class="cq-plaque-blurb">${character.blurb}</p>
    <div class="cq-thinking"><span class="cq-thinking-dot"></span> thinking...</div>
  `;
  return el;
}

function syncBoardSelection(board, controller) {
  board.setSelected(null);
  board.setLegalTargets([]);
}

function maybeAskPromotion(controller, from, to) {
  const piece = controller.chess.get(from);
  if (!piece || piece.type !== 'p') return null;
  const targetRank = to[1];
  if ((piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1')) {
    const choice = window.prompt('Promote to (q, r, b, n)?', 'q');
    return ['q', 'r', 'b', 'n'].includes(choice) ? choice : 'q';
  }
  return null;
}

function findKingSquare(chess, color) {
  const board = chess.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.type === 'k' && piece.color === color) {
        return `${files[f]}${8 - r}`;
      }
    }
  }
  return null;
}

function showGameOverModal(root, { result, weaknessSummary, onRematch, onExit }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'cq-modal-backdrop';
  backdrop.innerHTML = `
    <div class="cq-modal">
      <h2>Game Over</h2>
      <p>${result}</p>
      <p style="font-style:italic;">${weaknessSummary}</p>
      <div class="cq-modal-actions">
        <button class="cq-btn" id="cq-modal-exit">Back to Menu</button>
        <button class="cq-btn cq-btn-primary" id="cq-modal-rematch">Rematch</button>
      </div>
    </div>
  `;
  root.appendChild(backdrop);
  backdrop.querySelector('#cq-modal-exit').addEventListener('click', () => {
    backdrop.remove();
    onExit();
  });
  backdrop.querySelector('#cq-modal-rematch').addEventListener('click', () => {
    backdrop.remove();
    onRematch();
  });
}
