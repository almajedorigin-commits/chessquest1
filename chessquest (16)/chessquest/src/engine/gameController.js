// src/engine/gameController.js
//
// Orchestrates a single match: legal moves via chess.js, opponent moves via
// AIOpponent, move explanations via a CoachProvider, persistence via
// NotesStore, and sound cues via AudioManager. The UI layer should only
// need to call methods on this class and listen to its callbacks --
// it should never touch chess.js or Stockfish directly.

import { Chess } from 'chess.js';
import { AIOpponent } from './aiOpponent.js';
import { CoachEngine } from './coachEngine.js';
import { RuleBasedCoach, WeaknessTracker } from '../coach/RuleBasedCoach.js';
import { NotesStore } from '../storage/notesStore.js';

const COACH_ANALYSIS_DEPTH = 11;

export class GameController {
  /**
   * @param {Object} params
   * @param {Object} params.character - from src/data/characters.js
   * @param {string} params.themeId
   * @param {'live'|'silent'} params.mode
   * @param {AudioManager} params.audio
   * @param {CoachProvider} [params.coach] - defaults to RuleBasedCoach
   */
  constructor({ character, themeId, mode, audio, coach, humanColor = 'w' }) {
    this.chess = new Chess();
    this.character = character;
    this.themeId = themeId;
    this.mode = mode; // 'live' (insights shown immediately) or 'silent' (logged, revealed after)
    this.audio = audio;
    this.coach = coach || new RuleBasedCoach();
    this.humanColor = humanColor;
    this.aiColor = humanColor === 'w' ? 'b' : 'w';

    this.opponent = new AIOpponent(character);
    this.coachEngine = new CoachEngine();
    this.weaknessTracker = new WeaknessTracker();
    this.notesStore = new NotesStore();
    this.matchId = null;

    // UI hooks -- assign these from the UI layer.
    this.onMoveMade = null; // (moveResult) => void
    this.onInsight = null; // (entry) => void -- only fires in 'live' mode (surfaced immediately)
    this.onEntryRecorded = null; // (entry) => void -- fires in BOTH modes (for silent-mode reveal)
    this.onGameOver = null; // ({ result, weaknessSummary }) => void
    this.onThinking = null; // (isThinking) => void -- toggled around AI move calc
  }

  async start() {
    this.matchId = await this.notesStore.createMatch({
      themeId: this.themeId,
      characterId: this.character.id,
      characterName: this.character.name,
      elo: this.character.elo,
      mode: this.mode,
    });
    this.audio.play('gameStart');

    if (this.humanColor === 'b') {
      await this._playAiMove();
    }
  }

  /**
   * Attempts to play the human's move. moveInput can be SAN or {from,to,promotion}.
   * Returns { ok: true, move } or { ok: false, reason }.
   */
  async playHumanMove(moveInput) {
    if (this.chess.turn() !== this.humanColor) {
      return { ok: false, reason: 'not-your-turn' };
    }
    if (this.chess.isGameOver()) {
      return { ok: false, reason: 'game-over' };
    }

    const fenBefore = this.chess.fen();
    let move;
    try {
      move = this.chess.move(moveInput);
    } catch {
      move = null;
    }

    if (!move) {
      this.audio.play('illegal');
      return { ok: false, reason: 'illegal-move' };
    }

    this._playSoundForMove(move);
    const fenAfter = this.chess.fen();
    this.onMoveMade?.({ move, fenBefore, fenAfter, mover: this.humanColor });

    await this._generateAndStoreInsight({ fenBefore, fenAfter, moveSan: move.san, mover: this.humanColor });

    if (this.chess.isGameOver()) {
      await this._finish();
      return { ok: true, move };
    }

    await this._playAiMove();
    return { ok: true, move };
  }

  async _playAiMove() {
    this._aiThinking = true;
    this.onThinking?.(true);
    try {
      const fenBefore = this.chess.fen();
      const { move: uciMove, lines } = await this.opponent.chooseMove(fenBefore);
      if (!uciMove) return; // engine had nothing (shouldn't happen unless game is over)

      const moveObj = uciToMoveInput(uciMove);
      const move = this.chess.move(moveObj);
      if (!move) return;

      this._playSoundForMove(move);
      const fenAfter = this.chess.fen();
      this.onMoveMade?.({ move, fenBefore, fenAfter, mover: this.aiColor });

      // Opponent move explanation always goes to the log (both modes);
      // it's just surfaced immediately only in live mode.
      const insight = await this.coach.explainOpponentMove({
        fenBefore,
        fenAfter,
        moveSan: move.san,
        lines,
        character: this.character,
      });
      const entry = {
        moveNumber: this.chess.history().length,
        mover: this.aiColor,
        san: move.san,
        insight,
      };
      await this.notesStore.appendMove(this.matchId, entry);
      this.onEntryRecorded?.(entry);
      if (this.mode === 'live') this.onInsight?.(entry);

      if (this.chess.isGameOver()) {
        await this._finish();
      }
    } finally {
      this._aiThinking = false;
      this.onThinking?.(false);
    }
  }

