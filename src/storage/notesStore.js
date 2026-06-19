// src/storage/notesStore.js
//
// Persists match notes across sessions using IndexedDB (not localStorage --
// structured records, larger capacity, no synchronous blocking).
// Stores one record per match: metadata, full move log with MoveInsights
// (used by both Live Coach mode and Silent mode), and the final weakness summary.

const DB_NAME = 'chessquest';
const DB_VERSION = 1;
const STORE_NAME = 'matches';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('startedAt', 'startedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class NotesStore {
  constructor() {
    this._dbPromise = openDb();
  }

  async createMatch({ themeId, characterId, characterName, elo, mode }) {
    const db = await this._dbPromise;
    const record = {
      id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      themeId,
      characterId,
      characterName,
      elo,
      mode, // 'live' | 'silent'
      startedAt: Date.now(),
      endedAt: null,
      result: null,
      moveLog: [], // [{ moveNumber, mover, san, insight }]
      weaknessSummary: null,
    };
    await txWrite(db, (store) => store.put(record));
    return record.id;
  }

  async appendMove(matchId, entry) {
    const db = await this._dbPromise;
    const record = await txRead(db, (store) => store.get(matchId));
    if (!record) return;
    record.moveLog.push(entry);
    await txWrite(db, (store) => store.put(record));
  }

  async finishMatch(matchId, { result, weaknessSummary }) {
    const db = await this._dbPromise;
    const record = await txRead(db, (store) => store.get(matchId));
    if (!record) return;
    record.endedAt = Date.now();
    record.result = result;
    record.weaknessSummary = weaknessSummary;
    await txWrite(db, (store) => store.put(record));
  }

  async getMatch(matchId) {
    const db = await this._dbPromise;
    return txRead(db, (store) => store.get(matchId));
  }

  async listMatches({ limit = 20 } = {}) {
    const db = await this._dbPromise;
    const all = await txRead(db, (store) => store.getAll());
    return all.sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
  }

  async deleteMatch(matchId) {
    const db = await this._dbPromise;
    await txWrite(db, (store) => store.delete(matchId));
  }
}

function txWrite(db, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txRead(db, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
