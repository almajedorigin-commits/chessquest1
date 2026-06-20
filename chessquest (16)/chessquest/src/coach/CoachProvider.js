// src/coach/CoachProvider.js
//
// Abstract interface for "explain this move" providers.
// Today: RuleBasedCoach (free, instant, offline).
// Later: an LLMCoach could implement the same interface, calling a Netlify
// Function for richer prose, WITHOUT changing GameController, the UI, or
// the notes/storage layer. That is the entire point of this file existing.

/**
 * @typedef {Object} MoveInsight
 * @property {string} summary - One or two plain-language sentences.
 * @property {'brilliant'|'best'|'good'|'inaccuracy'|'mistake'|'blunder'} category
 * @property {string[]} tags - e.g. ['hanging-piece', 'missed-fork', 'king-safety']
 * @property {string} mathExplanation - centipawn/depth info translated to human terms
 * @property {number} evalBeforeCp - signed centipawn eval before the move (from mover's POV)
 * @property {number} evalAfterCp - signed centipawn eval after the move (from mover's POV)
 */

export class CoachProvider {
  /**
   * @returns {Promise<MoveInsight>}
   */
  async explainMove(/* { fenBefore, fenAfter, moveSan, lines, bestLine, mover } */) {
    throw new Error('explainMove() must be implemented by subclass');
  }

  /**
   * Optional: explain why the AI opponent chose its move (for silent-mode log).
   * @returns {Promise<MoveInsight>}
   */
  async explainOpponentMove(/* { fenBefore, fenAfter, moveSan, lines, character } */) {
    throw new Error('explainOpponentMove() must be implemented by subclass');
  }
}
