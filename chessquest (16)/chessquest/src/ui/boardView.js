// src/ui/boardView.js
//
// Renders an 8x8 chess board into a container element, themeable via CSS
// variables (set by themes/themeManager.js), and handles user interaction
// (click-to-select + click-to-move, and native drag-and-drop).
// Talks to the outside world only via callbacks -- it has no knowledge of
// chess.js, Stockfish, or the coach. It only knows "squares and pieces."

import { getPieceSet } from './pieces/pieceSets.js';
import { Prefs } from './preferences.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export class BoardView {
  /**
   * @param {HTMLElement} container
   * @param {Object} opts
   * @param {'w'|'b'} opts.orientation - which side is at the bottom
   * @param {(from:string, to:string)=>void} opts.onUserMove
   */
  constructor(container, { orientation = 'w', onUserMove, themeId = 'default' } = {}) {
    this.container = container;
    this.orientation = orientation;
    this.onUserMove = onUserMove;
    this.selectedSquare = null;
    this.legalTargets = [];
    this._squareEls = {};
    this._board = null; // chess.js board() snapshot, [8][8]
    this._themeId = themeId;
    this._pieceSet = resolvePieceSet(themeId);

    this._render();
  }

  _render() {
    this.container.innerHTML = '';
    this.container.classList.add('cq-board');

    const ranks = this.orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = this.orientation === 'w' ? FILES : [...FILES].reverse();

    for (const rank of ranks) {
      for (const file of files) {
        const square = `${file}${rank}`;
        const isLight = (FILES.indexOf(file) + rank) % 2 === 1;
        const el = document.createElement('div');
        el.className = `cq-square ${isLight ? 'cq-light' : 'cq-dark'}`;
        el.dataset.square = square;
        el.addEventListener('click', () => this._handleSquareClick(square));
        el.addEventListener('dragover', (e) => e.preventDefault());
        el.addEventListener('drop', (e) => {
          e.preventDefault();
          const from = e.dataTransfer.getData('text/square');
          if (from) this._tryMove(from, square);
        });
        this._squareEls[square] = el;
        this.container.appendChild(el);
      }
    }
  }

  /**
   * Smoothly glides the piece currently shown on `from` to `to`, then calls
   * `done()`. Visual only -- the caller updates the real position in done().
   * Works by cloning the piece into a floating layer and transitioning its
   * transform from the source square's position to the destination's.
   */
  animateMove(from, to, done) {
    const fromEl = this._squareEls[from];
    const toEl = this._squareEls[to];
    const pieceEl = fromEl && fromEl.querySelector('.cq-piece');
    if (!fromEl || !toEl || !pieceEl) { done?.(); return; }

    const boardRect = this.container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;

    // Floating clone so it can travel above other squares.
    const fly = pieceEl.cloneNode(true);
    fly.classList.add('cq-piece-flying');
    fly.style.left = `${fromRect.left - boardRect.left}px`;
    fly.style.top = `${fromRect.top - boardRect.top}px`;
    fly.style.width = `${fromRect.width}px`;
    fly.style.height = `${fromRect.height}px`;
    this.container.appendChild(fly);
    pieceEl.style.visibility = 'hidden';

    // Force reflow, then transition.
    void fly.offsetWidth;
    fly.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
    fly.style.zIndex = '20';

    const finish = () => {
      fly.removeEventListener('transitionend', finish);
      fly.remove();
      done?.();
    };
    fly.addEventListener('transitionend', finish);
    // Safety fallback in case transitionend doesn't fire.
    setTimeout(finish, 360);
  }

  /**
   * @param {Array} board - chess.js .board() result: 8x8 array, rank 8 first.
   */
  setPosition(board) {
    this._board = board;
    for (const square of Object.values(this._squareEls)) {
      square.innerHTML = '';
      square.classList.remove('cq-selected', 'cq-legal-target', 'cq-last-move');
    }

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (!piece) continue;
        const square = `${FILES[f]}${8 - r}`;
        const el = this._squareEls[square];
        if (!el) continue;
        el.appendChild(this._createPieceEl(piece.type, piece.color, square));
      }
    }
  }

  _createPieceEl(type, color, square) {
    const wrapper = document.createElement('div');
    wrapper.className = `cq-piece cq-piece-${color === 'w' ? 'white' : 'black'}`;
    wrapper.draggable = true;
    if (this._pieceSet === 'retro') {
      // Image-based set: <img> from /public/pieces/retro/<color><type>.png
      const img = document.createElement('img');
      img.className = 'piece-img';
      img.src = `/pieces/retro/${color}${type}.png`;
      img.alt = '';
      wrapper.appendChild(img);
    } else {
      wrapper.innerHTML = this._pieceSet[type];
    }
    wrapper.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/square', square);
      requestAnimationFrame(() => wrapper.classList.add('cq-dragging'));
    });
    wrapper.addEventListener('dragend', () => wrapper.classList.remove('cq-dragging'));
    return wrapper;
  }

  /** Highlights legal destination squares for the currently selected piece. */
  setLegalTargets(targets) {
    this.legalTargets = targets;
    for (const sq of Object.keys(this._squareEls)) {
      this._squareEls[sq].classList.toggle('cq-legal-target', targets.includes(sq));
    }
  }

  setSelected(square) {
    if (this.selectedSquare) this._squareEls[this.selectedSquare]?.classList.remove('cq-selected');
    this.selectedSquare = square;
    if (square) this._squareEls[square]?.classList.add('cq-selected');
  }

  highlightLastMove(from, to) {
    for (const sq of Object.keys(this._squareEls)) {
      this._squareEls[sq].classList.remove('cq-last-move');
    }
    this._squareEls[from]?.classList.add('cq-last-move');
    this._squareEls[to]?.classList.add('cq-last-move');
  }

  flashCheck(kingSquare) {
    const el = this._squareEls[kingSquare];
    if (!el) return;
    el.classList.add('cq-in-check');
    setTimeout(() => el.classList.remove('cq-in-check'), 900);
  }

  _handleSquareClick(square) {
    if (this.selectedSquare === square) {
      this.setSelected(null);
      this.setLegalTargets([]);
      return;
    }
    if (this.selectedSquare && this.legalTargets.includes(square)) {
      this._tryMove(this.selectedSquare, square);
      return;
    }
    // Selecting a new square is the UI layer's job to validate (it knows
    // whose turn it is and what's legal) -- we just forward the request.
    this._onRequestSelect?.(square);
  }

  _tryMove(from, to) {
    this.setSelected(null);
    this.setLegalTargets([]);
    this.onUserMove?.(from, to);
  }

  setOnRequestSelect(fn) {
    this._onRequestSelect = fn;
  }

  setClassicPieces(useClassic) {
    // Back-compat shim: route through pieceStyle.
    Prefs.pieceStyle = useClassic ? 'classic' : 'themed';
    this._pieceSet = resolvePieceSet(this._themeId);
    if (this._board) this.setPosition(this._board);
  }

  setPieceStyle(style) {
    Prefs.pieceStyle = style;
    this._pieceSet = resolvePieceSet(this._themeId);
    if (this._board) this.setPosition(this._board);
  }

  setOrientation(orientation) {
    this.orientation = orientation;
    this._render();
    if (this._board) this.setPosition(this._board);
  }
}

// Resolves the active piece set from the user's pieceStyle preference.
// 'themed' -> the theme's SVG set; 'classic' -> the standard SVG set;
// 'retro' -> the image-based pixel-art set (returns the sentinel string 'retro'
// which _createPieceEl detects to render <img> pieces).
function resolvePieceSet(themeId) {
  const style = Prefs.pieceStyle;
  if (style === 'themed') return getPieceSet(themeId);
  return getPieceSet('default'); // classic: clean standard set with a clear knight
}
