// src/engine/stockfishEngine.js
//
// Thin wrapper around the Stockfish 18 lite (single-threaded) WASM build.
// Responsibilities:
//   1. Load the engine as a Web Worker and speak UCI over postMessage.
//   2. Apply UCI_LimitStrength + UCI_Elo so a single engine binary covers
//      the full 300-3000 Elo range (no separate trained models needed).
//   3. Use MultiPV to gather several candidate moves near the top evaluation,
//      then pick among them using a "personality" bias (aggression/patience)
//      so different characters feel different even at the same Elo.
//   4. Expose getBestMove() AND getAnalysis() (eval + PV) so the coach layer
//      can explain moves, not just play them.

const ENGINE_JS_PATH = '/engine/stockfish-18-lite-single.js';

export class StockfishEngine {
  constructor() {
    this._worker = null;
    this._ready = false;
    this._readyPromise = null;
    this._pendingResolvers = [];
  }

  async init() {
    if (this._readyPromise) return this._readyPromise;

    this._readyPromise = new Promise((resolve, reject) => {
      try {
        this._worker = new Worker(ENGINE_JS_PATH);
      } catch (err) {
        reject(new Error('Failed to start Stockfish worker: ' + err.message));
        return;
      }

      const onMessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (line === 'uciok') {
          this._send('isready');
        } else if (line === 'readyok') {
          this._ready = true;
          this._worker.removeEventListener('message', onMessage);
          this._attachMainListener();
          resolve();
        }
      };

      this._worker.addEventListener('message', onMessage);
      this._worker.onerror = (err) => reject(err);
      this._send('uci');
    });

    return this._readyPromise;
  }

  _attachMainListener() {
    this._worker.addEventListener('message', (e) => {
      const line = typeof e.data === 'string' ? e.data : '';
      for (const handler of this._pendingResolvers) {
        handler(line);
      }
    });
  }

  _send(cmd) {
    this._worker.postMessage(cmd);
  }

  /**
   * Configure engine strength. elo should be in [300, 3000].
   * UCI_LimitStrength + UCI_Elo lets one binary cover the whole range.
   */
  setElo(elo) {
    const clamped = Math.max(300, Math.min(3000, Math.round(elo)));
    this._send('setoption name UCI_LimitStrength value true');
    this._send(`setoption name UCI_Elo value ${clamped}`);
  }

  setMultiPV(n) {
    this._send(`setoption name MultiPV value ${Math.max(1, Math.min(8, n))}`);
  }

  setPosition(fen, moves = []) {
    const movesStr = moves.length ? ` moves ${moves.join(' ')}` : '';
    this._send(`position fen ${fen}${movesStr}`);
  }

  /**
   * Runs a search and resolves with:
   *   { lines: [{ move, scoreCp, scoreMate, pv, depth, multipv }], bestMove }
   * lines is sorted by multipv rank (1 = best).
   * Uses "go depth N" for deterministic, fast, CPU-bounded search
   * (no wall-clock movetime so behavior is consistent across machines).
   */
  analyze({ depth = 12, movetime = null } = {}) {
    return new Promise((resolve) => {
      const lines = new Map();
      let bestMove = null;

      const handler = (line) => {
        if (line.startsWith('info') && line.includes('multipv')) {
          const parsed = parseInfoLine(line);
          if (parsed) lines.set(parsed.multipv, parsed);
        } else if (line.startsWith('bestmove')) {
          bestMove = line.split(' ')[1];
          this._pendingResolvers = this._pendingResolvers.filter((h) => h !== handler);
          resolve({
            lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv),
            bestMove,
          });
        }
      };

      this._pendingResolvers.push(handler);
      const goCmd = movetime ? `go movetime ${movetime}` : `go depth ${depth}`;
      this._send(goCmd);
    });
  }

  destroy() {
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
  }
}

function parseInfoLine(line) {
  const multipvMatch = line.match(/multipv (\d+)/);
  const depthMatch = line.match(/depth (\d+)/);
  const cpMatch = line.match(/score cp (-?\d+)/);
  const mateMatch = line.match(/score mate (-?\d+)/);
  const pvMatch = line.match(/ pv (.+)$/);

  if (!multipvMatch || !pvMatch) return null;

  const pv = pvMatch[1].trim().split(' ');
  return {
    multipv: parseInt(multipvMatch[1], 10),
    depth: depthMatch ? parseInt(depthMatch[1], 10) : null,
    scoreCp: cpMatch ? parseInt(cpMatch[1], 10) : null,
    scoreMate: mateMatch ? parseInt(mateMatch[1], 10) : null,
    pv,
    move: pv[0],
  };
}

/**
 * Picks a move among the top engine lines using a personality bias.
 * Only considers lines within `toleranceCp` of the best line's eval,
 * so personality NEVER causes a genuine blunder relative to the engine's
 * own assessment at this depth -- it only flavors choices among
 * near-equally-good moves.
 *
 * aggression: prefers lines whose PV looks tactical (captures/checks early)
 * patience:   prefers lines that are quieter (no early captures/checks)
 */
export function pickPersonalityMove(lines, { aggression = 0.5, patience = 0.5 } = {}) {
  if (!lines.length) return null;
  const best = lines[0];
  const bestScore = best.scoreMate != null ? (best.scoreMate > 0 ? 100000 : -100000) : best.scoreCp ?? 0;

  const toleranceCp = 35; // ~1/3 of a pawn -- small enough to never pick a real mistake
  const candidates = lines.filter((l) => {
    const score = l.scoreMate != null ? (l.scoreMate > 0 ? 100000 : -100000) : l.scoreCp ?? 0;
    return Math.abs(score - bestScore) <= toleranceCp;
  });

  if (candidates.length === 1) return candidates[0].move;

  const scored = candidates.map((l) => {
    const tacticalness = estimateTacticalness(l.pv);
    const personalityScore = aggression * tacticalness - patience * tacticalness;
    return { move: l.move, personalityScore };
  });

  scored.sort((a, b) => b.personalityScore - a.personalityScore);
  return scored[0].move;
}

function estimateTacticalness(pv) {
  // Heuristic: longer PV with early forcing moves (captures notated by
  // destination overlap isn't knowable from UCI alone without the position,
  // so we approximate using PV length as a proxy -- shorter forced sequences
  // toward mate/material gain tend to be tactical lines).
  return pv.length <= 4 ? 1 : pv.length <= 8 ? 0.5 : 0.2;
}
