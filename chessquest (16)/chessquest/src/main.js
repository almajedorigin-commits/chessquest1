// src/main.js

import './style.css';
import { renderStartMenu } from './ui/screens/startMenuScreen.js';
import { renderThemeSelect } from './ui/screens/themeSelectScreen.js';
import { renderCharacterSelect } from './ui/screens/characterSelectScreen.js';
import { renderModeSelect } from './ui/screens/modeSelectScreen.js';
import { renderGameScreen } from './ui/screens/gameScreen.js';
import { renderAccount } from './ui/screens/accountScreen.js';
import { renderOnlineLobby } from './ui/screens/onlineLobbyScreen.js';
import { renderOnlineGame } from './ui/screens/onlineGameScreen.js';
import { AudioManager } from './audio/audioManager.js';
import { BackgroundManager } from './themes/backgroundManager.js';
import { getIdentity, getTransport } from './online/index.js';
import { Auth } from './online/auth.js';
import { Prefs } from './ui/preferences.js';
import { renderSettings } from './ui/screens/settingsScreen.js';
import { renderLeaderboard } from './ui/screens/leaderboardScreen.js';

const PROGRESS_KEY = 'chessquest_progress_v1';

const app = document.getElementById('app');
const audio = new AudioManager();
audio.setMusicEnabled(Prefs.musicEnabled);
Prefs.boardView = 'flat'; // scene mode removed; ensure no saved pref strands a user
const background = new BackgroundManager();
background.mount();
background.applyTheme('space'); // pleasant default behind the menus
let activeController = null;

// Browser autoplay policies block audio until the user physically interacts
// with the page. So the first startMusic() on the menu silently fails and
// music only began after a click on the mute toggle. This global one-time
// listener starts music on the very first interaction anywhere, on any screen.
let _audioUnlocked = false;
function unlockAudioOnce() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  audio.markAudioUnlocked();
  document.removeEventListener('pointerdown', unlockAudioOnce);
  document.removeEventListener('keydown', unlockAudioOnce);
  document.removeEventListener('touchstart', unlockAudioOnce);
}
document.addEventListener('pointerdown', unlockAudioOnce);
document.addEventListener('keydown', unlockAudioOnce);
document.addEventListener('touchstart', unlockAudioOnce);

function cleanupActive() {
  if (activeController) {
    try { activeController.destroy(); } catch { /* ignore */ }
    activeController = null;
  }
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; }
}
function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
function unlockNextTier(themeId, currentIndex) {
  const progress = loadProgress();
  progress[themeId] = Math.max(progress[themeId] ?? 0, currentIndex + 1);
  saveProgress(progress);
}
function getUnlockedTier(themeId) {
  return loadProgress()[themeId] ?? 0;
}

// ---------------------------------------------------------------------------
// Start menu (entry point)
// ---------------------------------------------------------------------------
function goToStartMenu() {
  cleanupActive();
  background.applyTheme('space');
  audio.loadMusic('menu');
  // Do NOT call startMusic() here -- browsers block audio that isn't triggered
  // by a user gesture, and a blocked first play can wedge later attempts. The
  // global unlockAudioOnce listener starts it on the first click/key/touch, and
  // if the user already interacted this session, kick it off now.
  if (_audioUnlocked) audio.startMusic();
  renderStartMenu(app, {
    onPlayComputer: goToThemeSelect,
    onPlayOnline: goToOnlineLobby,
    onAccount: () => goToAccount(),
    onSettings: () => goToSettings(),
    onLeaderboard: () => goToLeaderboard(),
    audio,
  });
}

function goToSettings() {
  renderSettings(app, { onBack: goToStartMenu, audio });
}

function goToLeaderboard() {
  renderLeaderboard(app, { onBack: goToStartMenu });
}

function goToAccount() {
  renderAccount(app, {
    onBack: goToStartMenu,
    onChanged: () => { /* identity persisted; nothing else needed */ },
  });
}

// ---------------------------------------------------------------------------
// Single-player flow
// ---------------------------------------------------------------------------
function goToThemeSelect() {
  cleanupActive();
  renderThemeSelect(app, {
    onSelect: (theme) => goToCharacterSelect(theme),
    onBack: goToStartMenu,
  });
}

function goToCharacterSelect(theme) {
  background.applyTheme(theme.id);
  renderCharacterSelect(app, {
    theme,
    unlockedTier: getUnlockedTier(theme.id),
    onSelect: (character) => goToModeSelect(theme, character),
    onBack: goToThemeSelect,
  });
}

function goToModeSelect(theme, character) {
  renderModeSelect(app, {
    character,
    onSelect: (mode) => startGame(theme, character, mode),
    onBack: () => goToCharacterSelect(theme),
  });
}

function startGame(theme, character, mode) {
  const characterIndex = theme.characters.findIndex((c) => c.id === character.id);
  activeController = renderGameScreen(app, {
    theme, character, mode, audio, background,
    humanColor: 'w',
    onExit: goToStartMenu,
    onRematch: () => startGame(theme, character, mode),
  });

  const originalOnGameOver = activeController.onGameOver;
  activeController.onGameOver = (payload) => {
    if (payload.result.startsWith('You won')) unlockNextTier(theme.id, characterIndex);
    originalOnGameOver?.(payload);
  };
}

// ---------------------------------------------------------------------------
// Online flow
// ---------------------------------------------------------------------------
function goToOnlineLobby() {
  cleanupActive();
  renderOnlineLobby(app, {
    onStartGame: (game) => startOnlineGame(game),
    onBack: goToStartMenu,
  });
}

async function startOnlineGame(game) {
  cleanupActive();
  const transport = await getTransport();
  const identity = getIdentity();
  activeController = renderOnlineGame(app, {
    transport, identity, game, audio, background,
    onExit: goToStartMenu,
  });
}

// Boot.
(async () => {
  // If the player just returned from a Google sign-in or an email magic link,
  // there will be a live session to resolve and link into their identity.
  try {
    if (Auth.available()) {
      const session = await Auth.resolveSession();
      if (session) getIdentity().linkAccount(session);
    }
  } catch { /* ignore -- never block boot on auth */ }
  goToStartMenu();
})();