  async _generateAndStoreInsight({ fenBefore, fenAfter, moveSan, mover }) {
    // IMPORTANT: a single Stockfish worker can only run one search at a time.
    // These MUST be sequential, not Promise.all -- concurrent `go` commands on
    // one engine instance corrupt each other's output. Depth 11 is plenty to
    // categorize a move accurately while staying responsive on the lite WASM.
    const analysisBefore = await this.coachEngine.analyze(fenBefore, { depth: COACH_ANALYSIS_DEPTH });
    const analysisAfter = await this.coachEngine.analyze(fenAfter, { depth: COACH_ANALYSIS_DEPTH });

    const insight = await this.coach.explainMove({
      fenBefore,
      fenAfter,
      moveSan,
      linesBefore: analysisBefore.lines,
      linesAfter: analysisAfter.lines,
      mover,
    });

    this.weaknessTracker.accumulate(insight);
    const entry = {
      moveNumber: this.chess.history().length,
      mover,
      san: moveSan,
      insight,
    };
    await this.notesStore.appendMove(this.matchId, entry);

    this.onEntryRecorded?.(entry);
    if (this.mode === 'live') this.onInsight?.(entry);
    return insight;
  }

  async _finish() {
    const result = this._describeResult();
    const weaknessSummary = this.weaknessTracker.summary();
    await this.notesStore.finishMatch(this.matchId, { result, weaknessSummary });
    this.audio.play('gameEnd');
    this.onGameOver?.({ result, weaknessSummary });
  }

  _describeResult() {
    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'b' : 'w';
      return winner === this.humanColor ? 'You won by checkmate.' : `${this.character.name} won by checkmate.`;
    }
    if (this.chess.isStalemate()) return 'Draw by stalemate.';
    if (this.chess.isThreefoldRepetition()) return 'Draw by threefold repetition.';
    if (this.chess.isInsufficientMaterial()) return 'Draw by insufficient material.';
    if (this.chess.isDrawByFiftyMoves()) return 'Draw by the fifty-move rule.';
    return 'Game over.';
  }

  /**
   * Take back the last full move pair (your move + the opponent's reply) so it
   * returns to your turn. Used by the in-game "Take back" button vs the bot.
   * Returns true if anything was undone. Cannot be used while the AI is
   * thinking or after the game has ended.
   */
  takeBack() {
    if (this._aiThinking) return false;
    if (this.chess.isGameOver()) return false;

    const history = this.chess.history({ verbose: true });
    if (!history.length) return false;

    let undone = 0;
    // Undo the opponent's last reply if the last move was theirs.
    if (history[history.length - 1].color === this.aiColor) {
      this.chess.undo();
      undone++;
    }
    // Undo back to (and including) the player's last move so it's their turn.
    if (this.chess.turn() !== this.humanColor && this.chess.history().length) {
      this.chess.undo();
      undone++;
    } else if (this.chess.history().length && this.chess.turn() === this.humanColor) {
      // Last remaining move was the player's; step it back so they can redo.
      const last = this.chess.history({ verbose: true });
      if (last.length && last[last.length - 1].color === this.humanColor) {
        this.chess.undo();
        undone++;
      }
    }

    if (undone > 0) {
      this.audio.play('move');
      this.onMoveMade?.({
        move: { from: '', to: '' },
        fenBefore: null,
        fenAfter: this.chess.fen(),
        mover: null,
        isTakeBack: true,
      });
    }
    return undone > 0;
  }

  _playSoundForMove(move) {
    if (move.san.includes('#')) {
      this.audio.play('gameEnd');
    } else if (move.san.includes('+')) {
      this.audio.play('check');
    } else if (move.san === 'O-O' || move.san === 'O-O-O') {
      this.audio.play('castle');
    } else if (move.promotion) {
      this.audio.play('promote');
    } else if (move.captured) {
      this.audio.play('capture');
    } else {
      this.audio.play('move');
    }
  }

  async getFullNotes() {
    return this.notesStore.getMatch(this.matchId);
  }

  resign() {
    return this._finish();
  }

  destroy() {
    this.opponent.destroy();
    this.coachEngine.destroy();
  }
}

function uciToMoveInput(uci) {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci.slice(4) : undefined;
  return promotion ? { from, to, promotion } : { from, to };
}
