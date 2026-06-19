// src/online/Transport.js
//
// Abstract transport for online play. Two implementations:
//   - SupabaseTransport (real networking, needs a Supabase project)
//   - LocalTransport (no setup; same-browser/pass-and-play fallback)
// The lobby and online game UI talk ONLY to this interface, so flipping
// between local demo and real online is a one-line swap in online/index.js.
//
// A "game" is a room with two seats (white, black), a shared move list, and a
// status. Moves are exchanged as { from, to, promotion } plus the resulting
// FEN for validation/resync.

/**
 * @typedef {Object} OnlineGame
 * @property {string} id           - room id / code
 * @property {string} whiteId
 * @property {string} blackId
 * @property {string} fen          - current authoritative position
 * @property {string} turn         - 'w' | 'b'
 * @property {Array}  moves        - [{ from, to, promotion, san }]
 * @property {string} status       - 'waiting' | 'active' | 'finished'
 * @property {string|null} result
 */

export class Transport {
  /** Resolve once the transport is ready (connected / initialized). */
  async init() { throw new Error('not implemented'); }

  /** Create a private room; returns { game, code }. */
  async createRoom(/* { identity } */) { throw new Error('not implemented'); }

  /** Join a room by code; returns { game } or throws if not joinable. */
  async joinRoom(/* { code, identity } */) { throw new Error('not implemented'); }

  /** Enter the random matchmaking queue; resolves with { game } when paired. */
  async findMatch(/* { identity, onWaiting } */) { throw new Error('not implemented'); }

  /** Cancel an in-progress matchmaking search. */
  async cancelMatch() { throw new Error('not implemented'); }

  /** Push a move to the room. */
  async sendMove(/* { gameId, move, fen, turn, status, result } */) { throw new Error('not implemented'); }

  /**
   * Subscribe to a room's updates.
   * @param {string} gameId
   * @param {(game: OnlineGame) => void} onUpdate
   * @returns {() => void} unsubscribe
   */
  subscribe(/* gameId, onUpdate */) { throw new Error('not implemented'); }

  /** Leave / clean up a room. */
  async leaveRoom(/* gameId, identity */) { throw new Error('not implemented'); }

  /** True if this transport actually networks across devices. */
  get isNetworked() { return false; }
}
