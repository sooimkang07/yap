// ═══════════════════════════════════════════════════════
// yAp — AnalysisModal
// Drives the "✦ Analyzing" animation as segments arrive
// ═══════════════════════════════════════════════════════

const AnalysisModal = {
  _onComplete: null,

  open() {
    DOM.analysisOverlay.classList.add('visible');
    DOM.analysisOverlay.setAttribute('aria-hidden', 'false');
    DOM.analysisBars.innerHTML   = '';
    DOM.analysisLabel.textContent = 'Analyzing';
  },

  close() {
    DOM.analysisOverlay.classList.remove('visible');
    DOM.analysisOverlay.setAttribute('aria-hidden', 'true');
  },

  // Animate segment bars in one-by-one, then call onComplete
  animateSegments(segments, onComplete) {
    this._onComplete = onComplete;
    const container  = DOM.analysisBars;
    container.innerHTML = '';

    // Build all bar elements (invisible initially)
    const barEls = segments.map(seg => {
      const durLabel = _amsFmt(seg.end_ms - seg.start_ms);
      const el = document.createElement('div');
      el.className = 'analysis-bar';
      el.innerHTML = `
        <div class="analysis-bar__label">${seg.label}</div>
        <div class="analysis-bar__track">
          <div class="analysis-bar__fill"></div>
          <span class="analysis-bar__dur">${durLabel}</span>
        </div>`;
      container.appendChild(el);
      return el;
    });

    // Stagger: reveal label → fill bar → next bar
    barEls.forEach((el, i) => {
      const delay = i * 780;

      setTimeout(() => {
        el.classList.add('reveal');                          // label fades in

        setTimeout(() => {
          el.classList.add('filling');
          el.querySelector('.analysis-bar__fill')
            .classList.add('filled');                        // bar fills left→right
          setTimeout(() => {
            el.classList.add('settled');
          }, 620);
        }, 180);
      }, delay);
    });

    // Close + complete after last bar is fully filled
    const totalDelay = (barEls.length - 1) * 780 + 820;
    setTimeout(() => {
      this.close();
      if (this._onComplete) this._onComplete();
    }, totalDelay);
  },

  showError(message = 'Something went wrong') {
    DOM.analysisLabel.textContent = clipAnalysisError(message);
    setTimeout(() => this.close(), 2200);
  },
};

// Format ms → "m:ss"
function _amsFmt(ms) {
  if (!ms || ms <= 0) return '0:00';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function clipAnalysisError(message) {
  const normalized = String(message || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Something went wrong';
  return normalized.length > 68 ? normalized.slice(0, 65) + '...' : normalized;
}
