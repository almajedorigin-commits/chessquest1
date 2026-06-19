// src/audio/audioManager.js
//
// Wraps Howler.js for two layers:
//   1. SFX -- short clean cues for moves/captures/etc (per theme).
//   2. Music -- a looping ambient track per theme, faded in/out.
// Both layers fail silently if their files are missing, so the game never
// crashes on absent audio. SFX and music have independent volumes plus a
// master mute.

import { Howl } from 'howler';
import { trackFor } from './musicRegistry.js';

const SOUND_KEYS = ['move', 'capture', 'check', 'castle', 'promote', 'gameStart', 'gameEnd', 'illegal'];

const FILENAME_FOR_KEY = {
  move: 'move.wav',
  capture: 'capture.wav',
  check: 'check.wav',
  castle: 'castle.wav',
  promote: 'promote.wav',
  gameStart: 'game-start.wav',
  gameEnd: 'game-end.wav',
  illegal: 'illegal.wav',
};

// Music tracks are resolved per-context via musicRegistry.js.

export class AudioManager {
  constructor() {
    this._sounds = {};
    this._currentTheme = null;
    this._muted = false;
    this._sfxVolume = 0.7;
    this._musicVolume = 0.35;
    this._music = null;
    this._musicId = null;
    this._musicLoaded = false;
    this._wantMusic = false;
    this._musicContext = null;
    this._currentTrackTitle = '';
    this._musicEnabled = true;
    this._audioUnlocked = false;
  }

  loadTheme(themeId) {
    this._currentTheme = themeId;
    this._sounds = {};
    for (const key of SOUND_KEYS) {
      const src = `/sounds/${themeId}/${FILENAME_FOR_KEY[key]}`;
      this._sounds[key] = new Howl({
        src: [src],
        volume: key === 'move' ? this._sfxVolume * 0.7 : this._sfxVolume,
        onloaderror: () => { this._sounds[key] = null; },
      });
    }
  }

  /**
   * Load the music track for a context ('menu' or a theme id). Decoupled from
   * loadTheme so the menu can keep its track while the board uses a theme's
   * SFX. Pass the same context again to no-op.
   */
  loadMusic(context) {
    if (this._musicContext === context && this._music) return;
    this._musicContext = context;
    if (this._music) {
      try { this._music.fade(this._music.volume(), 0, 600); } catch { /* ignore */ }
      const old = this._music;
      setTimeout(() => { try { old.unload(); } catch { /* ignore */ } }, 700);
      this._music = null;
      this._musicId = null;
    }
    this._musicLoaded = false;
    const track = trackFor(context);
    const src = `/music/${track.dir}/${track.file}`;
    this._currentTrackTitle = track.title;
    this._music = new Howl({
      src: [src],
      loop: true,
      volume: 0,
      html5: true,
      onload: () => {
        this._musicLoaded = true;
        if (this._wantMusic && !this._muted && this._musicEnabled !== false) this.startMusic();
      },
      onplay: () => {
        // Ensure the fade-in runs once playback actually begins.
        if (this._musicId != null) this._music.fade(0, this._musicVolume, 1200, this._musicId);
      },
      onplayerror: (id) => {
        // Autoplay was blocked (no gesture yet). Howler lets us unlock + retry
        // once the audio context is allowed. Retry on the next unlock.
        try {
          this._music.once('unlock', () => {
            if (this._wantMusic && !this._muted && this._musicEnabled !== false) this.startMusic();
          });
        } catch { /* ignore */ }
      },
      onloaderror: () => { this._music = null; },
    });
    // If a gesture already happened and music is wanted, try immediately.
    if (this._audioUnlocked && this._wantMusic && this._musicEnabled !== false) {
      this.startMusic();
    }
  }

  get currentTrackTitle() {
    return this._currentTrackTitle || '';
  }

  /**
   * Master music preference. When false, music never plays (and stops if
   * playing). When true, music plays as soon as audio is unlocked by a gesture.
   * This is the clean fix for "music only starts when I toggle it" -- the
   * preference, not a manual toggle, drives playback.
   */
  setMusicEnabled(enabled) {
    this._musicEnabled = Boolean(enabled);
    if (!this._musicEnabled) {
      this.stopMusic();
    } else if (this._audioUnlocked) {
      this.startMusic();
    }
  }

  /** Called once a real user gesture has occurred (autoplay unlocked). */
  markAudioUnlocked() {
    this._audioUnlocked = true;
    if (this._musicEnabled !== false) this.startMusic();
  }

  startMusic() {
    // Record intent so we can start as soon as the track loads / unlocks, even
    // if this call arrives before the file is ready or before a user gesture.
    this._wantMusic = true;
    if (this._musicEnabled === false) return;
    if (this._muted || !this._music) return;
    if (this._musicId != null && this._music.playing(this._musicId)) return;
    this._musicId = this._music.play(); // onplay handler runs the fade-in
  }

  stopMusic() {
    this._wantMusic = false;
    if (this._music && this._musicId != null) {
      this._music.fade(this._music.volume(this._musicId), 0, 600, this._musicId);
      const m = this._music, id = this._musicId;
      setTimeout(() => m.stop(id), 650);
      this._musicId = null;
    }
  }

  play(key) {
    if (this._muted) return;
    const sound = this._sounds[key];
    if (sound) sound.play();
  }

  setSfxVolume(v) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    for (const key of SOUND_KEYS) {
      if (this._sounds[key]) this._sounds[key].volume(key === 'move' ? this._sfxVolume * 0.7 : this._sfxVolume);
    }
  }

  setMusicVolume(v) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    if (this._music && this._musicId != null) this._music.volume(this._musicVolume, this._musicId);
  }

  setMuted(muted) {
    this._muted = muted;
    if (muted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  toggleMuted() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  isMuted() {
    return this._muted;
  }
}

export const SOUND_FILENAMES = FILENAME_FOR_KEY;
