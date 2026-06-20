// src/online/onlineGameController.js
//
// Orchestrates a networked two-player match. Mirrors the single-player
// GameController's role but instead of an AI opponent, the other side's moves
// arrive over the Transport. chess.js validates every move locally; the DB row
// (or local store) is the shared source of truth so a refresh/reconnect
// resyncs from transport state.

import { Chess } from 'chess.js';

export class OnlineGameController {
  /**
   * @param {Object} params
   * @param {Object} params.transport
   * @param {Object} params.identity
   * @param {Object} params.game        - initial OnlineGame
   * @param {Object} params.audio
   */
  constructor({ transport, identity, game, audio }) {
    this.transport = transport;
    this.identity = identity;
    this.game = game;
    this.audio = audio;
    this.chess = new Chess(game.fen);

    // Which color is the local player?
    this.myColor = game.whiteId === identity.id ? 'w' : 'b';
    this.opponentName = this.myColor === 'w' ? game.blackName : game.whiteName;

    this._unsub = null;

    // UI hooks
    this.onMoveMade = null;     // ({ move, fen, mover }) => void
    this.onGameOver = null;     // ({ result }) => void
    this.onOpponentJoined = null; // (name) => void
    this.onStatus = null;       // (statusText) => void
  }

  start() {
    // Replay any moves already in the game (in case we joined mid-game).
    this.chess = new Chess();
    for (const m of this.game.moves) {
      try { this.chess.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch { /* ignore */ }
    }

    this._unsub = this.transport.subscribe(this.game.id, (g) => this._onRemoteUpdate(g));
    this.audio.play('gameStart');

    if (this.game.status === 'waiting') {
      this.onStatus?.('Waiting for an opponent to join...');
    } else {
      this.onStatus?.(`Playing against ${this.opponentName || 'opponent'}.`);
    }
  }

  get isMyTurn() {
    return this.chess.turn() === this.myColor && !this.chess.isGameOver();
  }

  async playMove(moveInput) {
    if (!this.isMyTurn) return { ok: false, reason: 'not-your-turn' };
    if (this.game.status === 'waiting') return { ok: false, reason: 'waiting' };

    let move;
    try { move = this.chess.move(moveInput); } catch { move = null; }
    if (!move) { this.audio.play('illegal'); return { ok: false, reason: 'illegal' }; }

    this._playSound(move);
    this.onMoveMade?.({ move, fen: this.chess.fen(), mover: this.myColor });

    const status = this.chess.isGameOver() ? 'finished' : 'active';
    const result = this.chess.isGameOver() ? this._describeResult() : null;

    await this.transport.sendMove({
      gameId: this.game.id,
      move: { from: move.from, to: move.to, promotion: move.promotion, san: move.san },
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      status,
      result,
    });

    if (this.chess.isGameOver()) { this._maybeUpdateRating(); this.onGameOver?.({ result }); }
    return { ok: true, move };
  }

  _onRemoteUpdate(g) {
    const prevStatus = this.game.status;
    this.game = g;

    // Opponent just joined a room we created.
    if (prevStatus === 'waiting' && g.status === 'active') {
      this.opponentName = this.myColor === 'w' ? g.blackName : g.whiteName;
      this.onOpponentJoined?.(this.opponentName);
      this.onStatus?.(`Playing against ${this.opponentName || 'opponent'}.`);
    }

    // Apply any moves we don't yet have locally (the opponent's move).
    const localCount = this.chess.history().length;
    if (g.moves.length > localCount) {
      for (let i = localCount; i < g.moves.length; i++) {
        const m = g.moves[i];
        let applied;
        try { applied = this.chess.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch { applied = null; }
        if (applied) {
          this._playSound(applied);
          this.onMoveMade?.({ move: applied, fen: this.chess.fen(), mover: applied.color });
        }
      }
    }

    if (g.status === 'finished') {
      this._maybeUpdateRating();
      this.onGameOver?.({ result: g.result || this._describeResult() });
    }
  }

  /**
   * After a finished game, update THIS player's rating via Elo (each client
   * writes only its own profile, avoiding write races). Guarded so it runs at
   * most once per game. Uses the opponent's rating from their profile, falling
   * back to an equal-rating assumption if unavailable.
   */
  async _maybeUpdateRating() {
    if (this._ratingApplied) return;
    this._ratingApplied = true;
    try {
      const { applyGameResult } = await import('./elo.js');
      const outcome = this._outcomeColor(); // 'white' | 'black' | 'draw' | null
      if (!outcome) return;

      const myRating = this.identity.rating || 800;
      let oppRating = myRating; // fallback: assume equal if no profile
      const oppId = this.myColor === 'w' ? this.game.blackId : this.game.whiteId;
      if (oppId && this.transport.getProfile) {
        const oppProfile = await this.transport.getProfile(oppId);
        if (oppProfile && typeof oppProfile.rating === 'number') oppRating = oppProfile.rating;
      }

      // Compute from white/black perspective, then read my side.
      const whiteR = this.myColor === 'w' ? myRating : oppRating;
      const blackR = this.myColor === 'b' ? myRating : oppRating;
      const res = applyGameResult(whiteR, blackR, outcome);
      const myNew = this.myColor === 'w' ? res.white : res.black;
      this._lastRatingDelta = myNew - myRating;

      this.identity.setRating(myNew);
      if (this.transport.upsertProfile) {
        await this.transport.upsertProfile({ id: this.identity.id, name: this.identity.name, rating: myNew });
      }
    } catch { /* never let rating logic break the game */ }
  }

  /** The winning color from the final position, or 'draw', or null if unclear. */
  _outcomeColor() {
    if (this.chess.isCheckmate()) {
      // After checkmate, the side to move has been mated, so the other won.
      return this.chess.turn() === 'w' ? 'black' : 'white';
    }
    if (this.chess.isDraw() || this.chess.isStalemate() ||
        this.chess.isThreefoldRepetition() || this.chess.isInsufficientMaterial()) {
      return 'draw';
    }
    // Resignations/abandonment: result text carries it; treat unknown as null.
    if (this.game.result && /resign|left/i.test(this.game.result)) {
      // If I resigned/left, I lost; otherwise I won.
      const iLost = /you resigned|you left/i.test(this.game.result);
      const meWhite = this.myColor === 'w';
      if (iLost) return meWhite ? 'black' : 'white';
      return meWhite ? 'white' : 'black';
    }
    return null;
  }

  _describeResult() {
    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'b' : 'w';
      const iWon = winner === this.myColor;
      return iWon ? 'You won by checkmate!' : 'You lost by checkmate.';
    }
    if (this.chess.isStalemate()) return 'Draw by stalemate.';
    if (this.chess.isThreefoldRepetition()) return 'Draw by repetition.';
    if (this.chess.isInsufficientMaterial()) return 'Draw by insufficient material.';
    if (this.chess.isDraw()) return 'Draw.';
    return 'Game over.';
  }

  _playSound(move) {
    if (move.san.includes('#')) this.audio.play('gameEnd');
    else if (move.san.includes('+')) this.audio.play('check');
    else if (move.san === 'O-O' || move.san === 'O-O-O') this.audio.play('castle');
    else if (move.promotion) this.audio.play('promote');
    else if (move.captured) this.audio.play('capture');
    else this.audio.play('move');
  }

  resign() {
    this.transport.sendMove({
      gameId: this.game.id,
      move: { from: '', to: '', san: 'resign' },
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      status: 'finished',
      result: 'You resigned.',
    });
    this.onGameOver?.({ result: 'You resigned.' });
  }

  destroy() {
    if (this._unsub) this._unsub();
    this.transport.leaveRoom(this.game.id, this.identity).catch(() => {});
  }
}
