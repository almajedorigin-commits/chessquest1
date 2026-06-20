// src/themes/backgroundManager.js
//
// Renders a lightweight animated background behind the board, one effect per
// theme. Uses a single <canvas> particle layer (cheap, no video files) over a
// CSS gradient set via theme variables. Respects prefers-reduced-motion by
// rendering a static gradient with no animation loop.
//
// Effects:
//   nature   -> drifting leaves + fireflies
//   archery  -> slow falling motes over a dawn sky
//   soldiers -> drifting smoke/ember flecks
//   medieval -> floating dust in torchlight
//   space    -> parallax starfield + occasional shooting star
//   mythical -> rising embers/sparks
//   pirates  -> gentle sea-spray bubbles rising

const THEME_BG = {
  nature:   { from: '#1d3024', to: '#0e1a13', particle: '#a3c585', kind: 'leaves' },
  archery:  { from: '#3a2c1c', to: '#1a130c', particle: '#e7c486', kind: 'motes' },
  soldiers: { from: '#23291f', to: '#10130d', particle: '#9aa07f', kind: 'embers' },
  medieval: { from: '#2a2012', to: '#140e07', particle: '#d6a85a', kind: 'dust' },
  space:    { from: '#0b1026', to: '#04060f', particle: '#cdd8ff', kind: 'stars' },
  mythical: { from: '#241338', to: '#0f0720', particle: '#c79bff', kind: 'sparks' },
  pirates:  { from: '#0e2a33', to: '#05151a', particle: '#7fd4e0', kind: 'bubbles' },
};

export class BackgroundManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.raf = null;
    this.particles = [];
    this.kind = 'stars';
    this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._onResize = () => this._resize();
  }

  mount() {
    if (this.canvas) return;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'cq-bg-canvas';
    document.body.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', this._onResize);
  }

  applyTheme(themeId) {
    const cfg = THEME_BG[themeId] || THEME_BG.space;
    this.kind = cfg.kind;
    this.particleColor = cfg.particle;
    document.body.style.setProperty('--bg-from', cfg.from);
    document.body.style.setProperty('--bg-to', cfg.to);
    this._seed();
    if (this._reduced) {
      this._drawStaticFrame();
    } else {
      this._start();
    }
  }

  _resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _seed() {
    const w = this.canvas.width, h = this.canvas.height;
    const count = this.kind === 'stars' ? 140 : 60;
    this.particles = Array.from({ length: count }, () => this._spawn(w, h, true));
  }

  _spawn(w, h, initial = false) {
    const base = {
      x: Math.random() * w,
      y: initial ? Math.random() * h : (this._risesUp() ? h + 10 : -10),
      r: Math.random() * 2 + 0.6,
      vx: (Math.random() - 0.5) * 0.3,
      vy: this._risesUp() ? -(Math.random() * 0.6 + 0.2) : (Math.random() * 0.6 + 0.2),
      a: Math.random() * 0.6 + 0.2,
      tw: Math.random() * Math.PI * 2, // twinkle phase
    };
    if (this.kind === 'stars') { base.vx = 0; base.vy = 0; }
    if (this.kind === 'leaves') { base.r = Math.random() * 3 + 1.5; base.spin = Math.random() * 0.05; }
    return base;
  }

  _risesUp() {
    return this.kind === 'embers' || this.kind === 'sparks' || this.kind === 'bubbles';
  }

  _start() {
    cancelAnimationFrame(this.raf);
    let shootTimer = 0;
    const loop = () => {
      const { ctx, canvas } = this;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const p of this.particles) {
        if (this.kind === 'stars') {
          p.tw += 0.04;
          const tw = (Math.sin(p.tw) + 1) / 2;
          ctx.globalAlpha = p.a * (0.4 + 0.6 * tw);
          ctx.fillStyle = this.particleColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.spin != null) p.x += Math.sin(p.y * 0.02) * 0.4; // leaf sway
        ctx.globalAlpha = p.a;
        ctx.fillStyle = this.particleColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        const off = this._risesUp() ? p.y < -10 : p.y > h + 10;
        if (off || p.x < -10 || p.x > w + 10) {
          Object.assign(p, this._spawn(w, h, false));
        }
      }

      // Space: occasional shooting star.
      if (this.kind === 'stars') {
        shootTimer -= 1;
        if (shootTimer <= 0 && Math.random() < 0.004) {
          this._shootingStar();
          shootTimer = 200;
        }
      }

      ctx.globalAlpha = 1;
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  _shootingStar() {
    const { ctx, canvas } = this;
    const x = Math.random() * canvas.width * 0.7;
    const y = Math.random() * canvas.height * 0.4;
    const len = 120;
    const grad = ctx.createLinearGradient(x, y, x + len, y + len * 0.4);
    grad.addColorStop(0, this.particleColor);
    grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + len * 0.4);
    ctx.stroke();
  }

  _drawStaticFrame() {
    // Reduced-motion: draw particles once, no loop.
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of this.particles) {
      ctx.globalAlpha = p.a;
      ctx.fillStyle = this.particleColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    if (this.canvas) { this.canvas.remove(); this.canvas = null; }
  }
}
