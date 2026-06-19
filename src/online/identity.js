// src/online/identity.js
//
// Lightweight identity. On first run the player gets an auto-generated guest
// identity (stable id + a random display name) stored in localStorage, so they
// can play online immediately with zero signup. They can optionally claim a
// display name; when Supabase is connected that name + rating sync to a
// profile row, otherwise it just persists locally.

const ID_KEY = 'chessquest_identity_v1';

const ADJECTIVES = ['Swift', 'Bold', 'Clever', 'Silent', 'Brave', 'Noble', 'Sly', 'Iron', 'Royal', 'Shadow'];
const NOUNS = ['Knight', 'Rook', 'Bishop', 'Pawn', 'Queen', 'Gambit', 'Castle', 'Falcon', 'Wolf', 'Ember'];

function randomName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}${Math.floor(Math.random() * 1000)}`;
}

function randomId() {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export class Identity {
  constructor() {
    this._data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(ID_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    const fresh = {
      id: randomId(),
      name: randomName(),
      isGuest: true,
      rating: 800, // starting Elo for online play
      createdAt: Date.now(),
    };
    this._save(fresh);
    return fresh;
  }

  _save(data) {
    try { localStorage.setItem(ID_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }

  get id() { return this._data.id; }
  get name() { return this._data.name; }
  get isGuest() { return this._data.isGuest; }
  get rating() { return this._data.rating; }
  get email() { return this._data.email || null; }
  get authId() { return this._data.authId || null; }
  get authProvider() { return this._data.authProvider || null; }
  get isVerified() { return Boolean(this._data.isVerified); }

  /** Claim a display name (turns a guest into a named local account). */
  setName(name) {
    const clean = String(name || '').trim().slice(0, 24);
    if (!clean) return;
    this._data.name = clean;
    this._data.isGuest = false;
    this._save(this._data);
  }

  setRating(rating) {
    this._data.rating = Math.round(rating);
    this._save(this._data);
  }

  /**
   * Link this identity to a verified auth account (email or Google). Keeps the
   * existing local player id and rating, so a guest who signs in doesn't lose
   * progress -- their guest history simply gets a verified identity attached.
   */
  linkAccount({ authId, email, name, provider, isVerified }) {
    this._data.authId = authId;
    this._data.email = email || this._data.email || null;
    this._data.authProvider = provider || 'email';
    this._data.isVerified = Boolean(isVerified);
    this._data.isGuest = false;
    if (name && name.trim()) this._data.name = name.trim().slice(0, 24);
    else if (this._data.isGuest && email) this._data.name = email.split('@')[0].slice(0, 24);
    this._save(this._data);
  }

  /** Sign out: drop the auth link but keep playing as the same local guest. */
  unlinkAccount() {
    delete this._data.authId;
    delete this._data.email;
    delete this._data.authProvider;
    this._data.isVerified = false;
    this._data.isGuest = true;
    this._save(this._data);
  }

  /** Reset to a brand-new guest identity. */
  reset() {
    this._data = {
      id: randomId(),
      name: randomName(),
      isGuest: true,
      rating: 800,
      createdAt: Date.now(),
    };
    this._save(this._data);
  }

  snapshot() {
    return { ...this._data };
  }
}
