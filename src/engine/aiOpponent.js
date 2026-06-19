// src/engine/aiOpponent.js
//
// Combines a Character (elo + personality) with the raw StockfishEngine
// to produce a ready-to-use opponent. This is the seam where, if you ever
// want to plug in a genuinely different model per character instead of
// Elo-limited Stockfish, you'd swap the implementation behind this class
// without touching the UI or coach layers.

import { StockfishEngine } from './stockfishEngine.js';
import { pickPersonalityMove } from './stockfishEngine.js';

const ANALYSIS_DEPTH_FOR_PLAY = 14;
const MULTIPV_FOR_PERSONALITY = 4;

export class AIOpponent {
  constructor(character) {
    this.character = character;
    this.engine = new StockfishEngine();
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    await this.engine.init();
    this.engine.setElo(this.character.elo);
    this.engine.setMultiPV(MULTIPV_FOR_PERSONALITY);
    this._initialized = true;
  }

  /**
   * Returns the move this character will play, plus the full analysis
   * (used later by the coach to explain what the engine considered).
   */
  async chooseMove(fen) {
    await this.init();
    this.engine.setPosition(fen);
    const { lines, bestMove } = await this.engine.analyze({ depth: ANALYSIS_DEPTH_FOR_PLAY });

    if (!lines.length) {
      return { move: bestMove, lines: [], usedPersonality: false };
    }

    const personalityMove = pickPersonalityMove(lines, {
      aggression: this.character.aggression,
      patience: this.character.patience,
    });

    return {
      move: personalityMove || bestMove,
      lines,
      usedPersonality: personalityMove !== lines[0].move,
    };
  }

  /**
   * Pure analysis call (no personality bias) -- used by the coach to
   * evaluate the HUMAN's move objectively, regardless of which character
   * they're playing against.
   */
  async analyzePosition(fen, { depth = 14 } = {}) {
    await this.init();
    this.engine.setPosition(fen);
    return this.engine.analyze({ depth });
  }

  destroy() {
    this.engine.destroy();
    this._initialized = false;
  }
}
