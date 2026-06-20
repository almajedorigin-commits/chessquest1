// src/coach/RuleBasedCoach.js
//
// Default, free, fully offline implementation of CoachProvider.
// Turns Stockfish's numbers (centipawns, depth, principal variation) and
// chess.js's board state into plain-English sentences -- the same kind of
// translation chess.com's Game Review performs, just rule-based instead
// of a trained "explain the move" model. No network calls, no API key.

import { Chess } from 'chess.js';
import { CoachProvider } from './CoachProvider.js';

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export class RuleBasedCoach extends CoachProvider {
  /**
   * @param {Object} params
   * @param {string} params.fenBefore - position before the human's move
   * @param {string} params.fenAfter - position after the human's move
   * @param {string} params.moveSan - the move just played, in SAN
   * @param {Array} params.linesBefore - engine MultiPV analysis of fenBefore (mover's POV)
   * @param {Array} params.linesAfter - engine MultiPV analysis of fenAfter (opponent's POV)
   * @param {'w'|'b'} params.mover
   */
  async explainMove({ fenBefore, fenAfter, moveSan, linesBefore, linesAfter, mover }) {
    const before = new Chess(fenBefore);
    const after = new Chess(fenAfter);

    const bestLineBefore = linesBefore?.[0];
    const playedWasBest = bestLineBefore && sanMatchesUci(before, moveSan, bestLineBefore.move);

    // Stockfish reports score relative to the side to move IN THE ANALYZED
    // position. fenBefore has `mover` to move, so its eval is already from the
    // mover's POV. fenAfter has the OPPONENT to move, so its eval is from the
    // opponent's POV -- we negate it to express everything from the mover's POV.
    const evalBeforeCp = lineToCp(bestLineBefore);            // mover's POV
    const bestLineAfter = linesAfter?.[0];
    const evalAfterCp = bestLineAfter != null
      ? -lineToCp(bestLineAfter)                              // flip opponent POV -> mover POV
      : evalBeforeCp;

    const swingCp = evalAfterCp - evalBeforeCp; // negative = move lost ground

    const category = categorizeSwing(swingCp, playedWasBest);
    const tags = detectTags({ before, after, moveSan, mover });
    const mathExplanation = humanizeMath({ evalBeforeCp, evalAfterCp, swingCp, bestLineBefore, before });
    const summary = buildSummary({ category, tags, moveSan, swingCp, bestLineBefore, before, mover });

    return { summary, category, tags, mathExplanation, evalBeforeCp, evalAfterCp };
  }

  async explainOpponentMove({ fenBefore, fenAfter, moveSan, lines, character }) {
    const before = new Chess(fenBefore);
    const after = new Chess(fenAfter);
    const mover = before.turn();
    const bestLine = lines?.[0];
    const tags = detectTags({ before, after, moveSan, mover });

    const flavor = character?.blurb ? ` (${character.name} \u2014 ${character.blurb})` : '';
    const reasonBits = [];
    if (tags.includes('capture')) reasonBits.push('captured material');
    if (tags.includes('check')) reasonBits.push('gave check');
    if (tags.includes('development')) reasonBits.push('developed a piece');
    if (bestLine?.scoreMate != null) {
      reasonBits.push(`is working toward a forced mate in ${Math.abs(bestLine.scoreMate)}`);
    }
    const reasonText = reasonBits.length ? reasonBits.join(', ') : 'kept the position flexible';

    return {
      summary: `${character?.name || 'The opponent'} played ${moveSan} because it ${reasonText}.${flavor}`,
      category: 'best',
      tags,
      mathExplanation: bestLine
        ? humanizeMath({ evalBeforeCp: lineToCp(bestLine), evalAfterCp: lineToCp(bestLine), swingCp: 0, bestLineBefore: bestLine, before })
        : 'No deep analysis available for this move.',
      evalBeforeCp: bestLine ? lineToCp(bestLine) : 0,
      evalAfterCp: bestLine ? lineToCp(bestLine) : 0,
    };
  }
}

function opposite(color) {
  return color === 'w' ? 'b' : 'w';
}

