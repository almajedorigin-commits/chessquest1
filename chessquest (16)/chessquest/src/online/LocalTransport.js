// src/online/LocalTransport.js
//
// No-setup fallback. Uses BroadcastChannel + localStorage so two tabs/windows
// on the SAME machine can play each other (a real, playable demo of the online
// flow). It does NOT cross the internet -- two different people on different
// computers need SupabaseTransport for that. The interface is identical, so
// the UI is unchanged either way.

import { Transport } from './Transport.js';
import { Chess } from 'chess.js';

const STORE_PREFIX = 'chessquest_room_';
const QUEUE_KEY = 'chessquest_mm_queue';

function loadRoom(id) {
  try { return JSON.parse(localStorage.getItem(STORE_PREFIX + id)); } catch { return null; }
}
function saveRoom(game) {
  localStorage.setItem(STORE_PREFIX + game.id, JSON.stringify(game));
}
function code4() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export class LocalTransport extends Transport {
  constructor() {
    super();
    this._channels = new Map(); // gameId -> BroadcastChannel
  }

  async init() { /* nothing to connect */ }

  get isNetworked() { return false; }

  async createRoom({ identity }) {
    const id = code4();
    const game = {
      id,
      whiteId: identity.id,
      whiteName: identity.name,
      whiteRating: identity.rating || 800,
      blackId: null,
      blackName: null,
      fen: new Chess().fen(),
      turn: 'w',
      moves: [],
      status: 'waiting',
      result: null,
    };
    saveRoom(game);
    return { game, code: id };
  }

  async joinRoom({ code, identity }) {
    const id = String(code || '').trim().toUpperCase();
    const game = loadRoom(id);
    if (!game) throw new Error('Room not found.');
    if (game.blackId && game.blackId !== identity.id && game.whiteId !== identity.id) {
      throw new Error('Room is full.');
    }
    if (game.whiteId !== identity.id && !game.blackId) {
      game.blackId = identity.id;
      game.blackName = identity.name;
      game.status = 'active';
      saveRoom(game);
      this._broadcast(game);
    }
    return { game };
  }

  async findMatch({ identity, onWaiting }) {
    // Simple local matchmaking: if someone is waiting in the queue, pair with
    // them; otherwise post yourself and wait for a joiner.
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { /* ignore */ }
    queue = queue.filter((q) => q.id !== identity.id && Date.now() - q.at < 60000);

    if (queue.length) {
      const opponent = queue.shift();
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      const { game } = await this.createRoom({ identity });
      game.blackId = opponent.id;
      game.blackName = opponent.name;
      game.status = 'active';
      saveRoom(game);
      // Tell the waiting player which room to enter.
      const mm = new BroadcastChannel('chessquest_mm');
      mm.postMessage({ type: 'paired', forId: opponent.id, gameId: game.id });
      setTimeout(() => mm.close(), 200);
      return { game };
    }

    // No one waiting: enqueue and listen for a pairing.
    queue.push({ id: identity.id, name: identity.name, at: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    onWaiting?.();

    return new Promise((resolve, reject) => {
      const mm = new BroadcastChannel('chessquest_mm');
      this._mmChannel = mm;
      mm.onmessage = (e) => {
        if (e.data?.type === 'paired' && e.data.forId === identity.id) {
          mm.close();
          this._mmChannel = null;
          const game = loadRoom(e.data.gameId);
          if (game) resolve({ game });
          else reject(new Error('Pairing failed.'));
        }
      };
    });
  }

  async cancelMatch() {
    try {
      let queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
      // can't know identity here; UI clears by re-posting filtered queue
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch { /* ignore */ }
    if (this._mmChannel) { this._mmChannel.close(); this._mmChannel = null; }
  }

  async sendMove({ gameId, move, fen, turn, status, result }) {
    const game = loadRoom(gameId);
    if (!game) return;
    game.moves.push(move);
    game.fen = fen;
    game.turn = turn;
    if (status) game.status = status;
    if (result !== undefined) game.result = result;
    saveRoom(game);
    this._broadcast(game);
  }

  subscribe(gameId, onUpdate) {
    const ch = new BroadcastChannel(STORE_PREFIX + gameId);
    ch.onmessage = (e) => { if (e.data?.game) onUpdate(e.data.game); };
    this._channels.set(gameId, ch);

    // Also poll localStorage as a fallback for the joiner who may have missed
    // the initial broadcast (storage event covers cross-tab writes too).
    const onStorage = (e) => {
      if (e.key === STORE_PREFIX + gameId && e.newValue) {
        try { onUpdate(JSON.parse(e.newValue)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      ch.close();
      this._channels.delete(gameId);
      window.removeEventListener('storage', onStorage);
    };
  }

  _broadcast(game) {
    let ch = this._channels.get(game.id);
    if (!ch) { ch = new BroadcastChannel(STORE_PREFIX + game.id); this._channels.set(game.id, ch); }
    ch.postMessage({ game });
  }

  async leaveRoom(gameId) {
    const ch = this._channels.get(gameId);
    if (ch) { ch.close(); this._channels.delete(gameId); }
  }

  // --- Profiles & ratings (localStorage-backed for local mode) ---

  _loadProfiles() {
    try { return JSON.parse(localStorage.getItem('chessquest_profiles') || '{}'); } catch { return {}; }
  }
  _saveProfiles(p) {
    try { localStorage.setItem('chessquest_profiles', JSON.stringify(p)); } catch { /* ignore */ }
  }

  async upsertProfile({ id, name, rating }) {
    const profiles = this._loadProfiles();
    profiles[id] = { id, name, rating };
    this._saveProfiles(profiles);
  }

  async getProfile(id) {
    return this._loadProfiles()[id] || null;
  }

  async getLeaderboard(limit = 20) {
    return Object.values(this._loadProfiles())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }
}
