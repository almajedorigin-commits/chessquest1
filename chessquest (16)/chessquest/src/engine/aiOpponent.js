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
    // Weak opponents need a wider candidate list so blundering can reach
    // genuinely bad moves; strong ones only need a few for personality.
    this.engine.setMultiPV(this.character.elo < 1200 ? 8 : MULTIPV_FOR_PERSONALITY);
    this._initialized = true;
  }

  /**
   * Returns the move this character will play, plus the full analysis
   * (used later by the coach to explain what the engine considered).
   */
  async chooseMove(fen) {
    await this.init();
    this.engine.setPosition(fen);
    // Use the weak-region depth cap if one is set (shallow search = weaker).
    const depth = this.engine.depthCap || ANALYSIS_DEPTH_FOR_PLAY;
    const { lines, bestMove } = await this.engine.analyze({ depth });

    if (!lines.length) {
      return { move: bestMove, lines: [], usedPersonality: false };
    }

    // Rating-based blundering. Stockfish even at Skill 0 rarely hangs pieces,
    // but a real 300-900 player does constantly. So below ~1200 we sometimes
    // deliberately pick a worse candidate move. The lower the Elo, the higher
    // the blunder chance and the worse the move we'll accept.
    const elo = this.character.elo;
    if (elo < 1200 && lines.length > 1) {
      // blunderChance: ~0.7 at 300 down to ~0.05 at 1200.
      const t = Math.max(0, Math.min(1, (1200 - elo) / 900));
      const blunderChance = 0.05 + t * 0.65;
      if (Math.random() < blunderChance) {
        // Pick from the weaker candidates. At the lowest Elo, allow the worst
        // available line; higher up, only slightly-worse lines.
        const worstIdx = lines.length - 1;
        const reach = Math.max(1, Math.round(t * worstIdx));
        const idx = 1 + Math.floor(Math.random() * reach);
        const chosen = lines[Math.min(idx, worstIdx)];
        return { move: chosen.move, lines, usedPersonality: false, blundered: true };
      }
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
