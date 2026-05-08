// ═══════════════════════════════════════════════════════
// yAp — AnalysisModal
// Apple-style transition while AI breaks a memo into topics
// ═══════════════════════════════════════════════════════

const ANALYSIS_COPY = {
  idleLabel: 'Analyzing',
  idleTitle: 'Breaking your memo into topics',
  idleStatus: 'Pulling apart the voice memo…',
};

const ANALYSIS_STATUS_STEPS = [
  'Listening for topic boundaries…',
  'Sorting replies from new ideas…',
  'Grouping moments that belong together…',
  'Pulling it all together…',
];

const AnalysisModal = {
  _onComplete: null,
  _timeouts: [],
  _statusInterval: null,

  open() {
    this._clearTimers();
    DOM.analysisOverlay.classList.add('visible');
    DOM.analysisOverlay.setAttribute('aria-hidden', 'false');
    DOM.analysisBars.innerHTML = '';
    DOM.analysisOverlay.dataset.phase = 'loading';
    DOM.analysisLabel.textContent = ANALYSIS_COPY.idleLabel;
    DOM.analysisTitle.textContent = ANALYSIS_COPY.idleTitle;
    DOM.analysisStatusCopy.textContent = ANALYSIS_COPY.idleStatus;
    let stepIndex = 0;
    this._statusInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % ANALYSIS_STATUS_STEPS.length;
      DOM.analysisStatusCopy.textContent = ANALYSIS_STATUS_STEPS[stepIndex];
    }, 1050);
  },

  close() {
    this._clearTimers();
    DOM.analysisOverlay.classList.remove('visible');
    DOM.analysisOverlay.setAttribute('aria-hidden', 'true');
    DOM.analysisOverlay.dataset.phase = 'idle';
  },

  animateSegments(segments, onComplete) {
    this._clearTimers();
    this._onComplete = onComplete;
    const container = DOM.analysisBars;
    container.innerHTML = '';
    DOM.analysisOverlay.dataset.phase = 'segments';
    DOM.analysisLabel.textContent = 'Topics Ready';
    DOM.analysisTitle.textContent = 'Here’s how yAp is shaping the thread';
    DOM.analysisStatusCopy.textContent = `${segments.length || 0} topic${segments.length === 1 ? '' : 's'} detected`;

    const barEls = segments.map((seg, index) => {
      const durationMs = Math.max(0, Number(seg.end_ms || 0) - Number(seg.start_ms || 0));
      const durLabel = formatDurationClock(durationMs);
      const label = clipWords(seg.label || `Topic ${index + 1}`, 9);
      const excerpt = clipWords(seg.transcript || seg.text || 'Voice memo segment', 18);
      const el = document.createElement('div');
      el.className = 'analysis-bar';
      el.innerHTML = `
        <div class="analysis-bar__header">
          <div class="analysis-bar__label">${escapeHtml(label)}</div>
          <div class="analysis-bar__dur">${durLabel}</div>
        </div>
        <div class="analysis-bar__track">
          <div class="analysis-bar__fill"></div>
        </div>
        <div class="analysis-bar__excerpt">${escapeHtml(excerpt)}</div>
      `;
      container.appendChild(el);
      return el;
    });

    if (!barEls.length) {
      DOM.analysisStatusCopy.textContent = 'No new topics found';
      this._timeouts.push(setTimeout(() => {
        this.close();
        if (this._onComplete) this._onComplete();
      }, 900));
      return;
    }

    barEls.forEach((el, index) => {
      const delay = 100 + (index * 180);
      this._timeouts.push(setTimeout(() => {
        el.classList.add('reveal');
        this._timeouts.push(setTimeout(() => {
          el.classList.add('filling');
          el.querySelector('.analysis-bar__fill')?.classList.add('filled');
        }, 50));
      }, delay));
    });

    const totalDelay = 100 + ((barEls.length - 1) * 180) + 400;
    this._timeouts.push(setTimeout(() => {
      this.close();
      if (this._onComplete) this._onComplete();
    }, totalDelay));
  },

  showError(message = 'Something went wrong') {
    this._clearTimers();
    DOM.analysisOverlay.dataset.phase = 'error';
    DOM.analysisLabel.textContent = 'Couldn’t Finish';
    DOM.analysisTitle.textContent = 'The memo hit a snag';
    DOM.analysisStatusCopy.textContent = clipAnalysisError(message) || 'Try recording that one more time.';
    DOM.analysisBars.innerHTML = '';
    this._timeouts.push(setTimeout(() => this.close(), 2200));
  },

  _clearTimers() {
    this._timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this._timeouts = [];
    if (this._statusInterval) {
      clearInterval(this._statusInterval);
      this._statusInterval = null;
    }
  },
};

function clipAnalysisError(message) {
  const normalized = String(message || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Something went wrong';
  return normalized.length > 92 ? `${normalized.slice(0, 89)}...` : normalized;
}
