// src/ui/screens/accountScreen.js
//
// Account hub. Guests get a name + rating panel (works offline). When the
// online server is connected, it also offers real verified accounts: email +
// password (with verification), passwordless magic link, and Google sign-in.
// Accounts are OPTIONAL -- guests can always play; signing in just attaches a
// verified identity and saves the rating, without losing the local guest id.

import { getIdentity } from '../../online/index.js';
import { Auth } from '../../online/auth.js';

export function renderAccount(root, { onBack, onChanged }) {
  const identity = getIdentity();
  root.innerHTML = '';

  const screen = document.createElement('div');
  screen.className = 'cq-screen';

  const authAvailable = Auth.available();

  screen.innerHTML = `
    <button class="cq-btn" id="cq-back-btn" style="margin-bottom:18px;">&larr; Back</button>
    <h1 class="cq-screen-title">Your account</h1>
    <p class="cq-screen-subtitle">Accounts are optional \u2014 you can always play as a guest. Signing in keeps your name and rating across devices.</p>

    <div class="cq-account-card">
      <div class="cq-account-row">
        <span class="cq-account-key">Display name</span>
        <input id="cq-name-input" class="cq-text-input" maxlength="24" value="${escapeAttr(identity.name)}" />
      </div>
      <div class="cq-account-row">
        <span class="cq-account-key">Status</span>
        <span id="cq-status-val">${statusLabel(identity)}</span>
      </div>
      <div class="cq-account-row">
        <span class="cq-account-key">Online rating</span>
        <span>${identity.rating}</span>
      </div>
      <div class="cq-account-actions">
        <button class="cq-btn cq-btn-primary" id="cq-save-name">Save name</button>
        <button class="cq-btn" id="cq-reset-id">Start fresh (new guest)</button>
      </div>
      <p class="cq-account-note" id="cq-account-note"></p>
    </div>

    <div id="cq-auth-section"></div>
  `;

  root.appendChild(screen);
  screen.querySelector('#cq-back-btn').addEventListener('click', onBack);

  // Name save / reset (always available, offline-friendly).
  screen.querySelector('#cq-save-name').addEventListener('click', () => {
    const val = screen.querySelector('#cq-name-input').value;
    if (val && val.trim()) {
      identity.setName(val);
      screen.querySelector('#cq-status-val').textContent = statusLabel(identity);
      screen.querySelector('#cq-account-note').textContent = `Saved. You'll appear as "${identity.name}".`;
      onChanged?.();
    }
  });

  screen.querySelector('#cq-reset-id').addEventListener('click', () => {
    if (window.confirm('Start fresh as a new guest? This clears your current name and rating.')) {
      Auth.signOut();
      identity.reset();
      screen.querySelector('#cq-name-input').value = identity.name;
      screen.querySelector('#cq-status-val').textContent = statusLabel(identity);
      screen.querySelector('#cq-account-note').textContent = 'New guest identity created.';
      renderAuthSection(screen, identity, onChanged); // refresh auth UI state
      onChanged?.();
    }
  });

  renderAuthSection(screen, identity, onChanged);
}

