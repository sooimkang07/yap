// ═══════════════════════════════════════════════════════
// yAp — Recording Indicator
// Floating avatar above mic button when recording/sending
// ═══════════════════════════════════════════════════════

const RecordingIndicator = {
  element: null,
  avatarEl: null,
  initialized: false,

  // ── Initialize the floating indicator ────────────────────────────────
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Create the indicator element
    this.element = document.createElement('div');
    this.element.className = 'recording-indicator-float';
    this.element.setAttribute('aria-hidden', 'true');
    
    this.avatarEl = document.createElement('div');
    this.avatarEl.className = 'recording-indicator-float__avatar';
    
    this.element.appendChild(this.avatarEl);

    // Insert above the mic button
    const micBtn = document.getElementById('btn-mic');
    if (micBtn && micBtn.parentNode) {
      micBtn.parentNode.insertBefore(this.element, micBtn);
    } else {
      // Fallback: append to body
      document.body.appendChild(this.element);
    }

    console.log('[yAp] Recording indicator initialized');
  },

  // ── Update the indicator based on recording state ─────────────────────
  updateState(recordingState) {
    if (!this.initialized) this.init();

    const isActive = recordingState === 'recording' || recordingState === 'sending';
    
    if (isActive) {
      // Get current user info
      const currentUser = getCurrentUser?.() || { color: '#999', avatarUrl: '' };
      
      // Update avatar appearance
      if (currentUser.avatarUrl) {
        this.avatarEl.style.backgroundImage = `url('${currentUser.avatarUrl}')`;
      }
      this.avatarEl.style.backgroundColor = currentUser.color;
      
      // Add state class for animation
      this.element.dataset.state = recordingState;
      this.element.classList.add('is-active');
    } else {
      this.element.classList.remove('is-active');
      this.element.dataset.state = 'idle';
    }
  },

  // ── Show the indicator ──────────────────────────────────────────────────
  show() {
    if (!this.initialized) this.init();
    this.element.classList.add('is-visible');
  },

  // ── Hide the indicator ──────────────────────────────────────────────────
  hide() {
    if (!this.initialized) this.init();
    this.element.classList.remove('is-visible');
  },
};
