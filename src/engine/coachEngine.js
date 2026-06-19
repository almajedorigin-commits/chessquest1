// src/engine/coachEngine.js
//
// A SECOND Stockfish instance, run at full strength (no UCI_LimitStrength),
// used exclusively to evaluate positions for the coach. This must be separate
// from the opponent's engine: the opponent is deliberately weakened to its
// character's Elo, so using it for analysis would produce evaluations as weak
// as a 300-Elo player -- useless for coaching. The coach needs the objective
// truth about a position regardless of which character you're facing.

import { StockfishEngine } from './stockfishEngine.js';

export class CoachEngine {
  constructor() {
    this.engine = new StockfishEngine();
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    await this.engine.init();
    // Full strength: no UCI_LimitStrength. MultiPV 3 lets the coach mention
    // alternative best moves ("X was stronger") when categorizing mistakes.
    this.engine.setMultiPV(3);
    this._initialized = true;
  }

  async analyze(fen, { depth = 11 } = {}) {
    await this.init();
    this.engine.setPosition(fen);
    return this.engine.analyze({ depth });
  }

  destroy() {
    this.engine.destroy();
    this._initialized = false;
  }
}
