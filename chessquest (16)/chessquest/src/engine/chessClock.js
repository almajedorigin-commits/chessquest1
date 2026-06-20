// src/engine/chessClock.js
//
// A simple two-player chess clock. Each side has a time budget in seconds.
// The active clock ticks down; switching turns pauses one and starts the other.
// Fires onFlag(color) when a side runs out, and onTick(white, black) for the UI.

export class ChessClock {
  /** @param {number} minutes per side (e.g. 2, 5, 10). 0 = no clock. */
  constructor(minutes) {
    this.enabled = minutes > 0;
    this.white = minutes * 60;
    this.black = minutes * 60;
    this.active = null;     // 'w' | 'b' | null
    this._interval = null;
    this._last = null;
    this.onTick = null;     // (whiteSeconds, blackSeconds) => void
    this.onFlag = null;     // (color) => void
    this._flagged = false;
  }

  start(color) {
    if (!this.enabled || this._flagged) return;
    this.active = color;
    this._last = Date.now();
    if (!this._interval) {
      this._interval = setInterval(() => this._tick(), 200);
    }
  }

  /** Switch the running clock to the other side (call after a move). */
  switch(toColor) {
    if (!this.enabled) return;
    this._settle();
    this.start(toColor);
  }

  stop() {
    this._settle();
    this.active = null;
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }

  _settle() {
    if (this.active && this._last != null) {
      const now = Date.now();
      const elapsed = (now - this._last) / 1000;
      if (this.active === 'w') this.white = Math.max(0, this.white - elapsed);
      else this.black = Math.max(0, this.black - elapsed);
      this._last = now;
    }
  }

  _tick() {
    if (this._flagged) return;
    this._settle();
    this.onTick?.(this.white, this.black);
    if (this.white <= 0 && !this._flagged) { this._flag('w'); }
    else if (this.black <= 0 && !this._flagged) { this._flag('b'); }
  }

  _flag(color) {
    this._flagged = true;
    this.stop();
    this.onFlag?.(color);
  }

  destroy() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
