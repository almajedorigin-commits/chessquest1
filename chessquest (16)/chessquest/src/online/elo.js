// src/online/elo.js
//
// Standard Elo rating math. Used to update both players' ratings after an
// online game finishes. Kept separate and pure so it's easy to test.
//
// score: 1 = win, 0.5 = draw, 0 = loss (from the player's perspective).

const DEFAULT_K = 32;

/** Expected score for A against B (0..1). */
export function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * New rating for a player given their rating, opponent rating, and result.
 * @param {number} rating
 * @param {number} opponentRating
 * @param {number} score 1 win, 0.5 draw, 0 loss
 * @param {number} [k]
 * @returns {number} new rating (rounded, floored at 100)
 */
export function newRating(rating, opponentRating, score, k = DEFAULT_K) {
  const expected = expectedScore(rating, opponentRating);
  const next = rating + k * (score - expected);
  return Math.max(100, Math.round(next));
}

/**
 * Compute both players' new ratings from a finished game.
 * @param {number} whiteRating
 * @param {number} blackRating
 * @param {'white'|'black'|'draw'} outcome
 * @returns {{ white: number, black: number, whiteDelta: number, blackDelta: number }}
 */
export function applyGameResult(whiteRating, blackRating, outcome) {
  const whiteScore = outcome === 'white' ? 1 : outcome === 'draw' ? 0.5 : 0;
  const blackScore = outcome === 'black' ? 1 : outcome === 'draw' ? 0.5 : 0;
  const white = newRating(whiteRating, blackRating, whiteScore);
  const black = newRating(blackRating, whiteRating, blackScore);
  return {
    white,
    black,
    whiteDelta: white - whiteRating,
    blackDelta: black - blackRating,
  };
}
