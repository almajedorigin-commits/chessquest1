// src/online/SupabaseTransport.js
//
// Real networked online play. Uses Supabase Postgres as the source of truth for
// game state (so reconnecting players resync) and Supabase Realtime for instant
// move delivery. Same interface as LocalTransport, so the UI is identical.
//
// Requires the schema in supabase/schema.sql and credentials in .env.
// See supabase/SUPABASE_SETUP.md for the 10-minute setup.

import { createClient } from '@supabase/supabase-js';
import { Transport } from './Transport.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';
import { Chess } from 'chess.js';

function code4() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export class SupabaseTransport extends Transport {
  constructor() {
    super();
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
    this._channels = new Map();
  }

  async init() {
    // Sign in anonymously so row-level security has an auth.uid() to key on.
    const { data } = await this.client.auth.getSession();
    if (!data.session) {
      await this.client.auth.signInAnonymously();
    }
  }

  get isNetworked() { return true; }

  async createRoom({ identity }) {
    const id = code4();
    const startFen = new Chess().fen();
    const row = {
      id,
      white_id: identity.id,
      white_name: identity.name,
      white_rating: identity.rating || 800,
      black_id: null,
      black_name: null,
      fen: startFen,
      turn: 'w',
      moves: [],
      status: 'waiting',
      result: null,
    };
    const { error } = await this.client.from('games').insert(row);
    if (error) throw new Error('Could not create room: ' + error.message);
    return { game: rowToGame(row), code: id };
  }

  async joinRoom({ code, identity }) {
    const id = String(code || '').trim().toUpperCase();
    const { data: existing, error: readErr } = await this.client
      .from('games').select('*').eq('id', id).single();
    if (readErr || !existing) throw new Error('Room not found.');

    if (existing.white_id === identity.id || existing.black_id === identity.id) {
      return { game: rowToGame(existing) };
    }
    if (existing.black_id) throw new Error('Room is full.');

    const { data: updated, error } = await this.client
      .from('games')
      .update({ black_id: identity.id, black_name: identity.name, status: 'active' })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error('Could not join: ' + error.message);
    return { game: rowToGame(updated) };
  }

  async findMatch({ identity, onWaiting }) {
    const myRating = identity.rating || 800;
    // Prefer a waiting opponent within a rating band; widen if none close.
    const bands = [150, 400, Infinity];
    let claimed = null;
    for (const band of bands) {
      let q = this.client
        .from('games')
        .select('*')
        .eq('status', 'waiting')
        .is('black_id', null)
        .neq('white_id', identity.id)
        .order('created_at', { ascending: true })
        .limit(5);
      if (band !== Infinity) {
        q = q.gte('white_rating', myRating - band).lte('white_rating', myRating + band);
      }
      const { data: open } = await q;
      if (open && open.length) {
        // Try to claim the closest-rated open room.
        const sorted = open.sort((a, b) =>
          Math.abs((a.white_rating || 800) - myRating) - Math.abs((b.white_rating || 800) - myRating));
        for (const room of sorted) {
          const { data: updated, error } = await this.client
            .from('games')
            .update({ black_id: identity.id, black_name: identity.name, status: 'active' })
            .eq('id', room.id)
            .is('black_id', null) // guard against a race
            .select('*')
            .single();
          if (!error && updated) { claimed = updated; break; }
        }
      }
      if (claimed) break;
    }
    if (claimed) return { game: rowToGame(claimed) };

    // No suitable open room: create one and wait for someone to join.
    const { game } = await this.createRoom({ identity });
    onWaiting?.();
    return new Promise((resolve) => {
      const unsub = this.subscribe(game.id, (g) => {
        if (g.status === 'active' && g.blackId) {
          unsub();
          resolve({ game: g });
        }
      });
      this._matchUnsub = unsub;
    });
  }

  async cancelMatch() {
    if (this._matchUnsub) { this._matchUnsub(); this._matchUnsub = null; }
  }

  async sendMove({ gameId, move, fen, turn, status, result }) {
    // Append move + advance authoritative state. The DB row is the source of
    // truth; Realtime postgres_changes notifies the opponent.
    const { data: current } = await this.client
      .from('games').select('moves').eq('id', gameId).single();
    const moves = (current?.moves || []).concat([move]);
    const patch = { moves, fen, turn };
    if (status) patch.status = status;
    if (result !== undefined) patch.result = result;
    await this.client.from('games').update(patch).eq('id', gameId);
  }

  subscribe(gameId, onUpdate) {
    const channel = this.client
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => onUpdate(rowToGame(payload.new))
      )
      .subscribe();
    this._channels.set(gameId, channel);
    return () => {
      this.client.removeChannel(channel);
      this._channels.delete(gameId);
    };
  }

  async leaveRoom(gameId, identity) {
    // Mark the game finished if a player abandons it.
    await this.client
      .from('games')
      .update({ status: 'finished', result: 'A player left the game.' })
      .eq('id', gameId);
    const ch = this._channels.get(gameId);
    if (ch) { this.client.removeChannel(ch); this._channels.delete(gameId); }
  }

  // --- Profiles & ratings ---

  /** Create/update a player's profile row (name + rating). */
  async upsertProfile({ id, name, rating }) {
    await this.client.from('profiles').upsert({ id, name, rating }).eq('id', id);
  }

  /** Fetch a single profile (or null). */
  async getProfile(id) {
    const { data } = await this.client.from('profiles').select('*').eq('id', id).single();
    return data || null;
  }

  /** Top players by rating for the leaderboard. */
  async getLeaderboard(limit = 20) {
    const { data } = await this.client
      .from('profiles')
      .select('id, name, rating')
      .order('rating', { ascending: false })
      .limit(limit);
    return data || [];
  }
}

function rowToGame(row) {
  return {
    id: row.id,
    whiteId: row.white_id,
    whiteName: row.white_name,
    blackId: row.black_id,
    blackName: row.black_name,
    fen: row.fen,
    turn: row.turn,
    moves: row.moves || [],
    status: row.status,
    result: row.result,
  };
}
