// src/online/index.js
//
// Single place that decides which transport to use. If Supabase credentials
// are present, real networked play is used; otherwise the no-setup local
// fallback. The rest of the app calls getTransport()/getIdentity() and never
// needs to know which backend is active.

import { Identity } from './identity.js';
import { LocalTransport } from './LocalTransport.js';
import { isSupabaseConfigured } from './supabaseConfig.js';

let _identity = null;
let _transport = null;

export function getIdentity() {
  if (!_identity) _identity = new Identity();
  return _identity;
}

export async function getTransport() {
  if (_transport) return _transport;
  if (isSupabaseConfigured()) {
    // Lazy-import so the Supabase client isn't bundled into the critical path
    // when it's not configured.
    const { SupabaseTransport } = await import('./SupabaseTransport.js');
    _transport = new SupabaseTransport();
  } else {
    _transport = new LocalTransport();
  }
  await _transport.init();
  return _transport;
}

export function isOnlineNetworked() {
  return isSupabaseConfigured();
}
