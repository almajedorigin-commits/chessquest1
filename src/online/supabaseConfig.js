// src/online/supabaseConfig.js
//
// Reads Supabase credentials from Vite env vars. To enable REAL online play:
//   1. Create a free project at https://supabase.com
//   2. Run the SQL in supabase/schema.sql in the SQL editor
//   3. Copy your project URL + anon key into a .env file (see .env.example)
//   4. Rebuild / redeploy
// If these are absent, the app automatically uses the no-setup LocalTransport.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