// Converts an engine line to a centipawn number FROM THE POV OF THE SIDE TO
// MOVE in the analyzed position. Mate scores become large signed values so
// arithmetic (swings, comparisons) stays well-defined; the sign follows whose
// mate it is (+ = side-to-move is mating, - = side-to-move is getting mated).
function lineToCp(line) {
  if (!line) return 0;
  if (line.scoreMate != null) return line.scoreMate > 0 ? 100000 : -100000;
  return line.scoreCp ?? 0;
}

function sanMatchesUci(chessInstance, san, uciMove) {
  if (!uciMove) return false;
  try {
    const verboseMoves = chessInstance.moves({ verbose: true });
    const match = verboseMoves.find((m) => m.san === san);
    return match && `${match.from}${match.to}${match.promotion || ''}` === uciMove;
  } catch {
    return false;
  }
}

function categorizeSwing(swingCp, playedWasBest) {
  if (playedWasBest) return swingCp >= -10 ? 'best' : 'good';
  if (swingCp >= -10) return 'good';
  if (swingCp >= -50) return 'inaccuracy';
  if (swingCp >= -150) return 'mistake';
  return 'blunder';
}

/**
 * Detects simple, explainable tactical tags by comparing before/after board
 * state -- no neural net needed, just chess.js queries.
 */
function detectTags({ before, after, moveSan, mover }) {
  const tags = [];
  const opp = opposite(mover);

  if (moveSan.includes('x')) tags.push('capture');
  if (moveSan.includes('+') || moveSan.includes('#')) tags.push('check');
  if (moveSan === 'O-O' || moveSan === 'O-O-O') tags.push('castle');

  // Did the moved piece land on a square the opponent attacks, with no defender?
  const verboseMoves = before.moves({ verbose: true });
  const playedMove = verboseMoves.find((m) => m.san === moveSan);
  if (playedMove) {
    const destPiece = after.get(playedMove.to);
    if (destPiece && destPiece.color === mover) {
      const attackedByOpp = after.isAttacked(playedMove.to, opp);
      const defendedByMover = after.isAttacked(playedMove.to, mover);
      if (attackedByOpp && !defendedByMover) {
        tags.push('hanging-piece');
      }
    }
    if (playedMove.piece !== 'p' && playedMove.piece !== 'k') {
      const fromRank = mover === 'w' ? '1' : '8';
      if (playedMove.from[1] === fromRank) tags.push('development');
    }
  }

  // Did this move leave behind a piece that is now hanging?
  const ownPiecesAfter = after.board().flat().filter((sq) => sq && sq.color === mover);
  for (const piece of ownPiecesAfter) {
    // (kept lightweight intentionally -- full scan is cheap on an 8x8 board)
  }

  return tags;
}

function humanizeMath({ evalBeforeCp, evalAfterCp, swingCp, bestLineBefore, before }) {
  const depth = bestLineBefore?.depth;
  const isMate = bestLineBefore?.scoreMate != null;
  const parts = [];

  // When the position is a forced mate, pawn counts are meaningless -- describe
  // the mate directly instead of dividing a sentinel value by 100.
  if (isMate) {
    const n = Math.abs(bestLineBefore.scoreMate);
    const who = bestLineBefore.scoreMate > 0 ? 'the side to move' : 'the opponent';
    parts.push(`The engine sees a forced checkmate for ${who} in ${n} move${n === 1 ? '' : 's'} (searching ${depth || 'several'} plies deep).`);
    if (Math.abs(swingCp) >= 10 && Math.abs(swingCp) < 50000) {
      const pawnsLost = Math.abs(swingCp / 100).toFixed(1);
      parts.push(`This move shifted the evaluation by about ${pawnsLost} pawn${pawnsLost === '1.0' ? '' : 's'} relative to the best line.`);
    }
    return parts.join(' ');
  }

  const pawnsBefore = (evalBeforeCp / 100).toFixed(1);
  const pawnsLost = Math.abs(swingCp / 100).toFixed(1);

  parts.push(
    `Before this move, the engine valued the position at about ${signedPawns(pawnsBefore)} pawns of advantage (it looked ${depth || 'several'} moves ahead to reach that estimate).`
  );

  if (Math.abs(swingCp) >= 10) {
    parts.push(
      swingCp < 0
        ? `This move gave back roughly ${pawnsLost} pawn${pawnsLost === '1.0' ? '' : 's'} worth of advantage compared to the best available continuation.`
        : `This move held or slightly improved the position by about ${pawnsLost} pawn${pawnsLost === '1.0' ? '' : 's'} compared to expectation.`
    );
  } else {
    parts.push('This move kept the evaluation essentially unchanged from the best available continuation.');
  }

  return parts.join(' ');
}

