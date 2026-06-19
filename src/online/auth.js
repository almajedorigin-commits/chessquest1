// src/online/auth.js
//
// Wraps Supabase Auth for optional verified accounts. Three sign-in paths:
//   - email + password (with email verification)
//   - magic link (passwordless email)
//   - Google OAuth
// When Supabase isn't configured, every method returns a friendly "not
// available" result instead of throwing, so guest/local play is unaffected.
//
// On a successful, verified sign-in, the result is linked into the existing
// local Identity (see identity.linkAccount) so a guest keeps their id/rating.

import { isSupabaseConfigured } from './supabaseConfig.js';

let _client = null;

async function getAuthClient() {
  if (!isSupabaseConfigured()) return null;
  if (_client) return _client;
  const { createClient } = await import('@supabase/supabase-js');
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('./supabaseConfig.js');
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

const NOT_CONFIGURED = {
  ok: false,
  reason: 'not-configured',
  message: 'Accounts need the online server connected. You can keep playing as a guest.',
};

export const Auth = {
  available() {
    return isSupabaseConfigured();
  },

  /** Returns the current signed-in user (or null), reading the live session. */
  async currentUser() {
    const client = await getAuthClient();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data?.user || null;
  },

  /** Sign up with email + password. Triggers a verification email if enabled. */
  async signUpEmail({ email, password, name }) {
    const client = await getAuthClient();
    if (!client) return NOT_CONFIGURED;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name || '' },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { ok: false, reason: 'error', message: error.message };
    // If email confirmation is ON, there's no session yet -- user must verify.
    const needsVerification = !data.session;
    return {
      ok: true,
      needsVerification,
      user: data.user,
      message: needsVerification
        ? 'Check your inbox and click the verification link to finish signing up.'
        : 'Account created.',
    };
  },

  /** Sign in with existing email + password. */
  async signInEmail({ email, password }) {
    const client = await getAuthClient();
    if (!client) return NOT_CONFIGURED;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: 'error', message: error.message };
    if (!data.user?.email_confirmed_at && !data.user?.confirmed_at) {
      return { ok: false, reason: 'unverified', message: 'Please verify your email first (check your inbox).' };
    }
    return { ok: true, user: data.user, message: 'Signed in.' };
  },

  /** Passwordless: emails a one-click magic link. */
  async sendMagicLink({ email }) {
    const client = await getAuthClient();
    if (!client) return NOT_CONFIGURED;
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return { ok: false, reason: 'error', message: error.message };
    return { ok: true, message: 'Magic link sent. Check your inbox to sign in.' };
  },

  /** Google OAuth. Redirects out and back; the session is read on return. */
  async signInGoogle() {
    const client = await getAuthClient();
    if (!client) return NOT_CONFIGURED;
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) return { ok: false, reason: 'error', message: error.message };
    return { ok: true, message: 'Redirecting to Google...' };
  },

  async signOut() {
    const client = await getAuthClient();
    if (!client) return;
    await client.auth.signOut();
  },

  /**
   * After an OAuth/magic-link redirect, call this to read the session and, if
   * present, return a normalized account object for Identity.linkAccount.
   */
  async resolveSession() {
    const client = await getAuthClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    const user = data?.session?.user;
    if (!user) return null;
    return {
      authId: user.id,
      email: user.email,
      name: user.user_metadata?.display_name || user.user_metadata?.full_name || '',
      provider: user.app_metadata?.provider || 'email',
      isVerified: Boolean(user.email_confirmed_at || user.confirmed_at || user.app_metadata?.provider === 'google'),
    };
  },
};
