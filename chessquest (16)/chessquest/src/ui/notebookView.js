// src/ui/notebookView.js
//
// Renders the "notebook" panel: in Live Coach mode, insights stream in as
// they happen. In Silent mode, entries are collected invisibly and the
// panel shows a locked state until the player chooses to reveal the log
// (during or after the match).

export class NotebookView {
  constructor(container, { mode = 'live' } = {}) {
    this.container = container;
    this.mode = mode;
    this.entries = [];
    this.revealed = mode === 'live';
    this._render();
  }

  _render() {
    this.container.innerHTML = '';
    this.container.classList.add('cq-notebook');

    const header = document.createElement('div');
    header.className = 'cq-notebook-header';
    header.innerHTML = `
      <span>Match Notes</span>
      <span class="cq-notebook-mode-label">${this.mode === 'live' ? 'Live Coach' : 'Silent Mode'}</span>
    `;
    this.container.appendChild(header);

    this.entriesEl = document.createElement('div');
    this.entriesEl.className = 'cq-notebook-entries';
    this.container.appendChild(this.entriesEl);

    this.footerEl = document.createElement('div');
    this.footerEl.className = 'cq-notebook-footer';
    this.footerEl.textContent = '';
    this.container.appendChild(this.footerEl);

    if (this.mode === 'silent' && !this.revealed) {
      this._renderLockedState();
    } else {
      this._renderEmptyOrEntries();
    }
  }

  _renderLockedState() {
    this.entriesEl.innerHTML = '';
    const lockMsg = document.createElement('div');
    lockMsg.className = 'cq-notebook-empty';
    lockMsg.textContent = "Reasoning is being recorded silently. Tap \u201cReveal Notes\u201d any time to see why every move was made.";
    this.entriesEl.appendChild(lockMsg);

    const revealBtn = document.createElement('button');
    revealBtn.className = 'cq-btn cq-btn-primary';
    revealBtn.style.marginTop = '14px';
    revealBtn.textContent = 'Reveal Notes';
    revealBtn.addEventListener('click', () => {
      this.revealed = true;
      this._renderEmptyOrEntries();
    });
    this.entriesEl.appendChild(revealBtn);
  }

  _renderEmptyOrEntries() {
    this.entriesEl.innerHTML = '';
    if (!this.entries.length) {
      const empty = document.createElement('div');
      empty.className = 'cq-notebook-empty';
      empty.textContent = 'No moves yet. Notes will appear here as the game unfolds.';
      this.entriesEl.appendChild(empty);
      return;
    }
    for (const entry of this.entries) {
      this.entriesEl.appendChild(this._buildEntryEl(entry));
    }
    this.entriesEl.scrollTop = this.entriesEl.scrollHeight;
  }

  _buildEntryEl({ moveNumber, mover, san, insight }) {
    const el = document.createElement('div');
    el.className = 'cq-entry';
    const moverLabel = mover === 'w' ? 'White' : 'Black';
    el.innerHTML = `
      <div class="cq-entry-move">
        ${moveNumber}. ${san}
        <span class="cq-entry-tag cq-tag-${insight.category}">${insight.category}</span>
        <span style="font-size:0.7rem;color:var(--ink-soft);font-weight:400;">${moverLabel}</span>
      </div>
      <p class="cq-entry-summary">${escapeHtml(insight.summary)}</p>
      <p class="cq-entry-math">${escapeHtml(insight.mathExplanation)}</p>
    `;
    return el;
  }

  /** Called for every move regardless of mode -- storage is mode-agnostic. */
  addEntry(entry) {
    this.entries.push(entry);
    if (this.mode === 'live' || this.revealed) {
      this._renderEmptyOrEntries();
    }
  }

  setFooter(text) {
    this.footerEl.textContent = text;
  }

  reset(mode) {
    this.mode = mode;
    this.entries = [];
    this.revealed = mode === 'live';
    this._render();
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