function signedPawns(pawnsStr) {
  const n = parseFloat(pawnsStr);
  return n >= 0 ? `+${pawnsStr}` : pawnsStr;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildSummary({ category, tags, moveSan, swingCp, bestLineBefore, before, mover }) {
  const bestSanHint = bestLineBefore?.move ? uciHintToReadable(before, bestLineBefore.move) : null;

  if (category === 'best' || category === 'good') {
    if (tags.includes('hanging-piece')) {
      return `${moveSan} is fine materially for now, but keep an eye on that piece next move -- it's sitting undefended.`;
    }
    return pick([
      `${moveSan} -- nice, that's right at the top of the engine's list. Solid choice.`,
      `${moveSan} matches the engine's strongest continuation here. Well played.`,
      `Good one. ${moveSan} is exactly what the position called for.`,
      `${moveSan} keeps you on the best path. The engine agrees with you here.`,
    ]);
  }

  const lossNote = bestSanHint ? ` ${bestSanHint} was stronger.` : '';

  if (tags.includes('hanging-piece')) {
    return pick([
      `Careful -- ${moveSan} leaves a piece hanging, free for the taking.${lossNote}`,
      `${moveSan} drops a piece undefended; your opponent can just grab it.${lossNote}`,
    ]);
  }

  if (category === 'inaccuracy') {
    return pick([
      `${moveSan} is a small slip -- not losing, just a little loose.${lossNote}`,
      `${moveSan} is okay, but it lets a bit of your edge slip away.${lossNote}`,
      `Slight inaccuracy with ${moveSan}. Nothing fatal.${lossNote}`,
    ]);
  }
  if (category === 'mistake') {
    return pick([
      `${moveSan} is a real mistake -- it hands your opponent a meaningful edge.${lossNote}`,
      `That one stings a bit: ${moveSan} gives away ground.${lossNote}`,
    ]);
  }
  if (category === 'blunder') {
    return pick([
      `Ouch -- ${moveSan} is a serious blunder that likely costs material or the game.${lossNote}`,
      `${moveSan} is a big one; this probably loses material outright.${lossNote}`,
      `That's a blunder. ${moveSan} lets your opponent take a decisive edge.${lossNote}`,
    ]);
  }
  return `${moveSan} was played.`;
}

function uciHintToReadable(chessInstance, uciMove) {
  try {
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const verbose = chessInstance.moves({ verbose: true });
    const match = verbose.find((m) => m.from === from && m.to === to);
    return match ? match.san : `${from}-${to}`;
  } catch {
    return null;
  }
}

/**
 * Aggregates a session's MoveInsights into a running "weakness profile."
 * Call accumulate() after every human move; read summary() any time.
 */
export class WeaknessTracker {
  constructor() {
    this.counts = {
      'hanging-piece': 0,
      'missed-fork': 0,
      'missed-pin': 0,
      'king-safety': 0,
      blunder: 0,
      mistake: 0,
      inaccuracy: 0,
    };
    this.totalMoves = 0;
  }

  accumulate(insight) {
    this.totalMoves += 1;
    if (insight.category in this.counts) this.counts[insight.category] += 1;
    for (const tag of insight.tags) {
      if (tag in this.counts) this.counts[tag] += 1;
    }
  }

  summary() {
    const issues = Object.entries(this.counts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);

    if (!issues.length) return 'No recurring weaknesses spotted yet -- clean game so far.';

    const top = issues.slice(0, 3).map(([key, n]) => `${labelFor(key)} (${n}x)`);
    return `Recurring patterns this match: ${top.join(', ')}.`;
  }
}

function labelFor(key) {
  const labels = {
    'hanging-piece': 'leaving pieces undefended',
    'missed-fork': 'missed forks',
    'missed-pin': 'missed pins',
    'king-safety': 'king safety lapses',
    blunder: 'blunders',
    mistake: 'mistakes',
    inaccuracy: 'inaccuracies',
  };
  return labels[key] || key;
}