function renderAuthSection(screen, identity, onChanged) {
  const host = screen.querySelector('#cq-auth-section');
  host.innerHTML = '';

  if (!Auth.available()) {
    host.innerHTML = `
      <div class="cq-auth-card cq-auth-disabled">
        <h3>Verified accounts</h3>
        <p>Email and Google sign-in turn on automatically once the online server is connected. Until then, your guest name and rating are saved on this device.</p>
      </div>`;
    return;
  }

  // If already signed in via auth, show the signed-in state.
  if (identity.authId) {
    host.innerHTML = `
      <div class="cq-auth-card">
        <h3>Signed in</h3>
        <p>${identity.authProvider === 'google' ? 'Google account' : 'Email account'}: <strong>${escapeHtml(identity.email || identity.name)}</strong> ${identity.isVerified ? '\u2713 verified' : '(unverified)'}</p>
        <button class="cq-btn" id="cq-signout">Sign out</button>
      </div>`;
    host.querySelector('#cq-signout').addEventListener('click', async () => {
      await Auth.signOut();
      identity.unlinkAccount();
      renderAuthSection(screen, identity, onChanged);
      screen.querySelector('#cq-status-val').textContent = statusLabel(identity);
      onChanged?.();
    });
    return;
  }

  host.innerHTML = `
    <div class="cq-auth-card">
      <h3>Sign in or create an account</h3>
      <p class="cq-auth-sub">Optional \u2014 keeps your name and rating across devices.</p>

      <button class="cq-btn cq-google-btn" id="cq-google">
        <span class="cq-g-icon">G</span> Continue with Google
      </button>

      <div class="cq-auth-divider"><span>or use email</span></div>

      <div class="cq-auth-tabs">
        <button class="cq-auth-tab cq-auth-tab-active" data-tab="signin">Sign in</button>
        <button class="cq-auth-tab" data-tab="signup">Create account</button>
        <button class="cq-auth-tab" data-tab="magic">Magic link</button>
      </div>

      <div class="cq-auth-form" id="cq-auth-form"></div>
      <p class="cq-account-note" id="cq-auth-note"></p>
    </div>`;

  host.querySelector('#cq-google').addEventListener('click', async () => {
    const note = host.querySelector('#cq-auth-note');
    note.textContent = 'Opening Google sign-in...';
    const res = await Auth.signInGoogle();
    if (!res.ok) note.textContent = res.message;
  });

  const tabs = host.querySelectorAll('.cq-auth-tab');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.classList.remove('cq-auth-tab-active'));
    t.classList.add('cq-auth-tab-active');
    renderAuthForm(host, identity, t.dataset.tab, screen, onChanged);
  }));

  renderAuthForm(host, identity, 'signin', screen, onChanged);
}

function renderAuthForm(host, identity, tab, screen, onChanged) {
  const form = host.querySelector('#cq-auth-form');
  const note = host.querySelector('#cq-auth-note');
  note.textContent = '';

  if (tab === 'magic') {
    form.innerHTML = `
      <input class="cq-text-input cq-auth-input" id="cq-email" type="email" placeholder="you@example.com" />
      <button class="cq-btn cq-btn-primary cq-auth-submit" id="cq-magic">Email me a sign-in link</button>`;
    form.querySelector('#cq-magic').addEventListener('click', async () => {
      const email = form.querySelector('#cq-email').value.trim();
      if (!email) { note.textContent = 'Enter your email first.'; return; }
      note.textContent = 'Sending...';
      const res = await Auth.sendMagicLink({ email });
      note.textContent = res.message;
    });
    return;
  }

  const isSignup = tab === 'signup';
  form.innerHTML = `
    ${isSignup ? '<input class="cq-text-input cq-auth-input" id="cq-name" placeholder="Display name" maxlength="24" />' : ''}
    <input class="cq-text-input cq-auth-input" id="cq-email" type="email" placeholder="you@example.com" />
    <input class="cq-text-input cq-auth-input" id="cq-pass" type="password" placeholder="Password" />
    <button class="cq-btn cq-btn-primary cq-auth-submit" id="cq-submit">${isSignup ? 'Create account' : 'Sign in'}</button>`;

  form.querySelector('#cq-submit').addEventListener('click', async () => {
    const email = form.querySelector('#cq-email').value.trim();
    const password = form.querySelector('#cq-pass').value;
    if (!email || !password) { note.textContent = 'Enter your email and password.'; return; }
    note.textContent = isSignup ? 'Creating account...' : 'Signing in...';

    let res;
    if (isSignup) {
      const name = form.querySelector('#cq-name')?.value?.trim() || '';
      res = await Auth.signUpEmail({ email, password, name });
    } else {
      res = await Auth.signInEmail({ email, password });
    }

    if (!res.ok) { note.textContent = res.message; return; }

    if (res.needsVerification) {
      note.textContent = res.message; // "check your inbox to verify"
      return;
    }

    // Signed in immediately (verification off, or already verified): link it.
    const session = await Auth.resolveSession();
    if (session) {
      identity.linkAccount(session);
      screen.querySelector('#cq-status-val').textContent = statusLabel(identity);
      onChanged?.();
      renderAuthSection(screen, identity, onChanged);
    } else {
      note.textContent = res.message;
    }
  });
}

function statusLabel(identity) {
  if (identity.authId) return identity.isVerified ? 'Verified account' : 'Account (unverified)';
  return identity.isGuest ? 'Guest' : 'Named account (this device)';
}

function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
